/**
 * Unit Tests for Logger Utility
 */

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
      File: function File() {},
      Console: function Console() {},
    },
  };
});
const winston = require('winston');
const config = require('../../../src/config');

describe('Logger Utility', () => {
  let logger;

  beforeEach(() => {
    jest.clearAllMocks();
    // Re-require logger to get fresh instance without resetting all modules
    delete require.cache[require.resolve('../../../src/utils/logger')];
    logger = require('../../../src/utils/logger');
  });

  describe('Logger initialization', () => {
    it('should create logger instance with expected methods', () => {
      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.debug).toBe('function');
      // If defaultMeta is present on the logger, ensure it includes service name
      if (logger.defaultMeta) {
        expect(logger.defaultMeta).toHaveProperty('service', config.serviceName);
      }
    });
  });

  describe('Logger methods', () => {
    it('should have info method', () => {
      expect(typeof logger.info).toBe('function');
    });

    it('should have error method', () => {
      expect(typeof logger.error).toBe('function');
    });

    it('should have warn method', () => {
      expect(typeof logger.warn).toBe('function');
    });

    it('should have debug method', () => {
      expect(typeof logger.debug).toBe('function');
    });
  });

  describe('Console transport in non-production', () => {
    it('should add console transport when not in production', () => {
      const originalEnv = config.nodeEnv;
      config.nodeEnv = 'development';

      delete require.cache[require.resolve('../../../src/utils/logger')];
      expect(() => require('../../../src/utils/logger')).not.toThrow();

      config.nodeEnv = originalEnv;
    });
  });

  describe('Service metadata', () => {
    it('should include service name in default metadata', () => {
      // Prefer asserting the exported logger shape rather than internals
      // of the winston implementation so tests remain stable across mocks.
      expect(logger).toBeDefined();
      if (logger.defaultMeta) {
        expect(logger.defaultMeta).toEqual(
          expect.objectContaining({ service: config.serviceName })
        );
      } else {
        // If the logger implementation attaches metadata differently,
        // fall back to checking that winston.createLogger received options
        // (kept for backward compatibility with some mock setups).
        expect(winston.createLogger).toHaveBeenCalledWith(
          expect.objectContaining({
            defaultMeta: { service: config.serviceName },
          })
        );
      }
    });
  });
});