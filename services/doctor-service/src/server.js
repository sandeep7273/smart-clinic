const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const config = require('./config');
const connectDB = require('./config/database');
const logger = require('./utils/logger');
const { errorHandler, notFoundHandler } = require('./middlewares/error.middleware');

// Import routes
const doctorRoutes = require('./routes/doctor.routes');
const healthRoutes = require('./routes/health.routes');

// Create Express app
const app = express();

// Connect to database
connectDB();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: config.cors.origin,
  credentials: true,
}));

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
if (config.nodeEnv === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim()),
    },
  }));
}

// Swagger documentation
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Doctor Service API',
      version: '1.0.0',
      description: 'API for managing doctor profiles and appointments',
      contact: {
        name: 'API Support',
      },
    },
    servers: [
      {
        url: `http://localhost:${config.port}`,
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./src/routes/*.js', './src/models/*.js'],
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Health check routes
app.use('/health', healthRoutes);

// API routes
app.use('/api/doctors', doctorRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Doctor Service',
    version: '1.0.0',
    status: 'running',
    documentation: `http://localhost:${config.port}/api-docs`,
  });
});

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// Start server
const server = app.listen(config.port, () => {
  logger.info(`🚀 Doctor Service running on port ${config.port}`);
  logger.info(`📚 API Documentation: http://localhost:${config.port}/api-docs`);
  logger.info(`🏥 Environment: ${config.nodeEnv}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

module.exports = app;
