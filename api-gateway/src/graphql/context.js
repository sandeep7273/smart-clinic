/**
 * GraphQL Context
 * Creates context for GraphQL resolvers
 */

const { validateToken } = require('../utils/auth');
const { getCorrelationId } = require('../utils/correlationId');
const logger = require('../utils/logger');

/**
 * Create GraphQL context from HTTP request
 * Extracts user info from JWT and correlation ID
 */
const createContext = async ({ req, res }) => {
  const correlationId = getCorrelationId(req);
  
  // Extract token from Authorization header
  const authHeader = req.headers.authorization;
  let user = null;
  let token = null;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
    
    try {
      // validateToken is async and validates through auth-service
      const decoded = await validateToken(token);
      
      if (decoded) {
        user = {
          userId: decoded.userId || decoded.id,
          email: decoded.email,
          role: decoded.role,
          tenantId: decoded.tenantId,
        };
        
        logger.debug('GraphQL context created with user', {
          correlationId,
          userId: user.userId,
          role: user.role,
        });
      }
    } catch (error) {
      logger.debug('GraphQL context: Invalid token', {
        correlationId,
        error: error.message,
      });
      // throw new Error('Invalid or expired token');
      // Token validation failed - user remains null, but token is still forwarded
      // to downstream services for their own validation
    }
  }
  
  return {
    user,
    token, // Include token for forwarding to downstream services (even if validation failed)
    correlationId,
    req,
    res,
  };
};

module.exports = { createContext };
