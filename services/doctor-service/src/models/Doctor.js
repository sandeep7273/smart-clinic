/**
 * Doctor Model (Write Model)
 * Comprehensive doctor profile with search capabilities
 */

const mongoose = require('mongoose');

// Enums
const DOCTOR_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  ON_LEAVE: 'on_leave',
  SUSPENDED: 'suspended',
};

const SLOT_STATUS = {
  AVAILABLE: 'available',
  BOOKED: 'booked',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
};

// Sub-schemas
const AddressSchema = new mongoose.Schema({
  street: { type: String, required: true },
  city: { type: String, required: true, index: true },
  state: { type: String, required: true },
  zipCode: { type: String, required: true },
  country: { type: String, required: true, default: 'USA' },
}, { _id: false });

const QualificationSchema = new mongoose.Schema({
  degree: { type: String, required: true },
  institution: { type: String, required: true },
  year: { type: Number, required: true },
  field: String,
}, { _id: false });

const LicenseSchema = new mongoose.Schema({
  licenseNumber: { type: String },
  issuingAuthority: { type: String},
  state: { type: String,  },
  expiryDate: Date,
  isActive: { type: Boolean, default: true },
}, { _id: false });

const ScheduleSlotSchema = new mongoose.Schema({
  date: { type: Date, required: true, index: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  status: { 
    type: String, 
    enum: Object.values(SLOT_STATUS), 
    default: SLOT_STATUS.AVAILABLE,
    index: true,
  },
  appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
  notes: String,
}, { timestamps: true });

const WeeklyScheduleSchema = new mongoose.Schema({
  dayOfWeek: { type: Number, min: 0, max: 6 }, // 0 = Sunday
  isAvailable: { type: Boolean, default: true },
  startTime: String,
  endTime: String,
  breaks: [{
    startTime: String,
    endTime: String,
  }],
}, { _id: false });

// Main Doctor Schema
const DoctorSchema = new mongoose.Schema({
  // User reference
  userId: { type: String, required: true, index: true },
  
  // Basic Information
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, index: true },
  phone: { type: String, required: true },
  dateOfBirth: Date,
  gender: { type: String, enum: ['male', 'female', 'other'] },
  
  // Professional Information
  specializations: [{ type: String, required: true, index: true }], // e.g., 'cardiology', 'internal medicine'
  subSpecialties: [String], // e.g., 'interventional cardiology'
  licenseNumber: { type: String  },
  yearsOfExperience: { type: Number, min: 0 },
  
  // Medical conditions and symptoms they treat (for search)
  treatedConditions: [{ type: String, index: true }], // e.g., 'diabetes', 'hypertension', 'heart disease'
  treatedSymptoms: [{ type: String, index: true }], // e.g., 'chest pain', 'shortness of breath', 'fatigue'
  
  // Profile
  bio: { type: String, maxlength: 2000 },
  profilePicture: String,
  languages: [String], // e.g., ['English', 'Spanish']
  
  // Location
  address: { type: AddressSchema, required: true },
  clinicName: String,
  clinicAddress: AddressSchema,
  
  // Qualifications
  qualifications: [QualificationSchema],
  licenses: [LicenseSchema],
  certifications: [String],
  
  // Schedule
  weeklySchedule: [WeeklyScheduleSchema],
  availability: [ScheduleSlotSchema],
  
  // Ratings and Reviews
  rating: { type: Number, min: 0, max: 5, default: 0 },
  reviewCount: { type: Number, default: 0 },
  
  // Consultation
  consultationFee: { type: Number, min: 0 },
  consultationDuration: { type: Number, default: 30 }, // in minutes
  acceptsInsurance: { type: Boolean, default: true },
  insuranceProviders: [String],
  
  // Status
  status: { 
    type: String, 
    enum: Object.values(DOCTOR_STATUS), 
    default: DOCTOR_STATUS.ACTIVE,
    index: true,
  },
  isAvailable: { type: Boolean, default: true, index: true },
  unavailableReason: String,
  unavailableUntil: Date,
  
  // Metadata
  tenantId: { type: String, index: true },
  isDeleted: { type: Boolean, default: false, index: true },
  createdByUserId: {
    type: String,
    index: true,
    required: true,
  },
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Text search index for comprehensive search
DoctorSchema.index({ 
  firstName: 'text', 
  lastName: 'text', 
  specializations: 'text',
  treatedConditions: 'text',
  treatedSymptoms: 'text',
  'address.city': 'text',
  'address.state': 'text',
  bio: 'text',
});

// Compound indexes for common queries
DoctorSchema.index({ specializations: 1, 'address.city': 1, status: 1 });
DoctorSchema.index({ specializations: 1, isAvailable: 1, status: 1 });
DoctorSchema.index({ 'address.city': 1, status: 1 });
DoctorSchema.index({ treatedConditions: 1, status: 1 });
DoctorSchema.index({ treatedSymptoms: 1, status: 1 });

// Virtual for full name
DoctorSchema.virtual('fullName').get(function() {
  return `Dr. ${this.firstName} ${this.lastName}`;
});

// Virtual for booked slots count (we only track booked slots)
DoctorSchema.virtual('bookedSlotsCount').get(function() {
  if (!this.availability) return 0;
  return this.availability.filter(slot => 
    slot.status === SLOT_STATUS.BOOKED && 
    new Date(slot.date) >= new Date()
  ).length;
});

// Static methods
DoctorSchema.statics.findByUserId = function(userId) {
  return this.findOne({ userId, isDeleted: false });
};

DoctorSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase(), isDeleted: false });
};



// Get available doctors for specific date/time
// Simple logic: doctor is available if the specific slot is NOT booked
DoctorSchema.statics.findAvailable = async function(date, startTime, endTime, options = {}) {
  const { specialization, location } = options;
  
  const searchDate = new Date(date);
  const filter = {
    status: DOCTOR_STATUS.ACTIVE,
    isAvailable: true,
    isDeleted: false,
  };

  if (specialization) {
    filter.specializations = specialization;
  }

  if (location) {
    filter['address.city'] = new RegExp(location, 'i');
  }

  return this.find(filter).sort({ rating: -1 });
};



DoctorSchema.methods.addAvailabilitySlot = function(slot) {
  this.availability.push(slot);
  return this;
};



const Doctor = mongoose.model('Doctor', DoctorSchema);

module.exports = {
  Doctor,
  DOCTOR_STATUS,
  SLOT_STATUS,
};
