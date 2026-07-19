/**
 * Cache Service
 * In-memory caching for API responses
 */

const NodeCache = require('node-cache');
const config = require('../config');
const logger = require('../utils/logger');

// Create cache instance
const cache = new NodeCache({
  stdTTL: config.cache.ttl,
  checkperiod: config.cache.checkPeriod,
  useClones: false,
});

// Event handlers
cache.on('set', (key, value) => {
  logger.debug('Cache set', { key });
});

cache.on('del', (key, value) => {
  logger.debug('Cache delete', { key });
});

cache.on('expired', (key, value) => {
  logger.debug('Cache expired', { key });
});

cache.on('flush', () => {
  logger.info('Cache flushed');
});

/**
 * Get value from cache
 * @param {string} key - Cache key
 * @returns {any|undefined} Cached value or undefined
 */
function get(key) {
  try {
    const value = cache.get(key);
    if (value !== undefined) {
      logger.debug('Cache hit', { key });
    } else {
      logger.debug('Cache miss', { key });
    }
    return value;
  } catch (error) {
    logger.error('Cache get error', { key, error: error.message });
    return undefined;
  }
}

/**
 * Set value in cache
 * @param {string} key - Cache key
 * @param {any} value - Value to cache
 * @param {number} ttl - Time to live in seconds (optional)
 * @returns {boolean} Success status
 */
function set(key, value, ttl = null) {
  try {
    const success = ttl ? cache.set(key, value, ttl) : cache.set(key, value);
    if (success) {
      logger.debug('Cache set success', { key, ttl: ttl || config.cache.ttl });
    }
    return success;
  } catch (error) {
    logger.error('Cache set error', { key, error: error.message });
    return false;
  }
}

/**
 * Delete value from cache
 * @param {string} key - Cache key
 * @returns {number} Number of deleted entries
 */
function del(key) {
  try {
    const count = cache.del(key);
    logger.debug('Cache delete', { key, count });
    return count;
  } catch (error) {
    logger.error('Cache delete error', { key, error: error.message });
    return 0;
  }
}

/**
 * Flush entire cache
 */
function flush() {
  try {
    cache.flushAll();
    logger.info('Cache flushed successfully');
  } catch (error) {
    logger.error('Cache flush error', { error: error.message });
  }
}

/**
 * Get cache statistics
 * @returns {Object} Cache stats
 */
function getStats() {
  return cache.getStats();
}

/**
 * Generate cache key from request
 * @param {Object} req - Express request object
 * @param {string} prefix - Key prefix
 * @returns {string} Cache key
 */
function generateCacheKey(req, prefix = 'api') {
  const userId = req.user?.userId || 'anonymous';
  const path = req.path;
  const query = JSON.stringify(req.query);
  return `${prefix}:${userId}:${path}:${query}`;
}

/**
 * Cache middleware for routes
 * @param {number} ttl - Time to live in seconds (optional)
 * @returns {Function} Express middleware
 */
function cacheMiddleware(ttl = null) {
  return (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const key = generateCacheKey(req);
    const cachedResponse = get(key);

    if (cachedResponse) {
      logger.info('Serving from cache', {
        correlationId: req.correlationId,
        key,
      });
      return res.json(cachedResponse);
    }

    // Store original res.json
    const originalJson = res.json.bind(res);

    // Override res.json
    res.json = (data) => {
      // Cache the response
      set(key, data, ttl);
      logger.debug('Response cached', {
        correlationId: req.correlationId,
        key,
      });
      return originalJson(data);
    };

    next();
  };
}

module.exports = {
  get,
  set,
  del,
  flush,
  getStats,
  generateCacheKey,
  cacheMiddleware,
};
