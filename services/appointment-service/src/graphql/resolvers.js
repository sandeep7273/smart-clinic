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
const { app } = require('../../../../api-gateway/src/config');

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
     * Get patient appointments
     */
    patientAppointments: async (_, { patientId, status,  first }, context) => {
      try {
        requireAuthentication(context);
        
        // Check if user can access patient's appointments
        if (!canAccessPatientData(patientId, context.user)) {
          throw new ForbiddenError('Access denied to patient appointments');
        }

        if(!canAccessAppointment({ patientId }, context.user)) {
          throw new ForbiddenError('Access denied to appointments');
        }
        
        // Handle status - convert array to MongoDB query format
        let statusFilter = {};
        if (status && status.length > 0) {
          // Convert GraphQL enum values back to database values
          const dbStatuses = status.map(s => {
            const statusMap = {
              'PENDING': 'pending',
              'CONFIRMED': 'confirmed',
              'CANCELLED': 'cancelled',
              'COMPLETED': 'completed',
              'NO_SHOW': 'no_show',
            };
            return statusMap[s] || s.toLowerCase();
          });
          statusFilter = { status: { $in: dbStatuses } };
        }
        
        const filter = {
          userId: patientId,
          ...statusFilter,
        };
         
        const appointments = await AppointmentReadView.search(filter)

          // .limit(first || 20)
          // .sort({ date: -1, startTime: -1 });
        
        // const total = await AppointmentReadView.countDocuments(filter);
        
        return {
          edges: appointments.data.map((apt) => ({
            cursor: apt._id.toString(),
            node: {
              id: apt._id.toString(),
              patientId: apt.patient.id,
              doctorId: apt.doctor.id,
              slotId: apt.slotId || 'unknown',
              title: `Appointment with Dr. ${apt.doctor.name}`,
              description: apt.reason,
              type: 'CONSULTATION',
              status: mapStatusToGraphQL(apt.status),
              date: apt.date,
              doctor: apt.doctor,
              appointmentNumber: apt.appointmentNumber,
              startTime: apt.startTime,
              endTime: apt.endTime,
              reason: apt.reason,
              symptoms: apt.symptoms,
              duration: apt.duration,
              isVirtual: false,
              notes: apt.notes,
              tags: [],
              createdAt: apt.createdAt,
              updatedAt: apt.updatedAt,
              bookedAt: apt.createdAt,
            }
          })),
          pageInfo: {
            hasNextPage: appointments.data.length === (first || 20),
            hasPreviousPage: false,
            startCursor: appointments.data.length > 0 ? appointments.data[0]._id.toString() : null,
            endCursor: appointments.data.length > 0 ? appointments.data[appointments.data.length - 1]._id.toString() : null
          },
          totalCount: appointments.pagination.total
        };
      } catch (error) {
        logger.error('Error fetching patient appointments via GraphQL:', { patientId, error: error.message });
        throw error;
      }
    },

  },

  Mutation: {
    /**
     * Book new appointment (SAGA pattern)
     */
    bookAppointment: async (_, { input }, context) => {
      try {
        requireAuthentication(context);
        
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
          endTime: result.appointment.endTime || '',
          duration: result.appointment.duration || 30,
          notes: result.appointment.notes || '',
          appointmentNumber: result.appointment.appointmentNumber || '',
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
          sagaId: result.sagaId || null
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


module.exports = resolvers;