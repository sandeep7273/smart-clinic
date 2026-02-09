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

// Virtual for available slots count
DoctorSchema.virtual('availableSlotsCount').get(function() {
  if (!this.availability) return 0;
  return this.availability.filter(slot => 
    slot.status === SLOT_STATUS.AVAILABLE && 
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

DoctorSchema.statics.findBySpecialization = function(specialization) {
  return this.find({ 
    specializations: specialization, 
    status: DOCTOR_STATUS.ACTIVE,
    isDeleted: false,
  });
};

// Comprehensive search method
DoctorSchema.statics.search = async function(searchParams) {
  const {
    query, // Free text search across multiple fields
    name, // Search by doctor's name specifically
    specialization,
    location, // city
    condition,
    symptom,
    date,
    minRating,
    maxFee,
    acceptsInsurance,
    isAvailable,
    page = 1,
    limit = 10,
    sortBy = 'rating',
    sortOrder = 'desc',
  } = searchParams;

  const filter = {
    status: DOCTOR_STATUS.ACTIVE,
    isDeleted: false,
  };

  // Text search across name, specialty, conditions, symptoms using MongoDB text index
  if (query) {
    filter.$text = { $search: query };
  }

  // Search by doctor's name (first name or last name)
  if (name) {
    filter.$or = [
      { firstName: new RegExp(name, 'i') },
      { lastName: new RegExp(name, 'i') },
      { $expr: { 
        $regexMatch: { 
          input: { $concat: ['$firstName', ' ', '$lastName'] }, 
          regex: name, 
          options: 'i' 
        } 
      }}
    ];
  }

  // Specialization filter
  if (specialization) {
    filter.specializations = { $in: Array.isArray(specialization) ? specialization : [specialization] };
  }

  // Location filter (city)
  if (location) {
    filter['address.city'] = new RegExp(location, 'i');
  }

  // Condition filter
  if (condition) {
    filter.treatedConditions = { $in: Array.isArray(condition) ? condition : [condition] };
  }

  // Symptom filter
  if (symptom) {
    filter.treatedSymptoms = { $in: Array.isArray(symptom) ? symptom : [symptom] };
  }

  // Rating filter
  if (minRating) {
    filter.rating = { $gte: parseFloat(minRating) };
  }

  // Fee filter
  if (maxFee) {
    filter.consultationFee = { $lte: parseFloat(maxFee) };
  }

  // Insurance filter
  if (acceptsInsurance !== undefined) {
    filter.acceptsInsurance = acceptsInsurance;
  }

  // Date availability filter
  if (date) {
    const searchDate = new Date(date);
    filter['availability'] = {
      $elemMatch: {
        date: {
          $gte: new Date(searchDate.setHours(0, 0, 0, 0)),
          $lt: new Date(searchDate.setHours(23, 59, 59, 999)),
        },
        status: SLOT_STATUS.AVAILABLE,
      },
    };
  }

  // Availability status filter
  if (isAvailable !== undefined) {
    if (isAvailable) {
      filter['availability.status'] = SLOT_STATUS.AVAILABLE;
    }
  }

  const skip = (page - 1) * limit;

  // Build sort object
  let sortObject = {};
  if (query && !sortBy) {
    // If text search, sort by relevance score
    sortObject = { score: { $meta: 'textScore' } };
  } else {
    // Otherwise sort by specified field
    sortObject[sortBy] = sortOrder === 'asc' ? 1 : -1;
  }

  const [doctors, total] = await Promise.all([
    this.find(filter)
      .select('-availability') // Exclude availability array for list view
      .skip(skip)
      .limit(limit)
      .sort(sortObject)
      .lean(),
    this.countDocuments(filter),
  ]);

  return {
    doctors,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

// Get available doctors for specific date/time
DoctorSchema.statics.findAvailable = async function(date, startTime, endTime, options = {}) {
  const { specialization, location } = options;
  
  const searchDate = new Date(date);
  const filter = {
    status: DOCTOR_STATUS.ACTIVE,
    isAvailable: true,
    isDeleted: false,
    'availability': {
      $elemMatch: {
        date: {
          $gte: new Date(searchDate.setHours(0, 0, 0, 0)),
          $lt: new Date(searchDate.setHours(23, 59, 59, 999)),
        },
        status: SLOT_STATUS.AVAILABLE,
        ...(startTime && { startTime }),
        ...(endTime && { endTime }),
      },
    },
  };

  if (specialization) {
    filter.specializations = specialization;
  }

  if (location) {
    filter['address.city'] = new RegExp(location, 'i');
  }

  return this.find(filter).sort({ rating: -1 });
};

// Instance methods
DoctorSchema.methods.addSpecialization = function(specialization) {
  if (!this.specializations.includes(specialization)) {
    this.specializations.push(specialization);
  }
  return this;
};

DoctorSchema.methods.removeSpecialization = function(specialization) {
  this.specializations = this.specializations.filter(s => s !== specialization);
  return this;
};

DoctorSchema.methods.addAvailabilitySlot = function(slot) {
  this.availability.push(slot);
  return this;
};

DoctorSchema.methods.updateSlotStatus = function(slotId, status, appointmentId = null) {
  const slot = this.availability.id(slotId);
  if (slot) {
    slot.status = status;
    if (appointmentId) {
      slot.appointmentId = appointmentId;
    }
  }
  return this;
};

// Get unique values for dropdowns
DoctorSchema.statics.getSpecializations = async function() {
  const result = await this.aggregate([
    { $match: { status: DOCTOR_STATUS.ACTIVE, isDeleted: false } },
    { $unwind: '$specializations' },
    { $group: { _id: '$specializations' } },
    { $sort: { _id: 1 } },
  ]);
  return result.map(r => r._id);
};

DoctorSchema.statics.getLocations = async function() {
  const result = await this.aggregate([
    { $match: { status: DOCTOR_STATUS.ACTIVE, isDeleted: false } },
    { $group: { _id: '$address.city' } },
    { $sort: { _id: 1 } },
  ]);
  return result.map(r => r._id);
};

DoctorSchema.statics.getTreatedConditions = async function() {
  const result = await this.aggregate([
    { $match: { status: DOCTOR_STATUS.ACTIVE, isDeleted: false } },
    { $unwind: '$treatedConditions' },
    { $group: { _id: '$treatedConditions' } },
    { $sort: { _id: 1 } },
  ]);
  return result.map(r => r._id);
};

const Doctor = mongoose.model('Doctor', DoctorSchema);

module.exports = {
  Doctor,
  DOCTOR_STATUS,
  SLOT_STATUS,
};
