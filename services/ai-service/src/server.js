// ── Bootstrap telemetry FIRST (before any other require) ───────────────────
const { telemetryMiddleware, metricsHandler } = require("./telemetry")({
  serviceName: "ai-service",
  version: "1.0.0",
});
const correlationIdMiddleware = require("./middlewares/correlationId.middleware");

const express = require("express");
const { ApolloServer } = require("apollo-server-express");
const cors = require("cors");
const mongoose = require("mongoose");
const config = require("./config");
const logger = require("./utils/logger");
const typeDefs = require("./graphql/typeDefs");
const resolvers = require("./graphql/resolvers");
const createContext = require("./graphql/context");

const redisClient = require("./config/redis");
const doctorClient = require("./grpc/doctorClient");
const appointmentClient = require("./grpc/appointmentClient");
const ragService = require("./services/ragService");

class AIServiceServer {
  constructor() {
    this.app = express();
    this.apolloServer = null;
  }

  /**
   * Initialize all connections and services
   */
  async initialize() {
    try {
      // Connect to MongoDB
      await this.connectMongoDB();

      // Connect to Redis
      redisClient.connect();

      // Initialize gRPC clients
      doctorClient.initialize();
      appointmentClient.initialize();

      // Initialize RAG service
      await ragService.initialize();

      // Setup Express middleware
      this.setupMiddleware();

      // Initialize Apollo Server
      await this.setupApolloServer();

      logger.info("AI Service initialized successfully");
    } catch (error) {
      logger.error("Failed to initialize AI Service:", error);
      throw error;
    }
  }

  /**
   * Connect to MongoDB
   */
  async connectMongoDB() {
    try {
      await mongoose.connect(config.mongodb.uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      logger.info("MongoDB connected successfully", {
        database: mongoose.connection.name,
        host: mongoose.connection.host,
      });
    } catch (error) {
      logger.error("MongoDB connection error:", error);
      throw error;
    }
  }

  /**
   * Setup Express middleware
   */
  setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // APM telemetry (request metrics + trace context headers)
    this.app.use(correlationIdMiddleware); // Propagate x-correlation-id
    this.app.use(telemetryMiddleware);

    // Prometheus metrics scrape endpoint
    this.app.get("/metrics", metricsHandler);

    // Health check endpoint
    this.app.get("/health", (req, res) => {
      res.json({
        status: "healthy",
        service: config.serviceName,
        timestamp: new Date().toISOString(),
      });
    });
  }

  /**
   * Setup Apollo GraphQL Server
   */
  async setupApolloServer() {
    this.apolloServer = new ApolloServer({
      typeDefs,
      resolvers,
      context: createContext,
      formatError: (error) => {
        logger.error("GraphQL Error:", error);
        return error;
      },
      introspection: true, // Enable for API Gateway federation
      playground: config.nodeEnv !== "production",
    });

    await this.apolloServer.start();
    this.apolloServer.applyMiddleware({
      app: this.app,
      path: "/graphql",
    });

    logger.info("Apollo Server initialized");
  }

  /**
   * Start the server
   */
  async start() {
    try {
      await this.initialize();

      this.app.listen(config.port, () => {
        logger.info(`🚀 AI Service is running on port ${config.port}`);
        logger.info(
          `📊 GraphQL endpoint: http://localhost:${config.port}/graphql`,
        );
        logger.info(`🏥 Health check: http://localhost:${config.port}/health`);
        logger.info(`Environment: ${config.nodeEnv}`);
      });
    } catch (error) {
      logger.error("Failed to start AI Service:", error);
      process.exit(1);
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    logger.info("Shutting down AI Service...");

    // Close Apollo Server
    if (this.apolloServer) {
      await this.apolloServer.stop();
    }

    // Disconnect Redis
    await redisClient.disconnect();

    // Disconnect MongoDB
    await mongoose.disconnect();

    logger.info("AI Service shut down successfully");
    process.exit(0);
  }
}

// Create and start server
const server = new AIServiceServer();

// Handle shutdown signals
process.on("SIGTERM", () => server.shutdown());
process.on("SIGINT", () => server.shutdown());

// Start the server
server.start().catch((error) => {
  logger.error("Failed to start server:", error);
  process.exit(1);
});

module.exports = server;
