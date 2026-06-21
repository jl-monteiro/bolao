import assert from "node:assert/strict";
import test from "node:test";

const contractUrl = new URL("./mfa-contract.ts", import.meta.url).href;
const {
  buildMfaConfirmPath,
  buildMfaSetupPath,
  buildMfaStatusPath,
  createConfirmMfaBody,
  isSixDigitCode,
} = (await import(contractUrl)) as typeof import("./mfa-contract");

test("builds fixed MFA endpoints", () => {
  assert.equal(buildMfaStatusPath(), "/v1/me/mfa");
  assert.equal(buildMfaSetupPath(), "/v1/me/mfa/totp/setup");
  assert.equal(buildMfaConfirmPath(), "/v1/me/mfa/totp/confirm");
});

test("builds MFA confirmation body", () => {
  assert.deepEqual(createConfirmMfaBody(" 123456 "), {
    code: "123456",
  });
});

test("accepts only six digit MFA codes", () => {
  assert.equal(isSixDigitCode("123456"), true);
  assert.equal(isSixDigitCode("12345"), false);
  assert.equal(isSixDigitCode("12345a"), false);
});
