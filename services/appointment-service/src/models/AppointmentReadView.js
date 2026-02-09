/**
 * Appointment Read View Model (CQRS Read Model)
 * Optimized for fast queries and search operations
 */

const mongoose = require('mongoose');

const appointmentReadViewSchema = new mongoose.Schema(
  {
    appointmentId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    appointmentNumber: {
      type: String,
      required: true,
      index: true,
    },

    // Patient Information (denormalized)
    patient: {
      id: { type: String, required: true, index: true },
      name: String,
      email: String,
      phone: String,
    },

    // Doctor Information (denormalized)
    doctor: {
      id: { type: String, required: true, index: true },
      name: String,
      specialization: String,
      profilePicture: String,
    },

    // Appointment Details
    date: {
      type: Date,
      required: true,
      index: true,
    },
    startTime: String,
    endTime: String,
    duration: Number,
    
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled', 'completed', 'no_show'],
      required: true,
      index: true,
    },

    // Reason and Notes
    reason: String,
    notes: String,
    symptoms: [String],

    // Cancellation Info
    cancelReason: String,
    cancelledAt: Date,

    // Timestamps
    confirmedAt: Date,
    completedAt: Date,

    // Multi-tenancy
    tenantId: {
      type: String,
      required: true,
      index: true,
    },

    // Metadata
    createdAt: Date,
    updatedAt: Date,
    lastSyncedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
appointmentReadViewSchema.index({ 'patient.id': 1, date: -1 });
appointmentReadViewSchema.index({ 'doctor.id': 1, date: -1 });
appointmentReadViewSchema.index({ status: 1, date: 1 });
appointmentReadViewSchema.index({ tenantId: 1, status: 1, date: -1 });
appointmentReadViewSchema.index({ appointmentNumber: 1 });

// Text index for search
appointmentReadViewSchema.index({
  appointmentNumber: 'text',
  'patient.name': 'text',
  'doctor.name': 'text',
  reason: 'text',
});

/**
 * Update read view from write model
 */
appointmentReadViewSchema.statics.updateFromAppointment = async function (appointment) {
  const readView = {
    appointmentId: appointment._id.toString(),
    appointmentNumber: appointment.appointmentNumber,
    patient: {
      id: appointment.userId,
      name: appointment.patientName,
      email: appointment.patientEmail,
      phone: appointment.patientPhone,
    },
    doctor: {
      id: appointment.doctorId,
      name: appointment.doctorName,
      specialization: appointment.doctorSpecialization,
    },
    date: appointment.date,
    startTime: appointment.startTime,
    endTime: appointment.endTime,
    duration: appointment.duration,
    status: appointment.status,
    reason: appointment.reason,
    notes: appointment.notes,
    symptoms: appointment.symptoms,
    cancelReason: appointment.cancelReason,
    cancelledAt: appointment.cancelledAt,
    confirmedAt: appointment.confirmedAt,
    completedAt: appointment.completedAt,
    tenantId: appointment.tenantId,
    createdAt: appointment.createdAt,
    updatedAt: appointment.updatedAt,
    lastSyncedAt: new Date(),
  };

  return this.findOneAndUpdate(
    { appointmentId: appointment._id.toString() },
    readView,
    { upsert: true, new: true }
  );
};

/**
 * Search appointments with filters
 */
appointmentReadViewSchema.statics.search = async function (filters = {}) {
  const query = {};

  // Patient filter
  if (filters.userId) {
    query['patient.id'] = filters.userId;
  }

  // Doctor filter
  if (filters.doctorId) {
    query['doctor.id'] = filters.doctorId;
  }

  // Status filter
  if (filters.status) {
    query.status = filters.status;
  }

  // Date range filter
  if (filters.startDate || filters.endDate) {
    query.date = {};
    if (filters.startDate) {
      query.date.$gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      query.date.$lte = new Date(filters.endDate);
    }
  }

  // Tenant filter
  if (filters.tenantId) {
    query.tenantId = filters.tenantId;
  }

  // Text search
  if (filters.search) {
    query.$text = { $search: filters.search };
  }

  // Pagination
  const page = parseInt(filters.page) || 1;
  const limit = parseInt(filters.limit) || 20;
  const skip = (page - 1) * limit;

  // Sort
  const sortOptions = {};
  if (filters.sortBy) {
    sortOptions[filters.sortBy] = filters.sortOrder === 'asc' ? 1 : -1;
  } else {
    sortOptions.date = -1; // Default: newest first
  }

  const [data, total] = await Promise.all([
    this.find(query).sort(sortOptions).skip(skip).limit(limit).lean(),
    this.countDocuments(query),
  ]);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get upcoming appointments for patient
 */
appointmentReadViewSchema.statics.getUpcomingForPatient = function (userId, limit = 10) {
  const now = new Date();
  return this.find({
    'patient.id': userId,
    date: { $gte: now },
    status: { $in: ['pending', 'confirmed'] },
  })
    .sort({ date: 1 })
    .limit(limit)
    .lean();
};

/**
 * Get doctor's schedule
 */
appointmentReadViewSchema.statics.getDoctorSchedule = function (doctorId, startDate, endDate) {
  return this.find({
    'doctor.id': doctorId,
    date: { $gte: startDate, $lte: endDate },
    status: { $ne: 'cancelled' },
  })
    .sort({ date: 1, startTime: 1 })
    .lean();
};

const AppointmentReadView = mongoose.model('AppointmentReadView', appointmentReadViewSchema);

module.exports = { AppointmentReadView, appointmentReadViewSchema };
