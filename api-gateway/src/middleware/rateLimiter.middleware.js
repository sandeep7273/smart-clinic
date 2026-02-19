/**
 * Rate Limiting Middleware
 * Protects APIs from abuse with tiered rate limiting
 */

const config = require('../config');
const logger = require('../utils/logger');

// Resolve rateLimit at runtime so jest module mocks reliably intercept it
function getRateLimit() {
  // Use require here so tests that mock 'express-rate-limit' (jest.mock)
  // will have their mock used when this module is required during tests.
  // This avoids pitfalls with hoisting and module cache ordering.
  return require('express-rate-limit');
}

/**
 * General rate limiter for all API routes
 * 100 requests per 15 minutes
 */
const generalOptions = {
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    success: false,
    error: {
      message: 'Too many requests, please try again later.',
      statusCode: 429,
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      correlationId: req.correlationId,
      ip: req.ip,
      path: req.path,
      limit: config.rateLimit.maxRequests,
    });

    res.status(429).json({
      success: false,
      error: {
        message: 'Too many requests, please try again later.',
        statusCode: 429,
      },
    });
  },
  skip: (req) => {
    // Skip rate limiting for health check endpoints
    return req.path === '/health' || req.path === '/ready' || req.path === '/status';
  },
};

const generalRateLimiter = getRateLimit()(generalOptions);
// Expose options and handler for unit tests
generalRateLimiter.options = generalOptions;
generalRateLimiter.handler = generalOptions.handler;

/**
 * Stricter rate limiter for authentication routes
 * 5 requests per 15 minutes
 */
const authOptions = {
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.authMax,
  message: {
    success: false,
    error: {
      message: 'Too many authentication attempts. Please try again later.',
      statusCode: 429,
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
  handler: (req, res) => {
    logger.warn('Auth rate limit exceeded', {
      correlationId: req.correlationId,
      ip: req.ip,
      path: req.path,
      limit: config.rateLimit.authMax,
    });

    res.status(429).json({
      success: false,
      error: {
        message: 'Too many authentication attempts. Please try again later.',
        statusCode: 429,
      },
    });
  },
};

const authRateLimiter = getRateLimit()(authOptions);
authRateLimiter.options = authOptions;
authRateLimiter.handler = authOptions.handler;

/**
 * Rate limiter for GraphQL endpoint
 * 200 requests per 15 minutes (more permissive as single endpoint handles many operations)
 */
const graphqlOptions = {
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.graphqlMax,
  message: {
    success: false,
    error: {
      message: 'Too many GraphQL requests. Please try again later.',
      statusCode: 429,
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('GraphQL rate limit exceeded', {
      correlationId: req.correlationId,
      ip: req.ip,
      limit: config.rateLimit.graphqlMax,
    });

    res.status(429).json({
      success: false,
      error: {
        message: 'Too many GraphQL requests. Please try again later.',
        statusCode: 429,
      },
    });
  },
};

const graphqlRateLimiter = getRateLimit()(graphqlOptions);
graphqlRateLimiter.options = graphqlOptions;
graphqlRateLimiter.handler = graphqlOptions.handler;

module.exports = {
  generalRateLimiter,
  authRateLimiter,
  graphqlRateLimiter,
};
