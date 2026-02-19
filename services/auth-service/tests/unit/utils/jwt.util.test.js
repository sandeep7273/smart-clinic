/**
 * Unit Tests for JWT Utility
 */

const { 
  generateAccessToken, 
  generateRefreshToken, 
  verifyAccessToken,
  verifyRefreshToken,
  decodeToken 
} = require('../../../src/utils/jwt.util');

describe('JWT Utility - Unit Tests', () => {
  const testPayload = {
    userId: 'test-user-123',
    email: 'test@example.com',
    role: 'patient',
  };

  describe('generateAccessToken', () => {
    it('should generate a valid JWT token', () => {
      const token = generateAccessToken(testPayload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should include payload data in token', () => {
      const token = generateAccessToken(testPayload);
      const decoded = decodeToken(token);

      expect(decoded.userId).toBe(testPayload.userId);
      expect(decoded.email).toBe(testPayload.email);
      expect(decoded.role).toBe(testPayload.role);
    });

    it('should add expiration time', () => {
      const token = generateAccessToken(testPayload);
      const decoded = decodeToken(token);

      expect(decoded.exp).toBeDefined();
      expect(decoded.exp).toBeGreaterThan(Date.now() / 1000);
    });

    it('should add issued at time', () => {
      const token = generateAccessToken(testPayload);
      const decoded = decodeToken(token);

      expect(decoded.iat).toBeDefined();
      expect(decoded.iat).toBeLessThanOrEqual(Date.now() / 1000);
    });

    it('should generate different tokens for different payloads', () => {
      const payload1 = { userId: 'user-1', email: 'user1@example.com' };
      const payload2 = { userId: 'user-2', email: 'user2@example.com' };

      const token1 = generateAccessToken(payload1);
      const token2 = generateAccessToken(payload2);

      expect(token1).not.toBe(token2);
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a valid refresh token', () => {
      const token = generateRefreshToken({ userId: 'test-user-123' });

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('should include userId in payload', () => {
      const refreshToken = generateRefreshToken({ userId: 'test-123' });
      const decoded = decodeToken(refreshToken);

      expect(decoded.userId).toBe('test-123');
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify valid access token', () => {
      const token = generateAccessToken(testPayload);
      const result = verifyAccessToken(token);

      expect(result.valid).toBe(true);
      expect(result.decoded).toBeDefined();
      expect(result.decoded.userId).toBe(testPayload.userId);
    });

    it('should return invalid for malformed token', () => {
      const result = verifyAccessToken('invalid.token.here');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should return invalid for empty token', () => {
      const result = verifyAccessToken('');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify valid refresh token', () => {
      const token = generateRefreshToken({ userId: 'test-123' });
      const result = verifyRefreshToken(token);

      expect(result.valid).toBe(true);
      expect(result.decoded).toBeDefined();
      expect(result.decoded.userId).toBe('test-123');
    });

    it('should return invalid for malformed token', () => {
      const result = verifyRefreshToken('not-a-valid-jwt');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('decodeToken', () => {
    it('should decode token without verification', () => {
      const token = generateAccessToken(testPayload);
      const decoded = decodeToken(token);

      expect(decoded).toBeDefined();
      expect(decoded.userId).toBe(testPayload.userId);
    });

    it('should return null for invalid token', () => {
      const decoded = decodeToken('invalid-token');
      expect(decoded).toBeNull();
    });

    it('should include standard JWT claims', () => {
      const token = generateAccessToken(testPayload);
      const decoded = decodeToken(token);

      expect(decoded).toHaveProperty('iat'); // issued at
      expect(decoded).toHaveProperty('exp'); // expiration
    });
  });

  describe('Token Security', () => {
    it('should handle special characters in payload', () => {
      const specialPayload = {
        userId: 'user-123',
        email: 'test+special@example.com',
        name: 'Test O\'Brien',
        note: 'Special chars: <>&"',
      };

      const token = generateAccessToken(specialPayload);
      const result = verifyAccessToken(token);

      expect(result.valid).toBe(true);
      expect(result.decoded.email).toBe(specialPayload.email);
      expect(result.decoded.name).toBe(specialPayload.name);
    });
  });
});
