import { expect, type APIRequestContext } from "@playwright/test";
import { Client } from "pg";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://bolao:bolao@localhost:5432/bolao?schema=public";

export type VerifiedUser = {
  email: string;
  id: string;
  name: string;
  password: string;
};

type GroupRole = "OWNER" | "ORGANIZER" | "MEMBER";

type GroupAuditLog = {
  action: "GROUP_CREATED" | "GROUP_UPDATED";
  actorId: string;
  newValues: {
    description: string | null;
    name: string;
  } | null;
  previousValues: {
    description: string | null;
    name: string;
  } | null;
};

async function withDatabase<T>(
  operation: (database: Client) => Promise<T>,
): Promise<T> {
  const database = new Client({
    connectionString: databaseUrl,
  });

  await database.connect();
  try {
    return await operation(database);
  } finally {
    await database.end();
  }
}

export async function createVerifiedUser(
  request: APIRequestContext,
): Promise<VerifiedUser> {
  const uniqueId = `${Date.now()}-${crypto.randomUUID()}`;
  const credentials = {
    email: `e2e-${uniqueId}@bolao.local`,
    name: `Teste ${crypto.randomUUID().slice(0, 8)}`,
    password: "senha-segura-123",
  };

  const response = await request.post(`${apiUrl}/v1/auth/sign-up/email`, {
    data: {
      callbackURL: "http://localhost:3000/entrar?verificado=1",
      ...credentials,
    },
  });

  expect(response.ok()).toBe(true);

  const id = await withDatabase(async (database) => {
    const result = await database.query<{ id: string }>(
      'UPDATE "User" SET "emailVerified" = true WHERE "email" = $1 RETURNING "id"',
      [credentials.email],
    );
    expect(result.rowCount).toBe(1);
    return result.rows[0].id;
  });

  return {
    ...credentials,
    id,
  };
}

export async function addGroupMembership(
  groupId: string,
  userId: string,
  role: Exclude<GroupRole, "OWNER">,
): Promise<void> {
  await withDatabase(async (database) => {
    await database.query(
      `INSERT INTO "GroupMembership"
        ("id", "role", "groupId", "userId", "updatedAt")
       VALUES ($1, $2, $3, $4, NOW())`,
      [crypto.randomUUID(), role, groupId, userId],
    );
  });
}

export async function getGroupAuditLogs(
  groupId: string,
): Promise<GroupAuditLog[]> {
  return withDatabase(async (database) => {
    const result = await database.query<GroupAuditLog>(
      `SELECT "action", "actorId", "previousValues", "newValues"
       FROM "AuditLog"
       WHERE "groupId" = $1
       ORDER BY "createdAt" ASC`,
      [groupId],
    );

    return result.rows;
  });
}
