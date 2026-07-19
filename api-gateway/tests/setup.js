/**
 * Jest Test Setup - API Gateway
 */

process.env.NODE_ENV = 'test';
process.env.PORT = '3000';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.AUTH_SERVICE_URL = 'http://localhost:4001';
process.env.DOCTOR_SERVICE_URL = 'http://localhost:4002';
process.env.APPOINTMENT_SERVICE_URL = 'http://localhost:4003';
process.env.AI_SERVICE_URL = 'http://localhost:4004';

jest.setTimeout(30000);

global.testUtils = {
  mockToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.token',
  
  mockUser: {
    userId: 'user-123',
    email: 'test@example.com',
    role: 'patient',
  },

  mockAuthHeader: function() {
    return { Authorization: `Bearer ${this.mockToken}` };
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
