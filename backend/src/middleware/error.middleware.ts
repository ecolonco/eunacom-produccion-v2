import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  isOperational?: boolean;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Set default error values
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let code = err.code || 'INTERNAL_ERROR';

  // Log error
  logger.error(`Error ${statusCode}: ${message}`, {
    error: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
    code = 'VALIDATION_ERROR';
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
    code = 'INVALID_TOKEN';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
    code = 'TOKEN_EXPIRED';
  } else if (err.name === 'PrismaClientKnownRequestError') {
    // Handle Prisma errors
    statusCode = 400;
    message = 'Database operation failed';
    code = 'DATABASE_ERROR';
  }

  // Send error response
  const response: any = {
    success: false,
    error: {
      code,
      message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  };

  res.status(statusCode).json(response);
};

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export const createError = (
  message: string,
  statusCode: number = 500,
  code?: string
): AppError => {
  const error: AppError = new Error(message);
  error.statusCode = statusCode;
  error.code = code || 'GENERIC_ERROR';
  error.isOperational = true;
  return error;
};