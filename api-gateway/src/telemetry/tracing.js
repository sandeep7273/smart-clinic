/**
 * OpenTelemetry Tracing Setup — API Gateway
 *
 * MUST be required before any other module so auto-instrumentation
 * can patch http / express / etc. at load time.
 *
 * Exports:
 *   tracer   – the active OpenTelemetry Tracer
 *   startSpan(name, attrs, parentCtx?) → Span
 *   endSpan(span, error?)
 *   getActiveTraceId() → string | undefined
 *   getActiveSpanId() → string | undefined
 */

"use strict";

const { NodeSDK } = require("@opentelemetry/sdk-node");
const {
  getNodeAutoInstrumentations,
} = require("@opentelemetry/auto-instrumentations-node");
const {
  OTLPTraceExporter,
} = require("@opentelemetry/exporter-trace-otlp-http");
const { Resource } =
  require("@opentelemetry/sdk-node").opentelemetry ||
  require("@opentelemetry/resources");
const {
  SEMRESATTRS_SERVICE_NAME,
  SEMRESATTRS_SERVICE_VERSION,
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
} = require("@opentelemetry/semantic-conventions");
const {
  BatchSpanProcessor,
  ConsoleSpanExporter,
  SimpleSpanProcessor,
} = require("@opentelemetry/sdk-trace-base");
const { trace, context, SpanStatusCode } = require("@opentelemetry/api");

const SERVICE_NAME = process.env.SERVICE_NAME || "api-gateway";
const SERVICE_VERSION = process.env.SERVICE_VERSION || "1.0.0";
const ENVIRONMENT = process.env.NODE_ENV || "development";
const OTLP_URL = process.env.OTLP_ENDPOINT || process.env.JAEGER_URL || null;

// ── Resource ──────────────────────────────────────────────────────────────────
let resource;
try {
  const { Resource: Res } = require("@opentelemetry/resources");
  resource = new Res({
    [SEMRESATTRS_SERVICE_NAME]: SERVICE_NAME,
    [SEMRESATTRS_SERVICE_VERSION]: SERVICE_VERSION,
    [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: ENVIRONMENT,
  });
} catch {
  resource = undefined;
}

// ── Span Exporter / Processor ─────────────────────────────────────────────────
function buildSpanProcessors() {
  const processors = [];

  if (OTLP_URL) {
    // Production / staging: send to Jaeger / OTLP collector
    const exporter = new OTLPTraceExporter({ url: `${OTLP_URL}/v1/traces` });
    processors.push(
      new BatchSpanProcessor(exporter, {
        maxQueueSize: 512,
        scheduledDelayMillis: 5000,
      }),
    );
    console.log(`[telemetry] Trace exporter → ${OTLP_URL}`);
  } else if (ENVIRONMENT !== "test") {
    // Development: print spans to console so they're visible without a collector
    processors.push(new SimpleSpanProcessor(new ConsoleSpanExporter()));
    console.log(
      "[telemetry] Trace exporter → console (set OTLP_ENDPOINT for Jaeger)",
    );
  }

  return processors;
}

// ── SDK Bootstrap ─────────────────────────────────────────────────────────────
const sdk = new NodeSDK({
  resource,
  spanProcessors: buildSpanProcessors(),
  instrumentations: [
    getNodeAutoInstrumentations({
      // Disable noisy fs instrumentation
      "@opentelemetry/instrumentation-fs": { enabled: false },
      "@opentelemetry/instrumentation-http": {
        ignoreIncomingRequestHook: (req) => {
          // Skip health / metrics probes from traces
          return /^\/(health|ready|metrics|favicon)/.test(req.url);
        },
      },
    }),
  ],
});

sdk.start();
console.log(`[telemetry] OpenTelemetry started — service: ${SERVICE_NAME}`);

// Shut down SDK on process exit
process.on("SIGTERM", () => sdk.shutdown().catch(() => {}));
process.on("SIGINT", () => sdk.shutdown().catch(() => {}));

// ── Tracer ────────────────────────────────────────────────────────────────────
const tracer = trace.getTracer(SERVICE_NAME, SERVICE_VERSION);

/**
 * Start a new span. Optionally attach to an existing parent context.
 * @param {string} name
 * @param {Record<string,string|number|boolean>} [attributes]
 * @param {import('@opentelemetry/api').Context} [parentCtx]
 */
function startSpan(name, attributes = {}, parentCtx) {
  return tracer.startSpan(name, { attributes }, parentCtx);
}

/**
 * End a span, recording an error if provided.
 * @param {import('@opentelemetry/api').Span} span
 * @param {Error} [error]
 */
function endSpan(span, error) {
  if (error) {
    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
  } else {
    span.setStatus({ code: SpanStatusCode.OK });
  }
  span.end();
}

/** Return the active trace ID (hex string) or undefined. */
function getActiveTraceId() {
  const span = trace.getActiveSpan();
  return span?.spanContext().traceId;
}

/** Return the active span ID (hex string) or undefined. */
function getActiveSpanId() {
  const span = trace.getActiveSpan();
  return span?.spanContext().spanId;
}

module.exports = {
  tracer,
  startSpan,
  endSpan,
  getActiveTraceId,
  getActiveSpanId,
  sdk,
  SpanStatusCode,
  context,
  trace,
};
