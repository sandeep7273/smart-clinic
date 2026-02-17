const Groq = require('groq-sdk');
const config = require('../config');
const logger = require('../utils/logger');

class IntentDetectionService {
  constructor() {
    this.groq = new Groq({
      apiKey: config.groq.apiKey
    });

    // Intent types as per architecture
    this.INTENTS = {
      HEALTH_QUERY: 'HEALTH_QUERY',
      SEARCH_DOCTOR: 'SEARCH_DOCTOR',
      SHOW_APPOINTMENTS: 'SHOW_APPOINTMENTS',
      BOOK_APPOINTMENT: 'BOOK_APPOINTMENT',
      CANCEL_APPOINTMENT: 'CANCEL_APPOINTMENT',
      UNKNOWN: 'UNKNOWN'
    };

    // Specialization mapping for medical terms
    this.specializationMap = {
      'heart': 'Cardiologist',
      'cardiac': 'Cardiologist',
      'cardiology': 'Cardiologist',
      'skin': 'Dermatologist',
      'dermatology': 'Dermatologist',
      'bone': 'Orthopedic',
      'joint': 'Orthopedic',
      'orthopedic': 'Orthopedic',
      'brain': 'Neurologist',
      'neuro': 'Neurologist',
      'neurology': 'Neurologist',
      'children': 'Pediatrician',
      'child': 'Pediatrician',
      'pediatric': 'Pediatrician',
      'eye': 'Ophthalmologist',
      'vision': 'Ophthalmologist',
      'ophthalmology': 'Ophthalmologist',
      'ear': 'ENT Specialist',
      'nose': 'ENT Specialist',
      'throat': 'ENT Specialist',
      'ent': 'ENT Specialist',
      'mental': 'Psychiatrist',
      'depression': 'Psychiatrist',
      'anxiety': 'Psychiatrist',
      'psychiatry': 'Psychiatrist',
      'diabetes': 'Endocrinologist',
      'thyroid': 'Endocrinologist',
      'hormones': 'Endocrinologist',
      'endocrinology': 'Endocrinologist',
      'gynecology': 'Gynecologist',
      'pregnancy': 'Gynecologist',
      'women': 'Gynecologist',
      'general': 'General Physician'
    };
  }

  /**
   * Detect intent from user query using LLM
   */
  async detectIntent(userQuery, context = []) {
    try {
      const systemPrompt = `You are a medical assistant AI that helps users book doctor appointments.
Your task is to analyze the user's query and determine their intent.

Available intents:
1. HEALTH_QUERY - User asking about health conditions, symptoms, or medical advice
2. SEARCH_DOCTOR - User wants to find/search for a doctor
3. SHOW_APPOINTMENTS - User wants to view their appointments
4. BOOK_APPOINTMENT - User wants to book an appointment
5. CANCEL_APPOINTMENT - User wants to cancel an appointment
6. UNKNOWN - Cannot determine intent

Also extract entities like:
- specialization (e.g., Cardiologist, Dermatologist)
- symptoms (e.g., chest pain, fever)
- date/time preferences
- location preferences

Respond in strict JSON format:
{
  "intent": "INTENT_TYPE",
  "confidence": 0.9,
  "entities": {
    "specialization": "extracted specialization",
    "symptoms": ["symptom1", "symptom2"],
    "date": "extracted date",
    "location": "extracted location"
  },
  "reasoning": "brief explanation"
}`;

      const contextMessages = context.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const messages = [
        { role: 'system', content: systemPrompt },
        ...contextMessages,
        { role: 'user', content: userQuery }
      ];

      const response = await this.groq.chat.completions.create({
        model: config.groq.model,
        messages,
        temperature: 0.3, // Lower temperature for more consistent intent detection
        max_tokens: 500,
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(response.choices[0].message.content);
      logger.info('Intent detected:', result);

      return result;
    } catch (error) {
      logger.error('Error detecting intent:', error);
      return {
        intent: this.INTENTS.UNKNOWN,
        confidence: 0,
        entities: {},
        reasoning: 'Error processing query'
      };
    }
  }

  /**
   * Extract specialization from query using keyword matching
   */
  extractSpecialization(query) {
    const lowerQuery = query.toLowerCase();
    
    for (const [keyword, specialization] of Object.entries(this.specializationMap)) {
      if (lowerQuery.includes(keyword)) {
        return specialization;
      }
    }
    
    return null;
  }

  /**
   * Validate and normalize intent
   */
  validateIntent(intent) {
    return Object.values(this.INTENTS).includes(intent) 
      ? intent 
      : this.INTENTS.UNKNOWN;
  }
}

module.exports = new IntentDetectionService();
