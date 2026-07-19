
const axios = require('axios');
const { validateToken, extractTokenFromHeader } = require('../../src/utils/auth');
const { UnauthorizedError } = require('../../src/utils/errors');

jest.mock('axios');

describe('Auth Util', () => {
  describe('validateToken', () => {
    it('should return user data for a valid token', async () => {
      const mockUser = { id: '1', role: 'user' };
      axios.get.mockResolvedValue({ data: { data: mockUser } });

      const user = await validateToken('valid-token');

      expect(user).toEqual(mockUser);
    });

    it('should throw UnauthorizedError for an invalid token', async () => {
      axios.get.mockRejectedValue({ response: { status: 401 } });

      await expect(validateToken('invalid-token')).rejects.toThrow(UnauthorizedError);
    });
  });

  describe('extractTokenFromHeader', () => {
    it('should extract token from Bearer header', () => {
      const token = extractTokenFromHeader('Bearer my-token');
      expect(token).toBe('my-token');
    });

    it('should return null for missing header', () => {
      const token = extractTokenFromHeader(null);
      expect(token).toBeNull();
    });

    it('should return null for invalid header format', () => {
        const token = extractTokenFromHeader('Invalid my-token');
        expect(token).toBeNull();
    });
  });
});
