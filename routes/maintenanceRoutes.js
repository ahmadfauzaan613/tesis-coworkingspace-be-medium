import express from 'express';
import { maintenanceController } from '../controllers/maintenanceController.js';
import { authenticateToken, authorizeRoles } from '../middlewares/authMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();

router.use(authenticateToken);

/**
 * @openapi
 * /api/v1/maintenance:
 *   get:
 *     summary: Get all maintenance tickets (Paginated)
 *     tags:
 *       - Maintenance
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, IN_PROGRESS, RESOLVED]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: List of tickets with pagination metadata
 */
router.get('/', asyncHandler(maintenanceController.getAll));

/**
 * @openapi
 * /api/v1/maintenance:
 *   post:
 *     summary: Create new maintenance repair ticket for an asset
 *     tags:
 *       - Maintenance
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - assetId
 *               - issueDescription
 *             properties:
 *               assetId:
 *                 type: integer
 *               issueDescription:
 *                 type: string
 *               assetStatus:
 *                 type: string
 *                 enum: [Broken, Maintenance]
 *                 description: Set asset status to this value if provided
 *     responses:
 *       201:
 *         description: Created
 */
router.post('/', authorizeRoles('admin', 'staff'), asyncHandler(maintenanceController.create));

/**
 * @openapi
 * /api/v1/maintenance/{id}/resolve:
 *   post:
 *     summary: Resolve maintenance ticket and record repair costs
 *     tags:
 *       - Maintenance
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               repairCost:
 *                 type: integer
 *                 default: 0
 *               vendorName:
 *                 type: string
 *               restoreAssetStatus:
 *                 type: boolean
 *                 default: true
 *                 description: Restores asset status to Available if true
 *     responses:
 *       200:
 *         description: Resolved successfully
 */
router.post('/:id/resolve', authorizeRoles('admin'), asyncHandler(maintenanceController.resolveTicket));

export default router;
