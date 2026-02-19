/**
 * Unit Tests for Auth Utility
 */

const axios = require('axios');
const { validateToken, extractTokenFromHeader } = require('../../../src/utils/auth');
const config = require('../../../src/config');
const { UnauthorizedError } = require('../../../src/utils/errors');

// Mock dependencies
jest.mock('axios');
jest.mock('../../../src/utils/logger');

describe('Auth Utility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateToken', () => {
    it('should validate token successfully', async () => {
      const mockToken = 'valid-token-123';
      const mockUserData = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'patient',
      };

      axios.get.mockResolvedValue({
        data: {
          data: mockUserData,
        },
      });

      const result = await validateToken(mockToken);

      expect(result).toEqual(mockUserData);
      expect(axios.get).toHaveBeenCalledWith(
        `${config.services.apiGateway.url}/api/auth/verify`,
        {
          headers: {
            Authorization: `Bearer ${mockToken}`,
          },
          timeout: 5000,
        }
      );
    });

    it('should throw UnauthorizedError for 401 response', async () => {
      const mockToken = 'invalid-token';

      axios.get.mockRejectedValue({
        response: {
          status: 401,
        },
      });

      await expect(validateToken(mockToken)).rejects.toThrow(UnauthorizedError);
      await expect(validateToken(mockToken)).rejects.toThrow('Invalid or expired token');
    });

    it('should throw error for auth service unavailable', async () => {
      const mockToken = 'some-token';

      axios.get.mockRejectedValue({
        response: {
          status: 500,
        },
      });

      await expect(validateToken(mockToken)).rejects.toThrow('Auth service unavailable');
    });

    it('should handle network errors', async () => {
      const mockToken = 'some-token';

      axios.get.mockRejectedValue(new Error('Network error'));

      await expect(validateToken(mockToken)).rejects.toThrow('Auth service unavailable');
    });

    it('should handle timeout errors', async () => {
      const mockToken = 'some-token';

      axios.get.mockRejectedValue({
        code: 'ECONNABORTED',
        message: 'timeout of 5000ms exceeded',
      });

      await expect(validateToken(mockToken)).rejects.toThrow('Auth service unavailable');
    });

    it('should handle malformed response', async () => {
      const mockToken = 'some-token';

      axios.get.mockResolvedValue({
        data: null,
      });

      const result = await validateToken(mockToken);

      expect(result).toBeUndefined();
    });

    it('should use correct API endpoint from config', async () => {
      const mockToken = 'test-token';
      const mockUserData = { id: 'user-1' };

      axios.get.mockResolvedValue({
        data: { data: mockUserData },
      });

      await validateToken(mockToken);

      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining(config.services.apiGateway.url),
        expect.any(Object)
      );
    });
  });

  describe('extractTokenFromHeader', () => {
    it('should extract token from valid Bearer header', () => {
      const authHeader = 'Bearer abc123xyz';
      const token = extractTokenFromHeader(authHeader);

      expect(token).toBe('abc123xyz');
    });

    it('should return null for missing header', () => {
      const token = extractTokenFromHeader(null);

      expect(token).toBeNull();
    });

    it('should return null for undefined header', () => {
      const token = extractTokenFromHeader(undefined);

      expect(token).toBeNull();
    });

    it('should return null for empty string header', () => {
      const token = extractTokenFromHeader('');

      expect(token).toBeNull();
    });

    it('should return null for invalid format (no Bearer prefix)', () => {
      const authHeader = 'abc123xyz';
      const token = extractTokenFromHeader(authHeader);

      expect(token).toBeNull();
    });

    it('should return null for invalid format (wrong prefix)', () => {
      const authHeader = 'Basic abc123xyz';
      const token = extractTokenFromHeader(authHeader);

      expect(token).toBeNull();
    });

    it('should return null for malformed Bearer header (no token)', () => {
      const authHeader = 'Bearer';
      const token = extractTokenFromHeader(authHeader);

      expect(token).toBeNull();
    });

    it('should return null for malformed Bearer header (extra parts)', () => {
      const authHeader = 'Bearer token1 token2';
      const token = extractTokenFromHeader(authHeader);

      expect(token).toBeNull();
    });

    it('should handle token with special characters', () => {
      const authHeader = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
      const token = extractTokenFromHeader(authHeader);

      expect(token).toBe('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U');
    });

    it('should be case-sensitive for Bearer prefix', () => {
      const authHeader = 'bearer abc123xyz';
      const token = extractTokenFromHeader(authHeader);

      expect(token).toBeNull();
    });
  });

  describe('Integration scenarios', () => {
    it('should extract and validate token in sequence', async () => {
      const authHeader = 'Bearer valid-token-456';
      const mockUserData = {
        id: 'user-456',
        email: 'user@example.com',
        role: 'doctor',
      };

      axios.get.mockResolvedValue({
        data: { data: mockUserData },
      });

      const token = extractTokenFromHeader(authHeader);
      expect(token).toBe('valid-token-456');

      const userData = await validateToken(token);
      expect(userData).toEqual(mockUserData);
    });

    it('should handle invalid header format gracefully', async () => {
      const authHeader = 'InvalidFormat';

      const token = extractTokenFromHeader(authHeader);
      expect(token).toBeNull();

      // Should not attempt validation with null token
      // This would be handled by the calling code
    });
  });
});