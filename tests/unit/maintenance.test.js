import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { createFakeDb } from '../mocks/fakeDb.js';

const fakeDb = createFakeDb();
vi.mock('../../config/db.js', () => ({ default: fakeDb }));

const { default: maintenanceRoutes } = await import('../../routes/maintenanceRoutes.js');
const { buildTestApp } = await import('../helpers/testApp.js');
const { authHeader } = await import('../helpers/auth.js');

const app = buildTestApp('/api/v1/maintenance', maintenanceRoutes);

beforeEach(() => {
  fakeDb.__reset();
});

describe('Maintenance routes', () => {
  it('starts with no tickets in the dummy dataset', async () => {
    const res = await request(app)
      .get('/api/v1/maintenance')
      .set('Authorization', authHeader());

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });

  it('creates a ticket and flips the asset status to Broken', async () => {
    const res = await request(app)
      .post('/api/v1/maintenance')
      .set('Authorization', authHeader({ role: 'staff' }))
      .send({ assetId: 4, issueDescription: 'AC not cooling', assetStatus: 'Broken' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ asset_id: 4, status: 'PENDING' });

    const listRes = await request(app)
      .get('/api/v1/maintenance')
      .set('Authorization', authHeader());
    expect(listRes.body.data).toHaveLength(1);
    expect(listRes.body.data[0].asset_name).toBe('Daikin AC Split 1.5 PK');
  });

  it('filters tickets by status', async () => {
    await request(app)
      .post('/api/v1/maintenance')
      .set('Authorization', authHeader({ role: 'staff' }))
      .send({ assetId: 1, issueDescription: 'Squeaky wheel' });

    const res = await request(app)
      .get('/api/v1/maintenance?status=PENDING')
      .set('Authorization', authHeader());

    expect(res.body.data).toHaveLength(1);
  });

  it('rejects ticket creation for an unknown asset', async () => {
    const res = await request(app)
      .post('/api/v1/maintenance')
      .set('Authorization', authHeader({ role: 'staff' }))
      .send({ assetId: 999, issueDescription: 'Broken' });

    expect(res.status).toBe(404);
  });

  it('resolves a ticket and restores asset status when requested', async () => {
    const created = await request(app)
      .post('/api/v1/maintenance')
      .set('Authorization', authHeader({ role: 'staff' }))
      .send({ assetId: 3, issueDescription: 'Bulb dead', assetStatus: 'Maintenance' });

    const resolveRes = await request(app)
      .post(`/api/v1/maintenance/${created.body.id}/resolve`)
      .set('Authorization', authHeader())
      .send({ repairCost: 150000, vendorName: 'FixIt Co', restoreAssetStatus: true });

    expect(resolveRes.status).toBe(200);

    const listRes = await request(app)
      .get('/api/v1/maintenance?status=RESOLVED')
      .set('Authorization', authHeader());
    expect(listRes.body.data).toHaveLength(1);
  });

  it('rejects resolving an already-resolved ticket', async () => {
    const created = await request(app)
      .post('/api/v1/maintenance')
      .set('Authorization', authHeader({ role: 'staff' }))
      .send({ assetId: 3, issueDescription: 'Bulb dead' });

    await request(app)
      .post(`/api/v1/maintenance/${created.body.id}/resolve`)
      .set('Authorization', authHeader())
      .send({ repairCost: 0 });

    const secondResolve = await request(app)
      .post(`/api/v1/maintenance/${created.body.id}/resolve`)
      .set('Authorization', authHeader())
      .send({ repairCost: 0 });

    expect(secondResolve.status).toBe(400);
  });

  it('rejects resolving a ticket with a negative repair cost', async () => {
    const created = await request(app)
      .post('/api/v1/maintenance')
      .set('Authorization', authHeader({ role: 'staff' }))
      .send({ assetId: 3, issueDescription: 'Bulb dead' });

    const res = await request(app)
      .post(`/api/v1/maintenance/${created.body.id}/resolve`)
      .set('Authorization', authHeader())
      .send({ repairCost: -5 });

    expect(res.status).toBe(400);
  });

  it('rejects ticket resolution from a staff role (admin only)', async () => {
    const created = await request(app)
      .post('/api/v1/maintenance')
      .set('Authorization', authHeader({ role: 'staff' }))
      .send({ assetId: 3, issueDescription: 'Bulb dead' });

    const res = await request(app)
      .post(`/api/v1/maintenance/${created.body.id}/resolve`)
      .set('Authorization', authHeader({ role: 'staff' }))
      .send({ repairCost: 0 });

    expect(res.status).toBe(403);
  });
});
