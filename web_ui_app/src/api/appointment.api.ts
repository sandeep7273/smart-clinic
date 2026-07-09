/**
 * Appointment API Service
 */

import {
  bookAppointmentGraphQL,
  getPatientAppointmentsGraphQL,
} from "./graphql.client";
import { authEvents } from "../utils/authEvents";

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
    if (result.success) {
      return {
        success: true,
        // appointment may be null when booking uses async saga – use known data as fallback
        data: result.appointment ?? {
          id: result.sagaId,
          appointmentNumber: result.sagaId,
          patientId: appointmentData.userId,
          doctorId: appointmentData.doctorId,
          date: appointmentData.date,
          startTime: appointmentData.startTime,
          endTime: appointmentData.endTime,
          status: "PENDING",
        },
        message: result.message,
      };
    }
    throw new Error(result.message || "Failed to book appointment");
  } catch (error: any) {
    if (error.response?.status === 401) authEvents.emitAuthError();
    throw new Error(
      error.response?.data?.message ||
        error.message ||
        "Failed to book appointment",
    );
  }
};

export const getPatientAppointments = async (
  patientId: string,
  status?: string,
  limit?: number,
) => {
  try {
    const result = await getPatientAppointmentsGraphQL(
      patientId,
      status,
      limit, // maps to `first` in the query
    );
    return {
      success: true,
      data: result.edges.map((edge: any) => edge.node),
      pagination: {
        total: result.totalCount,
        hasNextPage: result.pageInfo.hasNextPage,
        hasPreviousPage: result.pageInfo.hasPreviousPage,
      },
    };
  } catch (error: any) {
    if (error.response?.status === 401) authEvents.emitAuthError();
    throw new Error(
      error.response?.data?.message ||
        error.message ||
        "Failed to get appointments",
    );
  }
};
