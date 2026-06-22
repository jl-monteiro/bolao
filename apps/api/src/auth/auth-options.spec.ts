import { buildAuthOptions } from "./auth-options.js";

const baseEnvironment = {
  API_URL: "http://localhost:3001",
  BETTER_AUTH_SECRET: "s".repeat(32),
  WEB_URL: "http://localhost:3000",
};

describe("buildAuthOptions", () => {
  it("enables verified email and password authentication", () => {
    const options = buildAuthOptions(baseEnvironment);

    expect(options).toMatchObject({
      basePath: "/v1/auth",
      baseURL: "http://localhost:3001",
      emailAndPassword: {
        enabled: true,
        minPasswordLength: 8,
        requireEmailVerification: true,
        resetPasswordTokenExpiresIn: 3600,
        revokeSessionsOnPasswordReset: true,
      },
      trustedOrigins: ["http://localhost:3000"],
    });
  });

  it("configures Google only with a complete credential pair", () => {
    const withoutGoogle = buildAuthOptions({
      ...baseEnvironment,
      GOOGLE_CLIENT_ID: "client-id",
    });
    const withGoogle = buildAuthOptions({
      ...baseEnvironment,
      GOOGLE_CLIENT_ID: "client-id",
      GOOGLE_CLIENT_SECRET: "client-secret",
    });

    expect(withoutGoogle.socialProviders).toBeUndefined();
    expect(withGoogle.socialProviders).toEqual({
      google: {
        clientId: "client-id",
        clientSecret: "client-secret",
      },
    });
  });

  it("rejects secrets shorter than 32 characters", () => {
    expect(() =>
      buildAuthOptions({
        ...baseEnvironment,
        BETTER_AUTH_SECRET: "too-short",
      }),
    ).toThrow("BETTER_AUTH_SECRET must contain at least 32 characters");
  });
});
