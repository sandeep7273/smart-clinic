/**
 * Unit Tests for Database Configuration
 */

const mongoose = require('mongoose');

// Mock dependencies
jest.mock('mongoose', () => ({
  connect: jest.fn(),
  connection: {
    close: jest.fn(),
    on: jest.fn(),
    host: 'localhost',
  },
}));

jest.mock('../../../src/utils/logger.util', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

jest.mock('../../../src/config/env', () => ({
  mongodb: {
    uri: 'mongodb://localhost:27017/test_db',
    testUri: 'mongodb://localhost:27017/test_db_test',
  },
  isTest: jest.fn(() => false),
}));

const logger = require('../../../src/utils/logger.util');
const config = require('../../../src/config/env');

describe('Database Configuration - Unit Tests', () => {
  let database;
  let originalProcessExit;
  let originalProcessOn;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    
    // Mock process.exit
    originalProcessExit = process.exit;
    process.exit = jest.fn();
    
    // Mock process.on
    originalProcessOn = process.on;
    process.on = jest.fn();
    
    // Require fresh instance
    database = require('../../../src/config/database');
  });

  afterEach(() => {
    process.exit = originalProcessExit;
    process.on = originalProcessOn;
  });

  describe('connectDatabase', () => {
    it('should connect to MongoDB successfully', async () => {
      mongoose.connect.mockResolvedValue(true);

      await database.connectDatabase();

      expect(mongoose.connect).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('MongoDB connected')
      );
    });

    it('should use production URI when not in test mode', async () => {
      config.isTest.mockReturnValue(false);
      mongoose.connect.mockResolvedValue(true);

      await database.connectDatabase();

      expect(mongoose.connect).toHaveBeenCalledWith(
        'mongodb://localhost:27017/test_db',
        expect.any(Object)
      );
    });

    it('should use test URI when in test mode', async () => {
      config.isTest.mockReturnValue(true);
      mongoose.connect.mockResolvedValue(true);

      await database.connectDatabase();

      expect(mongoose.connect).toHaveBeenCalledWith(
        'mongodb://localhost:27017/test_db_test',
        expect.any(Object)
      );
    });

    it('should pass connection options to mongoose', async () => {
      mongoose.connect.mockResolvedValue(true);

      await database.connectDatabase();

      expect(mongoose.connect).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          maxPoolSize: 10,
          serverSelectionTimeoutMS: 5000,
          socketTimeoutMS: 45000,
        })
      );
    });

    it('should set up connection event handlers', async () => {
      mongoose.connect.mockResolvedValue(true);

      await database.connectDatabase();

      expect(mongoose.connection.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mongoose.connection.on).toHaveBeenCalledWith('disconnected', expect.any(Function));
      expect(mongoose.connection.on).toHaveBeenCalledWith('reconnected', expect.any(Function));
    });

    it('should log error on connection error event', async () => {
      mongoose.connect.mockResolvedValue(true);
      let errorHandler;

      mongoose.connection.on.mockImplementation((event, handler) => {
        if (event === 'error') {
          errorHandler = handler;
        }
      });

      await database.connectDatabase();

      const testError = new Error('Connection error');
      errorHandler(testError);

      expect(logger.error).toHaveBeenCalledWith('MongoDB connection error:', testError);
    });

    it('should log warning on disconnection', async () => {
      mongoose.connect.mockResolvedValue(true);
      let disconnectHandler;

      mongoose.connection.on.mockImplementation((event, handler) => {
        if (event === 'disconnected') {
          disconnectHandler = handler;
        }
      });

      await database.connectDatabase();
      disconnectHandler();

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('MongoDB disconnected')
      );
    });

    it('should log info on reconnection', async () => {
      mongoose.connect.mockResolvedValue(true);
      let reconnectHandler;

      mongoose.connection.on.mockImplementation((event, handler) => {
        if (event === 'reconnected') {
          reconnectHandler = handler;
        }
      });

      await database.connectDatabase();
      reconnectHandler();

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('MongoDB reconnected')
      );
    });

    it('should set up SIGINT handler for graceful shutdown', async () => {
      mongoose.connect.mockResolvedValue(true);

      await database.connectDatabase();

      expect(process.on).toHaveBeenCalledWith('SIGINT', expect.any(Function));
    });

    it('should close connection on SIGINT', async () => {
      mongoose.connect.mockResolvedValue(true);
      mongoose.connection.close.mockResolvedValue(true);
      let sigintHandler;

      process.on.mockImplementation((event, handler) => {
        if (event === 'SIGINT') {
          sigintHandler = handler;
        }
      });

      await database.connectDatabase();
      await sigintHandler();

      expect(mongoose.connection.close).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('MongoDB connection closed')
      );
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('should log error and exit on connection failure', async () => {
      const connectionError = new Error('Connection failed');
      mongoose.connect.mockRejectedValue(connectionError);

      await database.connectDatabase();

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('MongoDB connection failed'),
        connectionError
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should include database host in success log', async () => {
      mongoose.connect.mockResolvedValue(true);
      mongoose.connection.host = 'test-host';

      await database.connectDatabase();

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('test-host')
      );
    });
  });

  describe('disconnectDatabase', () => {
    it('should close MongoDB connection successfully', async () => {
      mongoose.connection.close.mockResolvedValue(true);

      await database.disconnectDatabase();

      expect(mongoose.connection.close).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('MongoDB connection closed')
      );
    });

    it('should log error if disconnection fails', async () => {
      const disconnectError = new Error('Disconnect failed');
      mongoose.connection.close.mockRejectedValue(disconnectError);

      await database.disconnectDatabase();

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error closing MongoDB connection'),
        disconnectError
      );
    });

    it('should not throw error on disconnection failure', async () => {
      mongoose.connection.close.mockRejectedValue(new Error('Disconnect failed'));

      await expect(database.disconnectDatabase()).resolves.not.toThrow();
    });
  });

  describe('Module Exports', () => {
    it('should export connectDatabase function', () => {
      expect(database.connectDatabase).toBeDefined();
      expect(typeof database.connectDatabase).toBe('function');
    });

    it('should export disconnectDatabase function', () => {
      expect(database.disconnectDatabase).toBeDefined();
      expect(typeof database.disconnectDatabase).toBe('function');
    });
  });

  describe('Connection Options', () => {
    it('should set appropriate maxPoolSize', async () => {
      mongoose.connect.mockResolvedValue(true);

      await database.connectDatabase();

      const options = mongoose.connect.mock.calls[0][1];
      expect(options.maxPoolSize).toBe(10);
    });

    it('should set server selection timeout', async () => {
      mongoose.connect.mockResolvedValue(true);

      await database.connectDatabase();

      const options = mongoose.connect.mock.calls[0][1];
      expect(options.serverSelectionTimeoutMS).toBe(5000);
    });

    it('should set socket timeout', async () => {
      mongoose.connect.mockResolvedValue(true);

      await database.connectDatabase();

      const options = mongoose.connect.mock.calls[0][1];
      expect(options.socketTimeoutMS).toBe(45000);
    });
  });

  describe('Error Handling', () => {
    it('should handle connection errors gracefully', async () => {
      mongoose.connect.mockRejectedValue(new Error('Network error'));

      await database.connectDatabase();

      expect(logger.error).toHaveBeenCalled();
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should handle timeout errors', async () => {
      mongoose.connect.mockRejectedValue(new Error('Connection timeout'));

      await database.connectDatabase();

      expect(logger.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          message: 'Connection timeout',
        })
      );
    });
  });
});
