import jwt from 'jsonwebtoken';
import { AppError } from '../utils/AppError.js';

export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Expecting "Bearer <token>"

  if (!token) {
    return next(new AppError('Access token required. Please authenticate.', 401));
  }

  const JWT_SECRET = process.env.JWT_SECRET || 'cospace_inventory_admin_secret_key_2026';

  try {
    const user = jwt.verify(token, JWT_SECRET);
    req.user = user;
    next();
  } catch (err) {
    return next(new AppError('Token is invalid or expired. Please login again.', 403));
  }
}

export function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('User authentication context is missing.', 401));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError('Access forbidden: Insufficient privileges.', 403));
    }

    next();
  };
}
