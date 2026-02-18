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
    // Maps user-friendly terms to standardized department names (as stored in DB)
    this.specializationMap = {
      // Cardiology
      'heart': 'Cardiology',
      'cardiac': 'Cardiology',
      'cardiology': 'Cardiology',
      'cardiologist': 'Cardiology',
      'cardiovascular': 'Cardiology',
      
      // Dermatology
      'skin': 'Dermatology',
      'dermatology': 'Dermatology',
      'dermatologist': 'Dermatology',
      'acne': 'Dermatology',
      'rash': 'Dermatology',
      
      // Orthopedics
      'bone': 'Orthopedics',
      'joint': 'Orthopedics',
      'orthopedic': 'Orthopedics',
      'orthopedics': 'Orthopedics',
      'orthopedist': 'Orthopedics',
      'fracture': 'Orthopedics',
      'arthritis': 'Orthopedics',
      
      // Neurology
      'brain': 'Neurology',
      'neuro': 'Neurology',
      'neurology': 'Neurology',
      'neurologist': 'Neurology',
      'headache': 'Neurology',
      'migraine': 'Neurology',
      
      // Pediatrics
      'children': 'Pediatrics',
      'child': 'Pediatrics',
      'pediatric': 'Pediatrics',
      'pediatrics': 'Pediatrics',
      'pediatrician': 'Pediatrics',
      'baby': 'Pediatrics',
      'infant': 'Pediatrics',
      
      // Ophthalmology
      'eye': 'Ophthalmology',
      'vision': 'Ophthalmology',
      'ophthalmology': 'Ophthalmology',
      'ophthalmologist': 'Ophthalmology',
      'glasses': 'Ophthalmology',
      'sight': 'Ophthalmology',
      
      // ENT
      'ear': 'ENT',
      'nose': 'ENT',
      'throat': 'ENT',
      'ent': 'ENT',
      'sinus': 'ENT',
      'hearing': 'ENT',
      
      // Psychiatry
      'mental': 'Psychiatry',
      'depression': 'Psychiatry',
      'anxiety': 'Psychiatry',
      'psychiatry': 'Psychiatry',
      'psychiatrist': 'Psychiatry',
      'stress': 'Psychiatry',
      'counseling': 'Psychiatry',
      
      // Endocrinology
      'diabetes': 'Endocrinology',
      'thyroid': 'Endocrinology',
      'hormones': 'Endocrinology',
      'endocrinology': 'Endocrinology',
      'endocrinologist': 'Endocrinology',
      'insulin': 'Endocrinology',
      
      // Gynecology
      'gynecology': 'Gynecology',
      'gynecologist': 'Gynecology',
      'pregnancy': 'Gynecology',
      'women': 'Gynecology',
      'obstetrics': 'Gynecology',
      'prenatal': 'Gynecology',
      
      // General Physician
      'general': 'General Medicine',
      'physician': 'General Medicine',
      'gp': 'General Medicine',
      'family doctor': 'General Medicine',
      'checkup': 'General Medicine'
    };
    
    // Reverse mapping: specialist role to department name
    this.specialistToDepartment = {
      'cardiologist': 'Cardiology',
      'dermatologist': 'Dermatology',
      'orthopedist': 'Orthopedics',
      'orthopedic surgeon': 'Orthopedics',
      'neurologist': 'Neurology',
      'pediatrician': 'Pediatrics',
      'ophthalmologist': 'Ophthalmology',
      'ent specialist': 'ENT',
      'psychiatrist': 'Psychiatry',
      'endocrinologist': 'Endocrinology',
      'gynecologist': 'Gynecology',
      'obstetrician': 'Gynecology',
      'general physician': 'General Medicine',
      'family physician': 'General Medicine'
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
   * Normalize specialization to match database format
   * Handles both "Cardiologist" -> "Cardiology" and "Cardiology" -> "Cardiology"
   */
  normalizeSpecialization(input) {
    if (!input) return null;
    
    const lowerInput = input.toLowerCase().trim();
    
    // Check if it's already in the map
    if (this.specializationMap[lowerInput]) {
      return this.specializationMap[lowerInput];
    }
    
    // Check specialist-to-department mapping
    if (this.specialistToDepartment[lowerInput]) {
      return this.specialistToDepartment[lowerInput];
    }
    
    // Check if input matches any value (department name) directly
    const departmentNames = [
      'Cardiology', 'Dermatology', 'Orthopedics', 'Neurology', 
      'Pediatrics', 'Ophthalmology', 'ENT', 'Psychiatry', 
      'Endocrinology', 'Gynecology', 'General Medicine'
    ];
    
    for (const dept of departmentNames) {
      if (dept.toLowerCase() === lowerInput) {
        return dept;
      }
    }
    
    // Try partial match as last resort
    for (const [keyword, specialization] of Object.entries(this.specializationMap)) {
      if (lowerInput.includes(keyword) || keyword.includes(lowerInput)) {
        return specialization;
      }
    }
    
    // Return original input if no normalization found
    return input;
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
