require('dotenv').config();

module.exports = {
  // Server
  port: process.env.PORT || 4005,
  nodeEnv: process.env.NODE_ENV || 'development',
  serviceName: process.env.SERVICE_NAME || 'ai-service',
  
  // MongoDB
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/ai_db'
  },
  
  // Redis
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || '',
    db: parseInt(process.env.REDIS_DB) || 0
  },
  
  // Groq LLM Configuration
  groq: {
    apiKey: process.env.GROQ_API_KEY || '',
    model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    maxTokens: parseInt(process.env.GROQ_MAX_TOKENS) || 1000,
    temperature: parseFloat(process.env.GROQ_TEMPERATURE) || 0.7
  },
  
  // Vector Database
  chroma: {
    host: process.env.CHROMA_HOST || 'localhost',
    port: parseInt(process.env.CHROMA_PORT) || 8000,
    collectionName: process.env.CHROMA_COLLECTION_NAME || 'medical_knowledge'
  },
  
  // External Services
  services: {
    auth: {
      url: process.env.AUTH_SERVICE_URL || 'http://localhost:4001'
    },
    doctor: {
      grpcHost: process.env.DOCTOR_SERVICE_GRPC_HOST || 'localhost',
      grpcPort: parseInt(process.env.DOCTOR_SERVICE_GRPC_PORT) || 50051
    },
    appointment: {
      grpcHost: process.env.APPOINTMENT_SERVICE_GRPC_HOST || 'localhost',
      grpcPort: parseInt(process.env.APPOINTMENT_SERVICE_GRPC_PORT) || 50052
    },
    apiGateway: {
      url: process.env.API_GATEWAY_URL || 'http://localhost:4000'
    }
  },
  
  // Context Configuration
  context: {
    maxMessages: parseInt(process.env.MAX_CONTEXT_MESSAGES) || 10,
    ttl: parseInt(process.env.CONTEXT_TTL) || 3600 // 1 hour
  },
  
  // Rate Limiting
  rateLimit: {
    window: parseInt(process.env.RATE_LIMIT_WINDOW) || 60000,
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
  },
  
  // Cache TTL
  cache: {
    doctorSearch: parseInt(process.env.CACHE_TTL_DOCTOR_SEARCH) || 300,
    appointment: parseInt(process.env.CACHE_TTL_APPOINTMENT) || 180
  },
  
  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info'
  }
};
