/**
 * Logging Middleware
 * Logs incoming requests and outgoing responses
 */

const logger = require('../utils/logger');

/**
 * Request logging middleware
 */
function loggingMiddleware(req, res, next) {
  const startTime = Date.now();

  // Log incoming request
  logger.info('Incoming request', {
    correlationId: req.correlationId,
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    userId: req.user?.userId,
  });

  // Capture response
  const originalSend = res.send;
  res.send = function (data) {
    res.send = originalSend;

    // Calculate duration
    const duration = Date.now() - startTime;

    // Determine log level based on status code
    const logLevel = res.statusCode >= 500 ? 'error' 
                   : res.statusCode >= 400 ? 'warn' 
                   : 'info';

    // Log response
    logger[logLevel]('Outgoing response', {
      correlationId: req.correlationId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId: req.user?.userId,
    });

    return originalSend.call(this, data);
  };

  next();
}

module.exports = loggingMiddleware;
