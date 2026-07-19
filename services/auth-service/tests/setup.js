/**
 * Jest Test Setup
 * Global configuration for all tests
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.JWT_EXPIRES_IN = '15m';
process.env.REFRESH_TOKEN_EXPIRES_IN = '7d';
process.env.MONGODB_URI = process.env.MONGO_URL || 'mongodb://localhost:27017/test_auth';
process.env.PORT = '4001';

// Increase timeout for database operations
jest.setTimeout(30000);

// Global test utilities
global.testUtils = {
  // Mock user data
  mockUser: {
    email: 'test@example.com',
    password: 'Test@123456',
    firstName: 'Test',
    lastName: 'User',
    phoneNumber: '+1234567890',
    dateOfBirth: '1990-01-01',
    role: 'patient',
  },

  mockDoctor: {
    email: 'doctor@example.com',
    password: 'Doctor@123456',
    firstName: 'Dr. John',
    lastName: 'Doe',
    phoneNumber: '+1234567891',
    role: 'doctor',
  },

  mockAdmin: {
    email: 'admin@example.com',
    password: 'Admin@123456',
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin',
  },
};

// Console suppression for cleaner test output
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  // Suppress console.error and console.warn during tests
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterAll(() => {
  // Restore console methods
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});
