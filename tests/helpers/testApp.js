import express from 'express';
import { errorHandler } from '../../middlewares/errorMiddleware.js';
import { AppError } from '../../utils/AppError.js';

export function buildTestApp(mountPath, router) {
  const app = express();
  app.use(express.json());
  app.use(mountPath, router);
  app.use((req, res, next) => {
    next(new AppError(`Requested URL (${req.originalUrl}) was not found on this server.`, 404));
  });
  app.use(errorHandler);
  return app;
}
