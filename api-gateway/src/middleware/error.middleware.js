/**
 * Error Handling Middleware
 * Centralized error handler for API Gateway
 */

const logger = require('../utils/logger');
const { AppError } = require('../utils/errors');
const config = require('../config');

/**
 * 404 Not Found handler
 * Must be registered after all routes
 */
function notFound(req, res, next) {
  const error = new AppError(`Route ${req.originalUrl} not found`, 404);
  next(error);
}

/**
 * Global error handler
 * Must be registered last in middleware chain
 */
function errorHandler(err, req, res, next) {
  // Log error with correlation ID
  logger.error('Error occurred', {
    correlationId: req.correlationId,
    error: err.message,
    stack: config.isDevelopment() ? err.stack : undefined,
    path: req.path,
    method: req.method,
    statusCode: err.statusCode,
    userId: req.user?.userId,
  });

  // Default error response
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let errors = null;

  // Handle operational errors (AppError instances)
  if (err.isOperational) {
    // These are expected errors, safe to expose
    statusCode = err.statusCode;
    message = err.message;

    // Include validation details if present
    if (err.details) {
      errors = err.details;
    }
  }
  // Handle GraphQL errors
  else if (err.extensions && err.extensions.code) {
    statusCode = err.extensions.code === 'UNAUTHENTICATED' ? 401 
               : err.extensions.code === 'FORBIDDEN' ? 403
               : err.extensions.code === 'BAD_USER_INPUT' ? 400
               : 500;
    message = err.message;
  }
  // Handle JWT errors
  else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }
  else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }
  // Handle Axios errors (from service calls)
  else if (err.isAxiosError) {
    statusCode = err.response?.status || 503;
    message = err.response?.data?.message || err.message || 'Service error';
  }
  // Programming or unknown errors
  else {
    // Don't leak error details in production
    if (config.isProduction()) {
      statusCode = 500;
      message = 'Internal server error';
    }
  }

  // Send error response
  const response = {
    success: false,
    error: {
      message,
      statusCode,
      correlationId: req.correlationId,
    },
  };

  // Add errors array if present
  if (errors) {
    response.error.errors = errors;
  }

  // Add stack trace in development
  if (config.isDevelopment() && err.stack) {
    response.error.stack = err.stack;
  }

  res.status(statusCode).json(response);
}

/**
 * Async error handler wrapper
 * Wraps async route handlers to catch promise rejections
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = {
  notFound,
  errorHandler,
  asyncHandler,
};
