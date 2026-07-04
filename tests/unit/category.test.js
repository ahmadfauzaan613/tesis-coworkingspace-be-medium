import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { createFakeDb } from '../mocks/fakeDb.js';

const fakeDb = createFakeDb();
vi.mock('../../config/db.js', () => ({ default: fakeDb }));

const { default: categoryRoutes } = await import('../../routes/categoryRoutes.js');
const { buildTestApp } = await import('../helpers/testApp.js');
const { authHeader } = await import('../helpers/auth.js');

const app = buildTestApp('/api/v1/categories', categoryRoutes);

beforeEach(() => {
  fakeDb.__reset();
});

describe('Category routes', () => {
  it('rejects requests without a token', async () => {
    const res = await request(app).get('/api/v1/categories');
    expect(res.status).toBe(401);
  });

  it('lists seeded dummy categories with pagination metadata', async () => {
    const res = await request(app)
      .get('/api/v1/categories')
      .set('Authorization', authHeader());

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(3);
    expect(res.body.data.map((c) => c.name)).toEqual(['Electronics', 'Furniture', 'HVAC']);
    expect(res.body.pagination.totalItems).toBe(3);
  });

  it('paginates using page/limit query params', async () => {
    const res = await request(app)
      .get('/api/v1/categories?page=2&limit=1')
      .set('Authorization', authHeader());

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.pagination.currentPage).toBe(2);
    expect(res.body.pagination.totalPages).toBe(3);
  });

  it('creates a category and makes it show up in a later listing (dynamic, not a DB refresh)', async () => {
    const createRes = await request(app)
      .post('/api/v1/categories')
      .set('Authorization', authHeader())
      .send({ name: 'Kitchen', description: 'Coffee machines and fridges' });

    expect(createRes.status).toBe(201);
    expect(createRes.body).toMatchObject({ name: 'Kitchen', description: 'Coffee machines and fridges' });

    const listRes = await request(app)
      .get('/api/v1/categories?limit=50')
      .set('Authorization', authHeader());

    expect(listRes.body.data.some((c) => c.name === 'Kitchen')).toBe(true);
    expect(listRes.body.pagination.totalItems).toBe(4);
  });

  it('rejects category creation without a name', async () => {
    const res = await request(app)
      .post('/api/v1/categories')
      .set('Authorization', authHeader())
      .send({ description: 'no name here' });

    expect(res.status).toBe(400);
  });

  it('rejects category creation from a non-admin role', async () => {
    const res = await request(app)
      .post('/api/v1/categories')
      .set('Authorization', authHeader({ role: 'staff' }))
      .send({ name: 'Kitchen' });

    expect(res.status).toBe(403);
  });

  it('updates an existing category', async () => {
    const res = await request(app)
      .put('/api/v1/categories/1')
      .set('Authorization', authHeader())
      .send({ name: 'Furniture Updated', description: 'Updated desc' });

    expect(res.status).toBe(200);
    expect(res.body.category.name).toBe('Furniture Updated');
  });

  it('rejects category update without a name', async () => {
    const res = await request(app)
      .put('/api/v1/categories/1')
      .set('Authorization', authHeader())
      .send({ description: 'still no name' });

    expect(res.status).toBe(400);
  });

  it('returns 404 when updating a non-existent category', async () => {
    const res = await request(app)
      .put('/api/v1/categories/999')
      .set('Authorization', authHeader())
      .send({ name: 'Ghost' });

    expect(res.status).toBe(404);
  });

  it('refuses to delete a category that still has assets attached', async () => {
    const res = await request(app)
      .delete('/api/v1/categories/1')
      .set('Authorization', authHeader());

    expect(res.status).toBe(400);
  });

  it('deletes a category with no associated assets', async () => {
    const created = await request(app)
      .post('/api/v1/categories')
      .set('Authorization', authHeader())
      .send({ name: 'Empty Category' });

    const res = await request(app)
      .delete(`/api/v1/categories/${created.body.id}`)
      .set('Authorization', authHeader());

    expect(res.status).toBe(200);
  });
});
