import type { Config } from "@jest/types";

// Sync object
const config: Config.InitialOptions = {
    verbose: true,
    preset: "ts-jest",
    testEnvironment: "node",
    globalSetup: "<rootDir>/dotenv/dotenv-test.js",
    testTimeout: 60000, // so long because of exchange requests
    maxConcurrency: 7,
    maxWorkers: 7,
    testMatch: ["**/__tests__/*.test.ts"],
};
export default config;
