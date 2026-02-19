/**
 * Unit Tests for Rate Limit Middleware
 */

const {
  generalLimiter,
  authLimiter,
  registerLimiter,
} = require('../../../src/middlewares/rateLimit.middleware');

// Mock dependencies
jest.mock('../../../src/utils/logger.util', () => ({
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
}));

jest.mock('../../../src/config/env', () => ({
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
  },
}));

const logger = require('../../../src/utils/logger.util');

describe('Rate Limit Middleware - Unit Tests', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      ip: '127.0.0.1',
      body: {},
      headers: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      setHeader: jest.fn(),
      getHeader: jest.fn(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('generalLimiter', () => {
    it('should be defined and be a function', () => {
      expect(generalLimiter).toBeDefined();
      expect(typeof generalLimiter).toBe('function');
    });

    it('should have correct configuration properties', () => {
      expect(generalLimiter).toHaveProperty('options');
      expect(generalLimiter.options).toHaveProperty('windowMs');
      expect(generalLimiter.options).toHaveProperty('max');
    });

    it('should use configured window and max values', () => {
      expect(generalLimiter.options.windowMs).toBe(15 * 60 * 1000);
      expect(generalLimiter.options.max).toBe(100);
    });

    it('should have standardHeaders enabled', () => {
      expect(generalLimiter.options.standardHeaders).toBe(true);
    });

    it('should have legacyHeaders disabled', () => {
      expect(generalLimiter.options.legacyHeaders).toBe(false);
    });

    it('should have custom error message', () => {
      expect(generalLimiter.options.message).toEqual({
        success: false,
        message: 'Too many requests from this IP, please try again later',
      });
    });

    it('should have custom handler function', () => {
      expect(generalLimiter.options.handler).toBeDefined();
      expect(typeof generalLimiter.options.handler).toBe('function');
    });

    it('should call logger and send 429 response when rate limit exceeded', () => {
      const handler = generalLimiter.options.handler;
      handler(req, res);

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Rate limit exceeded for IP:')
      );
      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Too many requests from this IP, please try again later',
      });
    });
  });

  describe('authLimiter', () => {
    it('should be defined and be a function', () => {
      expect(authLimiter).toBeDefined();
      expect(typeof authLimiter).toBe('function');
    });

    it('should have stricter limits than general limiter', () => {
      expect(authLimiter.options.windowMs).toBe(15 * 60 * 1000); // 15 minutes
      expect(authLimiter.options.max).toBe(150);
    });

    it('should skip successful requests', () => {
      expect(authLimiter.options.skipSuccessfulRequests).toBe(true);
    });

    it('should have custom auth-specific error message', () => {
      expect(authLimiter.options.message).toEqual({
        success: false,
        message: 'Too many login attempts from this IP, please try again after 15 minutes',
      });
    });

    it('should log email when rate limit exceeded', () => {
      req.body.email = 'test@example.com';
      const handler = authLimiter.options.handler;
      handler(req, res);

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('test@example.com')
      );
    });

    it('should handle missing email in request body', () => {
      req.body = {};
      const handler = authLimiter.options.handler;
      handler(req, res);

      expect(logger.warn).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(429);
    });

    it('should send 429 response with auth-specific message', () => {
      const handler = authLimiter.options.handler;
      handler(req, res);

      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Too many login attempts, please try again after 15 minutes',
      });
    });
  });

  describe('registerLimiter', () => {
    it('should be defined and be a function', () => {
      expect(registerLimiter).toBeDefined();
      expect(typeof registerLimiter).toBe('function');
    });

    it('should have longer window for registration', () => {
      expect(registerLimiter.options.windowMs).toBe(60 * 60 * 1000); // 1 hour
    });

    it('should have appropriate max registrations per hour', () => {
      expect(registerLimiter.options.max).toBe(100);
    });

    it('should have custom registration-specific error message', () => {
      expect(registerLimiter.options.message).toEqual({
        success: false,
        message: 'Too many accounts created from this IP, please try again after an hour',
      });
    });

    it('should log IP when registration rate limit exceeded', () => {
      const handler = registerLimiter.options.handler;
      handler(req, res);

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Registration rate limit exceeded for IP:')
      );
    });

    it('should send 429 response with registration-specific message', () => {
      const handler = registerLimiter.options.handler;
      handler(req, res);

      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Too many accounts created, please try again later',
      });
    });

    it('should include IP address in log message', () => {
      req.ip = '192.168.1.100';
      const handler = registerLimiter.options.handler;
      handler(req, res);

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('192.168.1.100')
      );
    });
  });

  describe('Rate limiter configurations comparison', () => {
    it('should have different window times for different limiters', () => {
      expect(generalLimiter.options.windowMs).toBe(15 * 60 * 1000);
      expect(authLimiter.options.windowMs).toBe(15 * 60 * 1000);
      expect(registerLimiter.options.windowMs).toBe(60 * 60 * 1000);
    });

    it('should have different max limits for different limiters', () => {
      expect(generalLimiter.options.max).toBe(100);
      expect(authLimiter.options.max).toBe(150);
      expect(registerLimiter.options.max).toBe(100);
    });

    it('should all use standardHeaders', () => {
      expect(generalLimiter.options.standardHeaders).toBe(true);
      expect(authLimiter.options.standardHeaders).toBe(true);
      expect(registerLimiter.options.standardHeaders).toBe(true);
    });

    it('should all disable legacyHeaders', () => {
      expect(generalLimiter.options.legacyHeaders).toBe(false);
      expect(authLimiter.options.legacyHeaders).toBe(false);
      expect(registerLimiter.options.legacyHeaders).toBe(false);
    });

    it('should only authLimiter skip successful requests', () => {
      expect(generalLimiter.options.skipSuccessfulRequests).toBeUndefined();
      expect(authLimiter.options.skipSuccessfulRequests).toBe(true);
      expect(registerLimiter.options.skipSuccessfulRequests).toBeUndefined();
    });
  });

  describe('Error messages', () => {
    it('should have unique error messages for each limiter', () => {
      const generalMsg = generalLimiter.options.message.message;
      const authMsg = authLimiter.options.message.message;
      const registerMsg = registerLimiter.options.message.message;

      expect(generalMsg).not.toBe(authMsg);
      expect(authMsg).not.toBe(registerMsg);
      expect(generalMsg).not.toBe(registerMsg);
    });

    it('should all have success: false in message object', () => {
      expect(generalLimiter.options.message.success).toBe(false);
      expect(authLimiter.options.message.success).toBe(false);
      expect(registerLimiter.options.message.success).toBe(false);
    });
  });

  describe('Handler functions', () => {
    it('should all have custom handler functions', () => {
      expect(typeof generalLimiter.options.handler).toBe('function');
      expect(typeof authLimiter.options.handler).toBe('function');
      expect(typeof registerLimiter.options.handler).toBe('function');
    });

    it('should all send 429 status code', () => {
      generalLimiter.options.handler(req, res);
      expect(res.status).toHaveBeenCalledWith(429);
      jest.clearAllMocks();

      authLimiter.options.handler(req, res);
      expect(res.status).toHaveBeenCalledWith(429);
      jest.clearAllMocks();

      registerLimiter.options.handler(req, res);
      expect(res.status).toHaveBeenCalledWith(429);
    });

    it('should all log warnings when triggered', () => {
      generalLimiter.options.handler(req, res);
      expect(logger.warn).toHaveBeenCalled();
      jest.clearAllMocks();

      authLimiter.options.handler(req, res);
      expect(logger.warn).toHaveBeenCalled();
      jest.clearAllMocks();

      registerLimiter.options.handler(req, res);
      expect(logger.warn).toHaveBeenCalled();
    });
  });
});
