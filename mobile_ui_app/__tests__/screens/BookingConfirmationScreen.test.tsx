/**
 * BookingConfirmationScreen Tests
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import BookingConfirmationScreen from '../../src/screens/BookingConfirmation/BookingConfirmationScreen';

// Mock navigation
const mockNavigate = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  goBack: jest.fn(),
  replace: jest.fn(),
  reset: jest.fn(),
  setOptions: jest.fn(),
};

// Mock appointment data
const mockAppointment = {
  id: 'apt-123',
  appointmentNumber: 'APT-2024-001',
  date: '2024-03-15',
  startTime: '09:00',
  endTime: '09:30',
  status: 'pending',
  reason: 'Regular checkup',
  symptoms: ['Fever', 'Cough'],
  createdAt: '2024-03-01T10:00:00Z',
  doctor: {
    id: '1',
    name: 'Sarah Johnson',
  },
};

// Mock doctor data
const mockDoctor = {
  id: '1',
  firstName: 'Sarah',
  lastName: 'Johnson',
  specializations: ['Cardiology'],
  rating: 4.8,
  reviewCount: 120,
  address: {
    street: '123 Main St',
    city: 'Boston',
    state: 'MA',
    zipCode: '02101',
  },
  phone: '+1234567890',
  email: 'sarah@example.com',
};

describe('BookingConfirmationScreen', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  const renderBookingConfirmationScreen = () => {
    return render(
      <BookingConfirmationScreen
        navigation={mockNavigation as any}
        route={{ params: { appointment: mockAppointment, doctor: mockDoctor } } as any}
      />
    );
  };

  it('should render confirmation screen correctly', () => {
    const { getByText } = renderBookingConfirmationScreen();

    expect(getByText('Booking Confirmed')).toBeTruthy();
    expect(getByText(/successfully booked/i)).toBeTruthy();
  });

  it('should display success checkmark', () => {
    const { getByText } = renderBookingConfirmationScreen();

    expect(getByText('✓')).toBeTruthy();
  });

  it('should display appointment number', () => {
    const { getByText } = renderBookingConfirmationScreen();

    expect(getByText('APT-2024-001')).toBeTruthy();
  });

  it('should display appointment date and time', () => {
    const { getByText } = renderBookingConfirmationScreen();

    expect(getByText(/09:00 - 09:30/)).toBeTruthy();
  });

  it('should display appointment status', () => {
    const { getByText } = renderBookingConfirmationScreen();

    expect(getByText('PENDING')).toBeTruthy();
  });

  it('should display doctor information', () => {
    const { getByText } = renderBookingConfirmationScreen();

    expect(getByText('Dr. Sarah Johnson')).toBeTruthy();
    expect(getByText('Cardiology')).toBeTruthy();
  });

  it('should display doctor contact information', () => {
    const { getByText } = renderBookingConfirmationScreen();

    expect(getByText('+1234567890')).toBeTruthy();
    expect(getByText('sarah@example.com')).toBeTruthy();
  });

  it('should display clinic address', () => {
    const { getByText } = renderBookingConfirmationScreen();

    expect(getByText('123 Main St')).toBeTruthy();
    expect(getByText('Boston, MA 02101')).toBeTruthy();
  });

  it('should display reason for visit', () => {
    const { getByText } = renderBookingConfirmationScreen();

    expect(getByText('Regular checkup')).toBeTruthy();
  });

  it('should display selected symptoms', () => {
    const { getByText } = renderBookingConfirmationScreen();

    expect(getByText('Fever')).toBeTruthy();
    expect(getByText('Cough')).toBeTruthy();
  });

  it('should display important notes', () => {
    const { getByText } = renderBookingConfirmationScreen();

    expect(getByText(/arrive 10 minutes before/i)).toBeTruthy();
    expect(getByText(/ID and insurance card/i)).toBeTruthy();
    expect(getByText(/cancel or reschedule/i)).toBeTruthy();
  });

  it('should navigate to AppointmentList when clicking View My Bookings', () => {
    const { getByText } = renderBookingConfirmationScreen();

    const viewBookingsButton = getByText('View My Bookings');
    fireEvent.press(viewBookingsButton);

    expect(mockNavigate).toHaveBeenCalledWith('AppointmentList');
  });

  it('should navigate back to DoctorList when clicking back button', () => {
    const { getByText } = renderBookingConfirmationScreen();

    const backButton = getByText('←');
    fireEvent.press(backButton);

    expect(mockNavigate).toHaveBeenCalledWith('DoctorList');
  });

  it('should match snapshot', () => {
    const tree = renderBookingConfirmationScreen();
    expect(tree).toMatchSnapshot();
  });
});
