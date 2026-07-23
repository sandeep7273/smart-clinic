const Groq = require("groq-sdk");
const config = require("../config");
const logger = require("../utils/logger");

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

class IntentDetectionService {
  constructor() {
    this.groq = new Groq({
      apiKey: config.groq.apiKey,
    });

    // Intent types as per architecture
    this.INTENTS = {
      HEALTH_QUERY: "HEALTH_QUERY",
      SEARCH_DOCTOR: "SEARCH_DOCTOR",
      SHOW_APPOINTMENTS: "SHOW_APPOINTMENTS",
      BOOK_APPOINTMENT: "BOOK_APPOINTMENT",
      CANCEL_APPOINTMENT: "CANCEL_APPOINTMENT",
      UNKNOWN: "UNKNOWN",
    };

    // Specialization mapping for medical terms
    // Maps user-friendly terms to standardized department names (as stored in DB)
    this.specializationMap = {
      // Cardiology
      heart: "Cardiology",
      cardiac: "Cardiology",
      cardiology: "Cardiology",
      cardiologist: "Cardiology",
      cardiovascular: "Cardiology",

      // Dermatology
      skin: "Dermatology",
      dermatology: "Dermatology",
      dermatologist: "Dermatology",
      acne: "Dermatology",
      rash: "Dermatology",

      // Orthopedics
      bone: "Orthopedics",
      joint: "Orthopedics",
      orthopedic: "Orthopedics",
      orthopedics: "Orthopedics",
      orthopedist: "Orthopedics",
      fracture: "Orthopedics",
      arthritis: "Orthopedics",

      // Neurology
      brain: "Neurology",
      neuro: "Neurology",
      neurology: "Neurology",
      neurologist: "Neurology",
      headache: "Neurology",
      migraine: "Neurology",

      // Pediatrics
      children: "Pediatrics",
      child: "Pediatrics",
      pediatric: "Pediatrics",
      pediatrics: "Pediatrics",
      pediatrician: "Pediatrics",
      baby: "Pediatrics",
      infant: "Pediatrics",

      // Ophthalmology
      eye: "Ophthalmology",
      vision: "Ophthalmology",
      ophthalmology: "Ophthalmology",
      ophthalmologist: "Ophthalmology",
      glasses: "Ophthalmology",
      sight: "Ophthalmology",

      // ENT
      ear: "ENT",
      nose: "ENT",
      throat: "ENT",
      ent: "ENT",
      sinus: "ENT",
      hearing: "ENT",

      // Psychiatry
      mental: "Psychiatry",
      depression: "Psychiatry",
      anxiety: "Psychiatry",
      psychiatry: "Psychiatry",
      psychiatrist: "Psychiatry",
      stress: "Psychiatry",
      counseling: "Psychiatry",

      // Endocrinology
      diabetes: "Endocrinology",
      thyroid: "Endocrinology",
      hormones: "Endocrinology",
      endocrinology: "Endocrinology",
      endocrinologist: "Endocrinology",
      insulin: "Endocrinology",

      // Gynecology
      gynecology: "Gynecology",
      gynecologist: "Gynecology",
      pregnancy: "Gynecology",
      women: "Gynecology",
      obstetrics: "Gynecology",
      prenatal: "Gynecology",

      // General Physician
      general: "General Medicine",
      physician: "General Medicine",
      gp: "General Medicine",
      "family doctor": "General Medicine",
      checkup: "General Medicine",
    };

    // Reverse mapping: specialist role to department name
    this.specialistToDepartment = {
      cardiologist: "Cardiology",
      dermatologist: "Dermatology",
      orthopedist: "Orthopedics",
      "orthopedic surgeon": "Orthopedics",
      neurologist: "Neurology",
      pediatrician: "Pediatrics",
      ophthalmologist: "Ophthalmology",
      "ent specialist": "ENT",
      psychiatrist: "Psychiatry",
      endocrinologist: "Endocrinology",
      gynecologist: "Gynecology",
      obstetrician: "Gynecology",
      "general physician": "General Medicine",
      "family physician": "General Medicine",
    };
  }

  /**
   * Rule-based intent detection — runs when LLM is unavailable.
   * Covers the most common user queries without requiring an API call.
   */
  detectIntentFallback(userQuery) {
    const q = userQuery.toLowerCase().trim();
    const extractedSpec = this.extractSpecialization(q);

    // ── SHOW_APPOINTMENTS ─────────────────────────────────────────
    const appointmentViewPatterns = [
      /\bmy appointments?\b/,
      /\bshow\b.{0,30}\bappointments?\b/,
      /\bview\b.{0,30}\bappointments?\b/,
      /\blist\b.{0,30}\bappointments?\b/,
      /\bsee\b.{0,30}\bappointments?\b/,
      /\bcheck\b.{0,30}\bappointments?\b/,
      /\bget\b.{0,30}\bappointments?\b/,
      /\bwhat appointments?\b/,
      /\bupcoming appointments?\b/,
      /\bscheduled appointments?\b/,
      /\bbooked appointments?\b/,
      /\bappointment history\b/,
      /\bmy bookings?\b/,
      /\bshow\b.{0,20}\bbooking\b/,
    ];
    if (appointmentViewPatterns.some((p) => p.test(q))) {
      return {
        intent: this.INTENTS.SHOW_APPOINTMENTS,
        confidence: 0.9,
        entities: {
          specialization: null,
          symptoms: [],
          date: null,
          location: null,
        },
        reasoning: "Rule-based: appointment view keywords detected",
      };
    }

    // ── CANCEL_APPOINTMENT ────────────────────────────────────────
    if (
      /\bcancel\b.{0,30}\bappointment\b/.test(q) ||
      /\bappointment\b.{0,30}\bcancel\b/.test(q)
    ) {
      return {
        intent: this.INTENTS.CANCEL_APPOINTMENT,
        confidence: 0.85,
        entities: {
          specialization: null,
          symptoms: [],
          date: null,
          location: null,
        },
        reasoning: "Rule-based: cancel appointment keywords detected",
      };
    }

    // ── BOOK_APPOINTMENT ──────────────────────────────────────────
    if (
      /\bbook\b.{0,30}\bappointment\b/.test(q) ||
      /\bbook\b.{0,30}\b(doctors?|physicians?|specialists?)\b/.test(q) ||
      /\bschedule\b.{0,30}\bappointment\b/.test(q) ||
      /\bschedule\b.{0,30}\b(doctors?|physicians?|specialists?)\b/.test(q) ||
      /\bmake\b.{0,30}\bappointment\b/.test(q) ||
      /\bappointment\b.{0,30}\bwith\b.{0,30}\b(doctors?|physicians?|specialists?|cardiologist|dermatologist|orthopedist|neurologist|pediatrician|ophthalmologist|psychiatrist|endocrinologist|gynecologist)\b/.test(
        q,
      )
    ) {
      const specialization = this.extractSpecialization(q);
      return {
        intent: this.INTENTS.BOOK_APPOINTMENT,
        confidence: 0.85,
        entities: {
          specialization: this.normalizeSpecialization(specialization),
          symptoms: [],
          date: null,
          location: null,
        },
        reasoning: "Rule-based: book appointment keywords detected",
      };
    }

    // ── SEARCH_DOCTOR ─────────────────────────────────────────────
    const searchPatterns = [
      /\bfind\b.{0,30}\b(doctors?|physicians?|specialists?|surgeons?)\b/,
      /\bsearch\b.{0,30}\b(doctors?|physicians?|specialists?)\b/,
      /\bshow\b.{0,30}\b(doctors?|physicians?|specialists?)\b/,
      /\blook(ing)?\b.{0,30}\b(doctors?|physicians?|specialists?)\b/,
      /\bneed\b.{0,30}\b(doctors?|physicians?|specialists?|appointments?)\b/,
      /\bwant\b.{0,30}\b(doctors?|physicians?|specialists?)\b/,
      /\brecommend\b.{0,30}\b(doctors?|physicians?|specialists?)\b/,
      /\blist\b.{0,30}\b(doctors?|physicians?|specialists?)\b/,
      /\bget\b.{0,30}\b(doctors?|physicians?|specialists?)\b/,
      /\bsee\b.{0,30}\b(doctors?|physicians?|specialists?)\b/,
      /\bavailable\b.{0,30}\b(doctors?|physicians?|specialists?)\b/,
      /\b(doctors?|physicians?|specialists?)\b.{0,30}\bavailable\b/,
    ];

    // Direct specialist name patterns (e.g. "show me neurologists", "i need a cardiologist")
    const specialistNamePattern = new RegExp(
      "\\b(" +
        Object.keys(this.specializationMap).join("|") +
        "|" +
        Object.keys(this.specialistToDepartment).join("|") +
        ")s?\\b",
    );

    const hasSearchPattern = searchPatterns.some((p) => p.test(q));
    const hasSpecialistName = specialistNamePattern.test(q);
    const extractedSymptoms = this.extractSymptoms(q);
    const inferredSymptomSpecialization = this.inferSpecializationFromSymptoms(
      q,
      extractedSymptoms,
    );

    if (hasSearchPattern || (hasSpecialistName && extractedSpec)) {
      return {
        intent: this.INTENTS.SEARCH_DOCTOR,
        confidence: 0.9,
        entities: {
          specialization: this.normalizeSpecialization(
            extractedSpec || inferredSymptomSpecialization,
          ),
          symptoms: extractedSymptoms,
          date: null,
          location: null,
        },
        reasoning: "Rule-based: doctor search keywords detected",
      };
    }

    // ── HEALTH_QUERY ──────────────────────────────────────────────
    const healthPatterns = [
      /\bsymptom(s)?\b/,
      /\bpain\b/,
      /\bache\b/,
      /\bfever\b/,
      /\bcough\b/,
      /\bsick\b/,
      /\bdisease\b/,
      /\bcondition\b/,
      /\btreat(ment)?\b/,
      /\bwhat is\b/,
      /\bhow to\b/,
      /\bsuffering\b/,
      /\bdiagnos\b/,
      /\bmedication\b/,
      /\bmedicine\b/,
      /\bhealth\b/,
      /\bwellness\b/,
      /\binfection\b/,
      /\ballerg\b/,
      /\binjur\b/,
      /\bhurt\b/,
    ];
    if (healthPatterns.some((p) => p.test(q))) {
      const symptoms = this.extractSymptoms(q);
      const inferredSpecialization =
        extractedSpec || this.inferSpecializationFromSymptoms(q, symptoms);

      return {
        intent: this.INTENTS.HEALTH_QUERY,
        confidence: 0.75,
        entities: {
          specialization: this.normalizeSpecialization(inferredSpecialization),
          symptoms,
          date: null,
          location: null,
        },
        reasoning: "Rule-based: health query keywords detected",
      };
    }

    // ── UNKNOWN ───────────────────────────────────────────────────
    return {
      intent: this.INTENTS.UNKNOWN,
      confidence: 0.3,
      entities: {
        specialization: null,
        symptoms: [],
        date: null,
        location: null,
      },
      reasoning: "Rule-based: no matching intent found",
    };
  }

  /**
   * Detect intent from user query.
   * Tries LLM first; falls back to rule-based detection if LLM is unavailable.
   */
  async detectIntent(userQuery, context = []) {
    const ruleBasedIntent = this.detectIntentFallback(userQuery);

    try {
      const simpleDoctorSearch =
        ruleBasedIntent.intent === this.INTENTS.SEARCH_DOCTOR &&
        !/\b(in|near|around|at|on|tomorrow|today|next|after|before)\b/i.test(
          userQuery,
        );

      if (simpleDoctorSearch) {
        logger.info("Intent detected (rule-based):", ruleBasedIntent);
        return ruleBasedIntent;
      }

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

      const contextMessages = context.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      const messages = [
        { role: "system", content: systemPrompt },
        ...contextMessages,
        { role: "user", content: userQuery },
      ];

      const response = await withTimeout(
        this.groq.chat.completions.create({
          model: config.groq.model,
          messages,
          temperature: 0.3,
          max_tokens: 500,
          response_format: { type: "json_object" },
        }),
        config.groq.timeoutMs,
        "Groq intent detection",
      );

      const result = JSON.parse(response.choices[0].message.content);
      logger.info("Intent detected (LLM):", result);

      return result;
    } catch (error) {
      // LLM unavailable (expired key, network error, quota) — use rule-based fallback
      const isApiError =
        error.status === 401 || error.status === 429 || error.status === 503;
      if (isApiError) {
        logger.warn(
          `Groq API unavailable (status ${error.status}) — falling back to rule-based intent detection`,
        );
      } else {
        logger.error("Error detecting intent:", error.message);
      }
      logger.info("Intent detected (rule-based fallback):", ruleBasedIntent);
      return ruleBasedIntent;
    }
  }

  /**
   * Extract specialization from query using keyword matching
   */
  extractSpecialization(query) {
    const lowerQuery = query.toLowerCase();

    for (const [keyword, specialization] of Object.entries(
      this.specializationMap,
    )) {
      const pattern = new RegExp(
        `\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}s?\\b`,
      );
      if (pattern.test(lowerQuery)) {
        return specialization;
      }
    }

    return null;
  }

  extractSymptoms(query) {
    const lowerQuery = query.toLowerCase();
    const symptomKeywords = [
      "fever",
      "cough",
      "cold",
      "flu",
      "chest pain",
      "heart attack",
      "palpitations",
      "high blood pressure",
      "blood pressure",
      "hypertension",
      "shortness of breath",
      "breathing difficulty",
      "dizziness",
      "headache",
      "migraine",
      "rash",
      "acne",
      "joint pain",
      "back pain",
      "bone pain",
      "stomach pain",
      "abdominal pain",
      "nausea",
      "vomiting",
      "diarrhea",
      "ear pain",
      "sore throat",
      "throat pain",
      "eye pain",
      "tooth pain",
      "dental pain",
      "anxiety",
      "depression",
      "diabetes",
      "thyroid",
      "pregnancy",
    ];

    return symptomKeywords.reduce((matches, symptom) => {
      const pattern = new RegExp(
        `\\b${symptom.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
      );

      if (
        pattern.test(lowerQuery) &&
        !matches.some((match) => match.includes(symptom))
      ) {
        matches.push(symptom);
      }

      return matches;
    }, []);
  }

  inferSpecializationFromSymptoms(query, symptoms = []) {
    const symptomText = `${query} ${symptoms.join(" ")}`.toLowerCase();
    const mappings = [
      {
        pattern:
          /\b(chest pain|shortness of breath|breathing difficulty|heart|heart attack|palpitations|high blood pressure|blood pressure|hypertension)\b/,
        specialization: "Cardiology",
      },
      { pattern: /\b(rash|acne|skin)\b/, specialization: "Dermatology" },
      {
        pattern: /\b(joint pain|back pain|bone pain|arthritis|fracture)\b/,
        specialization: "Orthopedics",
      },
      { pattern: /\b(headache|migraine|brain)\b/, specialization: "Neurology" },
      {
        pattern: /\b(child|children|baby|infant)\b/,
        specialization: "Pediatrics",
      },
      { pattern: /\b(eye pain|vision|eye)\b/, specialization: "Ophthalmology" },
      {
        pattern: /\b(ear pain|throat pain|sinus|hearing)\b/,
        specialization: "ENT",
      },
      {
        pattern: /\b(anxiety|depression|stress|mental)\b/,
        specialization: "Psychiatry",
      },
      {
        pattern: /\b(diabetes|thyroid|hormone|insulin)\b/,
        specialization: "Endocrinology",
      },
      {
        pattern: /\b(pregnancy|women|gynecology)\b/,
        specialization: "Gynecology",
      },
      {
        pattern:
          /\b(fever|cough|cold|flu|infection|sick|stomach pain|abdominal pain|nausea|vomiting|diarrhea|tooth pain|dental pain|dizziness)\b/,
        specialization: "General Medicine",
      },
    ];

    return (
      mappings.find(({ pattern }) => pattern.test(symptomText))
        ?.specialization || null
    );
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
      "Cardiology",
      "Dermatology",
      "Orthopedics",
      "Neurology",
      "Pediatrics",
      "Ophthalmology",
      "ENT",
      "Psychiatry",
      "Endocrinology",
      "Gynecology",
      "General Medicine",
    ];

    for (const dept of departmentNames) {
      if (dept.toLowerCase() === lowerInput) {
        return dept;
      }
    }

    // Try partial match as last resort
    for (const [keyword, specialization] of Object.entries(
      this.specializationMap,
    )) {
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
