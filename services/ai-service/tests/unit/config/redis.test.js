/**
 * Unit Tests for Redis Client
 */

// Mock dependencies before requiring modules
jest.mock('ioredis');
jest.mock('../../../src/utils/logger');

const Redis = require('ioredis');
let config;

describe('RedisClient', () => {
  let redisClient;
  let mockRedisInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    // Avoid resetting modules here to keep jest.mock mocks stable

    // Mock Redis instance
    mockRedisInstance = {
      on: jest.fn(),
      connect: jest.fn().mockResolvedValue(true),
      get: jest.fn(),
      set: jest.fn(),
      setex: jest.fn(),
      del: jest.fn(),
      quit: jest.fn().mockResolvedValue(true),
    };

    Redis.mockImplementation(() => mockRedisInstance);

    // Require fresh config and instance after mocks
    config = require('../../../src/config');
    redisClient = require('../../../src/config/redis');
  });

  describe('connect', () => {
    it('should initialize Redis client with correct config', () => {
      redisClient.connect();

      expect(Redis).toHaveBeenCalledWith(
        expect.objectContaining({
          host: config.redis.host,
          port: config.redis.port,
          db: config.redis.db,
          lazyConnect: true,
        })
      );
    });

    it('should set up event listeners', () => {
      redisClient.connect();

      expect(mockRedisInstance.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockRedisInstance.on).toHaveBeenCalledWith('ready', expect.any(Function));
      expect(mockRedisInstance.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockRedisInstance.on).toHaveBeenCalledWith('close', expect.any(Function));
    });

    it('should handle connection success', () => {
      redisClient.connect();

      // Trigger connect event
      const connectHandler = mockRedisInstance.on.mock.calls.find(
        call => call[0] === 'connect'
      )[1];
      connectHandler();

      expect(redisClient.isConnected).toBe(true);
    });

    it('should handle ready event', () => {
      redisClient.connect();

      // Trigger ready event
      const readyHandler = mockRedisInstance.on.mock.calls.find(
        call => call[0] === 'ready'
      )[1];
      readyHandler();

      expect(redisClient.isConnected).toBe(true);
    });

    it('should handle connection error', () => {
      redisClient.connect();

      // Trigger error event
      const errorHandler = mockRedisInstance.on.mock.calls.find(
        call => call[0] === 'error'
      )[1];
      errorHandler(new Error('Connection failed'));

      expect(redisClient.isConnected).toBe(false);
    });

    it('should handle ECONNREFUSED error', () => {
      redisClient.connect();

      const errorHandler = mockRedisInstance.on.mock.calls.find(
        call => call[0] === 'error'
      )[1];
      errorHandler({ code: 'ECONNREFUSED' });

      expect(redisClient.isConnected).toBe(false);
    });

    it('should handle close event', () => {
      redisClient.connect();

      const closeHandler = mockRedisInstance.on.mock.calls.find(
        call => call[0] === 'close'
      )[1];
      closeHandler();

      expect(redisClient.isConnected).toBe(false);
    });

    it('should handle connection failure gracefully', () => {
      mockRedisInstance.connect.mockRejectedValue(new Error('Connection failed'));

      redisClient.connect();

      expect(redisClient.isConnected).toBe(false);
    });

    it('should handle initialization error', () => {
      Redis.mockImplementation(() => {
        throw new Error('Redis initialization failed');
      });

      const result = redisClient.connect();

      expect(result).toBeNull();
      expect(redisClient.isConnected).toBe(false);
    });
  });

  describe('get', () => {
    beforeEach(() => {
      redisClient.connect();
      redisClient.isConnected = true;
    });

    it('should get data from Redis successfully', async () => {
      const mockData = { name: 'Test', value: 123 };
      mockRedisInstance.get.mockResolvedValue(JSON.stringify(mockData));

      const result = await redisClient.get('test-key');

      expect(result).toEqual(mockData);
      expect(mockRedisInstance.get).toHaveBeenCalledWith('test-key');
    });

    it('should return null for non-existent key', async () => {
      mockRedisInstance.get.mockResolvedValue(null);

      const result = await redisClient.get('non-existent');

      expect(result).toBeNull();
    });

    it('should return null when Redis not connected', async () => {
      redisClient.isConnected = false;

      const result = await redisClient.get('test-key');

      expect(result).toBeNull();
      expect(mockRedisInstance.get).not.toHaveBeenCalled();
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedisInstance.get.mockRejectedValue(new Error('Redis error'));

      const result = await redisClient.get('test-key');

      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    beforeEach(() => {
      redisClient.connect();
      redisClient.isConnected = true;
    });

    it('should set data in Redis without TTL', async () => {
      mockRedisInstance.set.mockResolvedValue('OK');

      const result = await redisClient.set('test-key', { value: 'test' });

      expect(result).toBe(true);
      expect(mockRedisInstance.set).toHaveBeenCalledWith(
        'test-key',
        JSON.stringify({ value: 'test' })
      );
    });

    it('should set data in Redis with TTL', async () => {
      mockRedisInstance.setex.mockResolvedValue('OK');

      const result = await redisClient.set('test-key', { value: 'test' }, 3600);

      expect(result).toBe(true);
      expect(mockRedisInstance.setex).toHaveBeenCalledWith(
        'test-key',
        3600,
        JSON.stringify({ value: 'test' })
      );
    });

    it('should return false when Redis not connected', async () => {
      redisClient.isConnected = false;

      const result = await redisClient.set('test-key', { value: 'test' });

      expect(result).toBe(false);
      expect(mockRedisInstance.set).not.toHaveBeenCalled();
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedisInstance.set.mockRejectedValue(new Error('Redis error'));

      const result = await redisClient.set('test-key', { value: 'test' });

      expect(result).toBe(false);
    });
  });

  describe('del', () => {
    beforeEach(() => {
      redisClient.connect();
      redisClient.isConnected = true;
    });

    it('should delete key from Redis', async () => {
      mockRedisInstance.del.mockResolvedValue(1);

      const result = await redisClient.del('test-key');

      expect(result).toBe(true);
      expect(mockRedisInstance.del).toHaveBeenCalledWith('test-key');
    });

    it('should return false when Redis not connected', async () => {
      redisClient.isConnected = false;

      const result = await redisClient.del('test-key');

      expect(result).toBe(false);
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedisInstance.del.mockRejectedValue(new Error('Redis error'));

      const result = await redisClient.del('test-key');

      expect(result).toBe(false);
    });
  });

  describe('storeContext', () => {
    beforeEach(() => {
      redisClient.connect();
      redisClient.isConnected = true;
    });

    it('should store conversation context', async () => {
      const existingContext = [
        { role: 'user', content: 'Hello', timestamp: '2026-01-01T00:00:00.000Z' },
      ];
      mockRedisInstance.get.mockResolvedValue(JSON.stringify(existingContext));
      mockRedisInstance.setex.mockResolvedValue('OK');

      const message = { role: 'assistant', content: 'Hi there!' };
      const result = await redisClient.storeContext('user-123', message);

      expect(result).toHaveLength(2);
      expect(result[1]).toMatchObject({
        role: 'assistant',
        content: 'Hi there!',
      });
      expect(result[1].timestamp).toBeDefined();
    });

    it('should create new context if none exists', async () => {
      mockRedisInstance.get.mockResolvedValue(null);
      mockRedisInstance.setex.mockResolvedValue('OK');

      const message = { role: 'user', content: 'Hello' };
      const result = await redisClient.storeContext('user-123', message);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject(message);
    });

    it('should trim context to max messages', async () => {
      const largeContext = Array(15).fill(null).map((_, i) => ({
        role: 'user',
        content: `Message ${i}`,
        timestamp: new Date().toISOString(),
      }));
      mockRedisInstance.get.mockResolvedValue(JSON.stringify(largeContext));
      mockRedisInstance.setex.mockResolvedValue('OK');

      const message = { role: 'user', content: 'New message' };
      const result = await redisClient.storeContext('user-123', message);

      expect(result.length).toBeLessThanOrEqual(config.context.maxMessages);
    });

    it('should return null when Redis not connected', async () => {
      redisClient.isConnected = false;

      const message = { role: 'user', content: 'Hello' };
      const result = await redisClient.storeContext('user-123', message);

      expect(result).toBeNull();
    });
  });

  describe('getContext', () => {
    beforeEach(() => {
      redisClient.connect();
      redisClient.isConnected = true;
    });

    it('should get conversation context', async () => {
      const mockContext = [
        { role: 'user', content: 'Hello', timestamp: '2026-01-01T00:00:00.000Z' },
        { role: 'assistant', content: 'Hi!', timestamp: '2026-01-01T00:00:01.000Z' },
      ];
      mockRedisInstance.get.mockResolvedValue(JSON.stringify(mockContext));

      const result = await redisClient.getContext('user-123');

      expect(result).toEqual(mockContext);
      expect(mockRedisInstance.get).toHaveBeenCalledWith('chat:context:user-123');
    });

    it('should return empty array for non-existent context', async () => {
      mockRedisInstance.get.mockResolvedValue(null);

      const result = await redisClient.getContext('user-123');

      expect(result).toEqual([]);
    });

    it('should return empty array when Redis not connected', async () => {
      redisClient.isConnected = false;

      const result = await redisClient.getContext('user-123');

      expect(result).toEqual([]);
    });
  });

  describe('clearContext', () => {
    beforeEach(() => {
      redisClient.connect();
      redisClient.isConnected = true;
    });

    it('should clear conversation context', async () => {
      mockRedisInstance.del.mockResolvedValue(1);

      const result = await redisClient.clearContext('user-123');

      expect(result).toBe(true);
      expect(mockRedisInstance.del).toHaveBeenCalledWith('chat:context:user-123');
    });

    it('should return true when Redis not connected', async () => {
      redisClient.isConnected = false;

      const result = await redisClient.clearContext('user-123');

      expect(result).toBe(true);
    });
  });

  describe('cacheDoctorSearch', () => {
    beforeEach(() => {
      redisClient.connect();
      redisClient.isConnected = true;
    });

    it('should cache doctor search results', async () => {
      mockRedisInstance.setex.mockResolvedValue('OK');

      const doctors = [{ id: 'doc-1', name: 'Dr. Smith' }];
      const result = await redisClient.cacheDoctorSearch('Cardiology', doctors);

      expect(result).toBe(true);
      expect(mockRedisInstance.setex).toHaveBeenCalledWith(
        'doctor:search:cardiology',
        config.cache.doctorSearch,
        JSON.stringify(doctors)
      );
    });
  });

  describe('getCachedDoctorSearch', () => {
    beforeEach(() => {
      redisClient.connect();
      redisClient.isConnected = true;
    });

    it('should get cached doctor search results', async () => {
      const mockDoctors = [{ id: 'doc-1', name: 'Dr. Smith' }];
      mockRedisInstance.get.mockResolvedValue(JSON.stringify(mockDoctors));

      const result = await redisClient.getCachedDoctorSearch('Cardiology');

      expect(result).toEqual(mockDoctors);
      expect(mockRedisInstance.get).toHaveBeenCalledWith('doctor:search:cardiology');
    });
  });

  describe('cacheUserAppointments', () => {
    beforeEach(() => {
      redisClient.connect();
      redisClient.isConnected = true;
    });

    it('should cache user appointments', async () => {
      mockRedisInstance.setex.mockResolvedValue('OK');

      const appointments = [{ id: 'apt-1', doctorId: 'doc-1' }];
      const result = await redisClient.cacheUserAppointments('user-123', appointments);

      expect(result).toBe(true);
      expect(mockRedisInstance.setex).toHaveBeenCalledWith(
        'appointments:user:user-123',
        config.cache.appointment,
        JSON.stringify(appointments)
      );
    });
  });

  describe('getCachedUserAppointments', () => {
    beforeEach(() => {
      redisClient.connect();
      redisClient.isConnected = true;
    });

    it('should get cached user appointments', async () => {
      const mockAppointments = [{ id: 'apt-1', doctorId: 'doc-1' }];
      mockRedisInstance.get.mockResolvedValue(JSON.stringify(mockAppointments));

      const result = await redisClient.getCachedUserAppointments('user-123');

      expect(result).toEqual(mockAppointments);
      expect(mockRedisInstance.get).toHaveBeenCalledWith('appointments:user:user-123');
    });
  });

  describe('invalidateUserAppointments', () => {
    beforeEach(() => {
      redisClient.connect();
      redisClient.isConnected = true;
    });

    it('should invalidate user appointments cache', async () => {
      mockRedisInstance.del.mockResolvedValue(1);

      const result = await redisClient.invalidateUserAppointments('user-123');

      expect(result).toBe(true);
      expect(mockRedisInstance.del).toHaveBeenCalledWith('appointments:user:user-123');
    });
  });

  describe('disconnect', () => {
    it('should disconnect from Redis', async () => {
      redisClient.connect();
      redisClient.isConnected = true;
      mockRedisInstance.quit.mockResolvedValue('OK');

      await redisClient.disconnect();

      expect(mockRedisInstance.quit).toHaveBeenCalled();
      expect(redisClient.isConnected).toBe(false);
    });

    it('should handle disconnect when not connected', async () => {
      redisClient.isConnected = false;

      await redisClient.disconnect();

      expect(mockRedisInstance.quit).not.toHaveBeenCalled();
    });

    it('should handle disconnect errors gracefully', async () => {
      redisClient.connect();
      redisClient.isConnected = true;
      mockRedisInstance.quit.mockRejectedValue(new Error('Disconnect failed'));

      await redisClient.disconnect();

      // Should not throw
      expect(true).toBe(true);
    });
  });
});