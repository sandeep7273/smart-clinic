const Redis = require('ioredis');
const config = require('../config');
const logger = require('../utils/logger');

class RedisClient {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  connect() {
    try {
      this.client = new Redis({
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password || undefined,
        db: config.redis.db,
        lazyConnect: true,
        retryStrategy: (times) => {
          // Stop retrying after 3 attempts
          if (times > 3) {
            logger.warn('Redis connection failed after 3 attempts. Service will continue without Redis.');
            return null;
          }
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        maxRetriesPerRequest: 1
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        logger.info('✅ Redis connected successfully');
      });

      this.client.on('ready', () => {
        this.isConnected = true;
        logger.info('✅ Redis is ready');
      });

      this.client.on('error', (err) => {
        this.isConnected = false;
        if (err.code === 'ECONNREFUSED') {
          logger.warn('⚠️  Redis connection refused. Service will continue without caching and context memory.');
        } else {
          logger.error('Redis error:', err);
        }
      });

      this.client.on('close', () => {
        this.isConnected = false;
        logger.warn('Redis connection closed');
      });

      // Try to connect
      this.client.connect().catch((err) => {
        this.isConnected = false;
        logger.warn('⚠️  Redis not available. Service will continue without caching and context memory.');
        logger.warn('To enable Redis: brew services start redis (macOS) or sudo systemctl start redis (Linux)');
      });

      return this.client;
    } catch (error) {
      this.isConnected = false;
      logger.warn('Failed to initialize Redis. Service will continue without caching:', error.message);
      return null;
    }
  }

  /**
   * Get data from Redis
   */
  async get(key) {
    if (!this.isConnected || !this.client) {
      return null;
    }
    
    try {
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.debug(`Redis GET error for key ${key}:`, error.message);
      return null;
    }
  }

  /**
   * Set data in Redis with optional TTL
   */
  async set(key, value, ttl = null) {
    if (!this.isConnected || !this.client) {
      return false;
    }
    
    try {
      const serialized = JSON.stringify(value);
      if (ttl) {
        await this.client.setex(key, ttl, serialized);
      } else {
        await this.client.set(key, serialized);
      }
      return true;
    } catch (error) {
      logger.debug(`Redis SET error for key ${key}:`, error.message);
      return false;
    }
  }

  /**
   * Delete key from Redis
   */
  async del(key) {
    if (!this.isConnected || !this.client) {
      return false;
    }
    
    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      logger.debug(`Redis DEL error for key ${key}:`, error.message);
      return false;
    }
  }

  /**
   * Store conversation context
   */
  async storeContext(userId, message) {
    if (!this.isConnected || !this.client) {
      logger.debug('Redis not available, skipping context storage');
      return null;
    }
    
    try {
      const key = `chat:context:${userId}`;
      const context = await this.get(key) || [];
      
      context.push({
        ...message,
        timestamp: new Date().toISOString()
      });

      // Keep only last N messages
      const maxMessages = config.context.maxMessages;
      const trimmedContext = context.slice(-maxMessages);

      await this.set(key, trimmedContext, config.context.ttl);
      return trimmedContext;
    } catch (error) {
      logger.debug(`Error storing context for user ${userId}:`, error.message);
      return null;
    }
  }

  /**
   * Get conversation context
   */
  async getContext(userId) {
    if (!this.isConnected || !this.client) {
      return [];
    }
    
    try {
      const key = `chat:context:${userId}`;
      return await this.get(key) || [];
    } catch (error) {
      logger.debug(`Error getting context for user ${userId}:`, error.message);
      return [];
    }
  }

  /**
   * Clear conversation context
   */
  async clearContext(userId) {
    if (!this.isConnected || !this.client) {
      return true; // Return true as "success" since there's nothing to clear
    }
    
    try {
      const key = `chat:context:${userId}`;
      await this.del(key);
      return true;
    } catch (error) {
      logger.debug(`Error clearing context for user ${userId}:`, error.message);
      return false;
    }
  }

  /**
   * Cache doctor search results
   */
  async cacheDoctorSearch(specialization, data) {
    if (!this.isConnected || !this.client) {
      return false;
    }
    
    const key = `doctor:search:${specialization.toLowerCase()}`;
    return await this.set(key, data, config.cache.doctorSearch);
  }

  /**
   * Get cached doctor search results
   */
  async getCachedDoctorSearch(specialization) {
    if (!this.isConnected || !this.client) {
      return null;
    }
    
    const key = `doctor:search:${specialization.toLowerCase()}`;
    return await this.get(key);
  }

  /**
   * Cache user appointments
   */
  async cacheUserAppointments(userId, data) {
    if (!this.isConnected || !this.client) {
      return false;
    }
    
    const key = `appointments:user:${userId}`;
    return await this.set(key, data, config.cache.appointment);
  }

  /**
   * Get cached user appointments
   */
  async getCachedUserAppointments(userId) {
    if (!this.isConnected || !this.client) {
      return null;
    }
    
    const key = `appointments:user:${userId}`;
    return await this.get(key);
  }

  /**
   * Invalidate user appointments cache
   */
  async invalidateUserAppointments(userId) {
    if (!this.isConnected || !this.client) {
      return false;
    }
    
    const key = `appointments:user:${userId}`;
    return await this.del(key);
  }

  /**
   * Close Redis connection
   */
  async disconnect() {
    if (this.client && this.isConnected) {
      try {
        await this.client.quit();
        this.isConnected = false;
        logger.info('Redis disconnected');
      } catch (error) {
        logger.debug('Error disconnecting Redis:', error.message);
      }
    }
  }
}

module.exports = new RedisClient();
