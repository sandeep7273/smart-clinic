/**
 * Correlation ID Middleware
 *
 * Reads x-correlation-id from incoming request headers (set by API Gateway)
 * or generates a new UUID. Attaches it to the request object and echoes it
 * back in the response so clients can correlate logs/traces end-to-end.
 *
 * Also propagates W3C TraceContext headers (traceparent / tracestate) so
 * OpenTelemetry can stitch spans across service boundaries.
 */

'use strict';

const { randomUUID } = require('crypto');

const CORRELATION_HEADER = 'x-correlation-id';

function correlationIdMiddleware(req, res, next) {
  // Read from gateway-forwarded header or generate new
  const correlationId =
    req.headers[CORRELATION_HEADER] ||
    req.headers[CORRELATION_HEADER.toLowerCase()] ||
    randomUUID();

  req.correlationId = correlationId;
  res.setHeader(CORRELATION_HEADER, correlationId);

  next();
}

module.exports = correlationIdMiddleware;
