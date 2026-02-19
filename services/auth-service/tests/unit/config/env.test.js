/**
 * Unit Tests for Environment Configuration
 */

describe('Environment Configuration - Unit Tests', () => {
  let originalEnv;
  let originalConsoleError;
  let originalConsoleWarn;
  let originalProcessExit;

  beforeEach(() => {
    // Save original values
    originalEnv = { ...process.env };
    originalConsoleError = console.error;
    originalConsoleWarn = console.warn;
    originalProcessExit = process.exit;

    // Mock console methods
    console.error = jest.fn();
    console.warn = jest.fn();
    process.exit = jest.fn();

    // Clear module cache
    jest.resetModules();
  });

  afterEach(() => {
    // Restore original values
    process.env = originalEnv;
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
    process.exit = originalProcessExit;
  });

  describe('Configuration Loading', () => {
    it('should load default configuration values', () => {
      const config = require('../../../src/config/env');

      expect(config).toBeDefined();
      expect(config.app).toBeDefined();
      expect(config.jwt).toBeDefined();
      expect(config.mongodb).toBeDefined();
      expect(config.cors).toBeDefined();
      expect(config.rateLimit).toBeDefined();
    });

    it('should use environment variables when available', () => {
      process.env.NODE_ENV = 'production';
      process.env.PORT = '5000';
      process.env.SERVICE_NAME = 'custom-auth-service';

      const config = require('../../../src/config/env');

      expect(config.app.env).toBe('production');
      expect(config.app.port).toBe(5000);
      expect(config.app.name).toBe('custom-auth-service');
    });

    it('should use default values when env vars not set', () => {
      delete process.env.NODE_ENV;
      delete process.env.PORT;
      delete process.env.SERVICE_NAME;

      const config = require('../../../src/config/env');

      expect(config.app.env).toBe('development');
      expect(config.app.port).toBe(4001);
      expect(config.app.name).toBe('auth-service');
    });
  });

  describe('App Configuration', () => {
    it('should parse port as integer', () => {
      process.env.PORT = '3000';

      const config = require('../../../src/config/env');

      expect(config.app.port).toBe(3000);
      expect(typeof config.app.port).toBe('number');
    });

    it('should handle invalid port gracefully', () => {
      process.env.PORT = 'invalid';

      const config = require('../../../src/config/env');

      expect(config.app.port).toBe(NaN);
    });

    it('should set environment from NODE_ENV', () => {
      process.env.NODE_ENV = 'staging';

      const config = require('../../../src/config/env');

      expect(config.app.env).toBe('staging');
    });
  });

  describe('JWT Configuration', () => {
    it('should load JWT secrets from environment', () => {
      process.env.JWT_ACCESS_SECRET = 'test_access_secret';
      process.env.JWT_REFRESH_SECRET = 'test_refresh_secret';

      const config = require('../../../src/config/env');

      expect(config.jwt.accessSecret).toBe('test_access_secret');
      expect(config.jwt.refreshSecret).toBe('test_refresh_secret');
    });

    it('should use fallback secrets when not set', () => {
      delete process.env.JWT_ACCESS_SECRET;
      delete process.env.JWT_REFRESH_SECRET;

      const config = require('../../../src/config/env');

      expect(config.jwt.accessSecret).toBe('fallback_access_secret');
      expect(config.jwt.refreshSecret).toBe('fallback_refresh_secret');
    });

    it('should load JWT issuer from environment', () => {
      process.env.JWT_ISSUER = 'custom-issuer';

      const config = require('../../../src/config/env');

      expect(config.jwt.issuer).toBe('custom-issuer');
    });

    it('should load token expiry times', () => {
      process.env.ACCESS_TOKEN_EXPIRY = '30m';
      process.env.REFRESH_TOKEN_EXPIRY = '14d';

      const config = require('../../../src/config/env');

      expect(config.jwt.accessTokenExpiry).toBe('30m');
      expect(config.jwt.refreshTokenExpiry).toBe('14d');
    });

    it('should use default expiry times when not set', () => {
      delete process.env.ACCESS_TOKEN_EXPIRY;
      delete process.env.REFRESH_TOKEN_EXPIRY;

      const config = require('../../../src/config/env');

      expect(config.jwt.accessTokenExpiry).toBe('500m');
      expect(config.jwt.refreshTokenExpiry).toBe('7d');
    });
  });

  describe('MongoDB Configuration', () => {
    it('should load MongoDB URI from environment', () => {
      process.env.MONGODB_URI = 'mongodb://custom:27017/db';

      const config = require('../../../src/config/env');

      expect(config.mongodb.uri).toBe('mongodb://custom:27017/db');
    });

    it('should use default MongoDB URI when not set', () => {
      delete process.env.MONGODB_URI;

      const config = require('../../../src/config/env');

      expect(config.mongodb.uri).toBe('mongodb://localhost:27017/smart_appointment_auth');
    });

    it('should load test MongoDB URI', () => {
      process.env.MONGODB_TEST_URI = 'mongodb://test:27017/test_db';

      const config = require('../../../src/config/env');

      expect(config.mongodb.testUri).toBe('mongodb://test:27017/test_db');
    });

    it('should use default test URI when not set', () => {
      delete process.env.MONGODB_TEST_URI;

      const config = require('../../../src/config/env');

      expect(config.mongodb.testUri).toBe('mongodb://localhost:27017/smart_appointment_auth_test');
    });
  });

  describe('CORS Configuration', () => {
    it('should load CORS origin from environment', () => {
      process.env.CORS_ORIGIN = 'http://example.com,http://test.com';

      const config = require('../../../src/config/env');

      expect(config.cors.origin).toBe('http://example.com,http://test.com');
    });

    it('should use default CORS origin when not set', () => {
      delete process.env.CORS_ORIGIN;

      const config = require('../../../src/config/env');

      expect(config.cors.origin).toBe('http://localhost:3000,http://localhost:19006');
    });

    it('should parse CORS credentials as boolean', () => {
      process.env.CORS_CREDENTIALS = 'true';

      const config = require('../../../src/config/env');

      expect(config.cors.credentials).toBe(true);
    });

    it('should default CORS credentials to false', () => {
      delete process.env.CORS_CREDENTIALS;

      const config = require('../../../src/config/env');

      expect(config.cors.credentials).toBe(false);
    });
  });

  describe('Rate Limit Configuration', () => {
    it('should parse rate limit window as integer', () => {
      process.env.RATE_LIMIT_WINDOW_MS = '600000';

      const config = require('../../../src/config/env');

      expect(config.rateLimit.windowMs).toBe(600000);
      expect(typeof config.rateLimit.windowMs).toBe('number');
    });

    it('should use default window when not set', () => {
      delete process.env.RATE_LIMIT_WINDOW_MS;

      const config = require('../../../src/config/env');

      expect(config.rateLimit.windowMs).toBe(900000);
    });

    it('should parse max requests as integer', () => {
      process.env.RATE_LIMIT_MAX_REQUESTS = '500';

      const config = require('../../../src/config/env');

      expect(config.rateLimit.maxRequests).toBe(500);
      expect(typeof config.rateLimit.maxRequests).toBe('number');
    });

    it('should use default max requests when not set', () => {
      delete process.env.RATE_LIMIT_MAX_REQUESTS;

      const config = require('../../../src/config/env');

      expect(config.rateLimit.maxRequests).toBe(1000);
    });
  });

  describe('Logging Configuration', () => {
    it('should load log level from environment', () => {
      process.env.LOG_LEVEL = 'debug';

      const config = require('../../../src/config/env');

      expect(config.logging.level).toBe('debug');
    });

    it('should use default log level when not set', () => {
      delete process.env.LOG_LEVEL;

      const config = require('../../../src/config/env');

      expect(config.logging.level).toBe('info');
    });
  });

  describe('Helper Methods', () => {
    it('isDevelopment should return true when env is development', () => {
      process.env.NODE_ENV = 'development';

      const config = require('../../../src/config/env');

      expect(config.isDevelopment()).toBe(true);
      expect(config.isProduction()).toBe(false);
      expect(config.isTest()).toBe(false);
    });

    it('isProduction should return true when env is production', () => {
      process.env.NODE_ENV = 'production';

      const config = require('../../../src/config/env');

      expect(config.isDevelopment()).toBe(false);
      expect(config.isProduction()).toBe(true);
      expect(config.isTest()).toBe(false);
    });

    it('isTest should return true when env is test', () => {
      process.env.NODE_ENV = 'test';

      const config = require('../../../src/config/env');

      expect(config.isDevelopment()).toBe(false);
      expect(config.isProduction()).toBe(false);
      expect(config.isTest()).toBe(true);
    });
  });

  describe('Configuration Validation', () => {
    it('should warn about fallback secrets in development', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.JWT_ACCESS_SECRET;
      delete process.env.JWT_REFRESH_SECRET;

      const config = require('../../../src/config/env');
      config.validateConfig();

      expect(console.warn).toHaveBeenCalled();
    });

    it('should exit in production with missing secrets', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.JWT_ACCESS_SECRET;
      delete process.env.JWT_REFRESH_SECRET;
      delete process.env.MONGODB_URI;

      const config = require('../../../src/config/env');
      config.validateConfig();

      expect(console.error).toHaveBeenCalled();
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should not exit in development with missing config', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.JWT_ACCESS_SECRET;

      const config = require('../../../src/config/env');
      config.validateConfig();

      expect(process.exit).not.toHaveBeenCalled();
    });

    it('should validate JWT_ACCESS_SECRET', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.JWT_ACCESS_SECRET;

      const config = require('../../../src/config/env');
      config.validateConfig();

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Configuration validation failed')
      );
    });

    it('should validate JWT_REFRESH_SECRET', () => {
      process.env.NODE_ENV = 'production';
      process.env.JWT_ACCESS_SECRET = 'valid_secret';
      delete process.env.JWT_REFRESH_SECRET;

      const config = require('../../../src/config/env');
      config.validateConfig();

      expect(console.error).toHaveBeenCalled();
    });

    it('should validate MONGODB_URI', () => {
      process.env.NODE_ENV = 'production';
      process.env.JWT_ACCESS_SECRET = 'valid_secret';
      process.env.JWT_REFRESH_SECRET = 'valid_secret';
      delete process.env.MONGODB_URI;

      const config = require('../../../src/config/env');
      config.validateConfig();

      expect(console.error).toHaveBeenCalled();
    });

    it('should pass validation with all required config in production', () => {
      process.env.NODE_ENV = 'production';
      process.env.JWT_ACCESS_SECRET = 'production_access_secret';
      process.env.JWT_REFRESH_SECRET = 'production_refresh_secret';
      process.env.MONGODB_URI = 'mongodb://prod:27017/db';

      require('../../../src/config/env');

      expect(process.exit).not.toHaveBeenCalled();
    });
  });

  describe('Module Exports', () => {
    it('should export validateConfig function', () => {
      const config = require('../../../src/config/env');

      expect(config.validateConfig).toBeDefined();
      expect(typeof config.validateConfig).toBe('function');
    });

    it('should export all configuration sections', () => {
      const config = require('../../../src/config/env');

      expect(config).toHaveProperty('app');
      expect(config).toHaveProperty('jwt');
      expect(config).toHaveProperty('mongodb');
      expect(config).toHaveProperty('cors');
      expect(config).toHaveProperty('rateLimit');
      expect(config).toHaveProperty('logging');
    });
  });
});
