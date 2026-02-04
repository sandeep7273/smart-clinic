/**
 * GraphQL Context
 * Creates context for GraphQL resolvers
 */

const { verifyAccessToken } = require('../utils/jwt');
const { getCorrelationId } = require('../utils/correlationId');
const logger = require('../utils/logger');

/**
 * Create GraphQL context from HTTP request
 * Extracts user info from JWT and correlation ID
 */
const createContext = ({ req, res }) => {
  const correlationId = getCorrelationId(req);
  
  // Extract token from Authorization header
  const authHeader = req.headers.authorization;
  let user = null;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const { valid, decoded, error } = verifyAccessToken(token);
    
    if (valid && decoded) {
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
    } else if (error) {
      logger.debug('GraphQL context: Invalid token', {
        correlationId,
        error: error.message,
      });
    }
  }
  
  return {
    user,
    correlationId,
    req,
    res,
  };
};

module.exports = { createContext };
