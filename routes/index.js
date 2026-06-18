import express from 'express';
import authRoutes from './authRoutes.js';
import categoryRoutes from './categoryRoutes.js';
import assetRoutes from './assetRoutes.js';
import { dashboardController } from '../controllers/dashboardController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import db from '../config/db.js';

const router = express.Router();

// 1. Public endpoint to check system status
router.get('/status', asyncHandler(async (req, res) => {
  try {
    await db.raw('SELECT 1');
    res.json({
      status: 'Online',
      database: 'Connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.json({
      status: 'Online',
      database: 'Disconnected',
      timestamp: new Date().toISOString()
    });
  }
}));

// 2. Protected Dashboard Analytics Stats Panel
/**
 * @openapi
 * /api/dashboard/stats:
 *   get:
 *     summary: Retrieve aggregate inventory metrics for stats panel dashboard
 *     responses:
 *       200:
 *         description: Object containing counts and recent log items
 */
router.get('/dashboard/stats', authenticateToken, asyncHandler(dashboardController.getStats));

// 3. Mount Sub-Routers
router.use('/auth', authRoutes);
router.use('/categories', categoryRoutes);
router.use('/assets', assetRoutes);

export default router;
