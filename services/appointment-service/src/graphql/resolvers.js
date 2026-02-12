/**
 * GraphQL Resolvers for Appointment Service
 * Implements SAGA pattern, CQRS, and Event Sourcing architecture
 */

const { AuthenticationError, ForbiddenError, UserInputError } = require('apollo-server-express');
const { publishAppointmentEvent } = require('../kafka');
const logger = require('../utils/logger');
const SagaOrchestrator = require('../services/sagaOrchestrator');
const { Appointment } = require('../models/Appointment');
const { AppointmentReadView } = require('../models/AppointmentReadView');
const { AppointmentEvent } = require('../models/AppointmentEvent');

/**
 * Map database status values to GraphQL enum values
 */
const mapStatusToGraphQL = (status) => {
  if (!status) {
    logger.warn('Status is null/undefined, defaulting to PENDING');
    return 'PENDING';
  }
  
  const statusMap = {
    'pending': 'PENDING',
    'confirmed': 'CONFIRMED',
    'cancelled': 'CANCELLED',
    'completed': 'COMPLETED',
    'no_show': 'NO_SHOW',
  };
  
  const mappedStatus = statusMap[status.toLowerCase()] || status.toUpperCase();
  logger.debug('Mapped status:', { input: status, output: mappedStatus });
  return mappedStatus;
};

const resolvers = {
  // Scalar resolvers
  DateTime: require('graphql-scalars').GraphQLDateTime,
  JSON: require('graphql-scalars').GraphQLJSON,

  // Root resolvers
  Query: {
    /**
     * Get single appointment by ID
     */
    appointment: async (_, { id }, context) => {
      try {
        logger.debug('Fetching appointment via GraphQL:', { id, userId: context.user?.userId });
        
        const appointment = await AppointmentReadView.findById(id);
        
        // Check authorization
        if (!appointment) {
          return null;
        }
        
        if (!canAccessAppointment(appointment, context.user)) {
          throw new ForbiddenError('Access denied to this appointment');
        }
        
        // Map to GraphQL schema
        return {
          id: appointment._id.toString(),
          patientId: appointment.userId,
          doctorId: appointment.doctorId,
          slotId: appointment.slotId,
          title: `Appointment with Dr. ${appointment.doctorName}`,
          description: appointment.reason,
          type: 'CONSULTATION',
          status: mapStatusToGraphQL(appointment.status),
          date: appointment.date,
          startTime: appointment.startTime,
          duration: appointment.duration,
          timeZone: 'UTC',
          location: null,
          isVirtual: false,
          fee: appointment.consultationFee || 0,
          paymentStatus: 'PENDING',
          notes: appointment.notes,
          tags: [],
          createdAt: appointment.createdAt,
          updatedAt: appointment.updatedAt,
          bookedAt: appointment.createdAt
        };
      } catch (error) {
        logger.error('Error fetching appointment via GraphQL:', { id, error: error.message });
        throw error;
      }
    },

    /**
     * Get patient appointments
     */
    patientAppointments: async (_, { patientId, status, dateFrom, dateTo, first, after }, context) => {
      try {
        requireAuthentication(context);
        
        // Check if user can access patient's appointments
        if (!canAccessPatientData(patientId, context.user)) {
          throw new ForbiddenError('Access denied to patient appointments');
        }
        
        const filter = {
          userId: patientId,
          ...(status && { status }),
          ...(dateFrom && { date: { $gte: dateFrom } }),
          ...(dateTo && { date: { ...filter.date, $lte: dateTo } })
        };
        
        const appointments = await AppointmentReadView.find(filter)
          .limit(first || 20)
          .sort({ date: -1, startTime: -1 });
        
        const total = await AppointmentReadView.countDocuments(filter);
        
        return {
          edges: appointments.map((apt) => ({
            cursor: apt._id.toString(),
            node: {
              id: apt._id.toString(),
              patientId: apt.userId,
              doctorId: apt.doctorId,
              slotId: apt.slotId,
              title: `Appointment with Dr. ${apt.doctorName}`,
              description: apt.reason,
              type: 'CONSULTATION',
              status: mapStatusToGraphQL(apt.status),
              date: apt.date,
              startTime: apt.startTime,
              duration: apt.duration,
              timeZone: 'UTC',
              location: null,
              isVirtual: false,
              fee: apt.consultationFee || 0,
              paymentStatus: 'PENDING',
              notes: apt.notes,
              tags: [],
              createdAt: apt.createdAt,
              updatedAt: apt.updatedAt,
              bookedAt: apt.createdAt
            }
          })),
          pageInfo: {
            hasNextPage: appointments.length === (first || 20),
            hasPreviousPage: false,
            startCursor: appointments.length > 0 ? appointments[0]._id.toString() : null,
            endCursor: appointments.length > 0 ? appointments[appointments.length - 1]._id.toString() : null
          },
          totalCount: total
        };
      } catch (error) {
        logger.error('Error fetching patient appointments via GraphQL:', { patientId, error: error.message });
        throw error;
      }
    },

    /**
     * Get doctor appointments
     */
    doctorAppointments: async (_, { doctorId, status, dateFrom, dateTo, first, after }, context) => {
      try {
        requireAuthentication(context);
        
        // Check if user can access doctor's appointments
        if (!canAccessDoctorData(doctorId, context.user)) {
          throw new ForbiddenError('Access denied to doctor appointments');
        }
        
        const filter = {
          doctorId,
          ...(status && { status }),
          ...(dateFrom && { dateFrom }),
          ...(dateTo && { dateTo })
        };
        
        return await appointmentService.getDoctorAppointments(
          doctorId,
          filter,
          { first: first || 20, after }
        );
      } catch (error) {
        logger.error('Error fetching doctor appointments:', { doctorId, error: error.message });
        throw error;
      }
    },

    /**
     * Get today's appointments
     */
    todayAppointments: async (_, { doctorId, status }, context) => {
      try {
        requireAuthentication(context);
        
        if (doctorId && !canAccessDoctorData(doctorId, context.user)) {
          throw new ForbiddenError('Access denied to doctor appointments');
        }
        
        return await appointmentService.getTodayAppointments(doctorId, status);
      } catch (error) {
        logger.error('Error fetching today appointments:', { doctorId, error: error.message });
        throw error;
      }
    },

    /**
     * Get upcoming appointments
     */
    upcomingAppointments: async (_, { patientId, doctorId, days }, context) => {
      try {
        requireAuthentication(context);
        
        if (patientId && !canAccessPatientData(patientId, context.user)) {
          throw new ForbiddenError('Access denied to patient appointments');
        }
        
        if (doctorId && !canAccessDoctorData(doctorId, context.user)) {
          throw new ForbiddenError('Access denied to doctor appointments');
        }
        
        return await appointmentService.getUpcomingAppointments(
          { patientId, doctorId },
          days || 7
        );
      } catch (error) {
        logger.error('Error fetching upcoming appointments:', { patientId, doctorId, error: error.message });
        throw error;
      }
    },

    /**
     * Get appointment events (Event Sourcing)
     */
    appointmentEvents: async (_, { appointmentId, eventType, fromVersion }, context) => {
      try {
        requireAuthentication(context);
        
        // Check if user can access appointment events
        const appointment = await appointmentService.getAppointment(appointmentId);
        if (!appointment || !canAccessAppointment(appointment, context.user)) {
          throw new ForbiddenError('Access denied to appointment events');
        }
        
        return await appointmentService.getAppointmentEvents(
          appointmentId,
          eventType,
          fromVersion
        );
      } catch (error) {
        logger.error('Error fetching appointment events:', { appointmentId, error: error.message });
        throw error;
      }
    },

    /**
     * Get appointment saga
     */
    appointmentSaga: async (_, { sagaId }, context) => {
      try {
        requireAuthentication(context);
        requireRole(context.user, ['admin', 'doctor']);
        
        return await appointmentService.getAppointmentSaga(sagaId);
      } catch (error) {
        logger.error('Error fetching appointment saga:', { sagaId, error: error.message });
        throw error;
      }
    },

    /**
     * Get appointment sagas
     */
    appointmentSagas: async (_, { appointmentId, status, first, after }, context) => {
      try {
        requireAuthentication(context);
        requireRole(context.user, ['admin', 'doctor']);
        
        return await appointmentService.getAppointmentSagas(
          { appointmentId, status },
          { first: first || 20, after }
        );
      } catch (error) {
        logger.error('Error fetching appointment sagas:', { appointmentId, error: error.message });
        throw error;
      }
    },

    /**
     * Get appointment statistics
     */
    appointmentStats: async (_, { patientId, doctorId, dateFrom, dateTo }, context) => {
      try {
        requireAuthentication(context);
        
        if (patientId && !canAccessPatientData(patientId, context.user)) {
          throw new ForbiddenError('Access denied to patient statistics');
        }
        
        if (doctorId && !canAccessDoctorData(doctorId, context.user)) {
          throw new ForbiddenError('Access denied to doctor statistics');
        }
        
        return await appointmentService.getAppointmentStats({
          patientId,
          doctorId,
          dateFrom,
          dateTo
        });
      } catch (error) {
        logger.error('Error fetching appointment stats:', { patientId, doctorId, error: error.message });
        throw error;
      }
    },

    /**
     * Search appointments
     */
    searchAppointments: async (_, { query, filters, first, after }, context) => {
      try {
        requireAuthentication(context);
        
        // Apply user-based filtering for non-admin users
        const userFilter = applyUserFilter(filters, context.user);
        
        return await appointmentService.searchAppointments(
          query,
          userFilter,
          { first: first || 20, after }
        );
      } catch (error) {
        logger.error('Error searching appointments:', { query, error: error.message });
        throw error;
      }
    }
  },

  Mutation: {
    /**
     * Book new appointment (SAGA pattern)
     */
    bookAppointment: async (_, { input }, context) => {
      try {
        // requireAuthentication(context);
        
        logger.info('Booking appointment via GraphQL:', {
          input,
          patientId: context.user.userId,
          correlationId: context.correlationId
        });
        
        // Initialize saga orchestrator
        const sagaOrchestrator = new SagaOrchestrator();
        
        // Map GraphQL input to booking data format
        const bookingData = {
          userId: context.user.userId,
          doctorId: input.doctorId,
          date: input.date,
          startTime: input.startTime,
          endTime: input.endTime,
          duration: input.duration || 30,
          reason: input.reason || input.description,
          notes: input.notes,
          symptoms: input.symptoms,
          patientDetails: input.patientDetails // Optional - system can use authenticated user data if not provided
        };

        
        // Execute booking through SAGA
        const result = await sagaOrchestrator.bookAppointment(
          bookingData,
          context.user,   /// need to check user
          context.token
        );
        
        logger.info('SAGA booking result:', {
          hasAppointment: !!result.appointment,
          appointmentStatus: result.appointment?.status,
          appointmentId: result.appointment?._id
        });
        
        // Validate the result
        if (!result.appointment) {
          throw new Error('Appointment creation failed - no appointment returned from saga');
        }
        
        // Ensure status has a valid value
        const appointmentStatus = result.appointment.status || 'pending';
        const mappedStatus = mapStatusToGraphQL(appointmentStatus);
        
        logger.info('Status mapping:', {
          originalStatus: appointmentStatus,
          mappedStatus: mappedStatus
        });
        
        const appointmentResponse = {
          id: result.appointment._id?.toString() || '',
          patientId: result.appointment.userId || '',
          doctorId: result.appointment.doctorId || '',
          slotId: result.slotReservation?.slotId || 'unknown',
          title: `Appointment with Dr. ${result.appointment.doctorName || 'Unknown'}`,
          description: result.appointment.reason || '',
          status: mappedStatus,
          date: result.appointment.date || new Date().toISOString(),
          startTime: result.appointment.startTime || '',
          duration: result.appointment.duration || 30,
          notes: result.appointment.notes || '',
          createdAt: result.appointment.createdAt || new Date(),
          bookedAt: result.appointment.createdAt || new Date()
        };
        
        logger.info('Appointment response constructed:', {
          id: appointmentResponse.id,
          status: appointmentResponse.status
        });
        
        return {
          success: true,
          message: 'Appointment booked successfully',
          appointment: appointmentResponse,
          sagaId: result.appointment.sagaId || null
        };
      } catch (error) {
        logger.error('Error booking appointment via GraphQL:', { 
          input, 
          error: error.message,
          stack: error.stack 
        });
        return {
          success: false,
          message: error.message || 'Failed to book appointment',
          errors: [{ message: error.message, code: 'BOOKING_FAILED' }]
        };
      }
    },

    /**
     * Confirm appointment
     */
    confirmAppointment: async (_, { appointmentId }, context) => {
      try {
        requireAuthentication(context);
        
        const appointment = await appointmentService.getAppointment(appointmentId);
        if (!appointment) {
          throw new UserInputError('Appointment not found');
        }
        
        if (!canModifyAppointment(appointment, context.user)) {
          throw new ForbiddenError('Cannot confirm this appointment');
        }
        
        logger.info('Confirming appointment:', {
          appointmentId,
          userId: context.user.userId,
          correlationId: context.correlationId
        });
        
        const result = await appointmentService.confirmAppointment(appointmentId, context);
        
        // Publish event
        if (result.success) {
          await publishAppointmentEvent('APPOINTMENT_CONFIRMED', {
            appointmentId,
            confirmedBy: context.user.userId
          }, context);
        }
        
        return result;
      } catch (error) {
        logger.error('Error confirming appointment:', { appointmentId, error: error.message });
        throw error;
      }
    },

    /**
     * Cancel appointment
     */
    cancelAppointment: async (_, { appointmentId, reason }, context) => {
      try {
        requireAuthentication(context);
        
        const appointment = await Appointment.findById(appointmentId);
        if (!appointment || appointment.isDeleted) {
          throw new UserInputError('Appointment not found');
        }
        
        if (!canCancelAppointment(appointment, context.user)) {
          throw new ForbiddenError('Cannot cancel this appointment');
        }
        
        if (!appointment.isCancellable()) {
          throw new UserInputError('Appointment cannot be cancelled at this time');
        }
        
        logger.info('Cancelling appointment via GraphQL:', {
          appointmentId,
          reason,
          userId: context.user.userId,
          correlationId: context.correlationId
        });
        
        appointment.status = 'cancelled';
        appointment.cancelReason = reason;
        appointment.cancelledAt = new Date();
        appointment.cancelledBy = context.user.userId;
        appointment.updatedBy = context.user.userId;
        
        await appointment.save();
        
        // Create event
        await AppointmentEvent.createEvent({
          aggregateId: appointment._id.toString(),
          aggregateType: 'Appointment',
          eventType: 'APPOINTMENT_CANCELLED',
          eventData: {
            cancelReason: reason,
          },
          metadata: {
            userId: context.user.userId,
            userRole: context.user.role,
          },
          tenantId: context.user.tenantId,
        });
        
        // Update read view
        await AppointmentReadView.updateFromAppointment(appointment);
        
        // Publish Kafka event
        try {
          await publishAppointmentEvent('APPOINTMENT_CANCELLED', {
            appointmentId: appointment._id.toString(),
            appointmentNumber: appointment.appointmentNumber,
            userId: appointment.userId,
            doctorId: appointment.doctorId,
            cancelReason: reason,
            cancelledBy: context.user.userId
          });
        } catch (kafkaError) {
          logger.warn('Failed to publish cancel event to Kafka:', kafkaError.message);
        }
        
        const readView = await AppointmentReadView.findOne({ appointmentId: appointment._id });
        
        return {
          success: true,
          message: 'Appointment cancelled successfully',
          appointment: readView ? {
            id: readView._id.toString(),
            patientId: readView.userId,
            doctorId: readView.doctorId,
            slotId: readView.slotId,
            title: `Appointment with Dr. ${readView.doctorName}`,
            description: readView.reason,
            type: 'CONSULTATION',
            status: mapStatusToGraphQL(readView.status),
            date: readView.date,
            startTime: readView.startTime,
            duration: readView.duration,
            timeZone: 'UTC',
            location: null,
            isVirtual: false,
            fee: readView.consultationFee || 0,
            paymentStatus: 'PENDING',
            notes: readView.notes,
            tags: [],
            createdAt: readView.createdAt,
            updatedAt: readView.updatedAt,
            bookedAt: readView.createdAt
          } : null
        };
      } catch (error) {
        logger.error('Error cancelling appointment via GraphQL:', { 
          appointmentId, 
          error: error.message 
        });
        return {
          success: false,
          message: error.message || 'Failed to cancel appointment',
          errors: [{ message: error.message, code: 'CANCELLATION_FAILED' }]
        };
      }
    },

    /**
     * Reschedule appointment
     */
    rescheduleAppointment: async (_, { input }, context) => {
      try {
        requireAuthentication(context);
        
        const appointment = await appointmentService.getAppointment(input.appointmentId);
        if (!appointment) {
          throw new UserInputError('Appointment not found');
        }
        
        if (!canModifyAppointment(appointment, context.user)) {
          throw new ForbiddenError('Cannot reschedule this appointment');
        }
        
        logger.info('Rescheduling appointment:', {
          input,
          userId: context.user.userId,
          correlationId: context.correlationId
        });
        
        const result = await appointmentService.rescheduleAppointment(input, context);
        
        // Publish event
        if (result.success) {
          await publishAppointmentEvent('APPOINTMENT_RESCHEDULED', {
            appointmentId: input.appointmentId,
            oldSlotId: appointment.slotId,
            newSlotId: input.newSlotId,
            reason: input.reason,
            rescheduledBy: context.user.userId
          }, context);
        }
        
        return result;
      } catch (error) {
        logger.error('Error rescheduling appointment:', { input, error: error.message });
        throw error;
      }
    },

    /**
     * Update appointment
     */
    updateAppointment: async (_, { input }, context) => {
      try {
        requireAuthentication(context);
        
        const appointment = await appointmentService.getAppointment(input.appointmentId);
        if (!appointment) {
          throw new UserInputError('Appointment not found');
        }
        
        if (!canModifyAppointment(appointment, context.user)) {
          throw new ForbiddenError('Cannot update this appointment');
        }
        
        logger.info('Updating appointment:', {
          input,
          userId: context.user.userId,
          correlationId: context.correlationId
        });
        
        const result = await appointmentService.updateAppointment(input, context);
        
        // Publish event
        if (result.success) {
          await publishAppointmentEvent('APPOINTMENT_UPDATED', {
            appointmentId: input.appointmentId,
            updatedFields: Object.keys(input).filter(key => key !== 'appointmentId'),
            updatedBy: context.user.userId
          }, context);
        }
        
        return result;
      } catch (error) {
        logger.error('Error updating appointment:', { input, error: error.message });
        throw error;
      }
    },

    /**
     * Start appointment
     */
    startAppointment: async (_, { appointmentId }, context) => {
      try {
        requireAuthentication(context);
        requireRole(context.user, ['doctor', 'admin']);
        
        const appointment = await appointmentService.getAppointment(appointmentId);
        if (!appointment) {
          throw new UserInputError('Appointment not found');
        }
        
        if (!canModifyAppointment(appointment, context.user)) {
          throw new ForbiddenError('Cannot start this appointment');
        }
        
        logger.info('Starting appointment:', {
          appointmentId,
          userId: context.user.userId,
          correlationId: context.correlationId
        });
        
        const result = await appointmentService.startAppointment(appointmentId, context);
        
        // Publish event
        if (result.success) {
          await publishAppointmentEvent('APPOINTMENT_STARTED', {
            appointmentId,
            startedBy: context.user.userId,
            startedAt: new Date().toISOString()
          }, context);
        }
        
        return result;
      } catch (error) {
        logger.error('Error starting appointment:', { appointmentId, error: error.message });
        throw error;
      }
    },

    /**
     * Complete appointment
     */
    completeAppointment: async (_, { appointmentId, notes, followUpRequired }, context) => {
      try {
        requireAuthentication(context);
        requireRole(context.user, ['doctor', 'admin']);
        
        const appointment = await appointmentService.getAppointment(appointmentId);
        if (!appointment) {
          throw new UserInputError('Appointment not found');
        }
        
        if (!canModifyAppointment(appointment, context.user)) {
          throw new ForbiddenError('Cannot complete this appointment');
        }
        
        logger.info('Completing appointment:', {
          appointmentId,
          notes,
          followUpRequired,
          userId: context.user.userId,
          correlationId: context.correlationId
        });
        
        const result = await appointmentService.completeAppointment(
          appointmentId,
          notes,
          followUpRequired,
          context
        );
        
        // Publish event
        if (result.success) {
          await publishAppointmentEvent('APPOINTMENT_COMPLETED', {
            appointmentId,
            completedBy: context.user.userId,
            completedAt: new Date().toISOString(),
            notes,
            followUpRequired
          }, context);
        }
        
        return result;
      } catch (error) {
        logger.error('Error completing appointment:', { appointmentId, error: error.message });
        throw error;
      }
    },

    /**
     * Mark appointment as no-show
     */
    markNoShow: async (_, { appointmentId }, context) => {
      try {
        requireAuthentication(context);
        requireRole(context.user, ['doctor', 'admin']);
        
        const appointment = await appointmentService.getAppointment(appointmentId);
        if (!appointment) {
          throw new UserInputError('Appointment not found');
        }
        
        if (!canModifyAppointment(appointment, context.user)) {
          throw new ForbiddenError('Cannot mark this appointment as no-show');
        }
        
        logger.info('Marking appointment as no-show:', {
          appointmentId,
          userId: context.user.userId,
          correlationId: context.correlationId
        });
        
        const result = await appointmentService.markNoShow(appointmentId, context);
        
        // Publish event
        if (result.success) {
          await publishAppointmentEvent('APPOINTMENT_NO_SHOW', {
            appointmentId,
            markedBy: context.user.userId,
            markedAt: new Date().toISOString()
          }, context);
        }
        
        return result;
      } catch (error) {
        logger.error('Error marking no-show:', { appointmentId, error: error.message });
        throw error;
      }
    }
  },

  // Subscriptions for real-time updates
  Subscription: {
    appointmentUpdated: {
      // Implementation would use a subscription mechanism like Redis PubSub
      subscribe: () => {
        // Mock implementation
        return null;
      }
    },

    appointmentStatusChanged: {
      subscribe: () => {
        // Mock implementation
        return null;
      }
    },

    patientAppointmentUpdates: {
      subscribe: () => {
        // Mock implementation
        return null;
      }
    },

    doctorAppointmentUpdates: {
      subscribe: () => {
        // Mock implementation  
        return null;
      }
    },

    sagaProgress: {
      subscribe: () => {
        // Mock implementation
        return null;
      }
    },

    appointmentReminders: {
      subscribe: () => {
        // Mock implementation
        return null;
      }
    },

    appointmentConflicts: {
      subscribe: () => {
        // Mock implementation
        return null;
      }
    }
  }
};

// Helper functions

function requireAuthentication(context) {
  if (!context.token) {
    throw new AuthenticationError('Authentication required');
  }
}

function requireRole(user, allowedRoles) {
  if (!user || !allowedRoles.includes(user.role)) {
    throw new ForbiddenError(`Access denied. Required roles: ${allowedRoles.join(', ')}`);
  }
}

function canAccessAppointment(appointment, user) {
  if (!user) return false;
  
  // Admin can access all appointments
  if (user.role === 'admin') return true;
  
  // Doctors can access their own appointments
  if (user.role === 'doctor' && appointment.doctorId === user.userId) return true;
  
  // Patients can access their own appointments
  if (user.role === 'patient' && appointment.patientId === user.userId) return true;
  
  return false;
}

function canAccessPatientData(patientId, user) {
  if (!user) return false;
  
  // Admin can access all patient data
  if (user.role === 'admin') return true;
  
  // Patient can access their own data
  if (user.role === 'patient' && patientId === user.userId) return true;
  
  // TODO: Add logic for doctors to access their patients' data
  
  return false;
}

function canAccessDoctorData(doctorId, user) {
  if (!user) return false;
  
  // Admin can access all doctor data
  if (user.role === 'admin') return true;
  
  // Doctor can access their own data
  if (user.role === 'doctor' && doctorId === user.userId) return true;
  
  return false;
}

function canBookForPatient(patientId, user) {
  if (!user) return false;
  
  // Admin can book for anyone
  if (user.role === 'admin') return true;
  
  // Patient can book for themselves
  if (user.role === 'patient' && patientId === user.userId) return true;
  
  // TODO: Add logic for caregivers, family members, etc.
  
  return false;
}

function canModifyAppointment(appointment, user) {
  if (!user) return false;
  
  // Admin can modify all appointments
  if (user.role === 'admin') return true;
  
  // Doctor can modify their appointments
  if (user.role === 'doctor' && appointment.doctorId === user.userId) return true;
  
  // Patient can modify their appointments (with restrictions)
  if (user.role === 'patient' && appointment.patientId === user.userId) {
    // Add business rules: e.g., can't modify within 24 hours, status restrictions
    return true;
  }
  
  return false;
}

function canCancelAppointment(appointment, user) {
  if (!user) return false;
  
  // Admin can cancel all appointments
  if (user.role === 'admin') return true;
  
  // Doctor can cancel their appointments
  if (user.role === 'doctor' && appointment.doctorId === user.userId) return true;
  
  // Patient can cancel their appointments (with restrictions)
  if (user.role === 'patient' && appointment.patientId === user.userId) {
    // Add business rules for cancellation policy
    return true;
  }
  
  return false;
}

function applyUserFilter(filter, user) {
  if (!user) return filter;
  
  // Admin sees all appointments
  if (user.role === 'admin') {
    return filter;
  }
  
  // Doctor sees only their appointments
  if (user.role === 'doctor') {
    return {
      ...filter,
      doctorId: user.userId
    };
  }
  
  // Patient sees only their appointments
  if (user.role === 'patient') {
    return {
      ...filter,
      patientId: user.userId
    };
  }
  
  return filter;
}

function validateBookingInput(input) {
  const errors = [];
  
  if (!input.patientId) {
    errors.push({ field: 'patientId', message: 'Patient ID is required', code: 'REQUIRED' });
  }
  
  if (!input.doctorId) {
    errors.push({ field: 'doctorId', message: 'Doctor ID is required', code: 'REQUIRED' });
  }
  
  if (errors.length > 0) {
    throw new UserInputError('Invalid input', { validationErrors: errors });
  }
}

module.exports = resolvers;