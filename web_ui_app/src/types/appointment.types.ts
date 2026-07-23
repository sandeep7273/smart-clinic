/**
 * Appointment Types – mirrors mobile app
 */

export interface Appointment {
  id: string;
  appointmentNumber: string;
  patientId: string;
  doctorId: string;
  doctor: {
    id: string;
    name?: string;
    specialization?: string;
    firstName: string;
    lastName: string;
    specializations: string[];
  };
  title?: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  status:
    | "PENDING"
    | "SCHEDULED"
    | "CONFIRMED"
    | "IN_PROGRESS"
    | "COMPLETED"
    | "CANCELLED"
    | "NO_SHOW"
    | "RESCHEDULED";
  reason: string;
  notes?: string;
  cancelReason?: string;
  cancelledAt?: string;
  confirmedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BookAppointmentRequest {
  userId: string;
  doctorId: string;
  date: string;
  startTime: string;
  endTime: string;
  duration?: number;
  reason: string;
  notes?: string;
  symptoms?: string[];
}

export interface TimeSlot {
  startTime: string;
  endTime: string;
  available: boolean;
  duration?: number;
}

export interface AppointmentListResponse {
  success: boolean;
  data: Appointment[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface AppointmentDetailResponse {
  success: boolean;
  data: Appointment;
}
