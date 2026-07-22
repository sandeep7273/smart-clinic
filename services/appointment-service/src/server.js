/**
 * Main Server Entry Point
 * Appointment Service with SAGA, CQRS, Event Sourcing, and GraphQL
 *
 * Telemetry bootstrapped FIRST so auto-instrumentation patches http/express/mongo.
 */

// Force IPv4 DNS resolution process-wide — ECS Service Connect DNS may return
// IPv6 first, causing ENETUNREACH.
require("dns").setDefaultResultOrder("ipv4first");

// ── Bootstrap telemetry FIRST ─────────────────────────────────────────────
const { telemetryMiddleware, metricsHandler } = require("./telemetry")({
  serviceName: "appointment-service",
  version: "1.0.0",
});
const correlationIdMiddleware = require("./middlewares/correlationId.middleware");

require("express-async-errors");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const swaggerUi = require("swagger-ui-express");

const config = require("./config");
const swaggerSpec = require("./config/swagger");
const { connectDB } = require("./config/database");
const logger = require("./utils/logger");
const {
  errorHandler,
  notFoundHandler,
} = require("./middlewares/errorHandler.middleware");

// Import GraphQL and new Kafka setup
const { createApolloServer, healthCheck } = require("./graphql/server");
const {
  initializeProducer,
  initializeConsumer,
  shutdown: shutdownKafka,
} = require("./kafka");

// Import gRPC server
const { startGrpcServer } = require("./grpc/server");

// Import routes
const appointmentRoutes = require("./routes/appointment.routes");
const healthRoutes = require("./routes/health.routes");

// Create Express app
const app = express();

// Middleware
app.use(helmet());
app.use(cors(config.cors));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
if (config.nodeEnv === "development") {
  app.use(morgan("dev"));
} else {
  app.use(
    morgan("combined", {
      stream: {
        write: (message) => logger.info(message.trim()),
      },
    }),
  );
}

// APM Telemetry + Prometheus metricsapp.use(correlationIdMiddleware);app.use(telemetryMiddleware);
app.get("/metrics", metricsHandler);

// Health, Readiness, Liveness endpoints
app.use("/health", healthRoutes);

// API documentation
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// API routes
app.use("/api/appointments", appointmentRoutes);

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Appointment Service API",
    version: "1.0.0",
    documentation: "/api-docs",
    graphql: "/graphql",
    endpoints: {
      appointments: "/appointments",
      health: "/health",
      graphql: "/graphql",
    },
    patterns: {
      saga: "Distributed transaction management",
      cqrs: "Command Query Responsibility Segregation",
      eventSourcing: "Complete audit trail",
      graphql: "Flexible API layer with federation support",
      kafka: "Event-driven architecture",
      circuitBreaker: "Service resilience",
    },
  });
});

// Initialize GraphQL server
const initializeGraphQL = async () => {
  try {
    const apolloServer = createApolloServer();
    await apolloServer.start();
    apolloServer.applyMiddleware({
      app,
      path: "/graphql",
      cors: false, // CORS already configured above
    });

    logger.info(
      `🚀 GraphQL Server ready at http://localhost:${config.port}${apolloServer.graphqlPath}`,
    );
    return apolloServer;
  } catch (error) {
    logger.error("Failed to initialize GraphQL server:", error);
    throw error;
  }
};

// Initialize services
const initializeServices = async () => {
  try {
    // Initialize GraphQL
    const apolloServer = await initializeGraphQL();

    // Initialize Kafka (optional - service can run without it)
    let kafkaInitialized = false;
    try {
      await initializeProducer();
      await initializeConsumer();
      kafkaInitialized = true;
      logger.info("✅ Kafka initialized successfully");
    } catch (kafkaError) {
      logger.warn(
        "⚠️  Kafka initialization failed - service will run without event streaming",
        {
          error: kafkaError.message,
          broker: kafkaError.cause?.broker,
        },
      );
      logger.info("💡 To enable Kafka: Start Kafka broker on localhost:9092");
    }

    // Initialize gRPC server
    const grpcServer = startGrpcServer(50052);

    logger.info("All services initialized successfully", {
      kafkaEnabled: kafkaInitialized,
      grpcEnabled: !!grpcServer,
    });
    return { apolloServer, kafkaInitialized, grpcServer };
  } catch (error) {
    logger.error("Failed to initialize services:", error);
    throw error;
  }
};

// Initialize and start server
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    logger.info("Database connected successfully");

    // Initialize GraphQL and Kafka services FIRST
    const { apolloServer, kafkaInitialized, grpcServer } =
      await initializeServices();

    // NOW register 404 handler AFTER GraphQL is mounted
    app.use(notFoundHandler);

    // Error handler (must be last)
    app.use(errorHandler);

    // Start server
    const server = app.listen(config.port, () => {
      logger.info(`Appointment Service started`, {
        port: config.port,
        environment: config.nodeEnv,
        documentation: `http://localhost:${config.port}/api-docs`,
        graphql: `http://localhost:${config.port}/graphql`,
      });
      console.log(`\n🚀 Appointment Service running on port ${config.port}`);
      console.log(
        `📚 API Documentation: http://localhost:${config.port}/api-docs`,
      );
      console.log(
        `🔗 GraphQL Endpoint: http://localhost:${config.port}/graphql`,
      );
      console.log(`🏥 Health Check: http://localhost:${config.port}/health\n`);
    });

    // Graceful shutdown handler
    const gracefulShutdown = async (signal) => {
      logger.info(`${signal} signal received: starting graceful shutdown`);

      try {
        // Stop accepting new requests
        server.close(async () => {
          logger.info("HTTP server closed");

          // Shutdown GraphQL server
          if (apolloServer) {
            await apolloServer.stop();
            logger.info("GraphQL server stopped");
          }

          // Shutdown gRPC server
          if (grpcServer) {
            grpcServer.forceShutdown();
            logger.info("gRPC server stopped");
          }

          // Shutdown Kafka connections (only if initialized)
          if (kafkaInitialized) {
            await shutdownKafka();
          }

          logger.info("Graceful shutdown completed");
          process.exit(0);
        });

        // Force shutdown after timeout
        setTimeout(() => {
          logger.error(
            "Could not close connections in time, forcefully shutting down",
          );
          process.exit(1);
        }, 10000);
      } catch (error) {
        logger.error("Error during graceful shutdown:", error);
        process.exit(1);
      }
    };

    // Register signal handlers
    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));

    // Handle unhandled rejections
    process.on("unhandledRejection", (err) => {
      logger.error("Unhandled Rejection:", err);
      gracefulShutdown("UNHANDLED_REJECTION");
    });

    return server;
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
};

// Start the server
startServer();

module.exports = app;
