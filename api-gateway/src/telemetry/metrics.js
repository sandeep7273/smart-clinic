/**
 * Prometheus Metrics — API Gateway
 *
 * Exposes standard APM-style metrics:
 *   • http_requests_total          – counter by method/route/status
 *   • http_request_duration_ms     – histogram (P50/P90/P99)
 *   • http_active_requests         – gauge
 *   • http_errors_total            – counter by method/route/error_code
 *   • service_proxy_duration_ms    – histogram for upstream proxy calls
 *   • nodejs_*                     – built-in Node.js runtime metrics
 *
 * Usage:
 *   const { register, httpRequestCounter } = require('./metrics');
 *   app.get('/metrics', async (req, res) => {
 *     res.set('Content-Type', register.contentType);
 *     res.end(await register.metrics());
 *   });
 */

"use strict";

const client = require("prom-client");

const SERVICE_NAME = process.env.SERVICE_NAME || "api-gateway";

// ── Registry ──────────────────────────────────────────────────────────────────
const register = new client.Registry();
register.setDefaultLabels({
  service: SERVICE_NAME,
  env: process.env.NODE_ENV || "development",
});

// Collect default Node.js metrics (heap, GC, event loop lag, etc.)
client.collectDefaultMetrics({ register, prefix: "nodejs_" });

// ── HTTP Request Counter ───────────────────────────────────────────────────────
const httpRequestCounter = new client.Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status_code"],
  registers: [register],
});

// ── HTTP Request Duration ─────────────────────────────────────────────────────
const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_ms",
  help: "HTTP request latency in milliseconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000],
  registers: [register],
});

// ── Active Requests Gauge ─────────────────────────────────────────────────────
const activeRequests = new client.Gauge({
  name: "http_active_requests",
  help: "Number of HTTP requests currently being processed",
  labelNames: ["method"],
  registers: [register],
});

// ── Error Counter ─────────────────────────────────────────────────────────────
const httpErrorCounter = new client.Counter({
  name: "http_errors_total",
  help: "Total number of HTTP errors (4xx/5xx)",
  labelNames: ["method", "route", "error_code"],
  registers: [register],
});

// ── Proxy / Upstream Duration ─────────────────────────────────────────────────
const proxyDuration = new client.Histogram({
  name: "service_proxy_duration_ms",
  help: "Duration of proxied upstream requests in milliseconds",
  labelNames: ["target_service", "method", "status_code"],
  buckets: [10, 25, 50, 100, 250, 500, 1000, 2500, 5000],
  registers: [register],
});

// ── GraphQL Operation Metrics ─────────────────────────────────────────────────
const graphqlOperationCounter = new client.Counter({
  name: "graphql_operations_total",
  help: "Total GraphQL operations",
  labelNames: ["operation_type", "operation_name", "status"],
  registers: [register],
});

const graphqlOperationDuration = new client.Histogram({
  name: "graphql_operation_duration_ms",
  help: "GraphQL operation execution time in milliseconds",
  labelNames: ["operation_type", "operation_name"],
  buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2500],
  registers: [register],
});

// ── Schema Reload Counter ─────────────────────────────────────────────────────
const schemaReloadCounter = new client.Counter({
  name: "gateway_schema_reloads_total",
  help: "Number of GraphQL schema reloads",
  labelNames: ["status"],
  registers: [register],
});

// ── Connected Services Gauge ──────────────────────────────────────────────────
const connectedServices = new client.Gauge({
  name: "gateway_connected_services",
  help: "Number of upstream services connected to the federation",
  registers: [register],
});

module.exports = {
  register,
  httpRequestCounter,
  httpRequestDuration,
  activeRequests,
  httpErrorCounter,
  proxyDuration,
  graphqlOperationCounter,
  graphqlOperationDuration,
  schemaReloadCounter,
  connectedServices,
};
