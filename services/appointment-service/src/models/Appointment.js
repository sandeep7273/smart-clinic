/**
 * Appointment Model (Write Model - CQRS)
 * Main appointment entity for write operations
 */

const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const appointmentSchema = new mongoose.Schema(
  {
    appointmentNumber: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },
    
    // Patient Information
    userId: {
      type: String,
      required: true,
      index: true,
    },
    patientName: String,
    patientEmail: String,
    patientPhone: String,

    // Doctor Information
    doctorId: {
      type: String,
      required: true,
      index: true,
    },
    doctorName: String,
    doctorSpecialization: String,

    // Appointment Details
    date: {
      type: Date,
      required: true,
      index: true,
    },
    startTime: {
      type: String,
      required: true,
    },
    endTime: {
      type: String,
      required: true,
    },
    duration: {
      type: Number,
      required: true,
      default: 30, // minutes
    },

    // Status
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled', 'completed', 'no_show'],
      default: 'pending',
      required: true,
      index: true,
    },

    // Appointment Information
    reason: {
      type: String,
      required: true,
    },
    notes: String,
    symptoms: [String],

    // Cancellation
    cancelReason: String,
    cancelledAt: Date,
    cancelledBy: String,

    // Confirmation
    confirmedAt: Date,
    confirmedBy: String,

    // Completion
    completedAt: Date,
    prescription: String,
    diagnosis: String,

    // Multi-tenancy
    tenantId: {
      type: String,
      required: true,
      index: true,
    },

    // Metadata
    createdBy: String,
    updatedBy: String,
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
appointmentSchema.index({ userId: 1, date: -1 });
appointmentSchema.index({ doctorId: 1, date: -1 });
appointmentSchema.index({ status: 1, date: 1 });
appointmentSchema.index({ tenantId: 1, status: 1, date: -1 });

// Generate appointment number
appointmentSchema.pre('save', async function (next) {
  if (!this.appointmentNumber) {
    const prefix = 'APT';
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.appointmentNumber = `${prefix}-${timestamp}-${random}`;
  }
  next();
});

// Virtual for formatted date
appointmentSchema.virtual('formattedDate').get(function () {
  return this.date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
});

// Method to check if cancellable
appointmentSchema.methods.isCancellable = function (cancellationWindow = 24 * 60 * 60 * 1000) {
  if (this.status === 'cancelled' || this.status === 'completed') {
    return false;
  }
  const now = new Date();
  const appointmentTime = new Date(this.date);
  return appointmentTime - now > cancellationWindow;
};

// Method to check if can be rescheduled
appointmentSchema.methods.canReschedule = function () {
  return ['pending', 'confirmed'].includes(this.status) && !this.isDeleted;
};

// Static method to get upcoming appointments
appointmentSchema.statics.getUpcoming = function (userId, limit = 10) {
  const now = new Date();
  return this.find({
    userId,
    date: { $gte: now },
    status: { $in: ['pending', 'confirmed'] },
    isDeleted: false,
  })
    .sort({ date: 1 })
    .limit(limit);
};

// Static method to get doctor's schedule
appointmentSchema.statics.getDoctorSchedule = function (doctorId, startDate, endDate) {
  return this.find({
    doctorId,
    date: { $gte: startDate, $lte: endDate },
    status: { $ne: 'cancelled' },
    isDeleted: false,
  }).sort({ date: 1, startTime: 1 });
};

const Appointment = mongoose.model('Appointment', appointmentSchema);

module.exports = { Appointment, appointmentSchema };
