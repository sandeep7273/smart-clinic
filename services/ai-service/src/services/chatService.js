const intentDetectionService = require("./intentDetectionService");
const ragService = require("./ragService");
const doctorClient = require("../grpc/doctorClient");
const appointmentClient = require("../grpc/appointmentClient");
const redisClient = require("../config/redis");
const logger = require("../utils/logger");
const config = require("../config");

function withTimeout(promise, timeoutMs, label) {
  let timeout;
  const timeoutPromise = new Promise((_, reject) => {
    timeout = setTimeout(
      () => reject(new Error(`${label} timed out after ${timeoutMs}ms`)),
      timeoutMs,
    );
  });

  return Promise.race([promise, timeoutPromise]).finally(() =>
    clearTimeout(timeout),
  );
}

class ChatService {
  constructor() {
    this.INTENTS = intentDetectionService.INTENTS;
  }

  shouldUseRuleBasedFastPath(intentResult) {
    if (
      intentResult.intent === this.INTENTS.HEALTH_QUERY &&
      (intentResult.entities?.specialization ||
        intentResult.entities?.symptoms?.length)
    ) {
      return true;
    }

    return [
      this.INTENTS.SEARCH_DOCTOR,
      this.INTENTS.SHOW_APPOINTMENTS,
      this.INTENTS.BOOK_APPOINTMENT,
      this.INTENTS.CANCEL_APPOINTMENT,
    ].includes(intentResult.intent);
  }

  async handleIntent(userId, message, authToken, intentResult, context = []) {
    switch (intentResult.intent) {
      case this.INTENTS.HEALTH_QUERY:
        return this.handleHealthQuery(
          message,
          intentResult,
          context,
          authToken,
        );

      case this.INTENTS.SEARCH_DOCTOR:
        return this.handleSearchDoctor(message, intentResult, authToken);

      case this.INTENTS.SHOW_APPOINTMENTS:
        return this.handleShowAppointments(userId, message, authToken);

      case this.INTENTS.BOOK_APPOINTMENT:
        return this.handleBookAppointment(message, intentResult);

      case this.INTENTS.CANCEL_APPOINTMENT:
        return this.handleCancelAppointment(message, intentResult);

      default:
        return this.handleUnknown(message, context);
    }
  }

  /**
   * Process user chat message
   */
  async processMessage(userId, message, authToken) {
    try {
      return await withTimeout(
        this.processMessageInternal(userId, message, authToken),
        config.chat.timeoutMs,
        "AI chat processing",
      );
    } catch (error) {
      logger.error("Chat processing timed out or failed:", error);
      return {
        success: true,
        data: {
          message:
            "I am having trouble reaching one of the clinic services right now. Please try again in a moment.",
          actionType: "NONE",
          payload: {},
        },
        intent: this.INTENTS.UNKNOWN,
        entities: {},
      };
    }
  }

  async processMessageInternal(userId, message, authToken) {
    try {
      logger.info(`Processing message for user ${userId}: ${message}`);

      const ruleBasedIntent =
        intentDetectionService.detectIntentFallback(message);

      if (this.shouldUseRuleBasedFastPath(ruleBasedIntent)) {
        const response = await this.handleIntent(
          userId,
          message,
          authToken,
          ruleBasedIntent,
        );

        return {
          success: true,
          data: response,
          intent: ruleBasedIntent.intent,
          entities: ruleBasedIntent.entities,
        };
      }

      if (config.chat.doctorLookupMode === "deferred") {
        if (ruleBasedIntent.intent === this.INTENTS.SEARCH_DOCTOR) {
          const response = await this.handleSearchDoctor(
            message,
            ruleBasedIntent,
            authToken,
          );

          return {
            success: true,
            data: response,
            intent: ruleBasedIntent.intent,
            entities: ruleBasedIntent.entities,
          };
        }
      }

      // Get conversation context
      const context = await redisClient.getContext(userId);

      // Detect intent
      const intentResult = await intentDetectionService.detectIntent(
        message,
        context,
      );

      // Store user message in context
      await redisClient.storeContext(userId, {
        role: "user",
        content: message,
      });

      const response = await this.handleIntent(
        userId,
        message,
        authToken,
        intentResult,
        context,
      );

      // Store assistant response in context
      await redisClient.storeContext(userId, {
        role: "assistant",
        content: response.message,
      });

      return {
        success: true,
        data: response,
        intent: intentResult.intent,
        entities: intentResult.entities,
      };
    } catch (error) {
      logger.error("Error processing message:", error);
      return {
        success: true,
        data: {
          message:
            "I am having trouble processing that request right now. Please try again in a moment.",
          actionType: "NONE",
          payload: {},
        },
        intent: this.INTENTS.UNKNOWN,
        entities: {},
      };
    }
  }

  /**
   * Handle health-related queries using RAG
   */
  async handleHealthQuery(message, intentResult, context, authToken) {
    try {
      const symptoms = intentResult.entities.symptoms || [];
      const specialization =
        intentResult.entities.specialization ||
        intentDetectionService.extractSpecialization(message) ||
        intentDetectionService.inferSpecializationFromSymptoms(
          message,
          symptoms,
        );

      if (
        config.chat.doctorLookupMode === "deferred" &&
        (specialization || symptoms.length > 0)
      ) {
        const normalizedSpecialization =
          intentDetectionService.normalizeSpecialization(specialization) ||
          "General Medicine";
        const symptomText = symptoms.length
          ? symptoms.join(", ")
          : "your symptoms";

        return {
          message: `For ${symptomText}, a ${normalizedSpecialization} doctor can help assess you. Would you like to view matching doctors?`,
          actionType: "SEARCH_DOCTOR",
          payload: {
            specialization: normalizedSpecialization,
            symptoms,
            count: 0,
            total: 0,
            doctors: [],
          },
          disclaimer:
            "This is not a substitute for professional medical advice. Please consult with a healthcare provider.",
        };
      }

      // Generate response using RAG
      const aiResponse = await ragService.generateResponseWithRAG(
        message,
        context,
      );

      // Extract specialization if mentioned
      let actionType = "NONE";
      let payload = {};

      if (specialization) {
        actionType = "SEARCH_DOCTOR";
        payload = { specialization };
      }

      return {
        message: aiResponse,
        actionType,
        payload,
        disclaimer:
          "This is not a substitute for professional medical advice. Please consult with a healthcare provider.",
      };
    } catch (error) {
      logger.error("Error handling health query:", error);
      return {
        message:
          "I can help you understand your symptoms and recommend specialists. Could you describe what you're experiencing?",
        actionType: "NONE",
        payload: {},
      };
    }
  }

  /**
   * Handle doctor search requests
   */
  async handleSearchDoctor(message, intentResult, authToken) {
    try {
      let specialization =
        intentResult.entities.specialization ||
        intentDetectionService.extractSpecialization(message) ||
        null;
      const location = intentResult.entities.location || null;
      const symptoms = intentResult.entities.symptoms || [];

      // Normalize specialization to match database format
      if (specialization) {
        specialization =
          intentDetectionService.normalizeSpecialization(specialization);
        logger.info("Normalized specialization for search:", {
          original: intentResult.entities.specialization,
          normalized: specialization,
        });
      }

      if (config.chat.doctorLookupMode === "deferred") {
        const searchText =
          [specialization, location ? `in ${location}` : null]
            .filter(Boolean)
            .join(" ") || "doctors";

        return {
          message: `I can show you ${searchText}. Would you like to view matching doctors?`,
          actionType: "SEARCH_DOCTOR",
          payload: {
            specialization,
            location,
            count: 0,
            total: 0,
            doctors: [],
          },
        };
      }

      if (!specialization && !location && symptoms.length === 0) {
        return {
          message:
            "I can help you find a doctor. Which type of specialist are you looking for? (e.g., Cardiologist, Dermatologist, Pediatrician)",
          actionType: "NONE",
          payload: {},
        };
      }

      // Build search filters
      const searchFilters = {
        limit: 10,
        page: 1,
        sortBy: "rating",
        sortOrder: "desc",
      };

      // Add available filters with normalized specialization
      if (specialization) searchFilters.specialization = specialization;
      if (location) {
        // Try to split location into city and state if possible
        const locationParts = location.split(",").map((p) => p.trim());
        if (locationParts.length > 1) {
          searchFilters.city = locationParts[0];
          searchFilters.state = locationParts[1];
        } else {
          searchFilters.city = location;
        }
      }

      // Build cache key from filters
      const cacheKey = JSON.stringify(searchFilters);

      // Check cache first
      const cachedDoctors = await redisClient.getCachedDoctorSearch(cacheKey);

      let doctors;
      let totalCount = 0;

      if (cachedDoctors) {
        doctors = cachedDoctors;
        totalCount = doctors.length;
        logger.info(`Using cached doctors for filters: ${cacheKey}`);
      } else {
        let doctorServiceError = false;
        // Call doctor service via gRPC using SearchDoctors
        try {
          const response = await doctorClient.searchDoctors(
            searchFilters,
            authToken,
          );

          if (response.success && response.doctors) {
            doctors = response.doctors;
            totalCount = response.total_count || doctors.length;
            // Cache the results
            await redisClient.cacheDoctorSearch(cacheKey, doctors);
          }
        } catch (error) {
          logger.error("Error calling doctor service:", error);
          doctorServiceError = true;
          doctors = [];
        }
        if (doctorServiceError) {
          return {
            message:
              "I can help you search for doctors. What type of specialist do you need?",
            actionType: "NONE",
            payload: {},
          };
        }
      }

      const doctorCount = doctors ? doctors.length : 0;

      // Build response message
      let searchDescription = [];
      if (specialization) searchDescription.push(specialization);
      if (location) searchDescription.push(`in ${location}`);

      const searchText = searchDescription.join(" ") || "doctors";

      // Limit doctors to top 5 for display in chat
      const displayDoctors = doctors
        ? doctors.slice(0, 5).map((doctor) => {
            // Log doctor data for debugging
            logger.info("Mapping doctor data:", {
              id: doctor.id,
              hasFirstName: !!doctor.firstName,
              hasLastName: !!doctor.lastName,
              hasSpecializations: !!doctor.specializations,
              hasAddress: !!doctor.address,
            });

            const doctorName =
              `${doctor.firstName || ""} ${doctor.lastName || ""}`.trim() ||
              doctor.name ||
              "Unknown Doctor";
            const doctorSpec =
              Array.isArray(doctor.specializations) &&
              doctor.specializations.length > 0
                ? doctor.specializations[0]
                : doctor.specialization || "General Practitioner";

            return {
              id: doctor.id || doctor.doctor_id || "",
              name: doctorName,
              specialization: doctorSpec,
              rating: parseFloat(doctor.average_rating || doctor.rating || 0),
              consultationFee: parseFloat(
                doctor.consultation_fee || doctor.consultationFee || 0,
              ),
              city: doctor.address?.city || doctor.city || "",
              state: doctor.address?.state || doctor.state || "",
              street: doctor.address?.street || doctor.street || "",
              languages: Array.isArray(doctor.languages)
                ? doctor.languages
                : [],
              experience: parseInt(
                doctor.experience_years || doctor.experience || 0,
                10,
              ),
            };
          })
        : [];

      return {
        message: `I found ${doctorCount} ${searchText} available. Would you like to view them?`,
        actionType: "SEARCH_DOCTOR",
        payload: {
          specialization,
          location,
          count: doctorCount,
          total: totalCount,
          doctors: displayDoctors,
        },
      };
    } catch (error) {
      logger.error("Error handling search doctor:", error);
      return {
        message:
          "I can help you search for doctors. What type of specialist do you need?",
        actionType: "NONE",
        payload: {},
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
            1,
          );

          if (response.success && response.appointments) {
            appointments = response.appointments;
            // Cache the results
            await redisClient.cacheUserAppointments(userId, appointments);
          } else {
            return {
              message: "I can help you view your appointments. Let me check...",
              actionType: "SHOW_APPOINTMENTS",
              payload: {},
            };
          }
        } catch (error) {
          logger.error("Error calling appointment service:", error);
          // If the appointment service errors out, return a helpful message
          return {
            message: "I can help you view your appointments. Let me check...",
            actionType: "SHOW_APPOINTMENTS",
            payload: {},
          };
        }
      }

      const appointmentCount = appointments.length;
      let responseMessage;

      if (appointmentCount === 0) {
        responseMessage =
          "You don't have any appointments scheduled. Would you like to book one?";
      } else {
        responseMessage = `You have ${appointmentCount} appointment${appointmentCount !== 1 ? "s" : ""}. Would you like to view them?`;
      }

      const displayAppointments = appointments
        .slice(0, 5)
        .map((appointment) => ({
          id: appointment.appointment_id || appointment.id,
          doctorId: appointment.doctor_id || appointment.doctorId,
          doctorName:
            appointment.doctor?.name ||
            appointment.doctor_name ||
            appointment.doctorName ||
            "Doctor",
          specialization:
            appointment.doctor?.specialization ||
            appointment.specialization ||
            "",
          city: appointment.doctor?.city || appointment.city || "",
          state: appointment.doctor?.state || appointment.state || "",
          date: appointment.appointment_date || appointment.date,
          startTime: appointment.start_time || appointment.startTime,
          endTime: appointment.end_time || appointment.endTime,
          status: appointment.status,
          type: appointment.appointment_type || appointment.type,
        }));

      return {
        message: responseMessage,
        actionType: "SHOW_APPOINTMENTS",
        payload: {
          count: appointmentCount,
          hasAppointments: appointmentCount > 0,
          appointments: displayAppointments,
        },
      };
    } catch (error) {
      logger.error("Error handling show appointments:", error);
      return {
        message: "I can help you view your appointments. Let me check...",
        actionType: "SHOW_APPOINTMENTS",
        payload: {},
      };
    }
  }

  /**
   * Handle appointment booking request
   */
  async handleBookAppointment(message, intentResult) {
    const specialization =
      intentResult.entities.specialization ||
      intentDetectionService.extractSpecialization(message);

    if (specialization) {
      const normalizedSpecialization =
        intentDetectionService.normalizeSpecialization(specialization);

      return {
        message: `To book an appointment with a ${normalizedSpecialization}, I'll help you find available doctors.`,
        actionType: "BOOK_APPOINTMENT",
        payload: { specialization: normalizedSpecialization },
      };
    }

    return {
      message:
        "I can help you book an appointment. Let's start by choosing a doctor.",
      actionType: "BOOK_APPOINTMENT",
      payload: {},
    };
  }

  /**
   * Handle appointment cancellation request
   */
  async handleCancelAppointment(message, intentResult) {
    return {
      message:
        "To cancel an appointment, let me show you your scheduled appointments.",
      actionType: "SHOW_APPOINTMENTS",
      payload: {
        action: "cancel",
      },
    };
  }

  /**
   * Handle unknown intent
   */
  async handleUnknown(message, context) {
    try {
      // Generate a helpful response using RAG
      const response = await ragService.generateResponseWithRAG(
        message,
        context,
      );

      return {
        message:
          response ||
          "I'm here to help you with health queries and appointments. You can ask me about symptoms, search for doctors, or view your appointments.",
        actionType: "NONE",
        payload: {},
      };
    } catch (error) {
      return {
        message:
          "I'm here to help you with:\n- Health questions and symptoms\n- Finding doctors\n- Viewing appointments\n- Booking appointments\n\nWhat would you like help with?",
        actionType: "NONE",
        payload: {},
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
