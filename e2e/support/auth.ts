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
  action:
    | "GROUP_CREATED"
    | "GROUP_UPDATED"
    | "GROUP_INVITE_ISSUED"
    | "GROUP_INVITE_REVOKED"
    | "GROUP_INVITE_ACCEPTED"
    | "GROUP_INVITE_EXPIRED"
    | "GROUP_PENDING_MEMBERSHIP_EXPIRED"
    | "GROUP_MEMBERSHIP_ACTIVATED"
    | "GROUP_MEMBER_ROLE_UPDATED"
    | "GROUP_OWNERSHIP_TRANSFER_REQUESTED"
    | "GROUP_OWNERSHIP_TRANSFER_REVOKED"
    | "GROUP_OWNERSHIP_TRANSFER_EXPIRED"
    | "GROUP_OWNERSHIP_TRANSFER_ACCEPTED";
  actorId: string | null;
  actorType: "SYSTEM" | "USER";
  newValues: Record<string, unknown> | null;
  previousValues: Record<string, unknown> | null;
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
      `SELECT "action", "actorId", "actorType", "previousValues", "newValues"
       FROM "AuditLog"
       WHERE "groupId" = $1
       ORDER BY "createdAt" ASC`,
      [groupId],
    );

    return result.rows;
  });
}

export async function getPendingMembershipCount(
  groupId: string,
  userId: string,
): Promise<number> {
  return withDatabase(async (database) => {
    const result = await database.query<{ count: string }>(
      `SELECT COUNT(*)::text AS "count"
       FROM "GroupPendingMembership"
       WHERE "groupId" = $1
         AND "userId" = $2
         AND "status" = 'PENDING'`,
      [groupId, userId],
    );

    return Number(result.rows[0].count);
  });
}

export async function getGroupMembershipCount(
  groupId: string,
  userId: string,
): Promise<number> {
  return withDatabase(async (database) => {
    const result = await database.query<{ count: string }>(
      `SELECT COUNT(*)::text AS "count"
       FROM "GroupMembership"
       WHERE "groupId" = $1
         AND "userId" = $2`,
      [groupId, userId],
    );

    return Number(result.rows[0].count);
  });
}

export async function getGroupMembershipRole(
  groupId: string,
  userId: string,
): Promise<GroupRole | null> {
  return withDatabase(async (database) => {
    const result = await database.query<{ role: GroupRole }>(
      `SELECT "role"
       FROM "GroupMembership"
       WHERE "groupId" = $1
         AND "userId" = $2`,
      [groupId, userId],
    );

    return result.rows[0]?.role ?? null;
  });
}

export async function getPasswordResetToken(
  userId: string,
): Promise<string> {
  return withDatabase(async (database) => {
    const result = await database.query<{ identifier: string }>(
      `SELECT "identifier"
       FROM "Verification"
       WHERE "value" = $1
         AND "identifier" LIKE 'reset-password:%'
       ORDER BY "createdAt" DESC
       LIMIT 1`,
      [userId],
    );

    expect(result.rowCount).toBe(1);
    return result.rows[0].identifier.replace("reset-password:", "");
  });
}
