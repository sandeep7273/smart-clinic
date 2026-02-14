/**
 * Configuration Management
 * Centralized application configuration
 */

require('dotenv').config();

const config = {
  // Server Configuration
  port: process.env.PORT || 4003,
  grpcPort: process.env.GRPC_PORT || 50051,
  nodeEnv: process.env.NODE_ENV || 'development',

  // MongoDB Configuration
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/doctor_db',

  // Auth Service Configuration
  authServiceUrl: process.env.AUTH_SERVICE_URL || 'http://localhost:4001',

  // Kafka Configuration
  kafkaBrokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),

  // Service Configuration
  serviceName: process.env.SERVICE_NAME || 'doctor-service',
  logLevel: process.env.LOG_LEVEL || 'info',

  // CORS Configuration
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  },

  // Pagination Defaults
  defaultPageSize: 10,
  maxPageSize: 100,
};

// Validate required configuration
const requiredConfig = ['mongodbUri', 'authServiceUrl'];
const missingConfig = requiredConfig.filter(key => !config[key]);

if (missingConfig.length > 0) {
  console.error('Missing required configuration:', missingConfig);
  process.exit(1);
}

module.exports = config;
