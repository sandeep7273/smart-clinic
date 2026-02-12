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

/**
 * CQRS Read Model for Doctor Schedule
 * Optimized for fast availability queries and schedule searches
 */
const doctorScheduleReadViewSchema = new mongoose.Schema(
  {
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    
    // Doctor Basic Info (denormalized for fast queries)
    firstName: {
      type: String,
      required: true,
      index: true,
    },
    lastName: {
      type: String,
      required: true,
      index: true,
    },
    doctorName: {
      type: String,
      required: true,
      index: true,
    },
    email: {
      type: String,
      index: true,
    },
    phone: String,
    
    // Professional Information
    specializations: [{
      type: String,
      index: true,
    }],
    subSpecialties: [String],
    licenseNumber: String,
    yearsOfExperience: Number,
    
    // Medical conditions and symptoms (for search)
    treatedConditions: [{
      type: String,
      index: true,
    }],
    treatedSymptoms: [{
      type: String,
      index: true,
    }],
    
    // Profile Information
    bio: String,
    profilePicture: String,
    languages: [String],
    
    // Location (denormalized for fast search)
    address: {
      street: String,
      city: {
        type: String,
        index: true,
      },
      state: String,
      zipCode: String,
      country: String,
    },
    clinicName: String,
    
    // Ratings and Reviews
    rating: {
      type: Number,
      default: 0,
      index: true,
    },
    reviewCount: {
      type: Number,
      default: 0,
    },
    
    // Consultation
    consultationFee: {
      type: Number,
      index: true,
    },
    consultationDuration: Number,
    acceptsInsurance: {
      type: Boolean,
      default: true,
      index: true,
    },
    insuranceProviders: [String],
    
    // Schedule Information (denormalized)
    nextAvailableSlot: {
      date: Date,
      startTime: String,
      endTime: String,
    },
    availableSlotsCount: {
      type: Number,
      default: 0,
    },
    bookedSlotsCount: {
      type: Number,
      default: 0,
    },
    
    // Weekly Schedule (denormalized)
    weeklySchedule: [{
      dayOfWeek: Number,
      isAvailable: Boolean,
      startTime: String,
      endTime: String,
    }],
    
    // Availability by date range (for quick queries)
    availabilityDates: [{
      date: Date,
      availableSlots: Number,
      bookedSlots: Number,
    }],
    
    // Status
    status: {
      type: String,
      index: true,
    },
    isAvailable: {
      type: Boolean,
      default: true,
      index: true,
    },
    
    // Metadata
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    tenantId: {
      type: String,
      index: true,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
      index: true,
    },
  createdByUserId: {
    type: String,
    index: true,
    required: true,
  },

  },
  {
    timestamps: true,
  }
);

// Compound indexes for common queries
doctorScheduleReadViewSchema.index({ specializations: 1, status: 1, 'nextAvailableSlot.date': 1 });
doctorScheduleReadViewSchema.index({ 'availabilityDates.date': 1, status: 1 });
doctorScheduleReadViewSchema.index({ specializations: 1, 'address.city': 1, status: 1 });
doctorScheduleReadViewSchema.index({ treatedConditions: 1, status: 1 });
doctorScheduleReadViewSchema.index({ treatedSymptoms: 1, status: 1 });
doctorScheduleReadViewSchema.index({ rating: -1, status: 1 });
doctorScheduleReadViewSchema.index({ consultationFee: 1, status: 1 });

// Text search index
doctorScheduleReadViewSchema.index({ 
  firstName: 'text',
  lastName: 'text',
  doctorName: 'text',
  specializations: 'text',
  treatedConditions: 'text',
  treatedSymptoms: 'text',
  'address.city': 'text',
  bio: 'text',
});

/**
 * Update read view from Doctor model
 */
doctorScheduleReadViewSchema.statics.updateFromDoctor = async function (doctor) {
  const doctorId = doctor._id;
  
  // Initialize availability if not exists
  if (!doctor.availability) {
    doctor.availability = [];
  }
  
  // Only track booked slots - no need to calculate "available" slots
  // Next available slot concept removed - all non-booked times are available
  const nextAvailableSlot = null; // Not needed in new model
  
  // Count only booked slots (we only track booked slots now)
  const bookedSlotsCount = doctor.availability ? doctor.availability.filter(
    slot => slot.status === 'booked'
  ).length : 0;
  
  const availableSlotsCount = 0; // Not tracked anymore - all non-booked slots are available
  
  // Group availability by date
  const availabilityDates = [];
  const slotsByDate = {};
  
  // Only track booked slots by date
  if (doctor.availability) {
    doctor.availability.forEach(slot => {
      if (slot.status === 'booked') {
        const dateKey = new Date(slot.date).toISOString().split('T')[0];
        if (!slotsByDate[dateKey]) {
          slotsByDate[dateKey] = { available: 0, booked: 0 };
        }
        slotsByDate[dateKey].booked++;
      }
    });
  }
  
  Object.keys(slotsByDate).forEach(date => {
    availabilityDates.push({
      date: new Date(date),
      availableSlots: slotsByDate[date].available,
      bookedSlots: slotsByDate[date].booked,
    });
  });
  
  // Update or create read view
  await this.findOneAndUpdate(
    { doctorId },
    {
      doctorId,
      userId: doctor.userId,
      firstName: doctor.firstName,
      lastName: doctor.lastName,
      doctorName: `${doctor.firstName} ${doctor.lastName}`,
      email: doctor.email,
      phone: doctor.phone,
      specializations: doctor.specializations,
      subSpecialties: doctor.subSpecialties,
      licenseNumber: doctor.licenseNumber,
      yearsOfExperience: doctor.yearsOfExperience,
      treatedConditions: doctor.treatedConditions,
      treatedSymptoms: doctor.treatedSymptoms,
      bio: doctor.bio,
      profilePicture: doctor.profilePicture,
      languages: doctor.languages,
      address: doctor.address,
      clinicName: doctor.clinicName,
      rating: doctor.rating,
      reviewCount: doctor.reviewCount,
      consultationFee: doctor.consultationFee,
      consultationDuration: doctor.consultationDuration,
      acceptsInsurance: doctor.acceptsInsurance,
      insuranceProviders: doctor.insuranceProviders,
      nextAvailableSlot,
      availableSlotsCount,
      bookedSlotsCount,
      weeklySchedule: doctor.weeklySchedule,
      availabilityDates,
      status: doctor.status,
      isAvailable: doctor.isAvailable,
      isDeleted: doctor.isDeleted,
      tenantId: doctor.tenantId,
      createdByUserId: doctor.createdByUserId,
      lastUpdated: new Date(),
    },
    { upsert: true, new: true }
  );
};

// Comprehensive search method
doctorScheduleReadViewSchema.statics.search = async function(searchParams) {
  const {
    query, // Free text search across multiple fields
    specialization,
    location, // city
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

  // Specialization filter
  if (specialization) {
    filter.specializations = { $in: Array.isArray(specialization) ? specialization : [specialization] };
  }

  // Location filter (city)
  if (location) {
    filter['address.city'] = new RegExp(location, 'i');
  }


  // Availability status filter
  if (isAvailable !== undefined) {
    if (isAvailable) {
      filter.isAvailable = true;
      filter.availableSlotsCount = { $gt: 0 };
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
      .skip(skip)
      .limit(limit)
      .sort(sortObject)
      .lean(),
    this.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(total / limit);
  
  return {
    doctors,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
};

/**
 * Find available doctors for date/time (optimized query)
 */
doctorScheduleReadViewSchema.statics.findAvailableDoctors = function (date, specialization = null) {
  const query = {
    status: 'active',
    'availabilityDates.date': date,
    'availabilityDates.availableSlots': { $gt: 0 },
  };
  
  if (specialization) {
    query.specializations = { $in: [specialization.toLowerCase()] };
  }
  
  return this.find(query)
    .sort({ 'nextAvailableSlot.date': 1 })
    .lean();
};

doctorScheduleReadViewSchema.statics.findBySpecialization = function(specialization) {
  return this.find({ 
    specializations: specialization, 
    status: DOCTOR_STATUS.ACTIVE,
    isDeleted: false,
  });
};

// Get unique values for dropdowns
doctorScheduleReadViewSchema.statics.getSpecializations = async function() {
  const result = await this.aggregate([
    { $match: { status: DOCTOR_STATUS.ACTIVE, isDeleted: false } },
    { $unwind: '$specializations' },
    { $group: { _id: '$specializations' } },
    { $sort: { _id: 1 } },
  ]);
  return result.map(r => r._id);
};

doctorScheduleReadViewSchema.statics.getLocations = async function() {
  const result = await this.aggregate([
    { $match: { status: DOCTOR_STATUS.ACTIVE, isDeleted: false } },
    { $group: { _id: '$address.city' } },
    { $sort: { _id: 1 } },
  ]);
  return result.map(r => r._id);
};


doctorScheduleReadViewSchema.methods.isSlotAvailable = function(date, startTime, endTime) {
  // Simple logic: all slots are available unless explicitly booked
  if (!date || !startTime || !endTime) {
    return false;
  }

  // Check if doctor is active
  if (this.status !== 'active' || !this.isAvailable) {
    return false;
  }

  // Check if the date has any available slots (not booked)
  const appointmentDate = new Date(date);
  const dateAvailability = this.availabilityDates.find(ad => 
    new Date(ad.date).toDateString() === appointmentDate.toDateString()
  );
  
  if (dateAvailability) {
    // If date has availability data, check if slots are available (not all booked)
    return dateAvailability.availableSlots > 0;
  }
  
  // If no explicit availability data exists for this date, assume available
  return true;
};


const DoctorScheduleReadView = mongoose.model('DoctorScheduleReadView', doctorScheduleReadViewSchema);

module.exports = {
    DoctorScheduleReadView
};

