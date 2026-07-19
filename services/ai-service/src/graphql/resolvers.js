const chatService = require('../services/chatService');
const redisClient = require('../config/redis');
const logger = require('../utils/logger');

const resolvers = {
  Query: {
    /**
     * Get conversation context for a user
     */
    getConversationContext: async (_, { userId }, context) => {
      try {
        // Verify authentication
        if (!context.user) {
          // Return empty context instead of throwing error for better UX
          logger.warn('Conversation context requested without authentication');
          return {
            userId,
            messages: [],
            messageCount: 0
          };
        }

        // Ensure user can only access their own context
        if (context.user.id !== userId && context.user.role !== 'admin') {
          logger.warn(`User ${context.user.id} attempted to access context for ${userId}`);
          return {
            userId,
            messages: [],
            messageCount: 0
          };
        }

        const messages = await redisClient.getContext(userId);

        return {
          userId,
          messages,
          messageCount: messages.length
        };
      } catch (error) {
        logger.error('Error getting conversation context:', error);
        // Return empty context on error instead of throwing
        return {
          userId,
          messages: [],
          messageCount: 0
        };
      }
    },

    /**
     * Health check endpoint
     */
    healthCheck: () => {
      return 'AI Service is running!';
    }
  },

  Mutation: {
    /**
     * Send a chat message and get AI response
     */
    sendChatMessage: async (_, { userId, message }, context) => {
      try {
        // Verify authentication
        if (!context.user) {
          logger.warn('Chat message attempted without authentication');
          return {
            success: false,
            message: 'Please log in to use the AI assistant'
          };
        }

        // Ensure user can only send messages as themselves
        if (context.user.userId !== userId && context.user.role !== 'admin') {
          logger.warn(`User ${context.user.userId} attempted to send message as ${userId}`);
          return {
            success: false,
            message: 'Unauthorized: Cannot send messages as another user'
          };
        }

        // Validate message
        if (!message || message.trim().length === 0) {
          return {
            success: false,
            message: 'Message cannot be empty'
          };
        }

        if (message.length > 1000) {
          return {
            success: false,
            message: 'Message is too long (max 1000 characters)'
          };
        }

        // Get auth token from context
        const authToken = context.token;

        // Process the message
        const result = await chatService.processMessage(userId, message, authToken);

        logger.info(`Chat message processed for user ${userId}`);

        return result;
      } catch (error) {
        logger.error('Error sending chat message:', error);
        return {
          success: false,
          message: error.message || 'Failed to process message'
        };
      }
    },

    /**
     * Clear conversation context for a user
     */
    clearConversationContext: async (_, { userId }, context) => {
      try {
        // Verify authentication
        if (!context.user) {
          logger.warn('Clear context attempted without authentication');
          return {
            success: false,
            message: 'Please log in to clear conversation history'
          };
        }

        // Ensure user can only clear their own context
        if (context.user.userId !== userId && context.user.role !== 'admin') {
          logger.warn(`User ${context.user.userId} attempted to clear context for ${userId}`);
          return {
            success: false,
            message: 'Unauthorized: Cannot clear another user\'s conversation'
          };
        }

        const success = await chatService.clearContext(userId);

        return {
          success,
          message: success ? 'Conversation context cleared successfully' : 'Failed to clear context'
        };
      } catch (error) {
        logger.error('Error clearing conversation context:', error);
        return {
          success: false,
          message: error.message || 'Failed to clear context'
        };
      }
    }
  }
};

module.exports = resolvers;
