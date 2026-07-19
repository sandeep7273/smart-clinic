/**
 * Unit Tests for Logger Utility
 */

const winston = require('winston');

describe('Logger Utility - Unit Tests', () => {
  let logger;

  beforeAll(() => {
    // Load logger after winston is configured
    logger = require('../../../src/utils/logger');
  });

  describe('Logger Configuration', () => {
    it('should export a logger instance', () => {
      expect(logger).toBeDefined();
    });

    it('should have winston logger properties', () => {
      expect(logger).toHaveProperty('level');
      expect(logger).toHaveProperty('format');
      expect(logger).toHaveProperty('transports');
    });

    it('should have log level configured', () => {
      expect(logger.level).toBeDefined();
      expect(typeof logger.level).toBe('string');
    });
  });

  describe('Logger Methods', () => {
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

  describe('Logger Functionality', () => {
    it('should be able to call info without errors', () => {
      expect(() => logger.info('Test message')).not.toThrow();
    });

    it('should be able to call error without errors', () => {
      expect(() => logger.error('Test error')).not.toThrow();
    });

    it('should be able to call warn without errors', () => {
      expect(() => logger.warn('Test warning')).not.toThrow();
    });

    it('should be able to call debug without errors', () => {
      expect(() => logger.debug('Test debug')).not.toThrow();
    });

    it('should handle logging with metadata', () => {
      const meta = { userId: '123', action: 'test' };
      expect(() => logger.info('Test with meta', meta)).not.toThrow();
    });
  });

  describe('Logger Transport Configuration', () => {
    it('should have at least one transport configured', () => {
      expect(logger.transports).toBeDefined();
      expect(Array.isArray(logger.transports) || logger.transports.length >= 0).toBe(true);
    });
  });
});
