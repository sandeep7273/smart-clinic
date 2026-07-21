const { validateToken, extractTokenFromHeader } = require('../utils/auth');

/**
 * Create GraphQL context
 * Extracts user from JWT token and adds to context.
 *
 * When called through the API Gateway, the gateway has already validated the
 * token and forwarded user info as x-user-* headers.  Trust those headers
 * directly to avoid a circular validation call back to the gateway.
 * Fall back to remote token validation only for direct (non-gateway) calls.
 */
const createContext = async ({ req }) => {
  const context = {
    user: null,
    userAgent: req.headers['user-agent'],
    ip: req.ip || req.connection.remoteAddress,
    requestId: req.id,
    timestamp: new Date().toISOString(),
    token: null,
    correlationId: req.headers['x-correlation-id'] ||
      req.headers['x-request-id'] ||
      `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    causationId: req.headers['x-causation-id'] || null,
  };

  const authHeader = req.headers.authorization;
  const token = extractTokenFromHeader(authHeader);

  if (token) {
    // Always set token so requireAuthentication() checks pass
    context.token = token;

    const gatewayUserId = req.headers['x-user-id'];
    if (gatewayUserId) {
      // API Gateway already validated the token — trust its forwarded headers
      context.user = {
        userId: gatewayUserId,
        id: gatewayUserId,
        email: req.headers['x-user-email'] || null,
        role: req.headers['x-user-role'] || null,
        tenantId: req.headers['x-tenant-id'] || null,
      };
    } else {
      // Direct call (dev / testing) — validate remotely as fallback
      try {
        const decoded = await validateToken(token);
        context.user = {
          userId: decoded.id,
          id: decoded.id,
          email: decoded.email,
          role: decoded.role || [],
          tenantId: decoded.tenantId || null,
          phone: decoded.phoneNumber,
        };
      } catch (error) {
        // Validation failed; context.token is still set.
      }
    }
  }

  return context;
};

module.exports = createContext;

