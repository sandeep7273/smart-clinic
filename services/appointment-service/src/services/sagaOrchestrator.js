/**
 * Saga Orchestrator
 * Implements SAGA pattern for distributed transactions in appointment booking
 * 
 * Booking Flow (Happy Path):
 * 1. Validate request
 * 2. Check doctor availability
 * 3. Reserve slot in Doctor Service
 * 4. Create appointment
 * 5. Create event sourcing record
 * 6. Update read view (CQRS)
 * 7. Publish events
 * 8. Send notifications
 * 
 * Compensation Flow (on failure):
 * - Release reserved slot
 * - Delete appointment
 * - Publish failure events
 */

const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const { SagaError, ValidationError, ConflictError } = require('../utils/errors');
const { Appointment } = require('../models/Appointment');
const { AppointmentReadView } = require('../models/AppointmentReadView');
const { AppointmentEvent } = require('../models/AppointmentEvent');
const { publishEvent } = require('../utils/eventProducer');
const { doctorService, userService, notificationService } = require('./serviceClients');

class SagaOrchestrator {
  constructor() {
    this.compensations = [];
  }

  /**
   * Execute SAGA for appointment booking
   */
  async bookAppointment(bookingData, user, authToken) {
    const sagaId = uuidv4();
    const startTime = Date.now();

    logger.info('Starting appointment booking SAGA', {
      sagaId,
      userId: bookingData.userId,
      doctorId: bookingData.doctorId,
    });

    try {
      // Step 1: Validate booking data
      await this.validateBookingData(bookingData);

      // Step 2: Get doctor details
      const doctorDetails = await this.getDoctorDetails(
        bookingData.doctorId,
        authToken
      );

    //   Step 3: Get patient details
      const patientDetails = await this.getPatientDetails(
        bookingData.userId,
        authToken
      );

      // Step 4: Check doctor availability
    //     await this.checkDoctorAvailability(
    //     bookingData.doctorId,
    //     bookingData.date,
    //     bookingData.startTime,
    //     bookingData.endTime,
    //     authToken
    //   );

      // Step 5: Reserve slot (with compensation)
      const slotReservation = await this.reserveSlot(
        bookingData.doctorId,
        bookingData,
        authToken
      );

      // Step 6: Create appointment (with compensation)
      const appointment = await this.createAppointment(
        bookingData,
        doctorDetails,
        patientDetails,
        user
      );

      // Step 7: Create event sourcing record
      await this.createAppointmentEvent(appointment, 'APPOINTMENT_CREATED', user);

      // Step 8: Update read view (CQRS)
      await this.updateReadView(appointment);

      // Step 9: Publish events (Outbox Pattern)
      await this.publishAppointmentEvents(appointment, 'APPOINTMENT_CREATED');

      // Step 10: Send notifications (non-critical)
      await this.sendNotifications(appointment, 'created', authToken);

      const duration = Date.now() - startTime;
      logger.info('Appointment booking SAGA completed successfully', {
        sagaId,
        appointmentId: appointment._id,
        duration: `${duration}ms`,
      });

      return {
        success: true,
        appointment,
        slotReservation,
      };
    } catch (error) {
      logger.error('Appointment booking SAGA failed', {
        sagaId,
        error: error.message,
        stack: error.stack,
      });

      // Execute compensations in reverse order
      await this.executeCompensations(sagaId);

      throw new SagaError(
        `Appointment booking failed: ${error.message}`,
        this.compensations.map((c) => c.name)
      );
    }
  }

  /**
   * Validate booking data
   */
  async validateBookingData(data) {
    if (!data.userId) {
      throw new ValidationError('User ID is required');
    }

    if (!data.doctorId) {
      throw new ValidationError('Doctor ID is required');
    }

    if (!data.date) {
      throw new ValidationError('Appointment date is required');
    }

    if (!data.startTime) {
      throw new ValidationError('Start time is required');
    }

    if (!data.endTime) {
      throw new ValidationError('End time is required');
    }

    if (!data.reason) {
      throw new ValidationError('Appointment reason is required');
    }

    // Validate date is in future
    const appointmentDate = new Date(data.date);
    const now = new Date();
    if (appointmentDate < now) {
      throw new ValidationError('Appointment date must be in the future');
    }

    return true;
  }

  /**
   * Get doctor details
   */
  async getDoctorDetails(doctorId, authToken) {
    try {
        console.log(`debugging Fetching doctor details for ID: ${doctorId}`);
      const result = await doctorService.getDoctorDetails.fire(doctorId, authToken);
      
      if (!result || !result.success) {
        throw new Error('Doctor not found');
      }

      return result.data;
    } catch (error) {
      logger.error('Failed to get doctor details:', error);
      throw error;
    }
  }

  /**
   * Get patient details
   */
  async getPatientDetails(userId, authToken) {
    try {
      const result = await userService.getPatientDetails.fire(userId, authToken);
      
      if (!result || !result.success) {
        throw new Error('Patient not found');
      }

      return result.data;
    } catch (error) {
      logger.error('Failed to get patient details:', error);
      // If user service is down, use minimal data
      return {
        _id: userId,
        firstName: 'Unknown',
        lastName: 'Patient',
        email: '',
        phone: '',
      };
    }
  }

  /**
   * Check doctor availability
   */
  async checkDoctorAvailability(doctorId, date, startTime, endTime, authToken) {
    try {
      const result = await doctorService.checkAvailability.fire(
        doctorId,
        date,
        startTime,
        endTime,
        authToken
      );

      if (!result || !result.success || !result.data.available) {
        throw new ConflictError('Doctor is not available at the requested time');
      }

      return result.data;
    } catch (error) {
      logger.error('Availability check failed:', error);
      throw error;
    }
  }

  /**
   * Reserve slot (Step with compensation)
   */
  async reserveSlot(doctorId, bookingData, authToken) {
    try {
      const slotData = {
        date: bookingData.date,
        startTime: bookingData.startTime,
        endTime: bookingData.endTime,
        userId: bookingData.userId,
      };

      const result = await doctorService.reserveSlot.fire(
        doctorId,
        slotData,
        authToken
      );

      if (!result || !result.success) {
        throw new Error('Failed to reserve slot');
      }

      const slotId = result.data.slotId;

      // Add compensation
      this.compensations.push({
        name: 'releaseSlot',
        execute: async () => {
          logger.info('Executing compensation: releaseSlot', { slotId });
          await doctorService.releaseSlot.fire(doctorId, slotId, authToken);
        },
      });

      return result.data;
    } catch (error) {
      logger.error('Slot reservation failed:', error);
      throw error;
    }
  }

  /**
   * Create appointment (Step with compensation)
   */
  async createAppointment(bookingData, doctorDetails, patientDetails, user) {
    try {
      // Generate appointment number
      const prefix = 'APT';
      const timestamp = Date.now().toString().slice(-8);
      const random = Math.random().toString(36).substring(2, 6).toUpperCase();
      const appointmentNumber = `${prefix}-${timestamp}-${random}`;

      const appointment = new Appointment({
        appointmentNumber,
        userId: bookingData.userId,
        patientName: `${patientDetails.firstName} ${patientDetails.lastName}`,
        patientEmail: patientDetails.email,
        patientPhone: patientDetails.phone,
        doctorId: bookingData.doctorId,
        doctorName: `${doctorDetails.firstName} ${doctorDetails.lastName}`,
        doctorSpecialization: doctorDetails.specializations?.[0] || '',
        date: bookingData.date,
        startTime: bookingData.startTime,
        endTime: bookingData.endTime,
        duration: bookingData.duration || 30,
        reason: bookingData.reason,
        notes: bookingData.notes,
        symptoms: bookingData.symptoms,
        status: 'pending',
        tenantId: user.tenantId || 'default',
        createdBy: user.userId,
      });

      await appointment.save();

      // Add compensation
      this.compensations.push({
        name: 'deleteAppointment',
        execute: async () => {
          logger.info('Executing compensation: deleteAppointment', {
            appointmentId: appointment._id,
          });
          await Appointment.findByIdAndUpdate(appointment._id, {
            isDeleted: true,
            status: 'cancelled',
            cancelReason: 'Booking failed - rolled back',
          });
        },
      });

      return appointment;
    } catch (error) {
      logger.error('Appointment creation failed:', error);
      throw error;
    }
  }

  /**
   * Create appointment event (Event Sourcing)
   */
  async createAppointmentEvent(appointment, eventType, user) {
    try {
      await AppointmentEvent.createEvent({
        aggregateId: appointment._id.toString(),
        aggregateType: 'Appointment',
        eventType,
        eventData: {
          appointmentNumber: appointment.appointmentNumber,
          userId: appointment.userId,
          doctorId: appointment.doctorId,
          date: appointment.date,
          startTime: appointment.startTime,
          endTime: appointment.endTime,
          status: appointment.status,
          reason: appointment.reason,
        },
        metadata: {
          userId: user.userId,
          userName: `${user.firstName} ${user.lastName}`,
          userRole: user.role,
        },
        tenantId: user.tenantId,
      });

      logger.info('Appointment event created', {
        appointmentId: appointment._id,
        eventType,
      });
    } catch (error) {
      logger.error('Failed to create appointment event:', error);
      // Don't throw - event sourcing failure shouldn't break booking
    }
  }

  /**
   * Update read view (CQRS)
   */
  async updateReadView(appointment) {
    try {
      await AppointmentReadView.updateFromAppointment(appointment);

      logger.info('Read view updated', {
        appointmentId: appointment._id,
      });
    } catch (error) {
      logger.error('Failed to update read view:', error);
      // Don't throw - read view can be rebuilt
    }
  }

  /**
   * Publish appointment events (Outbox Pattern)
   */
  async publishAppointmentEvents(appointment, eventType) {
    try {
      await publishEvent(eventType, {
        appointmentId: appointment._id.toString(),
        appointmentNumber: appointment.appointmentNumber,
        userId: appointment.userId,
        doctorId: appointment.doctorId,
        date: appointment.date,
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        status: appointment.status,
        tenantId: appointment.tenantId,
      });

      logger.info('Appointment events published', {
        appointmentId: appointment._id,
        eventType,
      });
    } catch (error) {
      logger.error('Failed to publish appointment events:', error);
      // Don't throw - events will be published by outbox processor
    }
  }

  /**
   * Send notifications (non-critical)
   */
  async sendNotifications(appointment, action, authToken) {
    try {
      const notificationData = {
        appointmentId: appointment._id.toString(),
        appointmentNumber: appointment.appointmentNumber,
        patientEmail: appointment.patientEmail,
        doctorName: appointment.doctorName,
        date: appointment.date,
        startTime: appointment.startTime,
      };

      if (action === 'created') {
        await notificationService.sendAppointmentConfirmation.fire(
          notificationData,
          authToken
        );
      } else if (action === 'cancelled') {
        await notificationService.sendCancellationNotification.fire(
          notificationData,
          authToken
        );
      }

      logger.info('Notification sent', {
        appointmentId: appointment._id,
        action,
      });
    } catch (error) {
      logger.warn('Failed to send notification:', error);
      // Don't throw - notification failure shouldn't break booking
    }
  }

  /**
   * Execute compensations in reverse order
   */
  async executeCompensations(sagaId) {
    logger.info('Executing compensations', {
      sagaId,
      count: this.compensations.length,
    });

    const failedCompensations = [];

    // Execute in reverse order (LIFO)
    for (let i = this.compensations.length - 1; i >= 0; i--) {
      const compensation = this.compensations[i];
      
      try {
        await compensation.execute();
        logger.info('Compensation executed successfully', {
          name: compensation.name,
        });
      } catch (error) {
        logger.error('Compensation failed', {
          name: compensation.name,
          error: error.message,
        });
        failedCompensations.push(compensation.name);
      }
    }

    if (failedCompensations.length > 0) {
      logger.error('Some compensations failed', {
        sagaId,
        failedCompensations,
      });
    }

    return failedCompensations;
  }
}

module.exports = SagaOrchestrator;
