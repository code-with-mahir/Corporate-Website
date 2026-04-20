import { ApiResponse } from '../types/api';

export const successResponse = <T = any>(
  data?: T,
  message: string = 'Success'
): ApiResponse<T> => {
  return {
    success: true,
    message,
    data,
  };
};

export const errorResponse = (
  message: string = 'An error occurred',
  error?: string | object
): ApiResponse => {
  return {
    success: false,
    message,
    error,
  };
};

export const validationErrorResponse = (errors: object): ApiResponse => {
  return {
    success: false,
    message: 'Validation failed',
    error: errors,
  };
};

export const unauthorizedResponse = (message: string = 'Unauthorized'): ApiResponse => {
  return {
    success: false,
    message,
    error: 'Authentication required',
  };
};

export const forbiddenResponse = (message: string = 'Forbidden'): ApiResponse => {
  return {
    success: false,
    message,
    error: 'Insufficient permissions',
  };
};

export const notFoundResponse = (resource: string = 'Resource'): ApiResponse => {
  return {
    success: false,
    message: `${resource} not found`,
    error: 'NOT_FOUND',
  };
};
