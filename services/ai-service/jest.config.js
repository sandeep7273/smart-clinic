module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js',
    '!src/config/**',
    '!src/graphql/index.js',
    '!src/scripts/**',
    '!**/node_modules/**',
  ],
  coverageThreshold: {
    global: {
      branches: 65,
      functions: 65,
      lines: 65,
      statements: 65,
    },
  },
  coverageDirectory: 'coverage',
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js',
  ],
  moduleDirectories: ['node_modules', 'src'],
  verbose: true,
  testTimeout: 15000,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
};
