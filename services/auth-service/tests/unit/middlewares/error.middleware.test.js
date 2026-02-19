/**
 * Unit Tests for Error Middleware
 */

const {
  APIError,
  notFoundHandler,
  errorHandler,
  asyncHandler,
} = require('../../../src/middlewares/error.middleware');

// Mock logger
jest.mock('../../../src/utils/logger.util', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
}));

// Mock config
jest.mock('../../../src/config/env', () => ({
  isDevelopment: jest.fn(() => false),
}));

const logger = require('../../../src/utils/logger.util');
const config = require('../../../src/config/env');

describe('Error Middleware - Unit Tests', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      originalUrl: '/api/test',
      path: '/api/test',
      method: 'GET',
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('APIError Class', () => {
    it('should create an error with default values', () => {
      const error = new APIError('Test error');

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(500);
      expect(error.isOperational).toBe(true);
      expect(error.status).toBe('error');
    });

    it('should create an error with custom status code', () => {
      const error = new APIError('Not found', 404);

      expect(error.message).toBe('Not found');
      expect(error.statusCode).toBe(404);
      expect(error.status).toBe('fail');
    });

    it('should create an error with 4xx status as fail', () => {
      const error = new APIError('Bad request', 400);
      expect(error.status).toBe('fail');
    });

    it('should create an error with 5xx status as error', () => {
      const error = new APIError('Server error', 500);
      expect(error.status).toBe('error');
    });

    it('should set isOperational flag', () => {
      const operationalError = new APIError('Operational', 400, true);
      const nonOperationalError = new APIError('Non-operational', 500, false);

      expect(operationalError.isOperational).toBe(true);
      expect(nonOperationalError.isOperational).toBe(false);
    });

    it('should capture stack trace', () => {
      const error = new APIError('Test error');
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('APIError');
    });

    it('should handle 401 unauthorized error', () => {
      const error = new APIError('Unauthorized', 401);
      expect(error.statusCode).toBe(401);
      expect(error.status).toBe('fail');
    });

    it('should handle 403 forbidden error', () => {
      const error = new APIError('Forbidden', 403);
      expect(error.statusCode).toBe(403);
      expect(error.status).toBe('fail');
    });
  });

  describe('notFoundHandler', () => {
    it('should create 404 error for undefined route', () => {
      req.originalUrl = '/api/undefined-route';

      notFoundHandler(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(APIError));
      const error = next.mock.calls[0][0];
      expect(error.message).toBe('Route /api/undefined-route not found');
      expect(error.statusCode).toBe(404);
    });

    it('should include the requested URL in error message', () => {
      req.originalUrl = '/api/users/invalid';

      notFoundHandler(req, res, next);

      const error = next.mock.calls[0][0];
      expect(error.message).toContain('/api/users/invalid');
    });

    it('should pass error to next middleware', () => {
      notFoundHandler(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  describe('errorHandler', () => {
    it('should handle APIError correctly', () => {
      const error = new APIError('Test error', 400);

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Test error',
      });
    });

    it('should handle generic errors with 500 status', () => {
      const error = new Error('Generic error');

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Generic error',
      });
    });

    it('should log error details', () => {
      const error = new APIError('Test error', 400);

      errorHandler(error, req, res, next);

      expect(logger.error).toHaveBeenCalledWith(
        'Error occurred:',
        expect.objectContaining({
          message: 'Test error',
          statusCode: 400,
          path: '/api/test',
          method: 'GET',
        })
      );
    });

    it('should handle Mongoose duplicate key error', () => {
      const error = {
        code: 11000,
        keyPattern: { email: 1 },
        message: 'Duplicate key error',
      };

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'email already exists',
        })
      );
    });

    it('should handle Mongoose validation error', () => {
      const error = {
        name: 'ValidationError',
        errors: {
          email: { message: 'Email is required' },
          password: { message: 'Password is required' },
        },
        message: 'Validation failed',
      };

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Email is required, Password is required',
        })
      );
    });

    it('should handle Mongoose cast error', () => {
      const error = {
        name: 'CastError',
        message: 'Cast to ObjectId failed',
      };

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Invalid ID format',
        })
      );
    });

    it('should handle JsonWebTokenError', () => {
      const error = {
        name: 'JsonWebTokenError',
        message: 'jwt malformed',
      };

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Invalid token',
        })
      );
    });

    it('should handle TokenExpiredError', () => {
      const error = {
        name: 'TokenExpiredError',
        message: 'jwt expired',
      };

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Token expired',
        })
      );
    });

    it('should include stack trace in development mode', () => {
      config.isDevelopment.mockReturnValue(true);
      const error = new Error('Test error');
      error.stack = 'Error stack trace';

      errorHandler(error, req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          stack: 'Error stack trace',
        })
      );
    });

    it('should not include stack trace in production mode', () => {
      config.isDevelopment.mockReturnValue(false);
      const error = new Error('Test error');

      errorHandler(error, req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.not.objectContaining({
          stack: expect.anything(),
        })
      );
    });

    it('should handle errors without statusCode', () => {
      const error = new Error('Unknown error');

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('should handle errors with custom statusCode', () => {
      const error = new Error('Custom error');
      error.statusCode = 418;

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(418);
    });
  });

  describe('asyncHandler', () => {
    it('should handle successful async function', async () => {
      const asyncFn = jest.fn().mockResolvedValue('success');
      const wrappedFn = asyncHandler(asyncFn);

      await wrappedFn(req, res, next);

      expect(asyncFn).toHaveBeenCalledWith(req, res, next);
      expect(next).not.toHaveBeenCalled();
    });

    it('should catch and pass async errors to next', async () => {
      const error = new Error('Async error');
      const asyncFn = jest.fn().mockRejectedValue(error);
      const wrappedFn = asyncHandler(asyncFn);

      await wrappedFn(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });

    it('should handle async APIError', async () => {
      const error = new APIError('Async API error', 400);
      const asyncFn = jest.fn().mockRejectedValue(error);
      const wrappedFn = asyncHandler(asyncFn);

      await wrappedFn(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(error.statusCode).toBe(400);
    });

    it('should handle synchronous errors in async handler', async () => {
      const error = new Error('Sync error in async');
      const asyncFn = jest.fn(() => {
        throw error;
      });
      const wrappedFn = asyncHandler(asyncFn);

      await wrappedFn(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });

    it('should preserve request, response, and next parameters', async () => {
      const asyncFn = jest.fn().mockResolvedValue();
      const wrappedFn = asyncHandler(asyncFn);

      await wrappedFn(req, res, next);

      expect(asyncFn).toHaveBeenCalledWith(req, res, next);
    });

    it('should handle multiple async operations', async () => {
      let callCount = 0;
      const asyncFn = jest.fn(async () => {
        callCount++;
        if (callCount === 1) {
          return 'first call';
        }
        throw new Error('second call error');
      });
      const wrappedFn = asyncHandler(asyncFn);

      // First call succeeds
      await wrappedFn(req, res, next);
      expect(next).not.toHaveBeenCalled();

      // Second call fails
      await wrappedFn(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('Error handling integration', () => {
    it('should handle complete error flow', async () => {
      // Simulate async route handler
      const routeHandler = asyncHandler(async (req, res, next) => {
        throw new APIError('Route error', 400);
      });

      await routeHandler(req, res, next);

      // Error should be passed to next
      expect(next).toHaveBeenCalledWith(expect.any(APIError));

      // Simulate error handler
      const error = next.mock.calls[0][0];
      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Route error',
        })
      );
    });
  });
});
