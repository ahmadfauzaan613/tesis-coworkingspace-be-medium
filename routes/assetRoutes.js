import express from 'express';
import { assetController } from '../controllers/assetController.js';
import { authenticateToken, authorizeRoles } from '../middlewares/authMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();

// Apply auth protection for all asset endpoints
router.use(authenticateToken);

/**
 * @openapi
 * /api/assets:
 *   get:
 *     summary: List coworking space inventory assets with filters
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: lowStock
 *         schema:
 *           type: string
 *           enum: [true, false]
 *     responses:
 *       200:
 *         description: List of filtered assets
 */
router.get('/', asyncHandler(assetController.getAll));

/**
 * @openapi
 * /api/assets/export:
 *   get:
 *     summary: Export all asset inventory items as a CSV file
 *     responses:
 *       200:
 *         description: CSV file streamed
 */
router.get('/export', asyncHandler(assetController.exportCSV));

/**
 * @openapi
 * /api/assets/history:
 *   get:
 *     summary: Get global stock logs history audit trail
 *     responses:
 *       200:
 *         description: List of audit records
 */
router.get('/history', asyncHandler(assetController.getGlobalHistory));

/**
 * @openapi
 * /api/assets/{id}/history:
 *   get:
 *     summary: Get stock logs history audit trail for specific asset
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 */
router.get('/:id/history', asyncHandler(assetController.getAssetHistory));

/**
 * @openapi
 * /api/assets:
 *   post:
 *     summary: Create inventory asset item
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - categoryId
 *               - name
 *             properties:
 *               categoryId:
 *                 type: integer
 *               name:
 *                 type: string
 *               sku:
 *                 type: string
 *               description:
 *                 type: string
 *               initialStock:
 *                 type: integer
 *               location:
 *                 type: string
 *               status:
 *                 type: string
 */
router.post('/', authorizeRoles('admin'), asyncHandler(assetController.create));

/**
 * @openapi
 * /api/assets/{id}:
 *   put:
 *     summary: Update basic asset details (excluding stock)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 */
router.put('/:id', authorizeRoles('admin'), asyncHandler(assetController.update));

/**
 * @openapi
 * /api/assets/{id}/stock:
 *   post:
 *     summary: Adjust stock inventory for an asset
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
 *             required:
 *               - changeQty
 *               - changeType
 *             properties:
 *               changeQty:
 *                 type: integer
 *               changeType:
 *                 type: string
 *                 enum: [ADDITION, DEDUCTION, DAMAGE, AUDIT]
 *               remarks:
 *                 type: string
 */
router.post('/:id/stock', authorizeRoles('admin', 'staff'), asyncHandler(assetController.adjustStock));

/**
 * @openapi
 * /api/assets/{id}:
 *   delete:
 *     summary: Delete asset item
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 */
router.delete('/:id', authorizeRoles('admin'), asyncHandler(assetController.delete));

export default router;
