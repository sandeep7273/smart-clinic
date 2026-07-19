/**
 * Jest Test Setup - AI Service
 */

process.env.NODE_ENV = 'test';
process.env.PORT = '4004';
process.env.GRPC_PORT = '50054';
process.env.GROQ_API_KEY = 'test-groq-api-key';
process.env.REDIS_URL = 'redis://localhost:6379';

jest.setTimeout(30000);

global.testUtils = {
  mockChatMessage: {
    userId: 'user-123',
    message: 'I need to book an appointment with a cardiologist',
    sessionId: 'session-456',
  },

  mockIntent: {
    intent: 'book_appointment',
    confidence: 0.95,
    entities: {
      specialization: 'cardiology',
    },
  },

  mockContext: {
    userId: 'user-123',
    sessionId: 'session-456',
    history: [],
  },
};

const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleLog = console.log;

beforeAll(() => {
  console.error = jest.fn();
  console.warn = jest.fn();
  console.log = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
  console.log = originalConsoleLog;
});

afterEach(() => {
  jest.clearAllMocks();
});
