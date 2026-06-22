import { auth } from "./auth.js";

describe("auth", () => {
  it("creates the Better Auth instance at the versioned API path", () => {
    expect(auth.options.basePath).toBe("/v1/auth");
    expect(auth.options.emailAndPassword).toMatchObject({
      enabled: true,
      minPasswordLength: 8,
      requireEmailVerification: true,
      resetPasswordTokenExpiresIn: 3600,
      revokeSessionsOnPasswordReset: true,
    });
    expect(
      typeof auth.options.emailAndPassword?.sendResetPassword,
    ).toBe("function");
    expect(auth.options.database).toBeDefined();
    expect(auth.options.emailVerification?.sendOnSignUp).toBe(true);
    expect(
      typeof auth.options.emailVerification?.sendVerificationEmail,
    ).toBe("function");
  });
});
