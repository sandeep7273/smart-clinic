const { validateToken, extractTokenFromHeader } = require('../utils/auth');

/**
 * Create GraphQL context
 * Extracts user from JWT token and adds to context
 */
const createContext = async ({ req }) => {
  const context = {
    user: null,
  };

  try {
    // const authHeader = req.headers.authorization;
    // const token = extractTokenFromHeader(authHeader);
    const token = req.headers.authorization?.replace('Bearer ', '') || null;
    if (token) {
      const user = await validateToken(token);
      context.user = {
        userId: user.id,
        email: user.email,
        role: user.role || [],
      };
    }
  } catch (error) {
    // Token verification failed - user will be null
    // GraphQL resolvers will handle authentication
  }

  return context;
};

module.exports = createContext;

