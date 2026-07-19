/**
 * Navigation Types
 * Type definitions for all navigation routes and params
 */

import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Doctor } from '../types/doctor.types';
import { Appointment } from '../types/appointment.types';

/**
 * Auth Stack Param List
 * Routes available when user is not authenticated
 */
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

/**
 * Main Stack Param List
 * Routes available when user is authenticated
 */
export type MainStackParamList = {
  DoctorList: undefined;
  Dashboard: undefined;
  FindDoctor: undefined;
  AISearch: undefined;
  DoctorDetails: { doctorId: string };
  BookAppointment: { doctor: Doctor };
  BookingConfirmation: { appointment: Appointment; doctor: Doctor };
  AppointmentList: undefined;
  SelectSlot: { doctorId: string };
  Confirmation: { appointmentId: string };
};

/**
 * Root Stack Param List
 * Top-level navigation structure
 */
export type RootStackParamList = AuthStackParamList & MainStackParamList;

/**
 * Screen Props Types
 */
export type LoginScreenProps = NativeStackScreenProps<AuthStackParamList, 'Login'>;
export type RegisterScreenProps = NativeStackScreenProps<AuthStackParamList, 'Register'>;
export type ForgotPasswordScreenProps = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;
export type DoctorListScreenProps = NativeStackScreenProps<MainStackParamList, 'DoctorList'>;
export type DashboardScreenProps = NativeStackScreenProps<MainStackParamList, 'Dashboard'>;
export type FindDoctorScreenProps = NativeStackScreenProps<MainStackParamList, 'FindDoctor'>;
export type AISearchScreenProps = NativeStackScreenProps<MainStackParamList, 'AISearch'>;
export type DoctorDetailsScreenProps = NativeStackScreenProps<MainStackParamList, 'DoctorDetails'>;
export type BookAppointmentScreenProps = NativeStackScreenProps<MainStackParamList, 'BookAppointment'>;
export type BookingConfirmationScreenProps = NativeStackScreenProps<MainStackParamList, 'BookingConfirmation'>;
export type AppointmentListScreenProps = NativeStackScreenProps<MainStackParamList, 'AppointmentList'>;
export type SelectSlotScreenProps = NativeStackScreenProps<MainStackParamList, 'SelectSlot'>;
export type ConfirmationScreenProps = NativeStackScreenProps<MainStackParamList, 'Confirmation'>;

/**
 * Navigation Hook Types
 */
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
