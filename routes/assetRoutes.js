import express from 'express';
import { assetController } from '../controllers/assetController.js';
import { authenticateToken, authorizeRoles } from '../middlewares/authMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();

// Apply auth protection for all asset endpoints
router.use(authenticateToken);

/**
 * @openapi
 * /api/v1/assets:
 *   get:
 *     summary: List coworking space inventory assets with filters (Paginated)
 *     tags:
 *       - Assets
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by asset name or SKU
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: integer
 *         description: Filter by category ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by equipment status (Available, Broken, etc.)
 *       - in: query
 *         name: lowStock
 *         schema:
 *           type: string
 *           enum: [true, false]
 *         description: Filter to only show low stock items (stock < 5)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of assets per page
 *     responses:
 *       200:
 *         description: List of filtered assets with pagination metadata
 */
router.get('/', asyncHandler(assetController.getAll));

/**
 * @openapi
 * /api/v1/assets/export:
 *   get:
 *     summary: Export all asset inventory items as a CSV file
 *     tags:
 *       - Assets
 *     responses:
 *       200:
 *         description: CSV file streamed
 */
router.get('/export', asyncHandler(assetController.exportCSV));

/**
 * @openapi
 * /api/v1/assets/history:
 *   get:
 *     summary: Get global stock logs history audit trail (Paginated)
 *     tags:
 *       - Assets
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of logs per page
 *     responses:
 *       200:
 *         description: List of audit records with pagination metadata
 */
router.get('/history', asyncHandler(assetController.getGlobalHistory));

/**
 * @openapi
 * /api/v1/assets/{id}/history:
 *   get:
 *     summary: Get stock logs history audit trail for specific asset (Paginated)
 *     tags:
 *       - Assets
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The asset ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of logs per page
 *     responses:
 *       200:
 *         description: List of specific asset logs with pagination metadata
 */
router.get('/:id/history', asyncHandler(assetController.getAssetHistory));

/**
 * @openapi
 * /api/v1/assets:
 *   post:
 *     summary: Create inventory asset item
 *     tags:
 *       - Assets
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
 *     responses:
 *       201:
 *         description: Created
 */
router.post('/', authorizeRoles('admin'), asyncHandler(assetController.create));

/**
 * @openapi
 * /api/v1/assets/{id}:
 *   put:
 *     summary: Update basic asset details (excluding stock)
 *     tags:
 *       - Assets
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The asset ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               categoryId:
 *                 type: integer
 *               name:
 *                 type: string
 *               sku:
 *                 type: string
 *               description:
 *                 type: string
 *               location:
 *                 type: string
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Asset updated successfully
 */
router.put('/:id', authorizeRoles('admin'), asyncHandler(assetController.update));

/**
 * @openapi
 * /api/v1/assets/{id}/stock:
 *   post:
 *     summary: Adjust stock inventory for an asset
 *     tags:
 *       - Assets
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The asset ID
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
 *     responses:
 *       200:
 *         description: Stock adjusted successfully
 */
router.post('/:id/stock', authorizeRoles('admin', 'staff'), asyncHandler(assetController.adjustStock));

/**
 * @openapi
 * /api/v1/assets/{id}:
 *   delete:
 *     summary: Delete asset item
 *     tags:
 *       - Assets
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The asset ID
 *     responses:
 *       200:
 *         description: Asset deleted successfully
 */
router.delete('/:id', authorizeRoles('admin'), asyncHandler(assetController.delete));

export default router;
