import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { createFakeDb } from '../mocks/fakeDb.js';

const fakeDb = createFakeDb();
vi.mock('../../config/db.js', () => ({ default: fakeDb }));

const { dashboardController } = await import('../../controllers/dashboardController.js');
const { authenticateToken } = await import('../../middlewares/authMiddleware.js');
const { asyncHandler } = await import('../../utils/asyncHandler.js');
const { errorHandler } = await import('../../middlewares/errorMiddleware.js');
const { authHeader } = await import('../helpers/auth.js');

const app = express();
app.use(express.json());
app.get('/api/v1/dashboard/stats', authenticateToken, asyncHandler(dashboardController.getStats));
app.use(errorHandler);

beforeEach(() => {
  fakeDb.__reset();
});

describe('Dashboard stats', () => {
  it('requires authentication', async () => {
    const res = await request(app).get('/api/v1/dashboard/stats');
    expect(res.status).toBe(401);
  });

  it('summarizes dummy inventory data stored in the fake db', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard/stats')
      .set('Authorization', authHeader());

    expect(res.status).toBe(200);
    expect(res.body.totalAssets).toBe(4);
    expect(res.body.totalCategories).toBe(3);
    expect(res.body.outOfStock).toBe(0);
    expect(res.body.lowStockCount).toBe(1); // only the Projector has 0 < stock < 5
    expect(res.body.lowStockAlerts.map((a) => a.sku)).toEqual(['ELC-PRJ-001']);
    expect(res.body.categoryBreakdown).toEqual(
      expect.arrayContaining([
        { category: 'Furniture', uniqueItems: 2, totalStock: 75 },
      ]),
    );
    expect(res.body.recentActivities.length).toBeGreaterThan(0);
  });

  it('reflects newly-adjusted stock dynamically (no db refresh needed)', async () => {
    await fakeDb('assets').where('id', 3).update({ stock: 0 });
    // stock_history insert to mirror what the controller does when adjusting stock
    await fakeDb('stock_history').insert({
      asset_id: 3,
      change_qty: -3,
      change_type: 'DEDUCTION',
      remarks: 'Test drain',
      admin_id: 1,
    });

    const res = await request(app)
      .get('/api/v1/dashboard/stats')
      .set('Authorization', authHeader());

    expect(res.body.outOfStock).toBe(1);
  });
});
