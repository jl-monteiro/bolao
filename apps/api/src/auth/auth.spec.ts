import { auth } from "./auth.js";

describe("auth", () => {
  it("creates the Better Auth instance at the versioned API path", () => {
    expect(auth.options.basePath).toBe("/v1/auth");
    expect(auth.options.emailAndPassword).toMatchObject({
      enabled: true,
      requireEmailVerification: true,
    });
    expect(auth.options.database).toBeDefined();
    expect(auth.options.emailVerification).toMatchObject({
      sendOnSignUp: true,
      sendVerificationEmail: expect.any(Function),
    });
  });
});
