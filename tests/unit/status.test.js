import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { createFakeDb } from '../mocks/fakeDb.js';

const fakeDb = createFakeDb();
vi.mock('../../config/db.js', () => ({ default: fakeDb }));

const { default: apiRouter } = await import('../../routes/index.js');
const { buildTestApp } = await import('../helpers/testApp.js');

const app = buildTestApp('/api/v1', apiRouter);

beforeEach(() => {
  fakeDb.__reset();
});

describe('GET /api/v1/status', () => {
  it('reports Online with a Connected database when the db responds', async () => {
    const res = await request(app).get('/api/v1/status');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('Online');
    expect(res.body.database).toBe('Connected');
    expect(res.body.timestamp).toBeTruthy();
  });

  it('still reports Online but Disconnected database when db.raw throws', async () => {
    const original = fakeDb.raw;
    fakeDb.raw = vi.fn().mockRejectedValue(new Error('connection refused'));

    const res = await request(app).get('/api/v1/status');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('Online');
    expect(res.body.database).toBe('Disconnected');

    fakeDb.raw = original;
  });

  it('returns a 404 AppError for unknown routes', async () => {
    const res = await request(app).get('/api/v1/does-not-exist');

    expect(res.status).toBe(404);
    expect(res.body.message).toContain('was not found on this server');
  });
});
