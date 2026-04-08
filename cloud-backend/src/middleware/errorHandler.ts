import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  isOperational?: boolean;
}

export function createError(message: string, statusCode: number = 500, code?: string): AppError {
  const error = new Error(message) as AppError;
  error.statusCode = statusCode;
  error.code = code;
  error.isOperational = true;
  return error;
}

export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';

  // Log unexpected errors
  if (!err.isOperational && process.env.NODE_ENV !== 'test') {
    console.error('[error]', err);
  }

  const response: {
    error: string;
    code: string;
    requestId?: string;
    details?: unknown;
  } = {
    error: err.message || 'Internal server error',
    code,
  };

  if (process.env.NODE_ENV === 'development') {
    response.details = err.stack;
  }

  res.status(statusCode).json(response);
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({
    error: 'Resource not found',
    code: 'NOT_FOUND',
  });
}
