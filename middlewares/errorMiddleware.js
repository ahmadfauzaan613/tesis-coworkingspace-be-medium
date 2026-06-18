import { AppError } from '../utils/AppError.js';

export function errorHandler(err, req, res, next) {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Map PostgreSQL raw database error codes to clean AppError payloads
  
  // Unique Constraint Violation (e.g. duplicate SKU or Category Name)
  if (err.code === '23505') {
    err.statusCode = 400;
    err.status = 'fail';
    err.message = 'Database violation: Duplicate value entered. Record already exists.';
  }

  // Check Constraint Violation (e.g. stock goes below 0)
  if (err.code === '23514') {
    err.statusCode = 400;
    err.status = 'fail';
    err.message = 'Database violation: Stock level cannot be negative.';
  }

  // Foreign Key Constraint Violation (e.g. invalid categoryId)
  if (err.code === '23503') {
    err.statusCode = 404;
    err.status = 'fail';
    err.message = 'Database violation: Referenced parent relation record not found.';
  }

  // Logging real internal server errors for backend debugging
  if (err.statusCode === 500) {
    console.error('💥 INTERNAL ERROR:', err);
  }

  res.status(err.statusCode).json({
    status: err.status,
    message: err.message || 'An unexpected internal server error occurred.'
  });
}
