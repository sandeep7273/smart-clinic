/**
 * Telemetry Middleware — API Gateway
 *
 * Attaches APM instrumentation to every Express request:
 *   1. Increments active-request gauge
 *   2. Records request counter + duration histogram on response finish
 *   3. Injects trace/span IDs into response headers for client-side correlation
 *   4. Normalises route patterns (avoids high-cardinality paths like /user/123)
 */

"use strict";

const {
  httpRequestCounter,
  httpRequestDuration,
  activeRequests,
  httpErrorCounter,
} = require("../telemetry/metrics");

const { getActiveTraceId, getActiveSpanId } = require("../telemetry/tracing");

/**
 * Normalise a URL path to a low-cardinality route label.
 * e.g. /api/users/abc123/profile → /api/users/:id/profile
 */
function normaliseRoute(req) {
  // Prefer Express's matched route if available
  if (req.route && req.baseUrl !== undefined) {
    return (req.baseUrl + req.route.path).replace(/\/{2,}/g, "/") || req.path;
  }
  // Fall back to stripping dynamic segments
  return req.path
    .replace(/\/[0-9a-fA-F]{24}/g, "/:id") // MongoDB ObjectId
    .replace(/\/[0-9a-f-]{36}/g, "/:id") // UUID
    .replace(/\/\d+/g, "/:id"); // Numeric IDs
}

/**
 * Express middleware that provides request-level APM instrumentation.
 */
function telemetryMiddleware(req, res, next) {
  const startMs = Date.now();
  const method = req.method;

  // Track active requests
  activeRequests.inc({ method });

  // Inject trace context into response headers (useful for frontend correlation)
  res.on("finish", () => {
    const route = normaliseRoute(req);
    const statusCode = String(res.statusCode);
    const durationMs = Date.now() - startMs;

    // Decrement active-request gauge
    activeRequests.dec({ method });

    // Record counters + histograms
    httpRequestCounter.inc({ method, route, status_code: statusCode });
    httpRequestDuration.observe(
      { method, route, status_code: statusCode },
      durationMs,
    );

    // Track errors separately for easy alerting
    if (res.statusCode >= 400) {
      httpErrorCounter.inc({ method, route, error_code: statusCode });
    }
  });

  // Attach trace/span IDs to response headers for distributed debugging
  const traceId = getActiveTraceId();
  const spanId = getActiveSpanId();
  if (traceId) res.setHeader("x-trace-id", traceId);
  if (spanId) res.setHeader("x-span-id", spanId);

  next();
}

module.exports = telemetryMiddleware;
