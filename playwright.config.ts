import { defineConfig } from "@playwright/test";

const braveExecutable =
  "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    browserName: "chromium",
    launchOptions: {
      executablePath: braveExecutable,
    },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "pnpm --filter @bolao/api dev",
      env: {
        API_URL: "http://localhost:3001",
        BETTER_AUTH_SECRET: "local-e2e-secret-with-at-least-32-characters",
        DATABASE_URL:
          "postgresql://bolao:bolao@localhost:5432/bolao?schema=public",
        WEB_URL: "http://localhost:3000",
      },
      reuseExistingServer: true,
      timeout: 120_000,
      url: "http://localhost:3001/v1/health",
    },
    {
      command: "pnpm --filter @bolao/web dev",
      env: {
        NEXT_PUBLIC_API_URL: "http://localhost:3001",
        NEXT_PUBLIC_EMAIL_DELIVERY: "console",
      },
      reuseExistingServer: true,
      timeout: 120_000,
      url: "http://localhost:3000",
    },
  ],
});
