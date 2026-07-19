/**
 * Jest Test Setup - Appointment Service
 */

process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = process.env.MONGO_URL || 'mongodb://localhost:27017/test_appointment';
process.env.PORT = '4003';
process.env.GRPC_PORT = '50053';

jest.setTimeout(30000);

global.testUtils = {
  mockAppointment: {
    patientId: 'patient-123',
    doctorId: 'doctor-456',
    date: '2024-03-20',
    startTime: '10:00',
    endTime: '10:30',
    type: 'consultation',
    status: 'scheduled',
    reason: 'Regular checkup',
  },

  mockPatient: {
    id: 'patient-123',
    name: 'Jane Smith',
    email: 'jane@example.com',
    phone: '+1234567890',
  },

  mockDoctor: {
    id: 'doctor-456',
    name: 'Dr. John Doe',
    specialization: 'Cardiology',
    consultationFee: 500,
  },
};

const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

afterEach(() => {
  jest.clearAllMocks();
});
