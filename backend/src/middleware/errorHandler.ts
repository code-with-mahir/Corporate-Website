import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

interface ErrorResponse {
  success: false;
  message: string;
  errors?: any[];
  stack?: string;
}

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
  });

  const response: ErrorResponse = {
    success: false,
    message: 'Internal server error',
  };

  if (err instanceof ZodError) {
    response.message = 'Validation error';
    response.errors = err.errors.map((error) => ({
      field: error.path.join('.'),
      message: error.message,
    }));
    res.status(400).json(response);
    return;
  }

  if (err.name === 'JsonWebTokenError') {
    response.message = 'Invalid token';
    res.status(401).json(response);
    return;
  }

  if (err.name === 'TokenExpiredError') {
    response.message = 'Token expired';
    res.status(401).json(response);
    return;
  }

  if (err.code === '23505') {
    response.message = 'Duplicate entry. Resource already exists.';
    res.status(409).json(response);
    return;
  }

  if (err.code === '23503') {
    response.message = 'Referenced resource does not exist.';
    res.status(400).json(response);
    return;
  }

  if (err.code === '23502') {
    response.message = 'Required field missing.';
    res.status(400).json(response);
    return;
  }

  if (err.code && err.code.startsWith('23')) {
    response.message = 'Database constraint violation.';
    res.status(400).json(response);
    return;
  }

  if (err.name === 'QueryFailedError' || err.code) {
    response.message = 'Database operation failed.';
    res.status(500).json(response);
    return;
  }

  if (err.status) {
    response.message = err.message || 'Request failed';
    res.status(err.status).json(response);
    return;
  }

  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
    response.message = err.message || 'Internal server error';
  }

  res.status(err.statusCode || 500).json(response);
};
