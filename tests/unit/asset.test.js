import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { createFakeDb } from '../mocks/fakeDb.js';

const fakeDb = createFakeDb();
vi.mock('../../config/db.js', () => ({ default: fakeDb }));

const { default: assetRoutes } = await import('../../routes/assetRoutes.js');
const { buildTestApp } = await import('../helpers/testApp.js');
const { authHeader } = await import('../helpers/auth.js');

const app = buildTestApp('/api/v1/assets', assetRoutes);

beforeEach(() => {
  fakeDb.__reset();
});

describe('Asset routes', () => {
  it('lists seeded dummy assets joined with category name', async () => {
    const res = await request(app)
      .get('/api/v1/assets')
      .set('Authorization', authHeader());

    expect(res.status).toBe(200);
    expect(res.body.pagination.totalItems).toBe(4);
    const projector = res.body.data.find((a) => a.sku === 'ELC-PRJ-001');
    expect(projector.category_name).toBe('Electronics');
  });

  it('filters by search term across name/sku', async () => {
    const res = await request(app)
      .get('/api/v1/assets?search=projector')
      .set('Authorization', authHeader());

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe('Epson HD Projector');
  });

  it('filters low-stock assets (< 5)', async () => {
    const res = await request(app)
      .get('/api/v1/assets?lowStock=true')
      .set('Authorization', authHeader());

    expect(res.status).toBe(200);
    expect(res.body.data.every((a) => a.stock < 5)).toBe(true);
    expect(res.body.data.map((a) => a.sku)).toEqual(['ELC-PRJ-001']);
  });

  it('filters by categoryId', async () => {
    const res = await request(app)
      .get('/api/v1/assets?categoryId=1')
      .set('Authorization', authHeader());

    expect(res.body.data).toHaveLength(2);
  });

  it('filters by status', async () => {
    await request(app)
      .put('/api/v1/assets/4')
      .set('Authorization', authHeader())
      .send({ categoryId: 3, name: 'Daikin AC Split 1.5 PK', sku: 'HVC-AC-001', status: 'Broken' });

    const res = await request(app)
      .get('/api/v1/assets?status=Broken')
      .set('Authorization', authHeader());

    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].sku).toBe('HVC-AC-001');
  });

  it('creates a new asset with an initial stock_history record, then reflects it in later reads', async () => {
    const createRes = await request(app)
      .post('/api/v1/assets')
      .set('Authorization', authHeader())
      .send({ categoryId: 2, name: 'Wireless Mic Set', sku: 'ELC-MIC-010', initialStock: 10, location: 'Storage' });

    expect(createRes.status).toBe(201);
    expect(createRes.body.stock).toBe(10);

    const historyRes = await request(app)
      .get(`/api/v1/assets/${createRes.body.id}/history`)
      .set('Authorization', authHeader());

    expect(historyRes.body.data).toHaveLength(1);
    expect(historyRes.body.data[0].change_type).toBe('INITIAL');

    const listRes = await request(app)
      .get('/api/v1/assets?limit=50')
      .set('Authorization', authHeader());

    expect(listRes.body.data.some((a) => a.sku === 'ELC-MIC-010')).toBe(true);
  });

  it('rejects asset creation for an unknown category', async () => {
    const res = await request(app)
      .post('/api/v1/assets')
      .set('Authorization', authHeader())
      .send({ categoryId: 999, name: 'Ghost Item' });

    expect(res.status).toBe(404);
  });

  it('rejects asset creation from a staff role (admin only)', async () => {
    const res = await request(app)
      .post('/api/v1/assets')
      .set('Authorization', authHeader({ role: 'staff' }))
      .send({ categoryId: 1, name: 'Chair' });

    expect(res.status).toBe(403);
  });

  it('adjusts stock upward and records history, allowed for staff role', async () => {
    const res = await request(app)
      .post('/api/v1/assets/3/stock')
      .set('Authorization', authHeader({ role: 'staff' }))
      .send({ changeQty: 5, changeType: 'ADDITION', remarks: 'Restock' });

    expect(res.status).toBe(200);

    const listRes = await request(app)
      .get('/api/v1/assets?search=Projector')
      .set('Authorization', authHeader());

    expect(listRes.body.data[0].stock).toBe(8);
  });

  it('rejects stock adjustment that would drop stock below zero', async () => {
    const res = await request(app)
      .post('/api/v1/assets/3/stock')
      .set('Authorization', authHeader())
      .send({ changeQty: -100, changeType: 'DEDUCTION' });

    expect(res.status).toBe(400);
  });

  it('rejects an invalid changeType', async () => {
    const res = await request(app)
      .post('/api/v1/assets/3/stock')
      .set('Authorization', authHeader())
      .send({ changeQty: 1, changeType: 'BOGUS' });

    expect(res.status).toBe(400);
  });

  it('updates asset details', async () => {
    const res = await request(app)
      .put('/api/v1/assets/1')
      .set('Authorization', authHeader())
      .send({ categoryId: 1, name: 'Ergonomic Mesh Chair v2', sku: 'FUR-CHR-001', status: 'Available' });

    expect(res.status).toBe(200);
    expect(res.body.asset.name).toBe('Ergonomic Mesh Chair v2');
  });

  it('returns 404 when updating a non-existent asset', async () => {
    const res = await request(app)
      .put('/api/v1/assets/999')
      .set('Authorization', authHeader())
      .send({ categoryId: 1, name: 'Ghost' });

    expect(res.status).toBe(404);
  });

  it('deletes an asset', async () => {
    const res = await request(app)
      .delete('/api/v1/assets/4')
      .set('Authorization', authHeader());

    expect(res.status).toBe(200);

    const listRes = await request(app)
      .get('/api/v1/assets?limit=50')
      .set('Authorization', authHeader());
    expect(listRes.body.data.some((a) => a.id === 4)).toBe(false);
  });

  it('exports assets as CSV', async () => {
    const res = await request(app)
      .get('/api/v1/assets/export')
      .set('Authorization', authHeader());

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.text).toContain('ID,Asset Name,SKU,Category,Location,Stock Level,Status,Created At');
    expect(res.text).toContain('FUR-CHR-001');
  });

  it('returns global stock history across assets', async () => {
    const res = await request(app)
      .get('/api/v1/assets/history')
      .set('Authorization', authHeader());

    expect(res.status).toBe(200);
    expect(res.body.pagination.totalItems).toBe(4);
    expect(res.body.data[0].admin_username).toBe('admin');
  });
});
