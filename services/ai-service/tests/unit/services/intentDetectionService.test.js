/**
 * Unit Tests for IntentDetectionService
 */

// Mock Groq SDK and logger before imports
jest.mock('groq-sdk', () => jest.fn());
jest.mock('../../../src/utils/logger');

let intentDetectionService;
const config = require('../../../src/config');
const Groq = require('groq-sdk');

describe('IntentDetectionService', () => {
  let mockGroqInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    mockGroqInstance = {
      chat: {
        completions: {
          create: jest.fn()
        }
      }
    };
    
    Groq.mockImplementation(() => mockGroqInstance);

    // Require service after configuring Groq mock so the instance uses the mocked client
    intentDetectionService = require('../../../src/services/intentDetectionService');
    // Force the service to use our mocked Groq instance (defensive)
    intentDetectionService.groq = mockGroqInstance;
  });

  describe('detectIntent', () => {
    it('should detect HEALTH_QUERY intent', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                intent: 'HEALTH_QUERY',
                confidence: 0.95,
                entities: {
                  symptoms: ['chest pain', 'shortness of breath']
                },
                reasoning: 'User asking about symptoms'
              })
            }
          }
        ]
      };

      mockGroqInstance.chat.completions.create.mockResolvedValue(mockResponse);

      const result = await intentDetectionService.detectIntent(
        'I have chest pain and shortness of breath'
      );

      expect(result.intent).toBe('HEALTH_QUERY');
      expect(result.confidence).toBe(0.95);
      expect(result.entities.symptoms).toContain('chest pain');
      expect(mockGroqInstance.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: config.groq.model,
          temperature: 0.3,
          response_format: { type: "json_object" }
        })
      );
    });

    it('should detect SEARCH_DOCTOR intent with specialization', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                intent: 'SEARCH_DOCTOR',
                confidence: 0.98,
                entities: {
                  specialization: 'Cardiology',
                  location: 'New York'
                },
                reasoning: 'User wants to find a cardiologist'
              })
            }
          }
        ]
      };

      mockGroqInstance.chat.completions.create.mockResolvedValue(mockResponse);

      const result = await intentDetectionService.detectIntent(
        'Find me a cardiologist in New York'
      );

      expect(result.intent).toBe('SEARCH_DOCTOR');
      expect(result.entities.specialization).toBe('Cardiology');
      expect(result.entities.location).toBe('New York');
    });

    it('should detect SHOW_APPOINTMENTS intent', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                intent: 'SHOW_APPOINTMENTS',
                confidence: 0.97,
                entities: {},
                reasoning: 'User wants to view appointments'
              })
            }
          }
        ]
      };

      mockGroqInstance.chat.completions.create.mockResolvedValue(mockResponse);

      const result = await intentDetectionService.detectIntent(
        'Show me my appointments'
      );

      expect(result.intent).toBe('SHOW_APPOINTMENTS');
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    it('should detect BOOK_APPOINTMENT intent', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                intent: 'BOOK_APPOINTMENT',
                confidence: 0.96,
                entities: {
                  specialization: 'Dermatology',
                  date: '2026-03-15'
                },
                reasoning: 'User wants to book appointment'
              })
            }
          }
        ]
      };

      mockGroqInstance.chat.completions.create.mockResolvedValue(mockResponse);

      const result = await intentDetectionService.detectIntent(
        'Book appointment with dermatologist on March 15'
      );

      expect(result.intent).toBe('BOOK_APPOINTMENT');
      expect(result.entities.specialization).toBe('Dermatology');
      expect(result.entities.date).toBe('2026-03-15');
    });

    it('should detect CANCEL_APPOINTMENT intent', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                intent: 'CANCEL_APPOINTMENT',
                confidence: 0.94,
                entities: {},
                reasoning: 'User wants to cancel appointment'
              })
            }
          }
        ]
      };

      mockGroqInstance.chat.completions.create.mockResolvedValue(mockResponse);

      const result = await intentDetectionService.detectIntent(
        'I need to cancel my appointment'
      );

      expect(result.intent).toBe('CANCEL_APPOINTMENT');
    });

    it('should include conversation context', async () => {
      const context = [
        { role: 'user', content: 'I have back pain' },
        { role: 'assistant', content: 'You might need an orthopedist' }
      ];

      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                intent: 'SEARCH_DOCTOR',
                confidence: 0.93,
                entities: { specialization: 'Orthopedics' },
                reasoning: 'Following up on previous conversation'
              })
            }
          }
        ]
      };

      mockGroqInstance.chat.completions.create.mockResolvedValue(mockResponse);

      await intentDetectionService.detectIntent('Yes, find me one', context);

      expect(mockGroqInstance.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({ role: 'user', content: 'I have back pain' }),
            expect.objectContaining({ role: 'assistant', content: 'You might need an orthopedist' })
          ])
        })
      );
    });

    it('should return UNKNOWN intent on error', async () => {
      mockGroqInstance.chat.completions.create.mockRejectedValue(
        new Error('API Error')
      );

      const result = await intentDetectionService.detectIntent('Some query');

      expect(result.intent).toBe('UNKNOWN');
      expect(result.confidence).toBeLessThanOrEqual(0.5);
      expect(typeof result.reasoning).toBe('string');
    });

    it('should handle malformed JSON response', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Invalid JSON'
            }
          }
        ]
      };

      mockGroqInstance.chat.completions.create.mockResolvedValue(mockResponse);

      const result = await intentDetectionService.detectIntent('Test query');

      expect(result.intent).toBe('UNKNOWN');
    });
  });

  describe('extractSpecialization', () => {
    it('should extract cardiology specialization', () => {
      const queries = [
        'I have heart problems',
        'Need a cardiologist',
        'Cardiac issues',
        'Cardiovascular checkup'
      ];

      queries.forEach(query => {
        const result = intentDetectionService.extractSpecialization(query);
        expect(result).toBe('Cardiology');
      });
    });

    it('should extract dermatology specialization', () => {
      const queries = [
        'I have skin problems',
        'Need a dermatologist',
        'Acne treatment',
        'Rash on my arm'
      ];

      queries.forEach(query => {
        const result = intentDetectionService.extractSpecialization(query);
        expect(result).toBe('Dermatology');
      });
    });

    it('should extract orthopedics specialization', () => {
      const queries = [
        'I have bone pain',
        'Joint problems',
        'Need an orthopedist',
        'Arthritis treatment'
      ];

      queries.forEach(query => {
        const result = intentDetectionService.extractSpecialization(query);
        expect(result).toBe('Orthopedics');
      });
    });

    it('should extract pediatrics specialization', () => {
      const queries = [
        'Doctor for my child',
        'Pediatrician needed',
        'Baby checkup',
        'Children health'
      ];

      queries.forEach(query => {
        const result = intentDetectionService.extractSpecialization(query);
        expect(result).toBe('Pediatrics');
      });
    });

    it('should return null for unrecognized specialization', () => {
      const result = intentDetectionService.extractSpecialization(
        'I need help with something else'
      );
      expect(result).toBe(null);
    });

    it('should be case insensitive', () => {
      const result = intentDetectionService.extractSpecialization(
        'NEED A CARDIOLOGIST'
      );
      expect(result).toBe('Cardiology');
    });
  });

  describe('normalizeSpecialization', () => {
    it('should normalize specialist role to department', () => {
      expect(intentDetectionService.normalizeSpecialization('cardiologist')).toBe('Cardiology');
      expect(intentDetectionService.normalizeSpecialization('dermatologist')).toBe('Dermatology');
      expect(intentDetectionService.normalizeSpecialization('pediatrician')).toBe('Pediatrics');
      expect(intentDetectionService.normalizeSpecialization('neurologist')).toBe('Neurology');
    });

    it('should handle department names directly', () => {
      expect(intentDetectionService.normalizeSpecialization('Cardiology')).toBe('Cardiology');
      expect(intentDetectionService.normalizeSpecialization('cardiology')).toBe('Cardiology');
      expect(intentDetectionService.normalizeSpecialization('CARDIOLOGY')).toBe('Cardiology');
    });

    it('should map keywords to departments', () => {
      expect(intentDetectionService.normalizeSpecialization('heart')).toBe('Cardiology');
      expect(intentDetectionService.normalizeSpecialization('skin')).toBe('Dermatology');
      expect(intentDetectionService.normalizeSpecialization('bone')).toBe('Orthopedics');
      expect(intentDetectionService.normalizeSpecialization('brain')).toBe('Neurology');
    });

    it('should handle ENT variations', () => {
      expect(intentDetectionService.normalizeSpecialization('ent')).toBe('ENT');
      expect(intentDetectionService.normalizeSpecialization('ear')).toBe('ENT');
      expect(intentDetectionService.normalizeSpecialization('nose')).toBe('ENT');
      expect(intentDetectionService.normalizeSpecialization('throat')).toBe('ENT');
    });

    it('should return null for null input', () => {
      expect(intentDetectionService.normalizeSpecialization(null)).toBe(null);
    });

    it('should return original input if no match found', () => {
      const input = 'UnknownSpecialization';
      expect(intentDetectionService.normalizeSpecialization(input)).toBe(input);
    });

    it('should trim whitespace', () => {
      expect(intentDetectionService.normalizeSpecialization('  cardiologist  ')).toBe('Cardiology');
    });

    it('should handle partial matches', () => {
      expect(intentDetectionService.normalizeSpecialization('cardiac surgery')).toBe('Cardiology');
      expect(intentDetectionService.normalizeSpecialization('pediatric care')).toBe('Pediatrics');
    });
  });

  describe('validateIntent', () => {
    it('should validate correct intents', () => {
      const validIntents = [
        'HEALTH_QUERY',
        'SEARCH_DOCTOR',
        'SHOW_APPOINTMENTS',
        'BOOK_APPOINTMENT',
        'CANCEL_APPOINTMENT',
        'UNKNOWN'
      ];

      validIntents.forEach(intent => {
        expect(intentDetectionService.validateIntent(intent)).toBe(intent);
      });
    });

    it('should return UNKNOWN for invalid intents', () => {
      const invalidIntents = [
        'INVALID_INTENT',
        'random_string',
        '',
        null,
        undefined
      ];

      invalidIntents.forEach(intent => {
        expect(intentDetectionService.validateIntent(intent)).toBe('UNKNOWN');
      });
    });
  });

  describe('INTENTS constants', () => {
    it('should have all required intent types', () => {
      expect(intentDetectionService.INTENTS).toHaveProperty('HEALTH_QUERY');
      expect(intentDetectionService.INTENTS).toHaveProperty('SEARCH_DOCTOR');
      expect(intentDetectionService.INTENTS).toHaveProperty('SHOW_APPOINTMENTS');
      expect(intentDetectionService.INTENTS).toHaveProperty('BOOK_APPOINTMENT');
      expect(intentDetectionService.INTENTS).toHaveProperty('CANCEL_APPOINTMENT');
      expect(intentDetectionService.INTENTS).toHaveProperty('UNKNOWN');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty query', async () => {
      mockGroqInstance.chat.completions.create.mockRejectedValue(
        new Error('Empty query')
      );

      const result = await intentDetectionService.detectIntent('');

      expect(result.intent).toBe('UNKNOWN');
    });

    it('should handle very long query', async () => {
      const longQuery = 'a'.repeat(1000);
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                intent: 'UNKNOWN',
                confidence: 0.2,
                entities: {},
                reasoning: 'Query too long'
              })
            }
          }
        ]
      };

      mockGroqInstance.chat.completions.create.mockResolvedValue(mockResponse);

      const result = await intentDetectionService.detectIntent(longQuery);

      expect(result.intent).toBe('UNKNOWN');
    });

    it('should handle special characters in query', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                intent: 'HEALTH_QUERY',
                confidence: 0.85,
                entities: {},
                reasoning: 'Health related query'
              })
            }
          }
        ]
      };

      mockGroqInstance.chat.completions.create.mockResolvedValue(mockResponse);

      const result = await intentDetectionService.detectIntent(
        'I have @#$% pain!!!'
      );

      expect(result.intent).toBe('HEALTH_QUERY');
    });
  });
});
