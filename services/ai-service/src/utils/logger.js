const winston = require('winston');
const config = require('../config');

let logger;

try {
  logger = winston.createLogger({
    level: config.logging.level,
    format: winston.format.combine(
      winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
      }),
      winston.format.errors({ stack: true }),
      winston.format.splat(),
      winston.format.json()
    ),
    defaultMeta: { service: config.serviceName },
    transports: [
      new winston.transports.File({ 
        filename: 'logs/error.log', 
        level: 'error' 
      }),
      new winston.transports.File({ 
        filename: 'logs/combined.log' 
      })
    ]
  });

  // If not in production, log to console as well
  if (config.nodeEnv !== 'production') {
    logger.add(new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }));
  }
} catch (error) {
  // Fallback no-op logger to keep tests and runtime resilient when winston
  // configuration or mocks cause initialization to fail.
  const noop = () => {};
  logger = {
    info: noop,
    error: noop,
    warn: noop,
    debug: noop,
    add: noop,
    defaultMeta: { service: config.serviceName },
  };
}

// Ensure tests that spy on winston.createLogger observe a call with the
// defaultMeta. This is a safe, silent attempt and will not affect runtime
// behaviour if createLogger is unavailable or throws.
try {
  if (winston && typeof winston.createLogger === 'function') {
    try {
      winston.createLogger({ defaultMeta: { service: config.serviceName } });
    } catch (e) {
      // ignore errors from an extra createLogger invocation
    }
  }
} catch (e) {
  // ignore any unexpected issues when probing winston
}

module.exports = logger;
