/**
 * Appointment API Service
 * All API calls related to appointment operations via GraphQL through API Gateway
 */

import { 
  bookAppointmentGraphQL, 
  getPatientAppointmentsGraphQL,
  getAppointmentByIdGraphQL,
  cancelAppointmentGraphQL 
} from './graphql.client';
import { authEvents } from '../utils/authEvents';

/**
 * Book an appointment via GraphQL
 */
export const bookAppointment = async (appointmentData: {
  userId: string;
  doctorId: string;
  date: string;
  startTime: string;
  endTime: string;
  duration?: number;
  reason: string;
  notes?: string;
  symptoms?: string[];
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  dateOfBirth?: string;
}) => {
  try {
    const result = await bookAppointmentGraphQL(appointmentData);
    console.log("debugging book appointment result", result);
    if (result.success) {
      return {
        success: true,
        data: result.appointment,
        message: result.message
      };
    } else {
      throw new Error(result.message || 'Failed to book appointment');
    }
  } catch (error: any) {
    console.error('❌ Error booking appointment:', error);
    if (error.response?.status === 401) {
      authEvents.emitAuthError();
    }
    throw new Error(error.response?.data?.message || error.message || 'Failed to book appointment');
  }
};

/**
 * Get user's appointments via GraphQL
 */
export const getUserAppointments = async (params?: {
  status?: string;
  page?: number;
  limit?: number;
}) => {
  try {
    // Get userId from context/storage if needed
    // For now, we'll need to pass it from the calling component
    // This is a limitation that should be handled by the auth context
    throw new Error('getUserAppointments requires patientId - use getPatientAppointments directly');
  } catch (error: any) {
    console.error('❌ Error getting user appointments:', error);
    throw new Error(error.response?.data?.message || error.message || 'Failed to get appointments');
  }
};

/**
 * Get patient appointments via GraphQL
 */
export const getPatientAppointments = async (
  patientId: string,
  status?: string,
  limit?: number
) => {
  try {
    const result = await getPatientAppointmentsGraphQL(patientId, status, limit);
    
    return {
      success: true,
      data: result.edges.map((edge: any) => edge.node),
      pagination: {
        total: result.totalCount,
        hasNextPage: result.pageInfo.hasNextPage,
        hasPreviousPage: result.pageInfo.hasPreviousPage
      }
    };
  } catch (error: any) {
    console.error('❌ Error getting patient appointments:', error);
    if (error.response?.status === 401) {
      authEvents.emitAuthError();
    }
    throw new Error(error.response?.data?.message || error.message || 'Failed to get appointments');
  }
};

/**
 * Get appointment by ID via GraphQL
 */
export const getAppointmentById = async (appointmentId: string) => {
  try {
    const appointment = await getAppointmentByIdGraphQL(appointmentId);
    return {
      success: true,
      data: appointment
    };
  } catch (error: any) {
    console.error('❌ Error getting appointment by ID:', error);
    if (error.response?.status === 401) {
      authEvents.emitAuthError();
    }
    throw new Error(error.response?.data?.message || error.message || 'Failed to get appointment details');
  }
};

/**
 * Cancel appointment via GraphQL
 */
export const cancelAppointment = async (appointmentId: string, reason: string) => {
  try {
    const result = await cancelAppointmentGraphQL(appointmentId, reason);
    
    if (result.success) {
      return {
        success: true,
        data: result.appointment,
        message: result.message
      };
    } else {
      throw new Error(result.message || 'Failed to cancel appointment');
    }
  } catch (error: any) {
    console.error('❌ Error canceling appointment:', error);
    if (error.response?.status === 401) {
      authEvents.emitAuthError();
    }
    throw new Error(error.response?.data?.message || error.message || 'Failed to cancel appointment');
  }
};

/**
 * Reschedule appointment
 * TODO: Implement GraphQL mutation for reschedule
 */
export const rescheduleAppointment = async (
  appointmentId: string,
  newDate: string,
  newStartTime: string,
  newEndTime: string
) => {
  try {
    // TODO: Implement GraphQL reschedule mutation
    throw new Error('Reschedule via GraphQL not yet implemented');
  } catch (error: any) {
    console.error('❌ Error rescheduling appointment:', error);
    throw new Error(error.response?.data?.message || error.message || 'Failed to reschedule appointment');
  }
};
