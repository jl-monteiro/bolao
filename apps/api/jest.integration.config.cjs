const base = require("./jest.config.cjs");

module.exports = {
  ...base,
  collectCoverageFrom: [],
  testPathIgnorePatterns: [],
  testRegex: "test/.*\\.integration\\.spec\\.ts$",
};
