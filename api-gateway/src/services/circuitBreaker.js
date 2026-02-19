/**
 * Circuit Breaker Service
 * Prevents cascading failures in microservices
 */

const CircuitBreaker = require('opossum');
const config = require('../config');
const logger = require('../utils/logger');
const { CircuitBreakerOpenError } = require('../utils/errors');

/**
 * Create a circuit breaker for a service function
 * @param {Function} fn - Function to wrap with circuit breaker
 * @param {string} serviceName - Name of the service for logging
 * @param {Object} options - Circuit breaker options
 * @returns {CircuitBreaker} Circuit breaker instance
 */
function createCircuitBreaker(fn, serviceName, options = {}) {
  // Defensive: allow callers to pass `null` or `undefined` for options
  options = options || {};
  const breakerOptions = {
    timeout: options.timeout || config.circuitBreaker.timeout,
    errorThresholdPercentage: options.errorThresholdPercentage || config.circuitBreaker.errorThresholdPercentage,
    resetTimeout: options.resetTimeout || config.circuitBreaker.resetTimeout,
    name: serviceName,
    ...options,
  };

  const breaker = new CircuitBreaker(fn, breakerOptions);

  // Event handlers for monitoring
  breaker.on('open', () => {
    logger.error(`Circuit breaker opened for ${serviceName}`, {
      service: serviceName,
      threshold: breakerOptions.errorThresholdPercentage,
    });
  });

  breaker.on('close', () => {
    logger.info(`Circuit breaker closed for ${serviceName}`, {
      service: serviceName,
    });
  });

  breaker.on('halfOpen', () => {
    logger.info(`Circuit breaker half-open for ${serviceName}`, {
      service: serviceName,
    });
  });

  breaker.on('failure', (error) => {
    logger.warn(`Circuit breaker recorded failure for ${serviceName}`, {
      service: serviceName,
      error: error.message,
    });
  });

  breaker.on('reject', () => {
    logger.warn(`Circuit breaker rejected request for ${serviceName}`, {
      service: serviceName,
      state: breaker.status.name,
    });
  });

  breaker.on('timeout', () => {
    logger.warn(`Circuit breaker timeout for ${serviceName}`, {
      service: serviceName,
      timeout: breakerOptions.timeout,
    });
  });

  return breaker;
}

/**
 * Execute a function with circuit breaker protection
 * @param {Function} fn - Function to execute
 * @param {string} serviceName - Service name
 * @param {...any} args - Arguments to pass to function
 * @returns {Promise<any>} Function result
 */
async function executeWithCircuitBreaker(fn, serviceName, ...args) {
  const breaker = createCircuitBreaker(fn, serviceName);

  try {
    return await breaker.fire(...args);
  } catch (error) {
    if (error.message && error.message.includes('Breaker is open')) {
      throw new CircuitBreakerOpenError(serviceName);
    }
    throw error;
  }
}

/**
 * Get circuit breaker stats
 * @param {CircuitBreaker} breaker - Circuit breaker instance
 * @returns {Object} Stats object
 */
function getCircuitBreakerStats(breaker) {
  const stats = breaker.stats;
  return {
    name: breaker.name,
    status: breaker.status.name,
    failures: stats.failures,
    successes: stats.successes,
    rejects: stats.rejects,
    timeouts: stats.timeouts,
    percentiles: stats.percentiles,
  };
}

module.exports = {
  createCircuitBreaker,
  executeWithCircuitBreaker,
  getCircuitBreakerStats,
};
