const { validateToken, extractTokenFromHeader } = require('../utils/auth');
const { AuthenticationError } = require('../utils/errors');

/**
 * Create GraphQL context
 * Extracts user from JWT token and adds to context
 */
const createContext = async ({ req }) => {
  const context = {
    user: null,
    userAgent: req.headers['user-agent'],
    ip: req.ip || req.connection.remoteAddress,
    requestId: req.id,
    timestamp: new Date().toISOString(),
    token: null, // Initialize token as null
    correlationId : req.headers['x-correlation-id'] || 
          req.headers['x-request-id'] || 
          `appt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    causationId : req.headers['x-causation-id'] || null
  };

  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (token) {
      const decoded = await validateToken(token);
      context.token = token; // Set the token in context for forwarding to downstream services (even if validation failed)
      context.user = {
        userId: decoded.id,
        email: decoded.email,
        role: decoded.role || [],
        tenantId: decoded.tenantId || null,
        phone: decoded.phoneNumber,
      };
    }
  } catch (error) {
    // Token verification failed - user will be null
    // GraphQL resolvers will handle authentication
  }

  return context;
};

module.exports = createContext;

