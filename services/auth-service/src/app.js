/**
 * Express Application Setup
 * Configures middleware, routes, and error handling
 */

const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const config = require("./config/env");
const logger = require("./utils/logger.util");
const authRoutes = require("./routes/auth.routes");
const { generalLimiter } = require("./middlewares/rateLimit.middleware");
const {
  notFoundHandler,
  errorHandler,
} = require("./middlewares/error.middleware");

// Telemetry middleware (singleton already bootstrapped in server.js)
const { telemetryMiddleware, metricsHandler } = require("./telemetry")({
  serviceName: "auth-service",
});
const correlationIdMiddleware = require("./middlewares/correlationId.middleware");

const app = express();

/**
 * Security Middleware
 */

// Helmet - sets various HTTP headers for security
app.use(helmet());

// CORS - Cross-Origin Resource Sharing
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    const allowedOrigins = config.cors.origin.split(",");
    if (allowedOrigins.includes(origin) || allowedOrigins.includes("*")) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: config.cors.credentials,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

/**
 * Request Parsing Middleware
 */
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

/**
 * APM + Telemetry Middleware
 * Must come after CORS/body-parser so it can read method/path.
 */
app.use(correlationIdMiddleware); // Propagate/generate x-correlation-id
app.use(telemetryMiddleware); // Request metrics + trace-id response headers

/**
 * Prometheus Metrics Endpoint
 */
app.get("/metrics", metricsHandler);

/**
 * Logging Middleware
 */
if (config.isDevelopment()) {
  app.use(morgan("dev"));
} else {
  app.use(
    morgan("combined", {
      stream: logger.stream,
      skip: (req, res) => res.statusCode < 400,
    }),
  );
}

/**
 * Rate Limiting
 */
app.use(generalLimiter);

/**
 * Health Check (before routes for quick access)
 */

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Auth service is running",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.app.env,
  });
});

/**
 * API Routes
 */

// Mount authentication routes
app.use("/auth", authRoutes);

// API info endpoint
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Smart Appointment System - Auth Service API",
    version: "1.0.0",
    endpoints: {
      health: "/health",
      auth: {
        register: "POST /auth/register",
        login: "POST /auth/login",
        refresh: "POST /auth/refresh",
        logout: "POST /auth/logout",
        profile: "GET /auth/me",
      },
    },
  });
});

/**
 * Error Handling
 */

// 404 handler - must be after all routes
app.use(notFoundHandler);

// Global error handler - must be last
app.use(errorHandler);

/**
 * Graceful Shutdown Handlers
 */

const gracefulShutdown = (signal) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);

  // Close server and cleanup
  process.exit(0);
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

module.exports = app;
