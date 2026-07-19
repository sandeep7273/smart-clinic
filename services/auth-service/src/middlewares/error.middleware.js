/**
 * Error Handling Middleware
 * Centralized error handling for the application
 */

function getLogger() {
  // Require logger at runtime so tests can mock the module before use.
  // This prevents the logger implementation from being captured at module
  // initialization time which can interfere with jest mocks.
  // eslint-disable-next-line global-require
  return require('../utils/logger.util');
}
function getConfig() {
  // Require config at runtime so tests can mock the module before use.
  // eslint-disable-next-line global-require
  return require('../config/env');
}

/**
 * Custom API Error class
 */
class APIError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    Error.captureStackTrace(this, this.constructor);
    // Ensure stack's heading contains the custom error name for tests that
    // assert on the stack trace contents.
    try {
      const rest = this.stack ? this.stack.split('\n').slice(1).join('\n') : '';
      this.stack = `${this.constructor.name}: ${this.message}` + (rest ? `\n${rest}` : '');
    } catch (e) {
      // ignore
    }
  }
}

/**
 * Not Found Error Handler
 * Handles 404 errors for undefined routes
 */
function notFoundHandler(req, res, next) {
  const error = new APIError(`Route ${req.originalUrl} not found`, 404);
  next(error);
}

/**
 * Global Error Handler
 * Catches all errors and sends appropriate response
 */
function errorHandler(err, req, res, next) {
  let error = { ...err };
  error.message = err.message;
  error.statusCode = err.statusCode || 500;

  // Log error (require logger at runtime so test mocks are respected)
  try {
    const logger = getLogger();
    logger.error('Error occurred:', {
      message: err.message,
      statusCode: error.statusCode,
      stack: err.stack,
      path: req.path,
      method: req.method,
    });
  } catch (e) {
    // If logger is unavailable, silently continue to allow tests to assert
    // response behavior without depending on logger side-effects.
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    error.message = `${field} already exists`;
    error.statusCode = 400;
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e) => e.message);
    error.message = errors.join(', ');
    error.statusCode = 400;
  }

  // Mongoose cast error
  if (err.name === 'CastError') {
    error.message = 'Invalid ID format';
    error.statusCode = 400;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error.message = 'Invalid token';
    error.statusCode = 401;
  }

  if (err.name === 'TokenExpiredError') {
    error.message = 'Token expired';
    error.statusCode = 401;
  }

  // Determine whether to include stack trace (use runtime config if available)
  const includeStack = (typeof getConfig === 'function' && getConfig().isDevelopment)
    ? getConfig().isDevelopment()
    : process.env.NODE_ENV === 'development';

  // Send error response
  res.status(error.statusCode).json({
    success: false,
    message: error.message || 'Internal server error',
    ...(includeStack && { stack: err.stack }),
  });
}

/**
 * Async error wrapper
 * Wraps async route handlers to catch errors
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    try {
      const result = fn(req, res, next);
      if (result && typeof result.then === 'function') {
        return result.catch(next);
      }
      return Promise.resolve(result);
    } catch (err) {
      next(err);
      return Promise.resolve();
    }
  };
}

module.exports = {
  APIError,
  notFoundHandler,
  errorHandler,
  asyncHandler,
};
