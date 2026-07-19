/**
 * Winston Logger — Auth Service
 * Enhanced with OpenTelemetry trace/span ID injection.
 */

const winston = require("winston");
const config = require("../config/env");

// Inject active trace/span IDs into every log record
const traceContextFormat = winston.format((info) => {
  try {
    const { trace } = require("@opentelemetry/api");
    const span = trace.getActiveSpan();
    if (span) {
      const ctx = span.spanContext();
      if (ctx.traceId) info.traceId = ctx.traceId;
      if (ctx.spanId) info.spanId = ctx.spanId;
    }
  } catch {
    /* OTel not ready */
  }
  return info;
});

// Define log format
const logFormat = winston.format.combine(
  traceContextFormat(),
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json(),
);

// Console format for development
const consoleFormat = winston.format.combine(
  traceContextFormat(),
  winston.format.colorize(),
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.printf(
    ({ timestamp, level, message, traceId, spanId, ...meta }) => {
      let msg = `${timestamp} [${level}]`;
      if (traceId) msg += ` [trace:${traceId.slice(0, 8)}]`;
      if (spanId) msg += ` [span:${spanId.slice(0, 8)}]`;
      msg += `: ${message}`;
      if (Object.keys(meta).length > 0) msg += ` ${JSON.stringify(meta)}`;
      return msg;
    },
  ),
);

// Create logger instance
const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  defaultMeta: { service: config.app.name },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: config.isDevelopment() ? consoleFormat : logFormat,
    }),
  ],
});

// Add file transports in production
if (config.isProduction()) {
  logger.add(
    new winston.transports.File({
      filename: "logs/error.log",
      level: "error",
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  );

  logger.add(
    new winston.transports.File({
      filename: "logs/combined.log",
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  );
}

// Create a stream for Morgan HTTP logger
logger.stream = {
  write: (message) => {
    logger.info(message.trim());
  },
};

module.exports = logger;
