/**
 * Logger Utility — Appointment Service
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

const levels = { error: 0, warn: 1, info: 2, http: 3, debug: 4 };
const colors = {
  error: "red",
  warn: "yellow",
  info: "green",
  http: "magenta",
  debug: "blue",
};
winston.addColors(colors);

const format = winston.format.combine(
  traceContextFormat(),
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss:ms" }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => {
    const { timestamp, level, message, traceId, spanId, ...meta } = info;
    let msg = `${timestamp} [${level}]`;
    if (traceId) msg += ` [trace:${traceId.slice(0, 8)}]`;
    if (spanId) msg += ` [span:${spanId.slice(0, 8)}]`;
    msg += `: ${message}`;
    if (Object.keys(meta).length > 0)
      msg += "\n" + JSON.stringify(meta, null, 2);
    return msg;
  }),
);

const transports = [
  new winston.transports.Console({ format }),
  new winston.transports.File({
    filename: "logs/error.log",
    level: "error",
    format: winston.format.combine(
      traceContextFormat(),
      winston.format.timestamp(),
      winston.format.json(),
    ),
  }),
  new winston.transports.File({
    filename: "logs/combined.log",
    format: winston.format.combine(
      traceContextFormat(),
      winston.format.timestamp(),
      winston.format.json(),
    ),
  }),
];

const logger = winston.createLogger({
  level: config.nodeEnv === "development" ? "debug" : "info",
  levels,
  transports,
});

module.exports = logger;
