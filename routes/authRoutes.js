import express from 'express';
import { authController } from '../controllers/authController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: Administrator Login
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful, returns token
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', asyncHandler(authController.login));

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     summary: Get logged-in Admin credentials info
 *     responses:
 *       200:
 *         description: Returns administrator identity profile
 */
router.get('/me', authenticateToken, asyncHandler(authController.getMe));

export default router;
