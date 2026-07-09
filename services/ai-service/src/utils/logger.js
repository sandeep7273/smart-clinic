/**
 * Logger — AI Service
 * Winston logger enhanced with OpenTelemetry trace/span ID injection.
 */

const winston = require("winston");
const config = require("../config");

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

let logger;

try {
  logger = winston.createLogger({
    level: config.logging?.level || "info",
    format: winston.format.combine(
      traceContextFormat(),
      winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
      winston.format.errors({ stack: true }),
      winston.format.splat(),
      winston.format.json(),
    ),
    defaultMeta: { service: config.serviceName || "ai-service" },
    transports: [
      new winston.transports.File({
        filename: "logs/error.log",
        level: "error",
      }),
      new winston.transports.File({ filename: "logs/combined.log" }),
    ],
  });

  if ((config.nodeEnv || process.env.NODE_ENV) !== "production") {
    logger.add(
      new winston.transports.Console({
        format: winston.format.combine(
          traceContextFormat(),
          winston.format.colorize(),
          winston.format.printf(
            ({ timestamp, level, message, traceId, spanId, ...meta }) => {
              let msg = `${timestamp || ""} [${level}]`;
              if (traceId) msg += ` [trace:${traceId.slice(0, 8)}]`;
              if (spanId) msg += ` [span:${spanId.slice(0, 8)}]`;
              return (
                msg +
                `: ${message}` +
                (Object.keys(meta).length ? " " + JSON.stringify(meta) : "")
              );
            },
          ),
        ),
      }),
    );
  }
} catch (error) {
  // Fallback no-op logger
  const noop = () => {};
  logger = { info: noop, warn: noop, error: noop, debug: noop };
}

module.exports = logger;
