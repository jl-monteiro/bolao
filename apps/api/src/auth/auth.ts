import { Logger } from "@nestjs/common";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { betterAuth } from "better-auth/minimal";
import { createNotificationProvider } from "../notifications/notification-provider.js";
import { buildVerificationEmail } from "../notifications/verification-email.js";
import { prisma } from "../prisma/prisma-client.js";
import { buildAuthOptions } from "./auth-options.js";

const logger = new Logger("EmailVerification");
const notificationProvider = createNotificationProvider(process.env);

const options = buildAuthOptions({
  API_URL: process.env.API_URL ?? "http://localhost:3001",
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ?? "",
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  WEB_URL: process.env.WEB_URL ?? "http://localhost:3000",
});

export const auth = betterAuth({
  ...options,
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailVerification: {
    sendOnSignUp: true,
    sendVerificationEmail: ({ user, url }) => {
      void notificationProvider
        .sendEmail(
          buildVerificationEmail({
            email: user.email,
            name: user.name,
            url,
          }),
        )
        .catch((error: unknown) => {
          logger.error("Failed to send verification email", error);
        });
      return Promise.resolve();
    },
  },
});
