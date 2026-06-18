import express from 'express';
import { categoryController } from '../controllers/categoryController.js';
import { authenticateToken, authorizeRoles } from '../middlewares/authMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();

// Apply auth protection for all category endpoints
router.use(authenticateToken);

/**
 * @openapi
 * /api/v1/categories:
 *   get:
 *     summary: Get all asset categories (Paginated)
 *     tags:
 *       - Categories
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
 *         description: Number of categories per page
 *     responses:
 *       200:
 *         description: List of categories with pagination metadata
 */
router.get('/', asyncHandler(categoryController.getAll));

/**
 * @openapi
 * /api/v1/categories:
 *   post:
 *     summary: Create new asset category
 *     tags:
 *       - Categories
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Created
 */
router.post('/', authorizeRoles('admin'), asyncHandler(categoryController.create));

/**
 * @openapi
 * /api/v1/categories/{id}:
 *   put:
 *     summary: Update asset category details
 *     tags:
 *       - Categories
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The category ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Category updated successfully
 */
router.put('/:id', authorizeRoles('admin'), asyncHandler(categoryController.update));

/**
 * @openapi
 * /api/v1/categories/{id}:
 *   delete:
 *     summary: Delete asset category
 *     tags:
 *       - Categories
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The category ID
 *     responses:
 *       200:
 *         description: Category deleted successfully
 */
router.delete('/:id', authorizeRoles('admin'), asyncHandler(categoryController.delete));

export default router;
