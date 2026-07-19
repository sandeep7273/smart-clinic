/**
 * Unit Tests for Authentication Middleware
 */

const { authenticate, optionalAuthenticate } = require('../../../src/middleware/auth.middleware');
const { extractTokenFromHeader, validateToken } = require('../../../src/utils/auth');
const { AuthenticationError } = require('../../../src/utils/errors');

// Mock dependencies
jest.mock('../../../src/utils/auth');
jest.mock('../../../src/utils/logger');

describe('Authentication Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      headers: {},
      path: '/api/test',
      correlationId: 'test-correlation-id',
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('authenticate() - Required Authentication', () => {
    it('should authenticate user with valid token', () => {
      const mockDecoded = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'patient',
        tenantId: 'tenant-1',
      };

      extractTokenFromHeader.mockReturnValue('valid-token');
      validateToken.mockReturnValue({ decoded: mockDecoded });

      const middleware = authenticate();
      middleware(req, res, next);

      expect(extractTokenFromHeader).toHaveBeenCalledWith(req);
      expect(validateToken).toHaveBeenCalledWith('valid-token');
      expect(req.user).toEqual({
        userId: 'user-123',
        email: 'test@example.com',
        role: 'patient',
        tenantId: 'tenant-1',
      });
      expect(req.token).toEqual(mockDecoded);
      expect(next).toHaveBeenCalledWith();
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('should call next with error when no token is provided', () => {
      extractTokenFromHeader.mockReturnValue(null);

      const middleware = authenticate();
      middleware(req, res, next);

      expect(extractTokenFromHeader).toHaveBeenCalledWith(req);
      expect(validateToken).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith(expect.any(AuthenticationError));
      expect(next.mock.calls[0][0].message).toBe('No token provided');
    });

    it('should call next with error when token is invalid', () => {
      extractTokenFromHeader.mockReturnValue('invalid-token');
      validateToken.mockReturnValue({ decoded: null });

      const middleware = authenticate();
      middleware(req, res, next);

      expect(validateToken).toHaveBeenCalledWith('invalid-token');
      expect(next).toHaveBeenCalledWith(expect.any(AuthenticationError));
      expect(next.mock.calls[0][0].message).toBe('Invalid token');
    });

    it('should handle token validation errors', () => {
      const error = new Error('Token validation failed');
      extractTokenFromHeader.mockReturnValue('token');
      validateToken.mockImplementation(() => {
        throw error;
      });

      const middleware = authenticate();
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });

    it('should attach user info without tenantId if not present', () => {
      const mockDecoded = {
        userId: 'user-456',
        email: 'admin@example.com',
        role: 'admin',
      };

      extractTokenFromHeader.mockReturnValue('valid-token');
      validateToken.mockReturnValue({ decoded: mockDecoded });

      const middleware = authenticate();
      middleware(req, res, next);

      expect(req.user).toEqual({
        userId: 'user-456',
        email: 'admin@example.com',
        role: 'admin',
        tenantId: undefined,
      });
      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('optionalAuthenticate() - Optional Authentication', () => {
    it('should authenticate user with valid token when provided', () => {
      const mockDecoded = {
        userId: 'user-789',
        email: 'optional@example.com',
        role: 'doctor',
        tenantId: 'tenant-2',
      };

      extractTokenFromHeader.mockReturnValue('valid-token');
      validateToken.mockReturnValue({ decoded: mockDecoded });

      const middleware = optionalAuthenticate();
      middleware(req, res, next);

      expect(extractTokenFromHeader).toHaveBeenCalledWith(req);
      expect(validateToken).toHaveBeenCalledWith('valid-token');
      expect(req.user).toEqual({
        userId: 'user-789',
        email: 'optional@example.com',
        role: 'doctor',
        tenantId: 'tenant-2',
      });
      expect(req.token).toEqual(mockDecoded);
      expect(next).toHaveBeenCalledWith();
    });

    it('should continue without error when no token is provided', () => {
      extractTokenFromHeader.mockReturnValue(null);

      const middleware = optionalAuthenticate();
      middleware(req, res, next);

      expect(extractTokenFromHeader).toHaveBeenCalledWith(req);
      expect(validateToken).not.toHaveBeenCalled();
      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalledWith();
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('should continue without error when token is invalid', () => {
      extractTokenFromHeader.mockReturnValue('invalid-token');
      validateToken.mockReturnValue({ decoded: null });

      const middleware = optionalAuthenticate();
      middleware(req, res, next);

      expect(validateToken).toHaveBeenCalledWith('invalid-token');
      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalledWith();
    });

    it('should handle token validation errors gracefully', () => {
      extractTokenFromHeader.mockReturnValue('token');
      validateToken.mockImplementation(() => {
        throw new Error('Validation failed');
      });

      const middleware = optionalAuthenticate();
      middleware(req, res, next);

      // Optional auth should still call next() even on error
      expect(next).toHaveBeenCalledWith();
      expect(req.user).toBeUndefined();
    });

    it('should not attach user info when decoded is falsy', () => {
      extractTokenFromHeader.mockReturnValue('token');
      validateToken.mockReturnValue({ decoded: undefined });

      const middleware = optionalAuthenticate();
      middleware(req, res, next);

      expect(req.user).toBeUndefined();
      expect(req.token).toBeUndefined();
      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing correlationId in request', () => {
      delete req.correlationId;
      const mockDecoded = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'patient',
      };

      extractTokenFromHeader.mockReturnValue('valid-token');
      validateToken.mockReturnValue({ decoded: mockDecoded });

      const middleware = authenticate();
      middleware(req, res, next);

      expect(req.user).toBeDefined();
      expect(next).toHaveBeenCalledWith();
    });

    it('should handle decoded token with extra fields', () => {
      const mockDecoded = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'patient',
        tenantId: 'tenant-1',
        exp: 1234567890,
        iat: 1234567800,
        extraField: 'extra',
      };

      extractTokenFromHeader.mockReturnValue('valid-token');
      validateToken.mockReturnValue({ decoded: mockDecoded });

      const middleware = authenticate();
      middleware(req, res, next);

      expect(req.user).toEqual({
        userId: 'user-123',
        email: 'test@example.com',
        role: 'patient',
        tenantId: 'tenant-1',
      });
      expect(req.token).toEqual(mockDecoded);
    });
  });
});
