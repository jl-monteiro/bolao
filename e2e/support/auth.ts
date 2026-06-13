import { expect, type APIRequestContext } from "@playwright/test";
import { Client } from "pg";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://bolao:bolao@localhost:5432/bolao?schema=public";

type VerifiedUser = {
  email: string;
  name: string;
  password: string;
};

export async function createVerifiedUser(
  request: APIRequestContext,
): Promise<VerifiedUser> {
  const uniqueId = `${Date.now()}-${crypto.randomUUID()}`;
  const user = {
    email: `e2e-${uniqueId}@bolao.local`,
    name: "Teste E2E",
    password: "senha-segura-123",
  };

  const response = await request.post(`${apiUrl}/v1/auth/sign-up/email`, {
    data: {
      callbackURL: "http://localhost:3000/entrar?verificado=1",
      ...user,
    },
  });

  expect(response.ok()).toBe(true);

  const database = new Client({
    connectionString: databaseUrl,
  });

  await database.connect();
  try {
    const result = await database.query(
      'UPDATE "User" SET "emailVerified" = true WHERE "email" = $1',
      [user.email],
    );
    expect(result.rowCount).toBe(1);
  } finally {
    await database.end();
  }

  return user;
}
