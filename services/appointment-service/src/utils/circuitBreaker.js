/**
 * Circuit Breaker Utility
 * Implements circuit breaker pattern for external service calls
 */

const CircuitBreaker = require('opossum');
const logger = require('./logger');
const config = require('../config');

/**
 * Create a circuit breaker for a function
 */
const createCircuitBreaker = (fn, options = {}) => {
  const defaultOptions = {
    timeout: config.circuitBreaker.timeout,
    errorThresholdPercentage: config.circuitBreaker.errorThresholdPercentage,
    resetTimeout: config.circuitBreaker.resetTimeout,
    ...options,
  };

  const breaker = new CircuitBreaker(fn, defaultOptions);

  // Event listeners
  breaker.on('open', () => {
    logger.warn('Circuit breaker opened', {
      name: options.name || 'unknown',
    });
  });

  breaker.on('halfOpen', () => {
    logger.info('Circuit breaker half-open', {
      name: options.name || 'unknown',
    });
  });

  breaker.on('close', () => {
    logger.info('Circuit breaker closed', {
      name: options.name || 'unknown',
    });
  });

  breaker.on('timeout', () => {
    logger.error('Circuit breaker timeout', {
      name: options.name || 'unknown',
      timeout: defaultOptions.timeout,
    });
  });

  breaker.on('reject', () => {
    logger.error('Circuit breaker rejected request', {
      name: options.name || 'unknown',
    });
  });

  breaker.on('failure', (error) => {
    logger.error('Circuit breaker failure', {
      name: options.name || 'unknown',
      error: error.message,
    });
  });

  return breaker;
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
};
