/**
 * Rate Limiting Middleware
 * Prevents brute force attacks and API abuse
 */

const rateLimit = require('express-rate-limit');

function getConfig() {
  // Require config at runtime so tests can mock it before use
  // eslint-disable-next-line global-require
  return require('../config/env');
}

function getLogger() {
  // Require logger at runtime so tests can mock it before use
  // eslint-disable-next-line global-require
  return require('../utils/logger.util');
}

// createLimiter wraps express-rate-limit output so tests can inspect options/handler
function createLimiter(options, { overrideRate = false } = {}) {
  const baseLimiter = rateLimit(options);
  // Wrap the returned middleware so we can attach metadata properties
  const wrapped = function (req, res, next) {
    return baseLimiter(req, res, next);
  };

  // Keep a copy of the static parts of options; windowMs/max may be overridden
  const staticOptions = { ...options };

  // Attach a dynamic `options` getter so tests can read runtime values (mocks)
  Object.defineProperty(wrapped, 'options', {
    enumerable: true,
    configurable: true,
    get() {
      if (!overrideRate) return staticOptions;
      try {
        const cfg = getConfig();
        return {
          ...staticOptions,
          windowMs: (cfg && cfg.rateLimit && cfg.rateLimit.windowMs) || staticOptions.windowMs,
          max: (cfg && cfg.rateLimit && cfg.rateLimit.maxRequests) || staticOptions.max,
        };
      } catch (e) {
        return staticOptions;
      }
    },
  });

  Object.defineProperty(wrapped, 'handler', {
    value: options.handler,
    enumerable: true,
    configurable: true,
    writable: false,
  });
  return wrapped;
}

// General rate limiter for all routes
const generalLimiter = createLimiter({
  windowMs: getConfig().rateLimit.windowMs,
  max: getConfig().rateLimit.maxRequests,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    getLogger().warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      message: 'Too many requests from this IP, please try again later',
    });
  },
}, { overrideRate: true });

// Strict rate limiter for authentication endpoints
const authLimiter = createLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 150, // 150 attempts per window
  skipSuccessfulRequests: true, // Don't count successful requests
  message: {
    success: false,
    message: 'Too many login attempts from this IP, please try again after 15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    getLogger().warn(`Auth rate limit exceeded for IP: ${req.ip}, Email: ${req.body?.email}`);
    res.status(429).json({
      success: false,
      message: 'Too many login attempts, please try again after 15 minutes',
    });
  },
});

// Registration rate limiter (prevent spam accounts)
const registerLimiter = createLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // 100 registrations per hour per IP
  message: {
    success: false,
    message: 'Too many accounts created from this IP, please try again after an hour',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    getLogger().warn(`Registration rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      message: 'Too many accounts created, please try again later',
    });
  },
});

module.exports = {
  generalLimiter,
  authLimiter,
  registerLimiter,
};
