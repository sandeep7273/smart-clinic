/**
 * Appointment Event Model (Event Sourcing)
 * Stores all state changes as immutable events
 */

const mongoose = require('mongoose');

const appointmentEventSchema = new mongoose.Schema(
  {
    eventId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    
    // Aggregate Information
    aggregateId: {
      type: String,
      required: true,
      index: true,
    },
    aggregateType: {
      type: String,
      required: true,
      default: 'Appointment',
    },
    
    // Event Details
    eventType: {
      type: String,
      required: true,
      enum: [
        'APPOINTMENT_CREATED',
        'APPOINTMENT_CONFIRMED',
        'APPOINTMENT_CANCELLED',
        'APPOINTMENT_RESCHEDULED',
        'APPOINTMENT_COMPLETED',
        'APPOINTMENT_NO_SHOW',
        'APPOINTMENT_UPDATED',
        'SLOT_RESERVED',
        'SLOT_RELEASED',
        'PAYMENT_INITIATED',
        'PAYMENT_COMPLETED',
        'NOTIFICATION_SENT',
      ],
      index: true,
    },
    
    // Event Data (snapshot of changes)
    eventData: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    
    // Metadata
    metadata: {
      userId: String,
      userName: String,
      userRole: String,
      ipAddress: String,
      userAgent: String,
      correlationId: String,
      causationId: String,
    },
    
    // Versioning
    version: {
      type: Number,
      required: true,
      default: 1,
    },
    
    // Timestamp
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    
    // Multi-tenancy
    tenantId: {
      type: String,
      required: true,
      index: true,
    },
  },
  {
    timestamps: false, // We use our own timestamp field
  }
);

// Compound indexes for efficient event replay
appointmentEventSchema.index({ aggregateId: 1, version: 1 });
appointmentEventSchema.index({ eventType: 1, timestamp: -1 });
appointmentEventSchema.index({ tenantId: 1, timestamp: -1 });

/**
 * Create a new event
 */
appointmentEventSchema.statics.createEvent = async function (eventData) {
  const { v4: uuidv4 } = require('uuid');
  
  const event = new this({
    eventId: uuidv4(),
    ...eventData,
    timestamp: new Date(),
  });
  
  return event.save();
};

/**
 * Get event history for an aggregate
 */
appointmentEventSchema.statics.getEventHistory = function (aggregateId) {
  return this.find({ aggregateId }).sort({ version: 1, timestamp: 1 }).lean();
};

/**
 * Get events by type
 */
appointmentEventSchema.statics.getEventsByType = function (eventType, filters = {}) {
  const query = { eventType, ...filters };
  return this.find(query).sort({ timestamp: -1 }).lean();
};

/**
 * Rebuild aggregate state from events (Event Sourcing)
 */
appointmentEventSchema.statics.rebuildState = async function (aggregateId) {
  const events = await this.getEventHistory(aggregateId);
  
  let state = null;
  
  for (const event of events) {
    switch (event.eventType) {
      case 'APPOINTMENT_CREATED':
        state = { ...event.eventData };
        break;
        
      case 'APPOINTMENT_CONFIRMED':
        if (state) {
          state.status = 'confirmed';
          state.confirmedAt = event.timestamp;
          state.confirmedBy = event.metadata?.userId;
        }
        break;
        
      case 'APPOINTMENT_CANCELLED':
        if (state) {
          state.status = 'cancelled';
          state.cancelReason = event.eventData.cancelReason;
          state.cancelledAt = event.timestamp;
          state.cancelledBy = event.metadata?.userId;
        }
        break;
        
      case 'APPOINTMENT_RESCHEDULED':
        if (state) {
          state.date = event.eventData.newDate;
          state.startTime = event.eventData.newStartTime;
          state.endTime = event.eventData.newEndTime;
        }
        break;
        
      case 'APPOINTMENT_COMPLETED':
        if (state) {
          state.status = 'completed';
          state.completedAt = event.timestamp;
          state.prescription = event.eventData.prescription;
          state.diagnosis = event.eventData.diagnosis;
        }
        break;
        
      case 'APPOINTMENT_NO_SHOW':
        if (state) {
          state.status = 'no_show';
        }
        break;
        
      case 'APPOINTMENT_UPDATED':
        if (state) {
          Object.assign(state, event.eventData);
        }
        break;
    }
  }
  
  return state;
};

/**
 * Get event statistics
 */
appointmentEventSchema.statics.getEventStats = async function (filters = {}) {
  const pipeline = [
    { $match: filters },
    {
      $group: {
        _id: '$eventType',
        count: { $sum: 1 },
        lastOccurred: { $max: '$timestamp' },
      },
    },
    {
      $sort: { count: -1 },
    },
  ];
  
  return this.aggregate(pipeline);
};

const AppointmentEvent = mongoose.model('AppointmentEvent', appointmentEventSchema);

module.exports = { AppointmentEvent, appointmentEventSchema };
