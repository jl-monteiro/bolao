type AuthEnvironment = {
  API_URL: string;
  BETTER_AUTH_SECRET: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  WEB_URL: string;
};

type AuthRuntimeOptions = {
  basePath: "/v1/auth";
  baseURL: string;
  emailAndPassword: {
    enabled: true;
    requireEmailVerification: true;
  };
  secret: string;
  socialProviders?: {
    google: {
      clientId: string;
      clientSecret: string;
    };
  };
  trustedOrigins: string[];
};

export function buildAuthOptions(
  environment: AuthEnvironment,
): AuthRuntimeOptions {
  if (environment.BETTER_AUTH_SECRET.length < 32) {
    throw new Error("BETTER_AUTH_SECRET must contain at least 32 characters");
  }

  const hasGoogleCredentials =
    Boolean(environment.GOOGLE_CLIENT_ID) &&
    Boolean(environment.GOOGLE_CLIENT_SECRET);

  return {
    basePath: "/v1/auth",
    baseURL: environment.API_URL,
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
    },
    secret: environment.BETTER_AUTH_SECRET,
    ...(hasGoogleCredentials
      ? {
          socialProviders: {
            google: {
              clientId: environment.GOOGLE_CLIENT_ID!,
              clientSecret: environment.GOOGLE_CLIENT_SECRET!,
            },
          },
        }
      : {}),
    trustedOrigins: [environment.WEB_URL],
  };
}
