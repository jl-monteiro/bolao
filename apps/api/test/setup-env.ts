process.env.API_URL ??= "http://localhost:3001";
process.env.BETTER_AUTH_SECRET ??= "s".repeat(32);
process.env.DATABASE_URL ??=
  "postgresql://bolao:bolao@localhost:5432/bolao?schema=public";
process.env.DATABASE_URL_TEST ??=
  "postgresql://bolao:bolao@localhost:5432/bolao?schema=public";
process.env.WEB_URL ??= "http://localhost:3000";
