/**
 * Correlation ID Utility
 * For distributed tracing across services
 */

const { v4: uuidv4 } = require('uuid');

const CORRELATION_ID_HEADER = 'x-correlation-id';

/**
 * Generate a new correlation ID
 * @returns {string} UUID v4
 */
function generateCorrelationId() {
  return uuidv4();
}

/**
 * Get correlation ID from request headers or generate new one
 * @param {Object} req - Express request object
 * @returns {string} Correlation ID
 */
function getCorrelationId(req) {
  // Try to get from headers (case-insensitive)
  const headerValue = req.headers[CORRELATION_ID_HEADER] || 
                       req.headers[CORRELATION_ID_HEADER.toLowerCase()];
  
  if (headerValue) {
    return headerValue;
  }

  // Generate new if not found
  return generateCorrelationId();
}

/**
 * Set correlation ID in response headers
 * @param {Object} res - Express response object
 * @param {string} correlationId - Correlation ID to set
 */
function setCorrelationId(res, correlationId) {
  res.setHeader(CORRELATION_ID_HEADER, correlationId);
}

/**
 * Get correlation ID header name
 * @returns {string} Header name
 */
function getCorrelationIdHeader() {
  return CORRELATION_ID_HEADER;
}

module.exports = {
  generateCorrelationId,
  getCorrelationId,
  setCorrelationId,
  getCorrelationIdHeader,
  CORRELATION_ID_HEADER,
};
