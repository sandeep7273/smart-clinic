/**
 * Correlation ID Middleware
 * Extracts or generates correlation ID for distributed tracing
 */

const { getCorrelationId, setCorrelationId } = require('../utils/correlationId');
const logger = require('../utils/logger');

/**
 * Correlation ID middleware
 * Must be applied early in middleware chain
 */
function correlationIdMiddleware(req, res, next) {
  // Get or generate correlation ID
  const correlationId = getCorrelationId(req);

  // Attach to request object for downstream use
  req.correlationId = correlationId;

  // Set in response headers
  setCorrelationId(res, correlationId);

  // Log the correlation ID
  logger.debug('Correlation ID assigned', { correlationId, path: req.path });

  next();
}

module.exports = correlationIdMiddleware;
