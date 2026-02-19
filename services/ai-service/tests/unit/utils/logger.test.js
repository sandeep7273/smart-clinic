/**
 * Unit Tests for Logger Utility
 */

const winston = require('winston');
const config = require('../../../src/config');

// Mock winston before requiring logger
jest.mock('winston', () => {
  const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    add: jest.fn(),
  };

  return {
    createLogger: jest.fn(() => mockLogger),
    format: {
      combine: jest.fn(),
      timestamp: jest.fn(),
      errors: jest.fn(),
      splat: jest.fn(),
      json: jest.fn(),
      colorize: jest.fn(),
      simple: jest.fn(),
    },
    transports: {
      File: jest.fn(),
      Console: jest.fn(),
    },
  };
});

describe('Logger Utility', () => {
  let logger;

  beforeEach(() => {
    jest.clearAllMocks();
    // Re-require logger to get fresh instance
    jest.resetModules();
    logger = require('../../../src/utils/logger');
  });

  describe('Logger initialization', () => {
    it('should create logger with correct configuration', () => {
      expect(winston.createLogger).toHaveBeenCalled();
      expect(winston.createLogger).toHaveBeenCalledWith(
        expect.objectContaining({
          level: config.logging.level,
          defaultMeta: { service: config.serviceName },
        })
      );
    });

    it('should configure timestamp format', () => {
      expect(winston.format.timestamp).toHaveBeenCalledWith({
        format: 'YYYY-MM-DD HH:mm:ss',
      });
    });

    it('should configure error format with stack traces', () => {
      expect(winston.format.errors).toHaveBeenCalledWith({ stack: true });
    });

    it('should use JSON format', () => {
      expect(winston.format.json).toHaveBeenCalled();
    });

    it('should configure file transports', () => {
      expect(winston.transports.File).toHaveBeenCalledWith({
        filename: 'logs/error.log',
        level: 'error',
      });
      expect(winston.transports.File).toHaveBeenCalledWith({
        filename: 'logs/combined.log',
      });
    });
  });

  describe('Logger methods', () => {
    it('should have info method', () => {
      expect(logger.info).toBeDefined();
      expect(typeof logger.info).toBe('function');
    });

    it('should have error method', () => {
      expect(logger.error).toBeDefined();
      expect(typeof logger.error).toBe('function');
    });

    it('should have warn method', () => {
      expect(logger.warn).toBeDefined();
      expect(typeof logger.warn).toBe('function');
    });

    it('should have debug method', () => {
      expect(logger.debug).toBeDefined();
      expect(typeof logger.debug).toBe('function');
    });
  });

  describe('Console transport in non-production', () => {
    it('should add console transport when not in production', () => {
      const originalEnv = config.nodeEnv;
      config.nodeEnv = 'development';

      jest.resetModules();
      require('../../../src/utils/logger');

      expect(winston.transports.Console).toHaveBeenCalled();

      config.nodeEnv = originalEnv;
    });
  });

  describe('Service metadata', () => {
    it('should include service name in default metadata', () => {
      expect(winston.createLogger).toHaveBeenCalledWith(
        expect.objectContaining({
          defaultMeta: { service: config.serviceName },
        })
      );
    });
  });
});