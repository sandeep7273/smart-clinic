/**
 * Winston Logger — Doctor Service
 * Enhanced with OpenTelemetry trace/span ID injection.
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

const logger = winston.createLogger({
  level: config.logLevel,
  format: winston.format.combine(
    traceContextFormat(),
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  defaultMeta: { service: config.serviceName },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        traceContextFormat(),
        winston.format.colorize(),
        winston.format.printf(
          ({ timestamp, level, message, traceId, spanId, ...meta }) => {
            let msg = `${timestamp || new Date().toISOString()} [${level}]`;
            if (traceId) msg += ` [trace:${traceId.slice(0, 8)}]`;
            if (spanId) msg += ` [span:${spanId.slice(0, 8)}]`;
            msg += `: ${message}`;
            if (Object.keys(meta).length)
              msg += ` ${JSON.stringify(meta, null, 2)}`;
            return msg;
          },
        ),
      ),
    }),
  ],
});

module.exports = logger;
