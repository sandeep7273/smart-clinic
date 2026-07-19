/**
 * Appointment API Service
 * All API calls related to appointment operations via GraphQL through API Gateway
 */

import { 
  bookAppointmentGraphQL, 
  getPatientAppointmentsGraphQL,
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
