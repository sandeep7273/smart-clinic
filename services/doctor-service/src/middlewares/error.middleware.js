const logger = require('../utils/logger');
const {
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
} = require('../utils/errors');

/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
  });

  // Handle custom errors
  if (err instanceof ValidationError) {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: err.message,
      details: err.details,
    });
  }

  if (err instanceof NotFoundError) {
    return res.status(404).json({
      success: false,
      error: 'Not Found',
      message: err.message,
    });
  }

  if (err instanceof UnauthorizedError) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: err.message,
    });
  }

  if (err instanceof ForbiddenError) {
    return res.status(403).json({
      success: false,
      error: 'Forbidden',
      message: err.message,
    });
  }

  if (err instanceof ConflictError) {
    return res.status(409).json({
      success: false,
      error: 'Conflict',
      message: err.message,
    });
  }

  // Handle mongoose validation errors
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => ({
      field: e.path,
      message: e.message,
    }));
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: 'Invalid data provided',
      details: errors,
    });
  }

  // Handle mongoose duplicate key errors
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(409).json({
      success: false,
      error: 'Conflict',
      message: `${field} already exists`,
    });
  }

  // Default error
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' 
      ? 'Something went wrong' 
      : err.message,
  });
};

/**
 * 404 handler
 */
const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `Route ${req.method} ${req.url} not found`,
  });
};

module.exports = {
  errorHandler,
  notFoundHandler,
};
