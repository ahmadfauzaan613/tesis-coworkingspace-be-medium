import express from 'express';
import { assignmentController } from '../controllers/assignmentController.js';
import { authenticateToken, authorizeRoles } from '../middlewares/authMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();

router.use(authenticateToken);

/**
 * @openapi
 * /api/v1/assignments:
 *   get:
 *     summary: Get all asset assignments (Paginated)
 *     tags:
 *       - Assignments
 *     parameters:
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
 *         description: List of assignments with pagination metadata
 */
router.get('/', asyncHandler(assignmentController.getAll));

/**
 * @openapi
 * /api/v1/assignments:
 *   post:
 *     summary: Allocate asset to user or room (Checkout)
 *     tags:
 *       - Assignments
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - assetId
 *               - assignedTo
 *             properties:
 *               assetId:
 *                 type: integer
 *               assignedTo:
 *                 type: string
 *               quantity:
 *                 type: integer
 *                 default: 1
 *     responses:
 *       201:
 *         description: Created
 */
router.post('/', authorizeRoles('admin', 'staff'), asyncHandler(assignmentController.create));

/**
 * @openapi
 * /api/v1/assignments/{id}/return:
 *   post:
 *     summary: Return allocated asset (Checkin)
 *     tags:
 *       - Assignments
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Returned successfully
 */
router.post('/:id/return', authorizeRoles('admin', 'staff'), asyncHandler(assignmentController.returnAsset));

export default router;
