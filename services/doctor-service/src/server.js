// Force IPv4 DNS resolution process-wide — ECS Service Connect DNS may return
// IPv6 first, causing ENETUNREACH.
require("dns").setDefaultResultOrder("ipv4first");

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

// ── Bootstrap telemetry FIRST (before other requires) ────────────────────────
const { telemetryMiddleware, metricsHandler } = require("./telemetry")({
  serviceName: "doctor-service",
  version: "1.0.0",
});
const correlationIdMiddleware = require("./middlewares/correlationId.middleware");
const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");
const config = require("./config");
const connectDB = require("./config/database");
const logger = require("./utils/logger");
const {
  errorHandler,
  notFoundHandler,
} = require("./middlewares/error.middleware");

// Import GraphQL and Kafka
const { createApolloServer } = require("./graphql/server");
const {
  initializeProducer,
  initializeConsumer,
  shutdown: shutdownKafka,
} = require("./kafka");
const { startGrpcServer } = require("./grpc/server");

// Import routes
const doctorRoutes = require("./routes/doctor.routes");
const healthRoutes = require("./routes/health.routes");

// Create Express app
const app = express();

// Connect to database
connectDB();

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: config.cors.origin,
    credentials: true,
  }),
);

// Body parser middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

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

// Swagger documentation
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Doctor Service API",
      version: "1.0.0",
      description: "API for managing doctor profiles and appointments",
      contact: {
        name: "API Support",
      },
    },
    servers: [
      {
        url: `http://localhost:${config.port}`,
        description: "Development server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  },
  apis: ["./src/routes/*.js", "./src/models/*.js"],
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Health check routes
app.use("/health", healthRoutes);

// API routes
app.use("/api/doctors", doctorRoutes);

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    service: "Doctor Service",
    version: "1.0.0",
    status: "running",
    documentation: `http://localhost:${config.port}/api-docs`,
    graphql: `http://localhost:${config.port}/graphql`,
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

    // Initialize gRPC server
    let grpcServer = null;
    try {
      const grpcPort = config.grpcPort || 50051;
      grpcServer = startGrpcServer(grpcPort);
      logger.info(`✅ gRPC server initialized on port ${grpcPort}`);
    } catch (grpcError) {
      logger.error("Failed to initialize gRPC server:", grpcError);
      // Don't exit - service can run without gRPC
    }

    // Initialize Kafka (optional - service can run without it)
    let kafkaInitialized = false;
    try {
      await initializeProducer();
      await initializeConsumer();
      kafkaInitialized = true;
      logger.info("✅ Kafka initialized successfully");
    } catch (kafkaError) {
      logger.warn(
        "⚠️ Kafka initialization failed - service will run without event streaming",
        {
          error: kafkaError.message,
          broker: kafkaError.cause?.broker,
        },
      );
      logger.info("💡 To enable Kafka: Start Kafka broker on localhost:9092");
    }

    logger.info("All services initialized successfully", {
      kafkaEnabled: kafkaInitialized,
      grpcEnabled: !!grpcServer,
    });
    return { apolloServer, kafkaInitialized, grpcServer };
  } catch (error) {
    logger.error("Failed to initialize services:", error);
    process.exit(1);
  }
};

// Start server
const startServer = async () => {
  try {
    // Initialize all services
    const { apolloServer, kafkaInitialized, grpcServer } =
      await initializeServices();

    // Register error handling middleware AFTER GraphQL
    // 404 handler
    app.use(notFoundHandler);
    // Global error handler
    app.use(errorHandler);

    // Start HTTP server
    const server = app.listen(config.port, () => {
      logger.info(`🚀 Doctor Service running on port ${config.port}`);
      logger.info(
        `📚 API Documentation: http://localhost:${config.port}/api-docs`,
      );
      logger.info(
        `🔗 GraphQL Endpoint: http://localhost:${config.port}/graphql`,
      );
      if (grpcServer) {
        logger.info(`⚡ gRPC Server: localhost:${config.grpcPort || 50051}`);
      }
      logger.info(`🏥 Environment: ${config.nodeEnv}`);
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

    return server;
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
};

// Start the application
startServer();

module.exports = app;
