import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
  testTimeout: 30000,
  collectCoverageFrom: ['tests/**/*.ts', '!tests/**/*.d.ts', '!tests/dist/**'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'json-summary'],
  reporters: ['default'],
  setupFilesAfterEnv: ['./helpers/setup.ts'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: './tsconfig.json',
      },
    ],
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  verbose: true,
};

export default config;
