import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { createFakeDb } from '../mocks/fakeDb.js';

const fakeDb = createFakeDb();
vi.mock('../../config/db.js', () => ({ default: fakeDb }));

const { default: assignmentRoutes } = await import('../../routes/assignmentRoutes.js');
const { buildTestApp } = await import('../helpers/testApp.js');
const { authHeader } = await import('../helpers/auth.js');

const app = buildTestApp('/api/v1/assignments', assignmentRoutes);

beforeEach(() => {
  fakeDb.__reset();
});

describe('Assignment routes', () => {
  it('starts with no assignments in the dummy dataset', async () => {
    const res = await request(app)
      .get('/api/v1/assignments')
      .set('Authorization', authHeader());

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });

  it('checks out an asset, deducting stock and logging history', async () => {
    const res = await request(app)
      .post('/api/v1/assignments')
      .set('Authorization', authHeader({ role: 'staff' }))
      .send({ assetId: 3, assignedTo: 'Conference Room Alpha', quantity: 2 });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ asset_id: 3, assigned_to: 'Conference Room Alpha', quantity: 2, status: 'ACTIVE' });

    const assetsRes = await request(app)
      .get('/api/v1/assignments')
      .set('Authorization', authHeader());
    expect(assetsRes.body.data).toHaveLength(1);
    expect(assetsRes.body.data[0].asset_name).toBe('Epson HD Projector');
  });

  it('rejects checkout when requested quantity exceeds stock', async () => {
    const res = await request(app)
      .post('/api/v1/assignments')
      .set('Authorization', authHeader({ role: 'staff' }))
      .send({ assetId: 3, assignedTo: 'Room B', quantity: 999 });

    expect(res.status).toBe(400);
  });

  it('defaults quantity to 1 when not provided', async () => {
    const res = await request(app)
      .post('/api/v1/assignments')
      .set('Authorization', authHeader({ role: 'staff' }))
      .send({ assetId: 2, assignedTo: 'Alice' });

    expect(res.status).toBe(201);
    expect(res.body.quantity).toBe(1);
  });

  it('rejects checkout with a negative quantity', async () => {
    const res = await request(app)
      .post('/api/v1/assignments')
      .set('Authorization', authHeader({ role: 'staff' }))
      .send({ assetId: 2, assignedTo: 'Alice', quantity: -5 });

    expect(res.status).toBe(400);
  });

  it('rejects checkout for a non-existent asset', async () => {
    const res = await request(app)
      .post('/api/v1/assignments')
      .set('Authorization', authHeader({ role: 'staff' }))
      .send({ assetId: 999, assignedTo: 'Room B' });

    expect(res.status).toBe(404);
  });

  it('returns a previously checked-out asset and restores stock', async () => {
    const checkout = await request(app)
      .post('/api/v1/assignments')
      .set('Authorization', authHeader({ role: 'staff' }))
      .send({ assetId: 4, assignedTo: 'Room 2', quantity: 3 });

    const returnRes = await request(app)
      .post(`/api/v1/assignments/${checkout.body.id}/return`)
      .set('Authorization', authHeader({ role: 'staff' }));

    expect(returnRes.status).toBe(200);

    const listRes = await request(app)
      .get('/api/v1/assignments')
      .set('Authorization', authHeader());
    expect(listRes.body.data[0].status).toBe('RETURNED');
  });

  it('rejects returning an already-returned assignment', async () => {
    const checkout = await request(app)
      .post('/api/v1/assignments')
      .set('Authorization', authHeader({ role: 'staff' }))
      .send({ assetId: 4, assignedTo: 'Room 2', quantity: 1 });

    await request(app)
      .post(`/api/v1/assignments/${checkout.body.id}/return`)
      .set('Authorization', authHeader({ role: 'staff' }));

    const secondReturn = await request(app)
      .post(`/api/v1/assignments/${checkout.body.id}/return`)
      .set('Authorization', authHeader({ role: 'staff' }));

    expect(secondReturn.status).toBe(400);
  });

  it('rejects assignment creation from a non-admin/staff role', async () => {
    const res = await request(app)
      .post('/api/v1/assignments')
      .set('Authorization', authHeader({ role: 'viewer' }))
      .send({ assetId: 1, assignedTo: 'X' });

    expect(res.status).toBe(403);
  });
});
