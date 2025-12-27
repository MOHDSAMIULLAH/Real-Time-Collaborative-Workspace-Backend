module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  setupFiles: ['<rootDir>/jest.setup.js'],
  globalTeardown: '<rootDir>/jest.teardown.js',
  maxWorkers: 1, // Run tests sequentially to avoid rate limiting
  testTimeout: 30000, // 30 second timeout for slow tests
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
    '!src/server.ts',
    '!src/**/*.interface.ts',
    '!src/**/*.type.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 54,
      functions: 58,
      lines: 66,
      statements: 66,
    },
  },
  coverageDirectory: 'coverage',
  moduleFileExtensions: ['ts', 'js', 'json'],
  verbose: true,
};
