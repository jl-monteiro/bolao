import { ConfigService } from "@nestjs/config";
import { ConflictException, ForbiddenException } from "@nestjs/common";
import type { PrismaClient } from "../src/generated/prisma/client.js";
import {
  AuditAction,
  GroupRole,
} from "../src/generated/prisma/enums.js";
import { GroupRolePolicy } from "../src/groups/group-role.policy.js";
import {
  type OwnershipTransferClock,
  OwnershipTransferService,
} from "../src/groups/ownership-transfer.service.js";
import { MfaService } from "../src/mfa/mfa.service.js";
import { generateTotpCode } from "../src/mfa/totp.js";
import { createTestPrismaClient } from "./database.js";

const NOW = new Date("2026-06-21T12:00:00.000Z");

describe("Ownership transfer PostgreSQL integration", () => {
  let prisma: PrismaClient;
  let mfa: MfaService;
  let service: OwnershipTransferService;
  let clock: OwnershipTransferClock;
  let currentNow = NOW;
  let ownerId: string;
  let targetId: string;
  let organizerId: string;
  let groupId: string;
  let targetMembershipId: string;

  beforeAll(() => {
    prisma = createTestPrismaClient();
    clock = {
      now: () => currentNow,
    };
    mfa = new MfaService(
      prisma,
      new ConfigService({
        BETTER_AUTH_SECRET: "integration-secret-for-mfa-32-bytes",
      }),
      clock,
    );
    service = new OwnershipTransferService(
      prisma,
      new GroupRolePolicy(),
      mfa,
      clock,
    );
  });

  beforeEach(async () => {
    currentNow = NOW;
    const suffix = crypto.randomUUID();
    ownerId = `owner-${suffix}`;
    targetId = `target-${suffix}`;
    organizerId = `organizer-${suffix}`;

    await prisma.user.createMany({
      data: [
        {
          email: `owner-${suffix}@bolao.local`,
          emailVerified: true,
          id: ownerId,
          name: "Owner Integration",
        },
        {
          email: `target-${suffix}@bolao.local`,
          emailVerified: true,
          id: targetId,
          name: "Target Integration",
        },
        {
          email: `organizer-${suffix}@bolao.local`,
          emailVerified: true,
          id: organizerId,
          name: "Organizer Integration",
        },
      ],
    });

    const group = await prisma.group.create({
      data: {
        memberships: {
          create: [
            {
              role: GroupRole.OWNER,
              userId: ownerId,
            },
            {
              role: GroupRole.MEMBER,
              userId: targetId,
            },
            {
              role: GroupRole.ORGANIZER,
              userId: organizerId,
            },
          ],
        },
        name: `Ownership ${suffix}`,
      },
      include: {
        memberships: true,
      },
    });
    groupId = group.id;
    targetMembershipId = group.memberships.find(
      (membership) => membership.userId === targetId,
    )!.id;
  });

  afterEach(async () => {
    if (groupId) {
      await prisma.auditLog.deleteMany({ where: { groupId } });
      await prisma.groupOwnershipTransfer.deleteMany({
        where: { groupId },
      });
      await prisma.groupMembership.deleteMany({ where: { groupId } });
      await prisma.group.deleteMany({ where: { id: groupId } });
    }

    await prisma.user.deleteMany({
      where: {
        id: {
          in: [ownerId, targetId, organizerId].filter(Boolean),
        },
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function enableMfa(userId: string): Promise<string> {
    const setup = await mfa.beginSetup(userId);
    await mfa.confirmSetup(
      userId,
      generateTotpCode({
        now: currentNow,
        secret: setup.secret,
      }),
    );
    return setup.secret;
  }

  it("transfers ownership atomically after MFA verification", async () => {
    const secret = await enableMfa(targetId);
    const requested = await service.request(
      ownerId,
      groupId,
      targetMembershipId,
    );

    await expect(
      service.accept(
        targetId,
        requested.id,
        generateTotpCode({ now: currentNow, secret }),
      ),
    ).resolves.toMatchObject({
      status: "ACCEPTED",
      targetMembership: {
        id: targetMembershipId,
      },
    });

    await expect(
      prisma.groupMembership.count({
        where: {
          groupId,
          role: GroupRole.OWNER,
        },
      }),
    ).resolves.toBe(1);
    await expect(
      prisma.groupMembership.findUniqueOrThrow({
        select: { role: true },
        where: {
          groupId_userId: {
            groupId,
            userId: targetId,
          },
        },
      }),
    ).resolves.toEqual({ role: GroupRole.OWNER });
    await expect(
      prisma.groupMembership.findUniqueOrThrow({
        select: { role: true },
        where: {
          groupId_userId: {
            groupId,
            userId: ownerId,
          },
        },
      }),
    ).resolves.toEqual({ role: GroupRole.ORGANIZER });
    await expect(
      prisma.auditLog.count({
        where: {
          action: AuditAction.GROUP_OWNERSHIP_TRANSFER_ACCEPTED,
          groupId,
        },
      }),
    ).resolves.toBe(1);
  });

  it("forbids acceptance without MFA and keeps roles unchanged", async () => {
    const requested = await service.request(
      ownerId,
      groupId,
      targetMembershipId,
    );

    await expect(
      service.accept(targetId, requested.id, "123456"),
    ).rejects.toBeInstanceOf(ForbiddenException);

    await expect(
      prisma.groupMembership.findUniqueOrThrow({
        select: { role: true },
        where: {
          groupId_userId: {
            groupId,
            userId: targetId,
          },
        },
      }),
    ).resolves.toEqual({ role: GroupRole.MEMBER });
  });

  it("requires revoking a pending request before creating another", async () => {
    await service.request(ownerId, groupId, targetMembershipId);

    const organizerMembership =
      await prisma.groupMembership.findUniqueOrThrow({
        where: {
          groupId_userId: {
            groupId,
            userId: organizerId,
          },
        },
      });

    await expect(
      service.request(ownerId, groupId, organizerMembership.id),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("handles concurrent acceptance idempotently with one final audit", async () => {
    const secret = await enableMfa(targetId);
    const requested = await service.request(
      ownerId,
      groupId,
      targetMembershipId,
    );
    const code = generateTotpCode({ now: currentNow, secret });

    const results = await Promise.allSettled([
      service.accept(targetId, requested.id, code),
      service.accept(targetId, requested.id, code),
    ]);

    expect(
      results.filter(({ status }) => status === "fulfilled").length,
    ).toBeGreaterThanOrEqual(1);
    await expect(
      prisma.auditLog.count({
        where: {
          action: AuditAction.GROUP_OWNERSHIP_TRANSFER_ACCEPTED,
          groupId,
        },
      }),
    ).resolves.toBe(1);
    await expect(
      prisma.groupMembership.count({
        where: {
          groupId,
          role: GroupRole.OWNER,
        },
      }),
    ).resolves.toBe(1);
  });
});
