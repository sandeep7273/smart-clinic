/**
 * Unit Tests for Rate Limiter Middleware
 */

// Mock dependencies
jest.mock('express-rate-limit');
jest.mock('../../../src/utils/logger');

const rateLimit = require('express-rate-limit');
const config = require('../../../src/config');

describe('Rate Limiter Middleware', () => {
  let mockRateLimitFn;
  let req, res;

  beforeEach(() => {
    // Mock the rate limit function
    mockRateLimitFn = jest.fn();
    rateLimit.mockReturnValue(mockRateLimitFn);

    req = {
      ip: '127.0.0.1',
      path: '/api/test',
      correlationId: 'test-correlation-id',
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    jest.clearAllMocks();
  });

  describe('General Rate Limiter Configuration', () => {
    it('should create rate limiter with correct configuration', () => {
      // Require the module to trigger rate limiter creation
      const { generalRateLimiter } = require('../../../src/middleware/rateLimiter.middleware');

      const firstCall = generalRateLimiter.options || {};
      expect(firstCall.windowMs).toBe(config.rateLimit.windowMs);
      expect(firstCall.max).toBe(config.rateLimit.maxRequests);
      expect(firstCall.standardHeaders).toBe(true);
      expect(firstCall.legacyHeaders).toBe(false);
    });

    it('should have correct error message structure', () => {
      const { generalRateLimiter } = require('../../../src/middleware/rateLimiter.middleware');
      const firstCall = generalRateLimiter.options || {};
      expect(firstCall.message).toEqual({
        success: false,
        error: {
          message: 'Too many requests, please try again later.',
          statusCode: 429,
        },
      });
    });

    it('should skip rate limiting for health check endpoints', () => {
      const { generalRateLimiter } = require('../../../src/middleware/rateLimiter.middleware');
      const skipFn = generalRateLimiter.options.skip;

      expect(skipFn({ path: '/health' })).toBe(true);
      expect(skipFn({ path: '/ready' })).toBe(true);
      expect(skipFn({ path: '/status' })).toBe(true);
      expect(skipFn({ path: '/api/users' })).toBe(false);
    });

    it('should handle rate limit exceeded with custom handler', () => {
      const { generalRateLimiter } = require('../../../src/middleware/rateLimiter.middleware');
      const handler = generalRateLimiter.handler;

      handler(req, res);

      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Too many requests, please try again later.',
          statusCode: 429,
        },
      });
    });
  });

  describe('Auth Rate Limiter Configuration', () => {
    it('should create auth rate limiter with stricter limits', () => {
      const { authRateLimiter } = require('../../../src/middleware/rateLimiter.middleware');
      const authCall = authRateLimiter.options || {};
      expect(authCall.windowMs).toBe(config.rateLimit.windowMs);
      expect(authCall.max).toBe(config.rateLimit.authMax);
      expect(authCall.skipSuccessfulRequests).toBe(true);
    });

    it('should have auth-specific error message', () => {
      const { authRateLimiter } = require('../../../src/middleware/rateLimiter.middleware');
      const authCall = authRateLimiter.options || {};
      expect(authCall.message).toEqual({
        success: false,
        error: {
          message: 'Too many authentication attempts. Please try again later.',
          statusCode: 429,
        },
      });
    });

    it('should handle auth rate limit exceeded with custom handler', () => {
      const { authRateLimiter } = require('../../../src/middleware/rateLimiter.middleware');
      const handler = authRateLimiter.handler;

      handler(req, res);

      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Too many authentication attempts. Please try again later.',
          statusCode: 429,
        },
      });
    });
  });

  describe('GraphQL Rate Limiter Configuration', () => {
    it('should create GraphQL rate limiter with higher limits', () => {
      const { graphqlRateLimiter } = require('../../../src/middleware/rateLimiter.middleware');
      const graphqlCall = graphqlRateLimiter.options || {};
      expect(graphqlCall.windowMs).toBe(config.rateLimit.windowMs);
      expect(graphqlCall.max).toBe(config.rateLimit.graphqlMax);
    });

    it('should have GraphQL-specific error message', () => {
      const { graphqlRateLimiter } = require('../../../src/middleware/rateLimiter.middleware');
      const graphqlCall = graphqlRateLimiter.options || {};
      expect(graphqlCall.message).toEqual({
        success: false,
        error: {
          message: 'Too many GraphQL requests. Please try again later.',
          statusCode: 429,
        },
      });
    });

    it('should handle GraphQL rate limit exceeded with custom handler', () => {
      const { graphqlRateLimiter } = require('../../../src/middleware/rateLimiter.middleware');
      const handler = graphqlRateLimiter.handler;

      handler(req, res);

      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Too many GraphQL requests. Please try again later.',
          statusCode: 429,
        },
      });
    });
  });

  describe('Rate Limiter Behavior', () => {
    it('should return different limiters for different purposes', () => {
      const rateLimiters = require('../../../src/middleware/rateLimiter.middleware');

      expect(rateLimiters.generalRateLimiter).toBeDefined();
      expect(rateLimiters.authRateLimiter).toBeDefined();
      expect(rateLimiters.graphqlRateLimiter).toBeDefined();
    });

    it('should handle requests with correlation IDs', () => {
      const { generalRateLimiter } = require('../../../src/middleware/rateLimiter.middleware');
      const handler = generalRateLimiter.handler;

      req.correlationId = 'unique-correlation-id';
      handler(req, res);

      expect(res.status).toHaveBeenCalledWith(429);
    });

    it('should handle requests without correlation IDs', () => {
      const { generalRateLimiter } = require('../../../src/middleware/rateLimiter.middleware');
      const handler = generalRateLimiter.handler;

      delete req.correlationId;
      handler(req, res);

      expect(res.status).toHaveBeenCalledWith(429);
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing IP address', () => {
      const { generalRateLimiter } = require('../../../src/middleware/rateLimiter.middleware');
      const handler = generalRateLimiter.handler;

      delete req.ip;
      handler(req, res);

      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalled();
    });

    it('should handle missing path', () => {
      const { generalRateLimiter } = require('../../../src/middleware/rateLimiter.middleware');
      const handler = generalRateLimiter.handler;

      delete req.path;
      handler(req, res);

      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalled();
    });

    it('should skip only specific health endpoints', () => {
      const { generalRateLimiter } = require('../../../src/middleware/rateLimiter.middleware');
      const skipFn = generalRateLimiter.options.skip;

      expect(skipFn({ path: '/health' })).toBe(true);
      expect(skipFn({ path: '/healthy' })).toBe(false);
      expect(skipFn({ path: '/api/health' })).toBe(false);
      expect(skipFn({ path: '/ready' })).toBe(true);
      expect(skipFn({ path: '/status' })).toBe(true);
      expect(skipFn({ path: '/api/status' })).toBe(false);
    });
  });
});
