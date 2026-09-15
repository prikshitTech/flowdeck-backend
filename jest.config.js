export default {
  testEnvironment: 'node',
  transform: {},
  testTimeout: 60000,
  globalSetup: '<rootDir>/tests/setup/globalSetup.js',
  globalTeardown: '<rootDir>/tests/setup/globalTeardown.js',
  setupFilesAfterEnv: ['<rootDir>/tests/setup/testEnvironment.js'],
  collectCoverageFrom: ['src/**/*.js', '!src/server.js', '!src/config/logger.js'],
  coverageReporters: ['text-summary', 'lcov'],
  coverageThreshold: {
    global: { statements: 60, branches: 50, functions: 60, lines: 60 }
  }
};
