import express from 'express';
import authRoutes from './authRoutes.js';
import categoryRoutes from './categoryRoutes.js';
import assetRoutes from './assetRoutes.js';
import assignmentRoutes from './assignmentRoutes.js';
import maintenanceRoutes from './maintenanceRoutes.js';
import { dashboardController } from '../controllers/dashboardController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import db from '../config/db.js';

const router = express.Router();

/**
 * @openapi
 * /api/v1/status:
 *   get:
 *     summary: Retrieve status of backend and DB connection
 *     tags:
 *       - System
 *     responses:
 *       200:
 *         description: OK
 */
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

/**
 * @openapi
 * /api/v1/dashboard/stats:
 *   get:
 *     summary: Retrieve aggregate inventory metrics for stats panel dashboard
 *     tags:
 *       - Dashboard
 *     responses:
 *       200:
 *         description: Object containing counts and recent log items
 */
router.get('/dashboard/stats', authenticateToken, asyncHandler(dashboardController.getStats));

// Mount Sub-Routers
router.use('/auth', authRoutes);
router.use('/categories', categoryRoutes);
router.use('/assets', assetRoutes);
router.use('/assignments', assignmentRoutes);
router.use('/maintenance', maintenanceRoutes);

export default router;
