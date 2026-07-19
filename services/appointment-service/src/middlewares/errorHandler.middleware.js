/**
 * Error Handler Middleware
 * Centralized error handling
 */

const logger = require('../utils/logger');
const { AppError } = require('../utils/errors');

/**
 * Error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  // Log error
  logger.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    userId: req.user?.userId,
  });

  // Operational errors - send to client
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        message: err.message,
        code: err.name,
      },
    });
  }

  // Programming or unknown errors - don't leak details
  res.status(500).json({
    success: false,
    error: {
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
    },
  });
};

/**
 * 404 handler
 */
const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: 'Route not found',
      code: 'NOT_FOUND',
    },
  });
};

module.exports = {
  errorHandler,
  notFoundHandler,
};
