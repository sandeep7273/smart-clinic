const intentDetectionService = require('./intentDetectionService');
const ragService = require('./ragService');
const doctorClient = require('../grpc/doctorClient');
const appointmentClient = require('../grpc/appointmentClient');
const redisClient = require('../config/redis');
const logger = require('../utils/logger');

class ChatService {
  constructor() {
    this.INTENTS = intentDetectionService.INTENTS;
  }

  /**
   * Process user chat message
   */
  async processMessage(userId, message, authToken) {
    try {
      logger.info(`Processing message for user ${userId}: ${message}`);

      // Get conversation context
      const context = await redisClient.getContext(userId);

      // Detect intent
      const intentResult = await intentDetectionService.detectIntent(message, context);
      
      // Store user message in context
      await redisClient.storeContext(userId, {
        role: 'user',
        content: message
      });

      // Process based on intent
      let response;
      switch (intentResult.intent) {
        case this.INTENTS.HEALTH_QUERY:
          response = await this.handleHealthQuery(message, intentResult, context, authToken);
          break;
        
        case this.INTENTS.SEARCH_DOCTOR:
          response = await this.handleSearchDoctor(message, intentResult, authToken);
          break;
        
        case this.INTENTS.SHOW_APPOINTMENTS:
          response = await this.handleShowAppointments(userId, message, authToken);
          break;
        
        case this.INTENTS.BOOK_APPOINTMENT:
          response = await this.handleBookAppointment(message, intentResult);
          break;
        
        case this.INTENTS.CANCEL_APPOINTMENT:
          response = await this.handleCancelAppointment(message, intentResult);
          break;
        
        default:
          response = await this.handleUnknown(message, context);
      }

      // Store assistant response in context
      await redisClient.storeContext(userId, {
        role: 'assistant',
        content: response.message
      });

      return {
        success: true,
        data: response,
        intent: intentResult.intent,
        entities: intentResult.entities
      };
    } catch (error) {
      logger.error('Error processing message:', error);
      return {
        success: false,
        message: 'Sorry, I encountered an error processing your request. Please try again.',
        actionType: 'NONE'
      };
    }
  }

  /**
   * Handle health-related queries using RAG
   */
  async handleHealthQuery(message, intentResult, context, authToken) {
    try {
      // Generate response using RAG
      const aiResponse = await ragService.generateResponseWithRAG(message, context);

      // Extract specialization if mentioned
      const specialization = intentResult.entities.specialization || 
                           intentDetectionService.extractSpecialization(message);

      let actionType = 'NONE';
      let payload = {};

      if (specialization) {
        actionType = 'SEARCH_DOCTOR';
        payload = { specialization };
      }

      return {
        message: aiResponse,
        actionType,
        payload,
        disclaimer: 'This is not a substitute for professional medical advice. Please consult with a healthcare provider.'
      };
    } catch (error) {
      logger.error('Error handling health query:', error);
      return {
        message: 'I can help you understand your symptoms and recommend specialists. Could you describe what you\'re experiencing?',
        actionType: 'NONE',
        payload: {}
      };
    }
  }

  /**
   * Handle doctor search requests
   */
  async handleSearchDoctor(message, intentResult, authToken) {
    try {
      const specialization = intentResult.entities.specialization || 
                           intentDetectionService.extractSpecialization(message);

      if (!specialization) {
        return {
          message: 'I can help you find a doctor. Which type of specialist are you looking for? (e.g., Cardiologist, Dermatologist, Pediatrician)',
          actionType: 'NONE',
          payload: {}
        };
      }

      // Check cache first
      const cachedDoctors = await redisClient.getCachedDoctorSearch(specialization);
      
      let doctors;
      if (cachedDoctors) {
        doctors = cachedDoctors;
        logger.info(`Using cached doctors for specialization: ${specialization}`);
      } else {
        // Call doctor service via gRPC
        try {
          const response = await doctorClient.getDoctorsBySpecialization(
            specialization,
            authToken,
            10,
            1
          );

          if (response.success && response.doctors) {
            doctors = response.doctors;
            // Cache the results
            await redisClient.cacheDoctorSearch(specialization, doctors);
          }
        } catch (error) {
          logger.error('Error calling doctor service:', error);
          doctors = [];
        }
      }

      const doctorCount = doctors ? doctors.length : 0;

      return {
        message: `I found ${doctorCount} ${specialization}${doctorCount !== 1 ? 's' : ''} available. Would you like to view them?`,
        actionType: 'SEARCH_DOCTOR',
        payload: {
          specialization,
          count: doctorCount
        }
      };
    } catch (error) {
      logger.error('Error handling search doctor:', error);
      return {
        message: 'I can help you search for doctors. What type of specialist do you need?',
        actionType: 'NONE',
        payload: {}
      };
    }
  }

  /**
   * Handle show appointments request
   */
  async handleShowAppointments(userId, message, authToken) {
    try {
      // Check cache first
      let appointments = await redisClient.getCachedUserAppointments(userId);

      if (!appointments) {
        // Call appointment service via gRPC
        try {
          const response = await appointmentClient.getUserAppointments(
            userId,
            authToken,
            null,
            10,
            1
          );

          if (response.success && response.appointments) {
            appointments = response.appointments;
            // Cache the results
            await redisClient.cacheUserAppointments(userId, appointments);
          } else {
            appointments = [];
          }
        } catch (error) {
          logger.error('Error calling appointment service:', error);
          appointments = [];
        }
      }

      const appointmentCount = appointments.length;
      let responseMessage;

      if (appointmentCount === 0) {
        responseMessage = 'You don\'t have any appointments scheduled. Would you like to book one?';
      } else {
        responseMessage = `You have ${appointmentCount} appointment${appointmentCount !== 1 ? 's' : ''}. Would you like to view them?`;
      }

      return {
        message: responseMessage,
        actionType: 'SHOW_APPOINTMENTS',
        payload: {
          count: appointmentCount,
          hasAppointments: appointmentCount > 0
        }
      };
    } catch (error) {
      logger.error('Error handling show appointments:', error);
      return {
        message: 'I can help you view your appointments. Let me check...',
        actionType: 'SHOW_APPOINTMENTS',
        payload: {}
      };
    }
  }

  /**
   * Handle appointment booking request
   */
  async handleBookAppointment(message, intentResult) {
    const specialization = intentResult.entities.specialization;

    if (specialization) {
      return {
        message: `To book an appointment with a ${specialization}, I'll help you find available doctors. Let's search for ${specialization}s.`,
        actionType: 'SEARCH_DOCTOR',
        payload: { specialization }
      };
    }

    return {
      message: 'I can help you book an appointment. First, let me know what type of doctor you need to see.',
      actionType: 'NONE',
      payload: {}
    };
  }

  /**
   * Handle appointment cancellation request
   */
  async handleCancelAppointment(message, intentResult) {
    return {
      message: 'To cancel an appointment, let me show you your scheduled appointments.',
      actionType: 'SHOW_APPOINTMENTS',
      payload: {
        action: 'cancel'
      }
    };
  }

  /**
   * Handle unknown intent
   */
  async handleUnknown(message, context) {
    try {
      // Generate a helpful response using RAG
      const response = await ragService.generateResponseWithRAG(message, context);

      return {
        message: response || 'I\'m here to help you with health queries and appointments. You can ask me about symptoms, search for doctors, or view your appointments.',
        actionType: 'NONE',
        payload: {}
      };
    } catch (error) {
      return {
        message: 'I\'m here to help you with:\n- Health questions and symptoms\n- Finding doctors\n- Viewing appointments\n- Booking appointments\n\nWhat would you like help with?',
        actionType: 'NONE',
        payload: {}
      };
    }
  }

  /**
   * Clear user conversation context
   */
  async clearContext(userId) {
    return await redisClient.clearContext(userId);
  }
}

module.exports = new ChatService();
