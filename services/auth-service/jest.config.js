module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js',
    '!src/app.js',
    '!src/config/**',
    '!**/node_modules/**',
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },

  // Coverage directory
  coverageDirectory: 'coverage',

  // Test match patterns
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js',
  ],

  // Module paths
  moduleDirectories: ['node_modules', 'src'],

  // Transform
  transform: {},

  // Verbose
  verbose: true,

  // Test timeout
  testTimeout: 10000,

  // Clear mocks
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // MongoDB preset
  preset: '@shelf/jest-mongodb',
};
