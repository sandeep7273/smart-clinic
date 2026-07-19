/**
 * Custom Error Classes
 * Operational errors for API Gateway
 */

/**
 * Base Application Error
 */
class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation Error - 400
 */
class ValidationError extends AppError {
  constructor(message = 'Validation failed', details = null) {
    super(message, 400);
    this.details = details;
  }
}

/**
 * Authentication Error - 401
 */
class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401);
  }
}

/**
 * Authorization Error - 403
 */
class AuthorizationError extends AppError {
  constructor(message = 'Access forbidden') {
    super(message, 403);
  }
}

/**
 * Not Found Error - 404
 */
class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
  }
}

/**
 * Service Unavailable Error - 503
 */
class ServiceUnavailableError extends AppError {
  constructor(service = 'Service', message = null) {
    super(message || `${service} is currently unavailable`, 503);
    this.service = service;
  }
}

/**
 * Timeout Error - 504
 */
class TimeoutError extends AppError {
  constructor(service = 'Service', message = null) {
    super(message || `Request to ${service} timed out`, 504);
    this.service = service;
  }
}

/**
 * Circuit Breaker Open Error - 503
 */
class CircuitBreakerOpenError extends AppError {
  constructor(service = 'Service') {
    super(`Circuit breaker is open for ${service}`, 503);
    this.service = service;
    this.code = 'CIRCUIT_BREAKER_OPEN';
  }
}

/**
 * Rate Limit Exceeded Error - 429
 */
class RateLimitError extends AppError {
  constructor(message = 'Too many requests, please try again later') {
    super(message, 429);
  }
}

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ServiceUnavailableError,
  TimeoutError,
  CircuitBreakerOpenError,
  RateLimitError,
};
