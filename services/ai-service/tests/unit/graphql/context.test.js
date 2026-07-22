/**
 * Unit Tests for GraphQL Context
 */

const createContext = require('../../../src/graphql/context');
const { validateToken, extractTokenFromHeader } = require('../../../src/utils/auth');

// Mock dependencies
jest.mock('../../../src/utils/auth');

describe('GraphQL Context', () => {
  let mockReq;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      headers: {
        'user-agent': 'test-agent',
        'x-correlation-id': 'test-correlation-id',
        'x-causation-id': 'test-causation-id',
      },
      ip: '127.0.0.1',
      connection: {
        remoteAddress: '192.168.1.1',
      },
      id: 'req-123',
    };
  });

  describe('createContext', () => {
    it('should create context with user when valid token provided', async () => {
      const mockToken = 'valid-token-123';
      const mockDecodedUser = {
        id: 'user-123',
        email: 'test@example.com',
        role: ['patient'],
        tenantId: 'tenant-1',
        phoneNumber: '+1234567890',
      };

      mockReq.headers.authorization = `Bearer ${mockToken}`;
      extractTokenFromHeader.mockReturnValue(mockToken);
      validateToken.mockResolvedValue(mockDecodedUser);

      const context = await createContext({ req: mockReq });

      expect(context.user).toEqual({
        userId: 'user-123',
        email: 'test@example.com',
        role: ['patient'],
        tenantId: 'tenant-1',
        phone: '+1234567890',
      });
      expect(context.token).toBe(mockToken);
      expect(extractTokenFromHeader).toHaveBeenCalledWith(`Bearer ${mockToken}`);
      expect(validateToken).toHaveBeenCalledWith(mockToken);
    });

    it('should create context without user when no token provided', async () => {
      const context = await createContext({ req: mockReq });

      expect(context.user).toBeNull();
      expect(context.token).toBeNull();
      expect(validateToken).not.toHaveBeenCalled();
    });

    it('should create context without user when token validation fails', async () => {
      const mockToken = 'invalid-token';
      mockReq.headers.authorization = `Bearer ${mockToken}`;
      extractTokenFromHeader.mockReturnValue(mockToken);
      validateToken.mockRejectedValue(new Error('Invalid token'));

      const context = await createContext({ req: mockReq });

      expect(context.user).toBeNull();
      expect(context.token).toBeNull();
    });

    it('should include request metadata in context', async () => {
      const context = await createContext({ req: mockReq });

      expect(context.userAgent).toBe('test-agent');
      expect(context.ip).toBe('127.0.0.1');
      expect(context.requestId).toBe('req-123');
      expect(context.correlationId).toBe('test-correlation-id');
      expect(context.causationId).toBe('test-causation-id');
      expect(context.timestamp).toBeDefined();
    });

    it('should use remoteAddress when ip not available', async () => {
      delete mockReq.ip;

      const context = await createContext({ req: mockReq });

      expect(context.ip).toBe('192.168.1.1');
    });

    it('should generate correlation ID when not provided', async () => {
      delete mockReq.headers['x-correlation-id'];
      delete mockReq.headers['x-request-id'];

      const context = await createContext({ req: mockReq });

      expect(context.correlationId).toBeDefined();
      expect(context.correlationId).toMatch(/^ai-/);
    });

    it('should use x-request-id as fallback for correlation ID', async () => {
      delete mockReq.headers['x-correlation-id'];
      mockReq.headers['x-request-id'] = 'request-id-123';

      const context = await createContext({ req: mockReq });

      expect(context.correlationId).toBe('request-id-123');
    });

    it('should set causationId to null when not provided', async () => {
      delete mockReq.headers['x-causation-id'];

      const context = await createContext({ req: mockReq });

      expect(context.causationId).toBeNull();
    });

    it('should handle user with null tenantId', async () => {
      const mockToken = 'valid-token';
      const mockDecodedUser = {
        id: 'user-123',
        email: 'test@example.com',
        role: ['patient'],
        tenantId: null,
        phoneNumber: '+1234567890',
      };

      mockReq.headers.authorization = `Bearer ${mockToken}`;
      extractTokenFromHeader.mockReturnValue(mockToken);
      validateToken.mockResolvedValue(mockDecodedUser);

      const context = await createContext({ req: mockReq });

      expect(context.user.tenantId).toBeNull();
    });

    it('should handle user with empty role array', async () => {
      const mockToken = 'valid-token';
      const mockDecodedUser = {
        id: 'user-123',
        email: 'test@example.com',
        phoneNumber: '+1234567890',
      };

      mockReq.headers.authorization = `Bearer ${mockToken}`;
      extractTokenFromHeader.mockReturnValue(mockToken);
      validateToken.mockResolvedValue(mockDecodedUser);

      const context = await createContext({ req: mockReq });

      expect(context.user.role).toEqual([]);
    });

    it('should handle extractTokenFromHeader returning null', async () => {
      mockReq.headers.authorization = 'InvalidFormat';
      extractTokenFromHeader.mockReturnValue(null);

      const context = await createContext({ req: mockReq });

      expect(context.user).toBeNull();
      expect(context.token).toBeNull();
      expect(validateToken).not.toHaveBeenCalled();
    });

    it('should include timestamp in ISO format', async () => {
      const context = await createContext({ req: mockReq });

      expect(context.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should handle multiple roles', async () => {
      const mockToken = 'valid-token';
      const mockDecodedUser = {
        id: 'user-123',
        email: 'admin@example.com',
        role: ['admin', 'doctor'],
        phoneNumber: '+1234567890',
      };

      mockReq.headers.authorization = `Bearer ${mockToken}`;
      extractTokenFromHeader.mockReturnValue(mockToken);
      validateToken.mockResolvedValue(mockDecodedUser);

      const context = await createContext({ req: mockReq });

      expect(context.user.role).toEqual(['admin', 'doctor']);
    });
  });

  describe('Context structure', () => {
    it('should have all required properties', async () => {
      const context = await createContext({ req: mockReq });

      expect(context).toHaveProperty('user');
      expect(context).toHaveProperty('userAgent');
      expect(context).toHaveProperty('ip');
      expect(context).toHaveProperty('requestId');
      expect(context).toHaveProperty('timestamp');
      expect(context).toHaveProperty('token');
      expect(context).toHaveProperty('correlationId');
      expect(context).toHaveProperty('causationId');
    });
  });
});