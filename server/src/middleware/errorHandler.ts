// =============================================================================
// server/src/middleware/errorHandler.ts
// Global Express error handler – catches all thrown errors
// =============================================================================

import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger.js';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Zod validation errors
  if (err instanceof ZodError) {
    res.status(422).json({
      error: 'Validation error',
      details: err.flatten().fieldErrors,
    });
    return;
  }

  const statusCode = err.statusCode ?? 500;
  const isOperational = err.isOperational ?? false;

  if (!isOperational) {
    logger.error('Unhandled error', {
      message: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
    });
  }

  res.status(statusCode).json({
    error: statusCode < 500 ? err.message : 'Internal server error',
    ...(process.env['NODE_ENV'] === 'development' && { stack: err.stack }),
  });
}

/** Factory for creating typed operational errors */
export function createError(message: string, statusCode: number): AppError {
  const err = new Error(message) as AppError;
  err.statusCode = statusCode;
  err.isOperational = true;
  return err;
}
