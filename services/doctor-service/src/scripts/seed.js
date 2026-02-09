const mongoose = require('mongoose');
const { Doctor } = require('../models/Doctor');
const config = require('../config');
const logger = require('../utils/logger');

const sampleDoctors = [
  {
    userId: '507f1f77bcf86cd799439011',
    firstName: 'Sarah',
    lastName: 'Johnson',
    email: 'dr.sarah.johnson@healthcare.com',
    phone: '+1-555-0101',
    specializations: ['Cardiology', 'Internal Medicine'],
    experience: 15,
    consultationFee: 200,
    bio: 'Board-certified cardiologist with 15 years of experience treating heart conditions.',
    address: {
      street: '123 Medical Center Dr',
      city: 'Boston',
      state: 'MA',
      zipCode: '02115',
      country: 'USA',
    },
    qualifications: [
      {
        degree: 'MD',
        institution: 'Harvard Medical School',
        year: 2008,
      },
      {
        degree: 'Fellowship in Cardiology',
        institution: 'Massachusetts General Hospital',
        year: 2012,
      },
    ],
    licenses: [
      {
        number: 'MA-123456',
        state: 'Massachusetts',
        expiryDate: new Date('2025-12-31'),
      },
    ],
    treatedConditions: ['Hypertension', 'Heart Disease', 'Arrhythmia', 'High Cholesterol'],
    treatedSymptoms: ['Chest Pain', 'Shortness of Breath', 'Palpitations', 'Fatigue'],
    weeklySchedule: [
      { day: 'Monday', startTime: '09:00', endTime: '17:00', isAvailable: true },
      { day: 'Tuesday', startTime: '09:00', endTime: '17:00', isAvailable: true },
      { day: 'Wednesday', startTime: '09:00', endTime: '17:00', isAvailable: true },
      { day: 'Thursday', startTime: '09:00', endTime: '17:00', isAvailable: true },
      { day: 'Friday', startTime: '09:00', endTime: '15:00', isAvailable: true },
    ],
    rating: 4.8,
    reviewCount: 127,
    totalPatients: 450,
    isAvailable: true,
    status: 'active',
  },
  {
    userId: '507f1f77bcf86cd799439012',
    firstName: 'Michael',
    lastName: 'Chen',
    email: 'dr.michael.chen@healthcare.com',
    phone: '+1-555-0102',
    specializations: ['Neurology', 'Pain Management'],
    experience: 12,
    consultationFee: 180,
    bio: 'Neurologist specializing in headaches, migraines, and chronic pain management.',
    address: {
      street: '456 Hospital Blvd',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94102',
      country: 'USA',
    },
    qualifications: [
      {
        degree: 'MD',
        institution: 'Stanford Medical School',
        year: 2011,
      },
    ],
    licenses: [
      {
        number: 'CA-654321',
        state: 'California',
        expiryDate: new Date('2025-12-31'),
      },
    ],
    treatedConditions: ['Migraine', 'Epilepsy', 'Neuropathy', 'Multiple Sclerosis'],
    treatedSymptoms: ['Headache', 'Dizziness', 'Numbness', 'Memory Problems'],
    weeklySchedule: [
      { day: 'Monday', startTime: '10:00', endTime: '18:00', isAvailable: true },
      { day: 'Tuesday', startTime: '10:00', endTime: '18:00', isAvailable: true },
      { day: 'Wednesday', startTime: '10:00', endTime: '18:00', isAvailable: true },
      { day: 'Thursday', startTime: '10:00', endTime: '18:00', isAvailable: true },
    ],
    rating: 4.9,
    reviewCount: 98,
    totalPatients: 320,
    isAvailable: true,
    status: 'active',
  },
  {
    userId: '507f1f77bcf86cd799439013',
    firstName: 'Emily',
    lastName: 'Rodriguez',
    email: 'dr.emily.rodriguez@healthcare.com',
    phone: '+1-555-0103',
    specializations: ['Pediatrics', 'Family Medicine'],
    experience: 10,
    consultationFee: 150,
    bio: 'Compassionate pediatrician dedicated to providing quality care for children and families.',
    address: {
      street: '789 Children\'s Way',
      city: 'Austin',
      state: 'TX',
      zipCode: '78701',
      country: 'USA',
    },
    qualifications: [
      {
        degree: 'MD',
        institution: 'University of Texas Medical School',
        year: 2013,
      },
    ],
    licenses: [
      {
        number: 'TX-987654',
        state: 'Texas',
        expiryDate: new Date('2025-12-31'),
      },
    ],
    treatedConditions: ['Asthma', 'Allergies', 'Growth Disorders', 'Infections'],
    treatedSymptoms: ['Fever', 'Cough', 'Rash', 'Stomach Pain'],
    weeklySchedule: [
      { day: 'Monday', startTime: '08:00', endTime: '16:00', isAvailable: true },
      { day: 'Tuesday', startTime: '08:00', endTime: '16:00', isAvailable: true },
      { day: 'Wednesday', startTime: '08:00', endTime: '16:00', isAvailable: true },
      { day: 'Thursday', startTime: '08:00', endTime: '16:00', isAvailable: true },
      { day: 'Friday', startTime: '08:00', endTime: '16:00', isAvailable: true },
    ],
    rating: 4.7,
    reviewCount: 215,
    totalPatients: 680,
    isAvailable: true,
    status: 'active',
  },
  {
    userId: '507f1f77bcf86cd799439014',
    firstName: 'David',
    lastName: 'Williams',
    email: 'dr.david.williams@healthcare.com',
    phone: '+1-555-0104',
    specializations: ['Orthopedics', 'Sports Medicine'],
    experience: 18,
    consultationFee: 220,
    bio: 'Orthopedic surgeon with expertise in sports injuries and joint replacement.',
    address: {
      street: '321 Sports Medicine Center',
      city: 'Denver',
      state: 'CO',
      zipCode: '80202',
      country: 'USA',
    },
    qualifications: [
      {
        degree: 'MD',
        institution: 'Johns Hopkins Medical School',
        year: 2005,
      },
    ],
    licenses: [
      {
        number: 'CO-456789',
        state: 'Colorado',
        expiryDate: new Date('2025-12-31'),
      },
    ],
    treatedConditions: ['Fractures', 'Arthritis', 'Sports Injuries', 'Back Pain'],
    treatedSymptoms: ['Joint Pain', 'Swelling', 'Limited Mobility', 'Muscle Weakness'],
    weeklySchedule: [
      { day: 'Monday', startTime: '07:00', endTime: '15:00', isAvailable: true },
      { day: 'Tuesday', startTime: '07:00', endTime: '15:00', isAvailable: true },
      { day: 'Wednesday', startTime: '07:00', endTime: '15:00', isAvailable: true },
      { day: 'Friday', startTime: '07:00', endTime: '15:00', isAvailable: true },
    ],
    rating: 4.9,
    reviewCount: 156,
    totalPatients: 520,
    isAvailable: true,
    status: 'active',
  },
  {
    userId: '507f1f77bcf86cd799439015',
    firstName: 'Jessica',
    lastName: 'Martinez',
    email: 'dr.jessica.martinez@healthcare.com',
    phone: '+1-555-0105',
    specializations: ['Dermatology', 'Cosmetic Dermatology'],
    experience: 8,
    consultationFee: 160,
    bio: 'Dermatologist specializing in skin conditions and cosmetic procedures.',
    address: {
      street: '567 Skin Care Plaza',
      city: 'Miami',
      state: 'FL',
      zipCode: '33101',
      country: 'USA',
    },
    qualifications: [
      {
        degree: 'MD',
        institution: 'University of Miami Medical School',
        year: 2015,
      },
    ],
    licenses: [
      {
        number: 'FL-789012',
        state: 'Florida',
        expiryDate: new Date('2025-12-31'),
      },
    ],
    treatedConditions: ['Acne', 'Eczema', 'Psoriasis', 'Skin Cancer'],
    treatedSymptoms: ['Rash', 'Itching', 'Skin Lesions', 'Hair Loss'],
    weeklySchedule: [
      { day: 'Monday', startTime: '09:00', endTime: '17:00', isAvailable: true },
      { day: 'Tuesday', startTime: '09:00', endTime: '17:00', isAvailable: true },
      { day: 'Thursday', startTime: '09:00', endTime: '17:00', isAvailable: true },
      { day: 'Friday', startTime: '09:00', endTime: '17:00', isAvailable: true },
    ],
    rating: 4.6,
    reviewCount: 89,
    totalPatients: 280,
    isAvailable: true,
    status: 'active',
  },
];

async function seedDatabase() {
  try {
    // Connect to database
    await mongoose.connect(config.mongodb.uri);
    logger.info('Connected to MongoDB');

    // Clear existing doctors
    await Doctor.deleteMany({});
    logger.info('Cleared existing doctors');

    // Insert sample doctors
    const doctors = await Doctor.insertMany(sampleDoctors);
    logger.info(`✅ Inserted ${doctors.length} sample doctors`);

    // Log doctor details
    doctors.forEach((doctor, index) => {
      logger.info(`${index + 1}. Dr. ${doctor.fullName} - ${doctor.specializations.join(', ')} - ${doctor.address.city}, ${doctor.address.state}`);
    });

    logger.info('🌱 Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    logger.error('Error seeding database:', error);
    process.exit(1);
  }
}

// Run seed if called directly
if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;
