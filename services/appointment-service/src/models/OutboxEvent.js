/**
 * Outbox Event Model
 * Ensures guaranteed event publishing using the Outbox Pattern
 */

const mongoose = require('mongoose');

const outboxEventSchema = new mongoose.Schema(
  {
    eventId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    
    // Event Details
    eventType: {
      type: String,
      required: true,
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
    
    // Event Payload
    payload: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    
    // Kafka Topic
    topic: {
      type: String,
      required: true,
    },
    
    // Publishing Status
    status: {
      type: String,
      enum: ['pending', 'published', 'failed'],
      default: 'pending',
      required: true,
      index: true,
    },
    
    // Retry Information
    retryCount: {
      type: Number,
      default: 0,
    },
    maxRetries: {
      type: Number,
      default: 3,
    },
    lastRetryAt: Date,
    
    // Error Information
    error: {
      message: String,
      stack: String,
      timestamp: Date,
    },
    
    // Publishing Information
    publishedAt: Date,
    
    // Metadata
    metadata: {
      correlationId: String,
      causationId: String,
      userId: String,
    },
    
    // Multi-tenancy
    tenantId: {
      type: String,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
outboxEventSchema.index({ status: 1, createdAt: 1 });
outboxEventSchema.index({ aggregateId: 1, createdAt: -1 });
outboxEventSchema.index({ eventType: 1, status: 1 });

/**
 * Create a new outbox event
 */
outboxEventSchema.statics.createOutboxEvent = async function (eventData) {
  const { v4: uuidv4 } = require('uuid');
  
  const outboxEvent = new this({
    eventId: eventData.eventId || uuidv4(),
    eventType: eventData.eventType,
    aggregateId: eventData.aggregateId,
    aggregateType: eventData.aggregateType || 'Appointment',
    payload: eventData.payload,
    topic: eventData.topic,
    status: 'pending',
    metadata: eventData.metadata || {},
    tenantId: eventData.tenantId,
  });
  
  return outboxEvent.save();
};

/**
 * Get pending events for publishing
 */
outboxEventSchema.statics.getPendingEvents = function (limit = 100) {
  return this.find({
    status: 'pending',
    retryCount: { $lt: this.maxRetries },
  })
    .sort({ createdAt: 1 })
    .limit(limit);
};

/**
 * Mark event as published
 */
outboxEventSchema.statics.markPublished = async function (eventId) {
  return this.findOneAndUpdate(
    { eventId },
    {
      status: 'published',
      publishedAt: new Date(),
    },
    { new: true }
  );
};

/**
 * Mark event as failed
 */
outboxEventSchema.statics.markFailed = async function (eventId, error) {
  return this.findOneAndUpdate(
    { eventId },
    {
      $inc: { retryCount: 1 },
      $set: {
        status: 'failed',
        lastRetryAt: new Date(),
        error: {
          message: error.message,
          stack: error.stack,
          timestamp: new Date(),
        },
      },
    },
    { new: true }
  );
};

/**
 * Retry failed events
 */
outboxEventSchema.statics.retryFailed = async function (eventId) {
  const event = await this.findOne({ eventId });
  
  if (!event) {
    throw new Error('Event not found');
  }
  
  if (event.retryCount >= event.maxRetries) {
    throw new Error('Max retries exceeded');
  }
  
  event.status = 'pending';
  event.lastRetryAt = new Date();
  
  return event.save();
};

/**
 * Clean up old published events (data retention)
 */
outboxEventSchema.statics.cleanup = async function (daysToKeep = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
  
  const result = await this.deleteMany({
    status: 'published',
    publishedAt: { $lt: cutoffDate },
  });
  
  return result.deletedCount;
};

/**
 * Get event statistics
 */
outboxEventSchema.statics.getStats = async function () {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]);
  
  return stats.reduce((acc, stat) => {
    acc[stat._id] = stat.count;
    return acc;
  }, {});
};

const OutboxEvent = mongoose.model('OutboxEvent', outboxEventSchema);

module.exports = { OutboxEvent, outboxEventSchema };
