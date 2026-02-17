/**
 * Script to seed medical knowledge into ChromaDB
 * Run this script once to populate the vector database with medical information
 */

const ragService = require('../services/ragService');
const logger = require('../utils/logger');

// Sample medical knowledge documents
const medicalDocuments = [
  {
    text: 'Chest pain can indicate various conditions. If experiencing severe chest pain, especially with shortness of breath, sweating, or pain radiating to the arm or jaw, seek emergency care immediately. For persistent chest discomfort, consult a Cardiologist.',
    metadata: { category: 'cardiology', severity: 'high' }
  },
  {
    text: 'Skin conditions like acne, eczema, psoriasis, or unusual moles should be examined by a Dermatologist. Early detection of skin issues is important for treatment.',
    metadata: { category: 'dermatology', severity: 'medium' }
  },
  {
    text: 'Joint pain, back pain, fractures, or sports injuries require evaluation by an Orthopedic specialist. They treat musculoskeletal conditions.',
    metadata: { category: 'orthopedics', severity: 'medium' }
  },
  {
    text: 'Persistent headaches, dizziness, numbness, tingling, or memory problems should be evaluated by a Neurologist. They specialize in brain and nervous system disorders.',
    metadata: { category: 'neurology', severity: 'medium' }
  },
  {
    text: 'Children\'s health concerns including developmental issues, vaccinations, and common childhood illnesses should be addressed by a Pediatrician.',
    metadata: { category: 'pediatrics', severity: 'low' }
  },
  {
    text: 'Vision problems, eye pain, redness, or changes in vision require examination by an Ophthalmologist. Regular eye exams are important for maintaining eye health.',
    metadata: { category: 'ophthalmology', severity: 'medium' }
  },
  {
    text: 'Ear, nose, and throat problems including hearing loss, sinus issues, or persistent sore throat should be evaluated by an ENT Specialist.',
    metadata: { category: 'ent', severity: 'medium' }
  },
  {
    text: 'Mental health concerns including depression, anxiety, mood disorders, or behavioral issues should be addressed with a Psychiatrist. Mental health is as important as physical health.',
    metadata: { category: 'psychiatry', severity: 'high' }
  },
  {
    text: 'Diabetes, thyroid disorders, hormonal imbalances, and metabolic conditions should be managed by an Endocrinologist.',
    metadata: { category: 'endocrinology', severity: 'high' }
  },
  {
    text: 'Women\'s health concerns including pregnancy, menstrual issues, or reproductive health should be discussed with a Gynecologist.',
    metadata: { category: 'gynecology', severity: 'medium' }
  },
  {
    text: 'For general health concerns, routine checkups, preventive care, or when unsure which specialist to see, start with a General Physician.',
    metadata: { category: 'general', severity: 'low' }
  },
  {
    text: 'Fever is a common symptom that can indicate infection. High fever (above 103°F/39.4°C) in adults or persistent fever should be evaluated by a doctor. For children, consult a Pediatrician.',
    metadata: { category: 'general', severity: 'medium' }
  },
  {
    text: 'Allergies including seasonal allergies, food allergies, or asthma should be managed with an Allergist or Immunologist.',
    metadata: { category: 'allergy', severity: 'medium' }
  },
  {
    text: 'Digestive issues including stomach pain, heartburn, chronic diarrhea, or constipation may require consultation with a Gastroenterologist.',
    metadata: { category: 'gastroenterology', severity: 'medium' }
  },
  {
    text: 'Heart conditions including high blood pressure, irregular heartbeat, or family history of heart disease should be monitored by a Cardiologist.',
    metadata: { category: 'cardiology', severity: 'high' }
  }
];

async function seedEmbeddings() {
  try {
    logger.info('Starting to seed medical knowledge...');

    // Initialize RAG service
    await ragService.initialize();

    // Add documents to vector database
    const success = await ragService.addDocuments(medicalDocuments);

    if (success) {
      logger.info(`Successfully seeded ${medicalDocuments.length} medical documents`);
    } else {
      logger.error('Failed to seed documents');
    }

    process.exit(0);
  } catch (error) {
    logger.error('Error seeding embeddings:', error);
    process.exit(1);
  }
}

// Run the seed script
seedEmbeddings();
