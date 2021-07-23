import type { Config } from '@jest/types';

// Sync object
const config: Config.InitialOptions = {
  verbose: true,
  preset: 'ts-jest',
  testEnvironment: 'node',
  globalSetup: "<rootDir>/dotenv/dotenv-test.js",
  testTimeout: 35000 // so long because of exchange requests
};
export default config;
