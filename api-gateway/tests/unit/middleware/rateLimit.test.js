/**
 * Unit Tests for Rate Limiter Middleware
 */

const rateLimit = require('express-rate-limit');
const config = require('../../../src/config');

// Mock dependencies
jest.mock('express-rate-limit');
jest.mock('../../../src/utils/logger');

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
      require('../../../src/middleware/rateLimiter.middleware');

      // Check if rateLimit was called with correct config
      expect(rateLimit).toHaveBeenCalled();
      
      const firstCall = rateLimit.mock.calls[0][0];
      expect(firstCall.windowMs).toBe(config.rateLimit.windowMs);
      expect(firstCall.max).toBe(config.rateLimit.maxRequests);
      expect(firstCall.standardHeaders).toBe(true);
      expect(firstCall.legacyHeaders).toBe(false);
    });

    it('should have correct error message structure', () => {
      require('../../../src/middleware/rateLimiter.middleware');
      
      const firstCall = rateLimit.mock.calls[0][0];
      expect(firstCall.message).toEqual({
        success: false,
        error: {
          message: 'Too many requests, please try again later.',
          statusCode: 429,
        },
      });
    });

    it('should skip rate limiting for health check endpoints', () => {
      require('../../../src/middleware/rateLimiter.middleware');
      
      const firstCall = rateLimit.mock.calls[0][0];
      const skipFn = firstCall.skip;

      expect(skipFn({ path: '/health' })).toBe(true);
      expect(skipFn({ path: '/ready' })).toBe(true);
      expect(skipFn({ path: '/status' })).toBe(true);
      expect(skipFn({ path: '/api/users' })).toBe(false);
    });

    it('should handle rate limit exceeded with custom handler', () => {
      require('../../../src/middleware/rateLimiter.middleware');
      
      const firstCall = rateLimit.mock.calls[0][0];
      const handler = firstCall.handler;

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
      require('../../../src/middleware/rateLimiter.middleware');

      // Auth rate limiter should be the second call
      const authCall = rateLimit.mock.calls[1][0];
      expect(authCall.windowMs).toBe(config.rateLimit.windowMs);
      expect(authCall.max).toBe(config.rateLimit.authMax);
      expect(authCall.skipSuccessfulRequests).toBe(true);
    });

    it('should have auth-specific error message', () => {
      require('../../../src/middleware/rateLimiter.middleware');
      
      const authCall = rateLimit.mock.calls[1][0];
      expect(authCall.message).toEqual({
        success: false,
        error: {
          message: 'Too many authentication attempts. Please try again later.',
          statusCode: 429,
        },
      });
    });

    it('should handle auth rate limit exceeded with custom handler', () => {
      require('../../../src/middleware/rateLimiter.middleware');
      
      const authCall = rateLimit.mock.calls[1][0];
      const handler = authCall.handler;

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
      require('../../../src/middleware/rateLimiter.middleware');

      // GraphQL rate limiter should be the third call
      const graphqlCall = rateLimit.mock.calls[2][0];
      expect(graphqlCall.windowMs).toBe(config.rateLimit.windowMs);
      expect(graphqlCall.max).toBe(config.rateLimit.graphqlMax);
    });

    it('should have GraphQL-specific error message', () => {
      require('../../../src/middleware/rateLimiter.middleware');
      
      const graphqlCall = rateLimit.mock.calls[2][0];
      expect(graphqlCall.message).toEqual({
        success: false,
        error: {
          message: 'Too many GraphQL requests. Please try again later.',
          statusCode: 429,
        },
      });
    });

    it('should handle GraphQL rate limit exceeded with custom handler', () => {
      require('../../../src/middleware/rateLimiter.middleware');
      
      const graphqlCall = rateLimit.mock.calls[2][0];
      const handler = graphqlCall.handler;

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
      require('../../../src/middleware/rateLimiter.middleware');
      
      const firstCall = rateLimit.mock.calls[0][0];
      const handler = firstCall.handler;

      req.correlationId = 'unique-correlation-id';
      handler(req, res);

      expect(res.status).toHaveBeenCalledWith(429);
    });

    it('should handle requests without correlation IDs', () => {
      require('../../../src/middleware/rateLimiter.middleware');
      
      const firstCall = rateLimit.mock.calls[0][0];
      const handler = firstCall.handler;

      delete req.correlationId;
      handler(req, res);

      expect(res.status).toHaveBeenCalledWith(429);
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing IP address', () => {
      require('../../../src/middleware/rateLimiter.middleware');
      
      const firstCall = rateLimit.mock.calls[0][0];
      const handler = firstCall.handler;

      delete req.ip;
      handler(req, res);

      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalled();
    });

    it('should handle missing path', () => {
      require('../../../src/middleware/rateLimiter.middleware');
      
      const firstCall = rateLimit.mock.calls[0][0];
      const handler = firstCall.handler;

      delete req.path;
      handler(req, res);

      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalled();
    });

    it('should skip only specific health endpoints', () => {
      require('../../../src/middleware/rateLimiter.middleware');
      
      const firstCall = rateLimit.mock.calls[0][0];
      const skipFn = firstCall.skip;

      expect(skipFn({ path: '/health' })).toBe(true);
      expect(skipFn({ path: '/healthy' })).toBe(false);
      expect(skipFn({ path: '/api/health' })).toBe(false);
      expect(skipFn({ path: '/ready' })).toBe(true);
      expect(skipFn({ path: '/status' })).toBe(true);
      expect(skipFn({ path: '/api/status' })).toBe(false);
    });
  });
});
