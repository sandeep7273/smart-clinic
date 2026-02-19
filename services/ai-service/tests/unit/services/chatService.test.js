/**
 * Unit Tests for ChatService
 */
// Mock dependencies before requiring modules so hoisted mocks prevent
// loading ESM-only dependencies during tests.
jest.mock('../../../src/services/intentDetectionService');
jest.mock('../../../src/services/ragService');
jest.mock('../../../src/grpc/doctorClient');
jest.mock('../../../src/grpc/appointmentClient');
jest.mock('../../../src/config/redis');
jest.mock('../../../src/utils/logger');

let chatService;
const intentDetectionService = require('../../../src/services/intentDetectionService');
const ragService = require('../../../src/services/ragService');
const doctorClient = require('../../../src/grpc/doctorClient');
const appointmentClient = require('../../../src/grpc/appointmentClient');
const redisClient = require('../../../src/config/redis');

describe('ChatService', () => {
  const mockAuthToken = 'Bearer test-token';
  const mockUserId = 'user-123';
  const mockContext = [
    { role: 'user', content: 'Hello' },
    { role: 'assistant', content: 'Hi! How can I help you?' }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    // Require ChatService after mocks are cleared and configured so that
    // hoisted jest.mock calls prevent loading ESM-only dependencies from
    // `ragService` during module initialization.
    delete require.cache[require.resolve('../../../src/services/chatService')];
    chatService = require('../../../src/services/chatService');
    
    // Default Redis mocks
    redisClient.getContext.mockResolvedValue(mockContext);
    redisClient.storeContext.mockResolvedValue(true);
    redisClient.clearContext.mockResolvedValue(true);
    redisClient.getCachedDoctorSearch.mockResolvedValue(null);
    redisClient.cacheDoctorSearch.mockResolvedValue(true);
    redisClient.getCachedUserAppointments.mockResolvedValue(null);
    redisClient.cacheUserAppointments.mockResolvedValue(true);
  });

  describe('processMessage', () => {
    it('should process message successfully', async () => {
      const message = 'I need to see a cardiologist';
      const mockIntentResult = {
        intent: 'SEARCH_DOCTOR',
        confidence: 0.95,
        entities: { specialization: 'Cardiology' }
      };

      intentDetectionService.detectIntent.mockResolvedValue(mockIntentResult);
      intentDetectionService.normalizeSpecialization.mockReturnValue('Cardiology');
      
      doctorClient.searchDoctors.mockResolvedValue({
        success: true,
        doctors: [
          { id: 'doc1', name: 'Dr. Smith', specialization: 'Cardiology' },
          { id: 'doc2', name: 'Dr. Jones', specialization: 'Cardiology' }
        ],
        total_count: 2
      });

      const result = await chatService.processMessage(mockUserId, message, mockAuthToken);

      expect(result.success).toBe(true);
      expect(result.intent).toBe('SEARCH_DOCTOR');
      expect(result.data.actionType).toBe('SEARCH_DOCTOR');
      expect(redisClient.storeContext).toHaveBeenCalledTimes(2); // user + assistant messages
    });

    it('should handle errors gracefully', async () => {
      const message = 'I need help';
      intentDetectionService.detectIntent.mockRejectedValue(new Error('API Error'));

      const result = await chatService.processMessage(mockUserId, message, mockAuthToken);

      expect(result.success).toBe(false);
      expect(result.message).toContain('error processing your request');
    });

    it('should store conversation context', async () => {
      const message = 'Hello';
      const mockIntentResult = {
        intent: 'UNKNOWN',
        confidence: 0.5,
        entities: {}
      };

      intentDetectionService.detectIntent.mockResolvedValue(mockIntentResult);
      ragService.generateResponseWithRAG.mockResolvedValue('Hello! How can I help you?');

      await chatService.processMessage(mockUserId, message, mockAuthToken);

      expect(redisClient.storeContext).toHaveBeenCalledWith(mockUserId, {
        role: 'user',
        content: message
      });
      expect(redisClient.storeContext).toHaveBeenCalledWith(mockUserId, {
        role: 'assistant',
        content: expect.any(String)
      });
    });
  });

  describe('handleHealthQuery', () => {
    it('should generate RAG response with specialization suggestion', async () => {
      const message = 'I have chest pain';
      const intentResult = {
        intent: 'HEALTH_QUERY',
        entities: { symptoms: ['chest pain'] }
      };
      
      ragService.generateResponseWithRAG.mockResolvedValue(
        'Chest pain could be related to heart issues. I recommend seeing a cardiologist.'
      );
      intentDetectionService.extractSpecialization.mockReturnValue('Cardiology');

      const result = await chatService.handleHealthQuery(
        message,
        intentResult,
        mockContext,
        mockAuthToken
      );

      expect(result.actionType).toBe('SEARCH_DOCTOR');
      expect(result.payload.specialization).toBe('Cardiology');
      expect(result.disclaimer).toContain('professional medical advice');
    });

    it('should handle RAG service error', async () => {
      const message = 'I feel sick';
      const intentResult = { intent: 'HEALTH_QUERY', entities: {} };
      
      ragService.generateResponseWithRAG.mockRejectedValue(new Error('RAG Error'));

      const result = await chatService.handleHealthQuery(
        message,
        intentResult,
        mockContext,
        mockAuthToken
      );

      expect(result.actionType).toBe('NONE');
      expect(result.message).toContain('help you understand your symptoms');
    });

    it('should include medical disclaimer', async () => {
      const message = 'What is diabetes?';
      const intentResult = { intent: 'HEALTH_QUERY', entities: {} };
      
      ragService.generateResponseWithRAG.mockResolvedValue('Diabetes is a chronic condition...');

      const result = await chatService.handleHealthQuery(
        message,
        intentResult,
        mockContext,
        mockAuthToken
      );

      expect(result.disclaimer).toBe(
        'This is not a substitute for professional medical advice. Please consult with a healthcare provider.'
      );
    });
  });

  describe('handleSearchDoctor', () => {
    it('should search doctors by specialization', async () => {
      const message = 'Find me a cardiologist';
      const intentResult = {
        intent: 'SEARCH_DOCTOR',
        entities: { specialization: 'Cardiology' }
      };

      intentDetectionService.normalizeSpecialization.mockReturnValue('Cardiology');
      doctorClient.searchDoctors.mockResolvedValue({
        success: true,
        doctors: [{ id: 'doc1', name: 'Dr. Smith' }],
        total_count: 1
      });

      const result = await chatService.handleSearchDoctor(
        message,
        intentResult,
        mockAuthToken
      );

      expect(result.actionType).toBe('SEARCH_DOCTOR');
      expect(result.message).toContain('I found 1');
      expect(doctorClient.searchDoctors).toHaveBeenCalledWith(
        expect.objectContaining({ specialization: 'Cardiology' }),
        mockAuthToken
      );
    });

    it('should search doctors by location', async () => {
      const message = 'Find doctors in New York, NY';
      const intentResult = {
        intent: 'SEARCH_DOCTOR',
        entities: { location: 'New York, NY' }
      };

      doctorClient.searchDoctors.mockResolvedValue({
        success: true,
        doctors: [],
        total_count: 0
      });

      const result = await chatService.handleSearchDoctor(
        message,
        intentResult,
        mockAuthToken
      );

      expect(doctorClient.searchDoctors).toHaveBeenCalledWith(
        expect.objectContaining({
          city: 'New York',
          state: 'NY'
        }),
        mockAuthToken
      );
    });

    it('should use cached doctor search results', async () => {
      const message = 'Find cardiologists';
      const intentResult = {
        intent: 'SEARCH_DOCTOR',
        entities: { specialization: 'Cardiology' }
      };
      const cachedDoctors = [{ id: 'doc1', name: 'Dr. Cached' }];

      intentDetectionService.normalizeSpecialization.mockReturnValue('Cardiology');
      redisClient.getCachedDoctorSearch.mockResolvedValue(cachedDoctors);

      const result = await chatService.handleSearchDoctor(
        message,
        intentResult,
        mockAuthToken
      );

      expect(result.payload.count).toBe(1);
      expect(doctorClient.searchDoctors).not.toHaveBeenCalled();
    });

    it('should prompt for specialization if missing', async () => {
      const message = 'Find a doctor';
      const intentResult = {
        intent: 'SEARCH_DOCTOR',
        entities: {}
      };
      intentDetectionService.extractSpecialization.mockReturnValue(null);

      const result = await chatService.handleSearchDoctor(
        message,
        intentResult,
        mockAuthToken
      );

      expect(result.actionType).toBe('NONE');
      expect(result.message).toContain('Which type of specialist');
    });

    it('should handle doctor service error', async () => {
      const message = 'Find a cardiologist';
      const intentResult = {
        intent: 'SEARCH_DOCTOR',
        entities: { specialization: 'Cardiology' }
      };

      intentDetectionService.normalizeSpecialization.mockReturnValue('Cardiology');
      doctorClient.searchDoctors.mockRejectedValue(new Error('Service Error'));

      const result = await chatService.handleSearchDoctor(
        message,
        intentResult,
        mockAuthToken
      );

      expect(result.actionType).toBe('NONE');
      expect(result.message).toContain('help you search for doctors');
    });
  });

  describe('handleShowAppointments', () => {
    it('should show user appointments', async () => {
      const appointments = [
        { id: 'apt1', doctorId: 'doc1', date: '2026-03-01' },
        { id: 'apt2', doctorId: 'doc2', date: '2026-03-15' }
      ];

      appointmentClient.getUserAppointments.mockResolvedValue({
        success: true,
        appointments
      });

      const result = await chatService.handleShowAppointments(
        mockUserId,
        'Show my appointments',
        mockAuthToken
      );

      expect(result.actionType).toBe('SHOW_APPOINTMENTS');
      expect(result.message).toContain('You have 2 appointments');
      expect(result.payload.count).toBe(2);
      expect(result.payload.hasAppointments).toBe(true);
    });

    it('should use cached appointments', async () => {
      const cachedAppointments = [{ id: 'apt1', doctorId: 'doc1' }];
      redisClient.getCachedUserAppointments.mockResolvedValue(cachedAppointments);

      const result = await chatService.handleShowAppointments(
        mockUserId,
        'Show appointments',
        mockAuthToken
      );

      expect(result.payload.count).toBe(1);
      expect(appointmentClient.getUserAppointments).not.toHaveBeenCalled();
    });

    it('should handle no appointments', async () => {
      appointmentClient.getUserAppointments.mockResolvedValue({
        success: true,
        appointments: []
      });

      const result = await chatService.handleShowAppointments(
        mockUserId,
        'Show my appointments',
        mockAuthToken
      );

      expect(result.message).toContain("don't have any appointments");
      expect(result.payload.hasAppointments).toBe(false);
    });

    it('should handle appointment service error', async () => {
      appointmentClient.getUserAppointments.mockRejectedValue(
        new Error('Service Error')
      );

      const result = await chatService.handleShowAppointments(
        mockUserId,
        'Show appointments',
        mockAuthToken
      );

      expect(result.actionType).toBe('SHOW_APPOINTMENTS');
      expect(result.message).toContain('help you view your appointments');
    });
  });

  describe('handleBookAppointment', () => {
    it('should redirect to doctor search with specialization', async () => {
      const message = 'Book appointment with cardiologist';
      const intentResult = {
        intent: 'BOOK_APPOINTMENT',
        entities: { specialization: 'Cardiology' }
      };

      const result = await chatService.handleBookAppointment(message, intentResult);

      expect(result.actionType).toBe('SEARCH_DOCTOR');
      expect(result.payload.specialization).toBe('Cardiology');
      expect(result.message).toContain('book an appointment');
    });

    it('should ask for specialization if missing', async () => {
      const message = 'Book an appointment';
      const intentResult = {
        intent: 'BOOK_APPOINTMENT',
        entities: {}
      };

      const result = await chatService.handleBookAppointment(message, intentResult);

      expect(result.actionType).toBe('NONE');
      expect(result.message).toContain('what type of doctor');
    });
  });

  describe('handleCancelAppointment', () => {
    it('should redirect to show appointments', async () => {
      const message = 'Cancel my appointment';
      const intentResult = { intent: 'CANCEL_APPOINTMENT', entities: {} };

      const result = await chatService.handleCancelAppointment(message, intentResult);

      expect(result.actionType).toBe('SHOW_APPOINTMENTS');
      expect(result.payload.action).toBe('cancel');
      expect(result.message).toContain('show you your scheduled appointments');
    });
  });

  describe('handleUnknown', () => {
    it('should generate RAG response for unknown intent', async () => {
      const message = 'What are your hours?';
      ragService.generateResponseWithRAG.mockResolvedValue(
        'Our appointment system is available 24/7'
      );

      const result = await chatService.handleUnknown(message, mockContext);

      expect(result.actionType).toBe('NONE');
      expect(result.message).toContain('24/7');
    });

    it('should provide default help message on RAG error', async () => {
      const message = 'Random query';
      ragService.generateResponseWithRAG.mockRejectedValue(new Error('RAG Error'));

      const result = await chatService.handleUnknown(message, mockContext);

      expect(result.actionType).toBe('NONE');
      expect(result.message).toContain("I'm here to help you with");
    });
  });

  describe('clearContext', () => {
    it('should clear user context', async () => {
      redisClient.clearContext.mockResolvedValue(true);

      const result = await chatService.clearContext(mockUserId);

      expect(redisClient.clearContext).toHaveBeenCalledWith(mockUserId);
      expect(result).toBe(true);
    });
  });
});
