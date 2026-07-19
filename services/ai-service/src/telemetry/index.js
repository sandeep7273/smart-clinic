/**
 * Shared Telemetry Factory
 *
 * Each microservice calls initTelemetry({ serviceName, version }) at startup
 * (before any other require) to get:
 *   – OTel tracing with auto-instrumentation
 *   – Prometheus metrics registry
 *   – APM telemetry Express middleware
 *   – Logger enhancer (injects traceId/spanId)
 *
 * Usage in server.js (must be the VERY FIRST require):
 *
 *   const { tracer, register, telemetryMiddleware, metricsHandler } =
 *     require('./telemetry')({ serviceName: 'auth-service', version: '1.0.0' });
 */

'use strict';

const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { BatchSpanProcessor, ConsoleSpanExporter, SimpleSpanProcessor } = require('@opentelemetry/sdk-trace-base');
const { trace, SpanStatusCode, context } = require('@opentelemetry/api');
const client = require('prom-client');

let _initialized = false;
let _instance    = null;

/**
 * @param {object} opts
 * @param {string} opts.serviceName   e.g. 'auth-service'
 * @param {string} [opts.version]     e.g. '1.0.0'
 * @param {string} [opts.environment] defaults to process.env.NODE_ENV
 */
function initTelemetry({ serviceName, version = '1.0.0', environment } = {}) {
  if (_initialized) return _instance;
  _initialized = true;

  const SERVICE_NAME = serviceName || process.env.SERVICE_NAME || 'unknown-service';
  const ENV          = environment || process.env.NODE_ENV || 'development';
  const OTLP_URL     = process.env.OTLP_ENDPOINT || process.env.JAEGER_URL || null;

  // ── Build span processors ─────────────────────────────────────────────────
  const spanProcessors = [];
  if (OTLP_URL) {
    spanProcessors.push(new BatchSpanProcessor(
      new OTLPTraceExporter({ url: `${OTLP_URL}/v1/traces` }),
      { maxQueueSize: 512, scheduledDelayMillis: 5000 },
    ));
    console.log(`[telemetry:${SERVICE_NAME}] → OTLP exporter: ${OTLP_URL}`);
  } else if (ENV !== 'test') {
    spanProcessors.push(new SimpleSpanProcessor(new ConsoleSpanExporter()));
    console.log(`[telemetry:${SERVICE_NAME}] → console exporter (set OTLP_ENDPOINT for Jaeger)`);
  }

  // ── Build resource attributes ─────────────────────────────────────────────
  let resource;
  try {
    const { Resource } = require('@opentelemetry/resources');
    const { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_VERSION, SEMRESATTRS_DEPLOYMENT_ENVIRONMENT } =
      require('@opentelemetry/semantic-conventions');
    resource = new Resource({
      [SEMRESATTRS_SERVICE_NAME]:           SERVICE_NAME,
      [SEMRESATTRS_SERVICE_VERSION]:        version,
      [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: ENV,
    });
  } catch { resource = undefined; }

  // ── Start OTel SDK (auto-instruments http, express, mongo, grpc, redis) ──
  const sdk = new NodeSDK({
    resource,
    spanProcessors,
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': { enabled: false },
        '@opentelemetry/instrumentation-http': {
          ignoreIncomingRequestHook: (req) =>
            /^\/(health|ready|metrics|favicon)/.test(req.url || ''),
        },
      }),
    ],
  });
  sdk.start();

  process.on('SIGTERM', () => sdk.shutdown().catch(() => {}));
  process.on('SIGINT',  () => sdk.shutdown().catch(() => {}));

  // ── Tracer ────────────────────────────────────────────────────────────────
  const tracer = trace.getTracer(SERVICE_NAME, version);

  function startSpan(name, attributes = {}, parentCtx) {
    return tracer.startSpan(name, { attributes }, parentCtx || context.active());
  }

  function endSpan(span, error) {
    if (error) {
      span.recordException(error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    } else {
      span.setStatus({ code: SpanStatusCode.OK });
    }
    span.end();
  }

  /** Wrap an async function in a named span. */
  async function withSpan(name, attributes, fn) {
    const span = startSpan(name, attributes);
    try {
      const result = await context.with(trace.setSpan(context.active(), span), fn);
      endSpan(span);
      return result;
    } catch (err) {
      endSpan(span, err);
      throw err;
    }
  }

  function getActiveTraceId() {
    return trace.getActiveSpan()?.spanContext().traceId;
  }

  function getActiveSpanId() {
    return trace.getActiveSpan()?.spanContext().spanId;
  }

  // ── Prometheus Registry ───────────────────────────────────────────────────
  const register = new client.Registry();
  register.setDefaultLabels({ service: SERVICE_NAME, env: ENV });
  client.collectDefaultMetrics({ register, prefix: 'nodejs_' });

  // ── Standard HTTP metrics ─────────────────────────────────────────────────
  const httpRequestCounter = new client.Counter({
    name: 'http_requests_total',
    help: 'Total HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
    registers: [register],
  });

  const httpRequestDuration = new client.Histogram({
    name: 'http_request_duration_ms',
    help: 'HTTP request latency in milliseconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000],
    registers: [register],
  });

  const activeRequests = new client.Gauge({
    name: 'http_active_requests',
    help: 'HTTP requests currently in-flight',
    labelNames: ['method'],
    registers: [register],
  });

  const httpErrorCounter = new client.Counter({
    name: 'http_errors_total',
    help: 'HTTP 4xx/5xx responses',
    labelNames: ['method', 'route', 'error_code'],
    registers: [register],
  });

  // ── DB / operation duration ───────────────────────────────────────────────
  const dbOperationDuration = new client.Histogram({
    name: 'db_operation_duration_ms',
    help: 'Database operation duration in milliseconds',
    labelNames: ['operation', 'collection', 'status'],
    buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000],
    registers: [register],
  });

  // ── Business-level error counter ──────────────────────────────────────────
  const businessErrorCounter = new client.Counter({
    name: 'business_errors_total',
    help: 'Application-level business logic errors',
    labelNames: ['error_type', 'service'],
    registers: [register],
  });

  // ── APM Middleware ────────────────────────────────────────────────────────
  function normaliseRoute(req) {
    if (req.route && req.baseUrl !== undefined) {
      return (req.baseUrl + req.route.path).replace(/\/{2,}/g, '/') || req.path;
    }
    return (req.path || '/')
      .replace(/\/[0-9a-fA-F]{24}/g, '/:id')
      .replace(/\/[0-9a-f-]{36}/g,  '/:id')
      .replace(/\/\d+/g,            '/:id');
  }

  function telemetryMiddleware(req, res, next) {
    const startMs = Date.now();
    const method  = req.method || 'UNKNOWN';

    activeRequests.inc({ method });

    // Inject trace context into response headers
    const traceId = getActiveTraceId();
    const spanId  = getActiveSpanId();
    if (traceId) res.setHeader('x-trace-id', traceId);
    if (spanId)  res.setHeader('x-span-id',  spanId);

    res.on('finish', () => {
      const route      = normaliseRoute(req);
      const statusCode = String(res.statusCode);
      const durationMs = Date.now() - startMs;

      activeRequests.dec({ method });
      httpRequestCounter.inc({ method, route, status_code: statusCode });
      httpRequestDuration.observe({ method, route, status_code: statusCode }, durationMs);

      if (res.statusCode >= 400) {
        httpErrorCounter.inc({ method, route, error_code: statusCode });
      }
    });

    next();
  }

  /** Express route handler for GET /metrics */
  async function metricsHandler(req, res) {
    try {
      res.set('Content-Type', register.contentType);
      res.end(await register.metrics());
    } catch (err) {
      res.status(500).end(err.message);
    }
  }

  // ── Winston format that injects traceId/spanId ────────────────────────────
  function traceContextFormat(winston) {
    return winston.format((info) => {
      const traceId = getActiveTraceId();
      const spanId  = getActiveSpanId();
      if (traceId) info.traceId = traceId;
      if (spanId)  info.spanId  = spanId;
      return info;
    })();
  }

  _instance = {
    // Tracing
    tracer, startSpan, endSpan, withSpan,
    getActiveTraceId, getActiveSpanId,
    SpanStatusCode, context, trace,
    // Metrics
    register,
    httpRequestCounter, httpRequestDuration, activeRequests,
    httpErrorCounter, dbOperationDuration, businessErrorCounter,
    // Middleware
    telemetryMiddleware, metricsHandler,
    // Logger helper
    traceContextFormat,
  };

  console.log(`[telemetry:${SERVICE_NAME}] Initialised ✅`);
  return _instance;
}

module.exports = initTelemetry;
