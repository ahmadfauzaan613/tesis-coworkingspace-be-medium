import express from 'express';
import { categoryController } from '../controllers/categoryController.js';
import { authenticateToken, authorizeRoles } from '../middlewares/authMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();

// Apply auth protection for all category endpoints
router.use(authenticateToken);

/**
 * @openapi
 * /api/categories:
 *   get:
 *     summary: Get all asset categories
 *     responses:
 *       200:
 *         description: List of categories
 */
router.get('/', asyncHandler(categoryController.getAll));

/**
 * @openapi
 * /api/categories:
 *   post:
 *     summary: Create new asset category
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

export default router;
