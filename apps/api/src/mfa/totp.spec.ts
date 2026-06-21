import { generateTotpCode, verifyTotpCode } from "./totp.js";

describe("TOTP", () => {
  it("verifies the current one-time code and rejects malformed input", () => {
    const secret = "JBSWY3DPEHPK3PXP";
    const now = new Date("2026-06-21T12:00:00.000Z");
    const code = generateTotpCode({ now, secret });

    expect(verifyTotpCode({ code, now, secret })).toBe(true);
    expect(verifyTotpCode({ code: "abc123", now, secret })).toBe(false);
  });

  it("accepts a code within the configured clock window", () => {
    const secret = "JBSWY3DPEHPK3PXP";
    const now = new Date("2026-06-21T12:00:00.000Z");
    const code = generateTotpCode({ now, secret });

    expect(
      verifyTotpCode({
        code,
        now: new Date(now.getTime() + 30_000),
        secret,
      }),
    ).toBe(true);
    expect(
      verifyTotpCode({
        code,
        now: new Date(now.getTime() + 120_000),
        secret,
      }),
    ).toBe(false);
  });
});
