/**
 * API Gateway Server
 * Main entry point for the API Gateway
 *
 * Telemetry (OTel tracing + Prometheus metrics) must be initialised BEFORE
 * any other require so auto-instrumentation can patch http/express/etc.
 */

// ── Bootstrap telemetry first ─────────────────────────────────────────────────
require("./telemetry/tracing"); // OpenTelemetry SDK + auto-instrumentation
const {
  register: metricsRegistry,
  connectedServices,
} = require("./telemetry/metrics");
const telemetryMiddleware = require("./middleware/telemetry.middleware");

const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const compression = require("compression");
const { ApolloServer } = require("apollo-server-express");
const config = require("./config");
const logger = require("./utils/logger");
const correlationIdMiddleware = require("./middleware/correlationId.middleware");
const requestLogger = require("./middleware/logging.middleware");
const { notFound, errorHandler } = require("./middleware/error.middleware");
const { graphqlRateLimiter } = require("./middleware/rateLimiter.middleware");
const healthRoutes = require("./routes/health.routes");
const proxyRoutes = require("./routes/proxy.routes");
const { createContext } = require("./graphql/context");
const { stitchRemoteSchemas } = require("./graphql/simpleFederation");
const { createServiceClients } = require("./services/serviceClient");

// Initialize Express app
const app = express();

/**
 * Security Middleware
 */
app.use(
  helmet({
    contentSecurityPolicy: config.app.env === "production" ? undefined : false,
    crossOriginEmbedderPolicy: false,
  }),
);

app.use(
  cors({
    origin: (origin, callback) => {
      const allowedOrigins = config.cors.origin
        .split(",")
        .map((o) => o.trim())
        .filter(Boolean);

      // Allow requests without Origin header (mobile apps, Postman, curl)
      if (!origin) {
        return callback(null, false);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, origin);
      }

      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: config.cors.credentials,
  }),
);

/**
 * Performance Middleware
 */
app.use(compression());

/**
 * Body Parsing Middleware
 */
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

/**
 * Custom Middleware
 */
app.use(correlationIdMiddleware);
app.use(telemetryMiddleware); // APM — request counters / histograms / trace headers
app.use(requestLogger);

/**
 * Prometheus Metrics Endpoint
 * GET /metrics  — scrape target for Prometheus / Grafana
 */
app.get("/metrics", async (req, res) => {
  try {
    res.set("Content-Type", metricsRegistry.contentType);
    res.end(await metricsRegistry.metrics());
  } catch (err) {
    res.status(500).end(err.message);
  }
});

/**
 * Health Check Routes
 */
app.use("/", healthRoutes);

/**
 * REST API Proxy Routes
 */
app.use("/api", proxyRoutes);

// ─── Hot-reloadable GraphQL ────────────────────────────────────────────────
// The Apollo Server instance and its Express sub-router are stored here so
// they can be rebuilt at any time via POST /admin/reload-schema without
// restarting the gateway process.
let activeApolloServer = null;
let graphqlSubRouter = require("express").Router(); // empty until first build

// Register a SINGLE persistent /graphql route that always delegates to the
// current sub-router.  Swapping graphqlSubRouter atomically replaces the
// schema without touching the Express app's route table.
app.use("/graphql", (req, res, next) => {
  if (!activeApolloServer) {
    return res.status(503).json({
      success: false,
      message: "GraphQL schema is still initializing. Please retry shortly.",
    });
  }

  return graphqlSubRouter(req, res, next);
});

/**
 * Build (or rebuild) the Apollo Server with freshly-stitched schemas.
 * Safe to call multiple times — stops the previous server before creating
 * the new one and atomically swaps the sub-router.
 */
const buildGraphQL = async () => {
  logger.info("Building GraphQL schema from upstream services...");

  const schema = await stitchRemoteSchemas(config);

  if (!schema) {
    logger.warn(
      "No GraphQL schema available — /graphql will return 503 until a reload succeeds.",
    );
    return null;
  }

  // Gracefully stop the previous Apollo Server
  if (activeApolloServer) {
    try {
      await activeApolloServer.stop();
      logger.info("Previous Apollo Server stopped");
    } catch (e) {
      logger.warn("Error stopping previous Apollo Server:", e.message);
    }
    activeApolloServer = null;
  }

  const apolloServer = new ApolloServer({
    schema,
    context: createContext,
    introspection: config.app.env !== "production",
    playground: config.app.env !== "production",
    formatError: (error) => {
      logger.error("GraphQL error", {
        message: error.message,
        path: error.path,
        extensions: error.extensions,
      });

      if (config.app.env === "production") {
        return {
          message:
            error.extensions?.code === "INTERNAL_SERVER_ERROR"
              ? "An internal error occurred"
              : error.message,
          extensions: {
            code: error.extensions?.code || "INTERNAL_SERVER_ERROR",
          },
        };
      }

      return error;
    },
    plugins: [
      {
        async requestDidStart() {
          return {
            async didEncounterErrors(requestContext) {
              logger.error("GraphQL request errors", {
                correlationId: requestContext.context.correlationId,
                errors: requestContext.errors.map((e) => ({
                  message: e.message,
                  path: e.path,
                })),
              });
            },
          };
        },
      },
    ],
  });

  await apolloServer.start();

  // Mount Apollo Server on a fresh sub-router.
  // Path '/' because the parent app already consumed '/graphql'.
  const newSubRouter = require("express").Router();
  apolloServer.applyMiddleware({
    app: newSubRouter,
    path: "/",
    cors: false, // CORS already handled globally
  });

  // Atomically swap the handler reference
  graphqlSubRouter = newSubRouter;
  activeApolloServer = apolloServer;

  logger.info("✅ GraphQL endpoint ready at /graphql");
  return apolloServer;
};

/**
 * Admin endpoint: reload GraphQL schema on demand.
 * Call this after starting a new microservice to pick up its GraphQL types
 * without restarting the API Gateway process.
 *
 *   curl -X POST http://localhost:3000/admin/reload-schema
 */
app.post("/admin/reload-schema", async (req, res) => {
  try {
    logger.info("Schema reload requested via POST /admin/reload-schema");
    const server = await buildGraphQL();
    if (server) {
      res.json({
        success: true,
        message: "GraphQL schema reloaded successfully",
      });
    } else {
      res.status(503).json({
        success: false,
        message: "No GraphQL services available — schema not updated",
      });
    }
  } catch (error) {
    logger.error("Schema reload failed:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Start Server
 */
const startServer = async () => {
  try {
    // Initialize service clients
    const serviceClients = createServiceClients();
    logger.info("Service clients initialized");

    /**
     * Error Handling Middleware (registered BEFORE listen so health checks work)
     */
    app.use(notFound);
    app.use(errorHandler);

    // Start Express server IMMEDIATELY so ALB/ECS health checks pass right away.
    // GraphQL schema stitching runs in the background — REST proxy routes are
    // fully operational from the first request.
    const server = app.listen(config.app.port, () => {
      logger.info(`API Gateway started successfully`, {
        port: config.app.port,
        environment: config.app.env,
        nodeVersion: process.version,
        graphqlEnabled: !!activeApolloServer,
      });

      logger.info("Available endpoints:");
      logger.info(
        `  - Health:        http://localhost:${config.app.port}/health`,
      );
      logger.info(
        `  - Ready:         http://localhost:${config.app.port}/ready`,
      );
      logger.info(
        `  - Status:        http://localhost:${config.app.port}/status`,
      );
      logger.info(
        `  - GraphQL:       http://localhost:${config.app.port}/graphql`,
      );
      logger.info(
        `  - Schema Reload: POST http://localhost:${config.app.port}/admin/reload-schema`,
      );
      logger.info(
        `  - REST API:      http://localhost:${config.app.port}/api/*`,
      );

      // Build GraphQL schema in background — does not block the HTTP server.
      buildGraphQL()
        .then(() => logger.info("Background GraphQL schema build complete"))
        .catch((err) =>
          logger.warn("Background GraphQL schema build failed:", err.message),
        );
    });

    // Handle server-level errors (e.g. EADDRINUSE) without going through
    // uncaughtException – this gives us a clean error message and controlled exit.
    let bindRetried = false;
    server.on("error", (err) => {
      if (err.code === "EADDRINUSE" && !bindRetried) {
        bindRetried = true;
        logger.warn(
          `Port ${config.app.port} is in use — killing occupant and retrying once...`,
        );
        try {
          // Kill whatever process is on the port, then retry after 1 s.
          require("child_process").execSync(
            `lsof -ti:${config.app.port} | xargs kill -9 2>/dev/null || true`,
            { stdio: "ignore" },
          );
        } catch (_) {
          // ignore kill errors
        }
        setTimeout(() => server.listen(config.app.port), 1000);
      } else {
        // Either a different error, or EADDRINUSE on the retry — give up.
        logger.error("Server failed to bind", {
          error: err.message,
          port: config.app.port,
        });
        process.exit(1);
      }
    });

    /**
     * Graceful Shutdown
     * server.closeAllConnections() (Node ≥ 18.2) immediately destroys keepalive
     * sockets so the port is released before nodemon starts the next instance.
     */
    const gracefulShutdown = async (signal) => {
      logger.info(`${signal} received. Starting graceful shutdown...`);

      // Destroy all open/idle connections immediately so the port is freed fast.
      if (typeof server.closeAllConnections === "function") {
        server.closeAllConnections();
      }

      server.close(async () => {
        logger.info("HTTP server closed");

        if (activeApolloServer) {
          try {
            await activeApolloServer.stop();
            logger.info("Apollo Server stopped");
          } catch (e) {
            logger.warn("Error stopping Apollo Server:", e.message);
          }
        }

        logger.info("Graceful shutdown completed");
        process.exit(0);
      });

      // Force shutdown after 10 seconds (reduced from 30 so nodemon restarts faster)
      setTimeout(() => {
        logger.error("Forced shutdown after timeout");
        process.exit(1);
      }, 10000).unref(); // .unref() prevents the timer from keeping the event loop alive
    };

    // Handle shutdown signals
    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));

    /**
     * Handle Uncaught Errors
     */
    process.on("uncaughtException", (error) => {
      logger.error("Uncaught Exception", {
        error: error.message,
        stack: error.stack,
      });
      process.exit(1);
    });

    process.on("unhandledRejection", (reason, promise) => {
      logger.error("Unhandled Rejection", {
        reason,
        promise,
      });
      process.exit(1);
    });
  } catch (error) {
    logger.error("Failed to start server", {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
};

// Start the server
startServer();

module.exports = app;
