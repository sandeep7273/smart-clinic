/**
 * Centralized Configuration
 * Loads and validates all environment variables
 */

require('dotenv').config();

const config = {
  // App Configuration
  app: {
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3000', 10),
    name: 'api-gateway',
  },

  // Service URLs
  services: {
    auth: process.env.AUTH_SERVICE_URL || 'http://localhost:4001',
    patient: process.env.PATIENT_SERVICE_URL || 'http://localhost:4002',
    doctor: process.env.DOCTOR_SERVICE_URL || 'http://localhost:4003',
    appointment: process.env.APPOINTMENT_SERVICE_URL || 'http://localhost:4004',
    notification: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:4005',
    search: process.env.SEARCH_SERVICE_URL || 'http://localhost:4006',
  },

  // JWT Configuration
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'fallback-access-secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret',
  },

  // CORS Configuration
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:19006,http://localhost:3001',
    credentials: true,
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    authMax: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '5', 10),
    graphqlMax: parseInt(process.env.GRAPHQL_RATE_LIMIT_MAX || '200', 10),
  },

  // Circuit Breaker Configuration
  circuitBreaker: {
    timeout: parseInt(process.env.CIRCUIT_BREAKER_TIMEOUT || '3000', 10),
    errorThresholdPercentage: parseInt(process.env.CIRCUIT_BREAKER_ERROR_THRESHOLD || '50', 10),
    resetTimeout: parseInt(process.env.CIRCUIT_BREAKER_RESET_TIMEOUT || '30000', 10),
  },

  // Cache Configuration
  cache: {
    ttl: parseInt(process.env.CACHE_TTL || '300', 10), // 5 minutes
    checkPeriod: parseInt(process.env.CACHE_CHECK_PERIOD || '600', 10), // 10 minutes
  },

  // Service Timeouts
  timeouts: {
    service: parseInt(process.env.SERVICE_TIMEOUT || '5000', 10),
    proxy: parseInt(process.env.PROXY_TIMEOUT || '10000', 10),
  },

  // GraphQL Configuration
  graphql: {
    introspection: process.env.GRAPHQL_INTROSPECTION === 'true',
    playground: process.env.GRAPHQL_PLAYGROUND === 'true',
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },

  // Helper methods
  isDevelopment() {
    return this.app.env === 'development';
  },

  isProduction() {
    return this.app.env === 'production';
  },

  isTest() {
    return this.app.env === 'test';
  },
};

// Validation function
function validateConfig() {
  const errors = [];

  // Check JWT secrets in production
  if (config.isProduction()) {
    if (config.jwt.accessSecret === 'fallback-access-secret') {
      errors.push('JWT_ACCESS_SECRET must be set in production');
    }
    if (config.jwt.refreshSecret === 'fallback-refresh-secret') {
      errors.push('JWT_REFRESH_SECRET must be set in production');
    }
  }

  // Check if at least auth service is configured
  if (!config.services.auth) {
    errors.push('AUTH_SERVICE_URL must be configured');
  }

  if (errors.length > 0) {
    console.error('❌ Configuration validation failed:');
    errors.forEach((error) => console.error(`  - ${error}`));
    if (config.isProduction()) {
      process.exit(1);
    }
  } else if (config.isDevelopment() && errors.length === 0) {
    console.log('✅ Configuration validated successfully');
  }
}

// Validate on load
validateConfig();

// Export config with validation function
config.validateConfig = validateConfig;

module.exports = config;
