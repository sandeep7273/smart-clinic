/**
 * Rate Limiting Middleware
 * Protects APIs from abuse with tiered rate limiting
 */

const rateLimit = require('express-rate-limit');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * General rate limiter for all API routes
 * 100 requests per 15 minutes
 */
const generalRateLimiter = rateLimit({
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
});

/**
 * Stricter rate limiter for authentication routes
 * 5 requests per 15 minutes
 */
const authRateLimiter = rateLimit({
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
});

/**
 * Rate limiter for GraphQL endpoint
 * 200 requests per 15 minutes (more permissive as single endpoint handles many operations)
 */
const graphqlRateLimiter = rateLimit({
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
});

module.exports = {
  generalRateLimiter,
  authRateLimiter,
  graphqlRateLimiter,
};
