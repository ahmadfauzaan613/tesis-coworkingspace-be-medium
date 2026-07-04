import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createFakeDb } from '../mocks/fakeDb.js';

const fakeDb = createFakeDb();
vi.mock('../../config/db.js', () => ({ default: fakeDb }));

const { default: authRoutes } = await import('../../routes/authRoutes.js');
const { buildTestApp } = await import('../helpers/testApp.js');
const { authHeader } = await import('../helpers/auth.js');

const app = buildTestApp('/api/v1/auth', authRoutes);

beforeEach(() => {
  fakeDb.__reset();
});

describe('Auth routes', () => {
  it('logs in the seeded admin user and returns a usable token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'admin', password: 'admin' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user).toMatchObject({ username: 'admin', role: 'admin' });

    const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET);
    expect(decoded.username).toBe('admin');
  });

  it('logs in the seeded demo user', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'demo', password: 'demo' });

    expect(res.status).toBe(200);
    expect(res.body.user.username).toBe('demo');
  });

  it('logs in a regular dummy user stored in the db via bcrypt-checked password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'staffuser', password: 'staff123' });

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ username: 'staffuser', role: 'staff' });
  });

  it('rejects an unknown username', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'ghost', password: 'whatever' });

    expect(res.status).toBe(401);
  });

  it('rejects a wrong password for a real dummy user', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'staffuser', password: 'wrong-password' });

    expect(res.status).toBe(401);
  });

  it('returns the authenticated profile on /me', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', authHeader({ id: 3, username: 'staffuser', role: 'staff' }));

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ username: 'staffuser', role: 'staff' });
  });

  it('rejects /me without a token', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  it('rejects /me with a tampered token', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer not-a-real-token');

    expect(res.status).toBe(403);
  });

  it('rejects /me with an expired token', async () => {
    const expiredToken = jwt.sign(
      { id: 1, username: 'admin', role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: -10 },
    );

    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${expiredToken}`);

    expect(res.status).toBe(403);
    expect(res.body.message).toContain('invalid or expired');
  });

  it('rejects a malformed Authorization header (missing Bearer prefix)', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'not-even-bearer-formatted');

    expect(res.status).toBe(401);
  });

  it('getMe falls back to a synthetic profile for the admin/demo shortcut accounts', async () => {
    // Simulates a token minted before the corresponding row exists in the users table.
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', authHeader({ id: 999, username: 'admin', role: 'admin' }));

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: 999, username: 'admin', email: 'admin@coworking.com', role: 'admin' });
  });
});
