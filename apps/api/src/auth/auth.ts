import { prismaAdapter } from "better-auth/adapters/prisma";
import { betterAuth } from "better-auth/minimal";
import { prisma } from "../prisma/prisma-client.js";
import { buildAuthOptions } from "./auth-options.js";

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
});
