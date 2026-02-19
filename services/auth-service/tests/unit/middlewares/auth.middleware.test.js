/**
 * Unit Tests for Auth Middleware
 */

const { authenticate, authorize } = require('../../../src/middlewares/auth.middleware');
const { verifyAccessToken } = require('../../../src/utils/jwt.util');
const { APIError } = require('../../../src/middlewares/error.middleware');

// Mock dependencies
jest.mock('../../../src/utils/jwt.util');
jest.mock('../../../src/utils/logger.util', () => ({
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
}));

describe('Auth Middleware - Unit Tests', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      headers: {},
      user: null,
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('authenticate', () => {
    it('should authenticate user with valid token', () => {
      const mockDecoded = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'patient',
      };

      req.headers.authorization = 'Bearer valid-token-here';
      verifyAccessToken.mockReturnValue({
        valid: true,
        decoded: mockDecoded,
        error: null,
      });

      authenticate(req, res, next);

      expect(verifyAccessToken).toHaveBeenCalledWith('valid-token-here');
      expect(req.user).toEqual(mockDecoded);
      expect(next).toHaveBeenCalledWith();
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('should reject request without authorization header', () => {
      authenticate(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(APIError));
      const error = next.mock.calls[0][0];
      expect(error.message).toBe('No token provided');
      expect(error.statusCode).toBe(401);
    });

    it('should reject request with malformed authorization header', () => {
      req.headers.authorization = 'InvalidFormat token';

      authenticate(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(APIError));
      const error = next.mock.calls[0][0];
      expect(error.message).toBe('No token provided');
      expect(error.statusCode).toBe(401);
    });

    it('should reject request with invalid token', () => {
      req.headers.authorization = 'Bearer invalid-token';
      verifyAccessToken.mockReturnValue({
        valid: false,
        decoded: null,
        error: 'Token verification failed',
      });

      authenticate(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(APIError));
      const error = next.mock.calls[0][0];
      expect(error.message).toBe('Token verification failed');
      expect(error.statusCode).toBe(401);
    });

    it('should reject request with expired token', () => {
      req.headers.authorization = 'Bearer expired-token';
      verifyAccessToken.mockReturnValue({
        valid: false,
        decoded: null,
        error: 'Token expired',
      });

      authenticate(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(APIError));
      const error = next.mock.calls[0][0];
      expect(error.message).toBe('Token expired');
    });

    it('should handle missing Bearer prefix', () => {
      req.headers.authorization = 'token-without-bearer';

      authenticate(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(APIError));
      const error = next.mock.calls[0][0];
      expect(error.message).toBe('No token provided');
    });

    it('should handle empty authorization header', () => {
      req.headers.authorization = '';

      authenticate(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(APIError));
    });

    it('should extract token correctly from Bearer header', () => {
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.signature';
      req.headers.authorization = `Bearer ${token}`;
      verifyAccessToken.mockReturnValue({
        valid: true,
        decoded: { userId: '123' },
        error: null,
      });

      authenticate(req, res, next);

      expect(verifyAccessToken).toHaveBeenCalledWith(token);
    });

    it('should handle verification error without custom message', () => {
      req.headers.authorization = 'Bearer invalid-token';
      verifyAccessToken.mockReturnValue({
        valid: false,
        decoded: null,
        error: null,
      });

      authenticate(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(APIError));
      const error = next.mock.calls[0][0];
      expect(error.message).toBe('Invalid token');
    });
  });

  describe('authorize', () => {
    it('should allow access for user with correct role', () => {
      req.user = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'doctor',
      };

      const middleware = authorize('doctor', 'admin');
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('should allow access for admin role', () => {
      req.user = {
        userId: 'admin-123',
        email: 'admin@example.com',
        role: 'admin',
      };

      const middleware = authorize('admin');
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should deny access for user without correct role', () => {
      req.user = {
        userId: 'user-123',
        email: 'patient@example.com',
        role: 'patient',
      };

      const middleware = authorize('doctor', 'admin');
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(APIError));
      const error = next.mock.calls[0][0];
      expect(error.message).toBe('Forbidden: Insufficient permissions');
      expect(error.statusCode).toBe(403);
    });

    it('should deny access when user is not authenticated', () => {
      req.user = null;

      const middleware = authorize('patient');
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(APIError));
      const error = next.mock.calls[0][0];
      expect(error.message).toBe('Unauthorized');
      expect(error.statusCode).toBe(401);
    });

    it('should handle multiple allowed roles', () => {
      req.user = { role: 'patient' };

      const middleware = authorize('patient', 'doctor', 'admin');
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should handle single allowed role', () => {
      req.user = { role: 'doctor' };

      const middleware = authorize('doctor');
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should be case-sensitive for roles', () => {
      req.user = { role: 'Doctor' };

      const middleware = authorize('doctor');
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(APIError));
      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(403);
    });

    it('should handle undefined user object', () => {
      req.user = undefined;

      const middleware = authorize('patient');
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(APIError));
      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(401);
    });
  });

  describe('Integration scenarios', () => {
    it('should work in sequence: authenticate then authorize', () => {
      // First authenticate
      const mockDecoded = {
        userId: 'doctor-123',
        email: 'doctor@example.com',
        role: 'doctor',
      };

      req.headers.authorization = 'Bearer valid-token';
      verifyAccessToken.mockReturnValue({
        valid: true,
        decoded: mockDecoded,
        error: null,
      });

      authenticate(req, res, next);
      expect(req.user).toEqual(mockDecoded);

      // Then authorize
      const authorizeMiddleware = authorize('doctor');
      authorizeMiddleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(next).toHaveBeenCalledTimes(2);
    });

    it('should fail authorization if authentication did not set user', () => {
      const authorizeMiddleware = authorize('doctor');
      authorizeMiddleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(APIError));
      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(401);
    });
  });
});
