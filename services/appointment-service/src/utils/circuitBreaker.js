/**
 * Circuit Breaker Utility
 * Implements circuit breaker pattern for external service calls
 */

const CircuitBreaker = require('opossum');
const logger = require('./logger');
const config = require('../config');

/**
 * Custom error class for business logic errors that should NOT trigger circuit breaker
 */
class BusinessError extends Error {
  constructor(message, statusCode, originalError) {
    super(message);
    this.name = 'BusinessError';
    this.statusCode = statusCode;
    this.isBusinessError = true;
    this.originalError = originalError;
  }
}

/**
 * Create a circuit breaker for a function
 */
const createCircuitBreaker = (fn, options = {}) => {
  // const defaultOptions = {
  //   timeout: config.circuitBreaker.timeout,
  //   errorThresholdPercentage: config.circuitBreaker.errorThresholdPercentage,
  //   resetTimeout: config.circuitBreaker.resetTimeout,
  //   // Filter errors - only count 5xx and network errors as failures
  //   // Business errors (4xx) should not trigger circuit breaker
  //   errorFilter: (error) => {
  //     // Don't count business errors as failures
  //     if (error instanceof BusinessError || error.isBusinessError) {
  //       logger.debug('Circuit breaker: Ignoring business error', {
  //         name: options.name || 'unknown',
  //         message: error.message,
  //         statusCode: error.statusCode
  //       });
  //       return false; // Don't count as failure
  //     }
      
  //     // Check for HTTP status codes
  //     if (error.response?.status) {
  //       const status = error.response.status;
  //       // 4xx errors are client/business errors - don't count as service failures
  //       if (status >= 400 && status < 500) {
  //         logger.debug('Circuit breaker: Ignoring 4xx error', {
  //           name: options.name || 'unknown',
  //           status,
  //           message: error.message
  //         });
  //         return false; // Don't count as failure
  //       }
  //       // 5xx errors are server errors - count as failures
  //       return true;
  //     }
      
  //     // Network errors, timeouts, etc. - count as failures
  //     return true;
  //   },
  //   ...options,
  // };

  // const breaker = new CircuitBreaker(fn, defaultOptions);

  // // Event listeners
  // breaker.on('open', () => {
  //   logger.warn('Circuit breaker opened', {
  //     name: options.name || 'unknown',
  //   });
  // });

  // breaker.on('halfOpen', () => {
  //   logger.info('Circuit breaker half-open', {
  //     name: options.name || 'unknown',
  //   });
  // });

  // breaker.on('close', () => {
  //   logger.info('Circuit breaker closed', {
  //     name: options.name || 'unknown',
  //   });
  // });

  // breaker.on('timeout', () => {
  //   logger.error('Circuit breaker timeout', {
  //     name: options.name || 'unknown',
  //     timeout: defaultOptions.timeout,
  //   });
  // });

  // breaker.on('reject', () => {
  //   logger.error('Circuit breaker rejected request', {
  //     name: options.name || 'unknown',
  //   });
  // });

  // breaker.on('failure', (error) => {
  //   logger.error('Circuit breaker failure', {
  //     name: options.name || 'unknown',
  //     error: error.message,
  //   });
  // });

  // return breaker;


   logger.info(`Circuit breaker DISABLED for ${options.name || 'unknown'} - All requests will pass through`);
  
  // Return a simple wrapper that mimics circuit breaker API but just calls the function directly
  return {
    fire: async (...args) => {
      return await fn(...args);
    },
    // Mock stats for compatibility
    stats: {
      fires: 0,
      successes: 0,
      failures: 0,
      rejects: 0,
      timeouts: 0,
      fallbacks: 0,
      latencyMean: 0,
      percentiles: {}
    },
    opened: false,
    halfOpen: false,
    closed: true,
    on: () => {} // No-op event listeners
  };
};

/**
 * Execute function with circuit breaker
 */
const executeWithCircuitBreaker = async (fn, options = {}) => {
  const breaker = createCircuitBreaker(fn, options);
  return breaker.fire();
};

/**
 * Get circuit breaker health status
 */
const getCircuitBreakerStats = (breaker) => {
  const stats = breaker.stats;
  
  return {
    fires: stats.fires,
    successes: stats.successes,
    failures: stats.failures,
    rejects: stats.rejects,
    timeouts: stats.timeouts,
    fallbacks: stats.fallbacks,
    latencyMean: stats.latencyMean,
    percentiles: stats.percentiles,
    isOpen: breaker.opened,
    isHalfOpen: breaker.halfOpen,
    isClosed: breaker.closed,
  };
};

module.exports = {
  createCircuitBreaker,
  executeWithCircuitBreaker,
  getCircuitBreakerStats,
  BusinessError,
};
