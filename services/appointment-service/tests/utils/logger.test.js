
const winston = require('winston');

const logger = require('../../src/utils/logger');

describe('Logger', () => {
  it('should be a winston logger instance', () => {
    expect(logger).toBeInstanceOf(winston.Logger);
  });

  it('should have the correct log level in development', () => {
    process.env.NODE_ENV = 'development';
    // Re-require the logger to re-evaluate the config
    jest.isolateModules(() => {

        const logger = require('../../src/utils/logger');
        expect(logger.level).toBe('debug');
      });
  });

  it('should have the correct log level in production', () => {
    process.env.NODE_ENV = 'production';
    jest.isolateModules(() => {

        const logger = require('../../src/utils/logger');
        expect(logger.level).toBe('info');
      });
  });
});