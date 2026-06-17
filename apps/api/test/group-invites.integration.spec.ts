import { jest } from "@jest/globals";
import { ConflictException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHash } from "node:crypto";
import type { PrismaClient } from "../src/generated/prisma/client.js";
import {
  AuditAction,
  GroupRole,
  PendingMembershipStatus,
} from "../src/generated/prisma/enums.js";
import { GroupInviteTokenService } from "../src/groups/group-invite-token.service.js";
import {
  type GroupInviteClock,
  GroupInvitesService,
} from "../src/groups/group-invites.service.js";
import { GroupRolePolicy } from "../src/groups/group-role.policy.js";
import type { EmailMessage } from "../src/notifications/notification-provider.js";
import { createTestPrismaClient } from "./database.js";

const now = new Date("2026-06-14T15:00:00.000Z");

function tokenFromAcceptUrl(acceptUrl: string): string {
  const token = new URLSearchParams(
    new URL(acceptUrl).hash.slice(1),
  ).get("token");

  if (!token) {
    throw new Error("Issued invitation did not include a fragment token");
  }

  return token;
}

describe("Group invitations PostgreSQL integration", () => {
  let prisma: PrismaClient;
  let service: GroupInvitesService;
  let ownerId: string;
  let invitedId: string;
  let groupId: string;

  beforeAll(() => {
    prisma = createTestPrismaClient();
    const notificationProvider = {
      sendEmail: jest.fn<(message: EmailMessage) => Promise<void>>(),
    };
    const clock: GroupInviteClock = {
      now: () => now,
    };

    service = new GroupInvitesService(
      prisma,
      new GroupRolePolicy(),
      new GroupInviteTokenService(),
      notificationProvider,
      new ConfigService({
        WEB_URL: "http://localhost:3000",
      }),
      clock,
    );
  });

  beforeEach(async () => {
    const suffix = crypto.randomUUID();
    ownerId = `owner-${suffix}`;
    invitedId = `invited-${suffix}`;

    await prisma.user.createMany({
      data: [
        {
          email: `owner-${suffix}@bolao.local`,
          emailVerified: true,
          id: ownerId,
          name: "Owner Integration",
        },
        {
          email: `invited-${suffix}@bolao.local`,
          emailVerified: true,
          id: invitedId,
          name: "Invited Integration",
        },
      ],
    });

    const group = await prisma.group.create({
      data: {
        memberships: {
          create: {
            role: GroupRole.OWNER,
            userId: ownerId,
          },
        },
        name: `Integration ${suffix}`,
      },
    });
    groupId = group.id;
  });

  afterEach(async () => {
    if (groupId) {
      await prisma.auditLog.deleteMany({
        where: {
          groupId,
        },
      });
      await prisma.groupPendingMembership.deleteMany({
        where: {
          groupId,
        },
      });
      await prisma.groupInvite.deleteMany({
        where: {
          groupId,
        },
      });
      await prisma.groupMembership.deleteMany({
        where: {
          groupId,
        },
      });
      await prisma.group.deleteMany({
        where: {
          id: groupId,
        },
      });
    }

    await prisma.user.deleteMany({
      where: {
        id: {
          in: [ownerId, invitedId].filter(Boolean),
        },
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("enforces one active invitation for the same group and normalized email", async () => {
    const invited = await prisma.user.findUniqueOrThrow({
      where: {
        id: invitedId,
      },
    });

    const results = await Promise.allSettled([
      service.issue(ownerId, groupId, invited.email.toUpperCase()),
      service.issue(ownerId, groupId, ` ${invited.email} `),
    ]);

    expect(results.filter(({ status }) => status === "fulfilled")).toHaveLength(
      1,
    );
    const rejected = results.find(
      ({ status }) => status === "rejected",
    ) as PromiseRejectedResult | undefined;
    expect(rejected?.reason).toBeInstanceOf(ConflictException);
    await expect(
      prisma.groupInvite.count({
        where: {
          groupId,
        },
      }),
    ).resolves.toBe(1);
  });

  it("returns one pending membership and one audit for concurrent acceptance", async () => {
    const invited = await prisma.user.findUniqueOrThrow({
      where: {
        id: invitedId,
      },
    });
    const issued = await service.issue(ownerId, groupId, invited.email);
    const token = tokenFromAcceptUrl(issued.acceptUrl!);

    const accepted = await Promise.all([
      service.accept(invitedId, token),
      service.accept(invitedId, token),
    ]);

    expect(accepted[0]).toEqual(accepted[1]);
    await expect(
      prisma.groupPendingMembership.count({
        where: {
          groupId,
          status: PendingMembershipStatus.PENDING,
          userId: invitedId,
        },
      }),
    ).resolves.toBe(1);
    await expect(
      prisma.auditLog.count({
        where: {
          action: AuditAction.GROUP_INVITE_ACCEPTED,
          groupId,
        },
      }),
    ).resolves.toBe(1);
    await expect(
      prisma.groupMembership.count({
        where: {
          groupId,
          userId: invitedId,
        },
      }),
    ).resolves.toBe(0);
  });

  it("expires a stale active invitation before issuing its replacement", async () => {
    const invited = await prisma.user.findUniqueOrThrow({
      where: {
        id: invitedId,
      },
    });
    const staleInvite = await prisma.groupInvite.create({
      data: {
        expiresAt: now,
        groupId,
        issuedAt: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000),
        issuedById: ownerId,
        targetEmail: invited.email,
        tokenHash: createHash("sha256")
          .update(crypto.randomUUID())
          .digest("hex"),
      },
    });

    await expect(
      service.issue(ownerId, groupId, invited.email),
    ).resolves.toMatchObject({
      status: "PENDING",
    });
    await expect(
      prisma.groupInvite.findUnique({
        select: {
          status: true,
        },
        where: {
          id: staleInvite.id,
        },
      }),
    ).resolves.toEqual({
      status: "EXPIRED",
    });
    await expect(
      prisma.groupInvite.count({
        where: {
          groupId,
        },
      }),
    ).resolves.toBe(2);
  });
});
