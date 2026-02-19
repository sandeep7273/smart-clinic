/**
 * Jest Test Setup - Doctor Service
 */

process.env.NODE_ENV = 'production';
process.env.MONGODB_URI = process.env.MONGO_URL || 'mongodb://localhost:27017/test_doctor';
process.env.PORT = '4002';
process.env.GRPC_PORT = '50052';

jest.setTimeout(30000);

global.testUtils = {
  mockDoctor: {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@hospital.com',
    phoneNumber: '+1234567890',
    specialization: 'Cardiology',
    qualifications: ['MBBS', 'MD'],
    experienceYears: 15,
    consultationFee: 500,
    availableSlots: [
      { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' }
    ],
  },

  mockSearchQuery: {
    specialization: 'Cardiology',
    location: 'New York',
    availableDate: '2024-03-20',
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
