/**
 * Configuration Management
 * Centralized application configuration
 */

require("dotenv").config();

const config = {
  // Server Configuration
  port: process.env.PORT || 4003,
  grpcPort: process.env.GRPC_PORT || 50051,
  nodeEnv: process.env.NODE_ENV || "development",

  // MongoDB Configuration
  mongodbUri: process.env.MONGODB_URI || "mongodb://localhost:27017/doctor_db",

  // API Gateway URL for service-to-service communication.
  // Prefer explicit env vars; fallback to container DNS instead of localhost.
  apiGatewayUrl:
    process.env.API_GATEWAY_INTERNAL_URL ||
    process.env.API_GATEWAY_URL ||
    "http://api-gateway:3000",

  // Kafka Configuration
  kafkaBrokers: (process.env.KAFKA_BROKERS || "localhost:9092").split(","),

  // Service Configuration
  serviceName: process.env.SERVICE_NAME || "doctor-service",
  logLevel: process.env.LOG_LEVEL || "info",

  // CORS Configuration
  cors: {
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true,
  },

  // Pagination Defaults
  defaultPageSize: 10,
  maxPageSize: 100,
};

// Validate required configuration
const requiredConfig = ["mongodbUri", "apiGatewayUrl"];
const missingConfig = requiredConfig.filter((key) => !config[key]);

if (missingConfig.length > 0) {
  console.error("Missing required configuration:", missingConfig);
  process.exit(1);
}

module.exports = config;
