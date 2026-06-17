module.exports = {
  extensionsToTreatAsEsm: [".ts"],
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: ".",
  testRegex: ".*\\.spec\\.ts$",
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        useESM: true,
      },
    ],
  },
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  collectCoverageFrom: ["src/**/*.(t|j)s"],
  coverageDirectory: "coverage",
  setupFiles: ["<rootDir>/test/setup-env.ts"],
  testEnvironment: "node",
  testPathIgnorePatterns: ["/test/.*\\.integration\\.spec\\.ts$"],
};
