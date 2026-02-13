/**
 * Environment Configuration
 * Loads and validates environment variables
 */

require('dotenv').config();

const config = {
  // App
  app: {
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '4001', 10),
    name: process.env.SERVICE_NAME || 'auth-service',
  },

  // JWT
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'fallback_access_secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret',
    issuer: process.env.JWT_ISSUER || 'auth-service',
    accessTokenExpiry: process.env.ACCESS_TOKEN_EXPIRY || '500m',
    refreshTokenExpiry: process.env.REFRESH_TOKEN_EXPIRY || '7d',
  },

  // Database
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/smart_appointment_auth',
    testUri: process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/smart_appointment_auth_test',
  },

  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000,http://localhost:19006',
    credentials: process.env.CORS_CREDENTIALS === 'true',
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000', 10),
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },

  // Helper methods
  isDevelopment: function () {
    return this.app.env === 'development';
  },
  isProduction: function () {
    return this.app.env === 'production';
  },
  isTest: function () {
    return this.app.env === 'test';
  },
};

// Validate critical configuration
function validateConfig() {
  const errors = [];

  if (!config.jwt.accessSecret || config.jwt.accessSecret === 'fallback_access_secret') {
    errors.push('JWT_ACCESS_SECRET is not set or using fallback value');
  }

  if (!config.jwt.refreshSecret || config.jwt.refreshSecret === 'fallback_refresh_secret') {
    errors.push('JWT_REFRESH_SECRET is not set or using fallback value');
  }

  if (!config.mongodb.uri) {
    errors.push('MONGODB_URI is not set');
  }

  if (config.isProduction() && errors.length > 0) {
    console.error('❌ Configuration validation failed:');
    errors.forEach((error) => console.error(`  - ${error}`));
    process.exit(1);
  }

  if (errors.length > 0 && config.isDevelopment()) {
    console.warn('⚠️  Configuration warnings:');
    errors.forEach((error) => console.warn(`  - ${error}`));
  }
}

// Validate on load
validateConfig();

// Export config with validateConfig function
config.validateConfig = validateConfig;

module.exports = config;
