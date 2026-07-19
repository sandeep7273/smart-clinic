/**
 * Appointment Types
 */

export interface Appointment {
  id: string;
  appointmentNumber: string;
  userId: string;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  doctorId: string;
  doctor: {
    id: string;
    name: string;
    specialization: string[];
  };
  title: string;
  doctorSpecialization: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  reason: string;
  notes?: string;
  symptoms?: string[];
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
