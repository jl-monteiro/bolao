import { jest } from "@jest/globals";
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import type { PrismaClient } from "../src/generated/prisma/client.js";
import {
  GroupRole,
  PendingMembershipStatus,
} from "../src/generated/prisma/enums.js";
import { GroupInviteTokenService } from "../src/groups/group-invite-token.service.js";
import {
  type GroupInviteClock,
  GroupInvitesService,
} from "../src/groups/group-invites.service.js";
import { GroupRolePolicy } from "../src/groups/group-role.policy.js";
import {
  ACTIVATION_CLOCK,
  PendingMembershipActivationService,
} from "../src/groups/pending-membership-activation.service.js";
import { IdentityService } from "../src/identity/identity.service.js";
import type { EmailMessage } from "../src/notifications/notification-provider.js";
import { createTestPrismaClient } from "./database.js";

const NOW = new Date("2026-06-14T15:00:00.000Z");

function tokenFromAcceptUrl(acceptUrl: string): string {
  const token = new URLSearchParams(
    new URL(acceptUrl).hash.slice(1),
  ).get("token");
  if (!token) {
    throw new Error("Issued invitation did not include a fragment token");
  }
  return token;
}

function computeCpfCheckDigit(base: string): number {
  let sum = 0;

  for (let index = 0; index < base.length; index += 1) {
    sum += Number(base[index]) * (base.length + 1 - index);
  }

  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}

function buildValidCpf(): string {
  const seed = Number.parseInt(
    crypto.randomUUID().replace(/-/g, "").slice(0, 12),
    16,
  );
  const firstNineDigits = String((seed % 900_000_000) + 100_000_000);
  const firstCheckDigit = computeCpfCheckDigit(firstNineDigits);
  const secondCheckDigit = computeCpfCheckDigit(
    `${firstNineDigits}${firstCheckDigit}`,
  );

  return `${firstNineDigits}${firstCheckDigit}${secondCheckDigit}`;
}

describe("Identity submission and pending membership activation PostgreSQL", () => {
  let prisma: PrismaClient;
  let invites: GroupInvitesService;
  let identity: IdentityService;
  let activation: PendingMembershipActivationService;
  let ownerId: string;
  let invitedId: string;
  let groupId: string;
  let identityCpf: string;
  let otherCpfUserId: string;

  beforeAll(() => {
    prisma = createTestPrismaClient();
    const notificationProvider = {
      sendEmail: jest.fn<(message: EmailMessage) => Promise<void>>(),
    };
    const clock: GroupInviteClock = {
      now: () => NOW,
    };

    invites = new GroupInvitesService(
      prisma,
      new GroupRolePolicy(),
      new GroupInviteTokenService(),
      notificationProvider,
      { get: () => "http://localhost:3000" } as never,
      clock,
    );
    identity = new IdentityService(prisma, { now: () => NOW });
    activation = new PendingMembershipActivationService(prisma, {
      now: () => NOW,
    });
  });

  beforeEach(async () => {
    const suffix = crypto.randomUUID();
    ownerId = `owner-${suffix}`;
    invitedId = `invited-${suffix}`;
    identityCpf = buildValidCpf();
    otherCpfUserId = "";

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
        name: `Identity ${suffix}`,
      },
    });
    groupId = group.id;
  });

  afterEach(async () => {
    if (groupId) {
      await prisma.auditLog.deleteMany({ where: { groupId } });
      await prisma.groupPendingMembership.deleteMany({
        where: { groupId },
      });
      await prisma.groupInvite.deleteMany({ where: { groupId } });
      await prisma.groupMembership.deleteMany({ where: { groupId } });
      await prisma.group.deleteMany({ where: { id: groupId } });
    }
    const ids = [ownerId, invitedId, otherCpfUserId].filter(
      (value): value is string => Boolean(value),
    );
    if (ids.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: ids } } });
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("stores validated identity only once and activates the pending membership atomically", async () => {
    const invited = await prisma.user.findUniqueOrThrow({
      where: { id: invitedId },
    });
    const issued = await invites.issue(ownerId, groupId, invited.email);
    const token = tokenFromAcceptUrl(issued.acceptUrl!);
    await invites.accept(invitedId, token);

    await expect(
      prisma.groupPendingMembership.findFirstOrThrow({
        where: { userId: invitedId, groupId },
      }),
    ).resolves.toMatchObject({ status: PendingMembershipStatus.PENDING });

    const result = await identity.submit(invitedId, {
      birthDate: "1990-05-15",
      cpf: identityCpf,
      fullName: "Maria da Silva",
    });

    expect(result).toMatchObject({ cpf: identityCpf });

    const refreshedUser = await prisma.user.findUniqueOrThrow({
      where: { id: invitedId },
    });
    expect(refreshedUser.identityValidatedAt).toEqual(NOW);
    expect(refreshedUser.cpf).toBe(identityCpf);

    const pending = await prisma.groupPendingMembership.findFirstOrThrow({
      where: { userId: invitedId, groupId },
    });

    const activationResult = await activation.activate(
      invitedId,
      pending.id,
    );

    expect(activationResult).toEqual({
      groupId,
      joinedAt: NOW,
      pendingMembershipId: pending.id,
      role: GroupRole.MEMBER,
    });

    await expect(
      prisma.groupMembership.count({
        where: { groupId, userId: invitedId },
      }),
    ).resolves.toBe(1);

    await expect(
      prisma.groupPendingMembership.findFirstOrThrow({
        where: { userId: invitedId, groupId },
      }),
    ).resolves.toMatchObject({
      status: PendingMembershipStatus.ACTIVATED,
    });

    await expect(
      prisma.auditLog.count({
        where: {
          action: "GROUP_MEMBERSHIP_ACTIVATED",
          groupId,
        },
      }),
    ).resolves.toBe(1);
  });

  it("returns the same activation result on a concurrent duplicate attempt", async () => {
    const invited = await prisma.user.findUniqueOrThrow({
      where: { id: invitedId },
    });
    const issued = await invites.issue(ownerId, groupId, invited.email);
    const token = tokenFromAcceptUrl(issued.acceptUrl!);
    await invites.accept(invitedId, token);

    await identity.submit(invitedId, {
      birthDate: "1990-05-15",
      cpf: identityCpf,
      fullName: "Maria da Silva",
    });

    const pending = await prisma.groupPendingMembership.findFirstOrThrow({
      where: { userId: invitedId, groupId },
    });

    const results = await Promise.all([
      activation.activate(invitedId, pending.id),
      activation.activate(invitedId, pending.id),
    ]);

    expect(results[0]).toEqual(results[1]);

    await expect(
      prisma.groupMembership.count({
        where: { groupId, userId: invitedId },
      }),
    ).resolves.toBe(1);

    await expect(
      prisma.auditLog.count({
        where: {
          action: "GROUP_MEMBERSHIP_ACTIVATED",
          groupId,
        },
      }),
    ).resolves.toBe(1);
  });

  it("forbids activation when the invited account has not validated identity", async () => {
    const invited = await prisma.user.findUniqueOrThrow({
      where: { id: invitedId },
    });
    const issued = await invites.issue(ownerId, groupId, invited.email);
    const token = tokenFromAcceptUrl(issued.acceptUrl!);
    await invites.accept(invitedId, token);

    const pending = await prisma.groupPendingMembership.findFirstOrThrow({
      where: { userId: invitedId, groupId },
    });

    await expect(
      activation.activate(invitedId, pending.id),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      prisma.groupMembership.count({
        where: { groupId, userId: invitedId },
      }),
    ).resolves.toBe(0);
  });

  it("returns conflict when the chosen CPF is already linked to another user", async () => {
    const other = await prisma.user.create({
      data: {
        birthDate: new Date("1991-01-01T00:00:00.000Z"),
        cpf: identityCpf,
        email: `other-${crypto.randomUUID()}@bolao.local`,
        emailVerified: true,
        id: `other-${crypto.randomUUID()}`,
        identityValidatedAt: NOW,
        name: "Other Integration",
      },
    });
    otherCpfUserId = other.id;

    await expect(
      identity.submit(invitedId, {
        birthDate: "1990-05-15",
        cpf: identityCpf,
        fullName: "Maria da Silva",
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("reuses the existing activation idempotently without duplicating membership", async () => {
    const invited = await prisma.user.findUniqueOrThrow({
      where: { id: invitedId },
    });
    const issued = await invites.issue(ownerId, groupId, invited.email);
    const token = tokenFromAcceptUrl(issued.acceptUrl!);
    await invites.accept(invitedId, token);

    await identity.submit(invitedId, {
      birthDate: "1990-05-15",
      cpf: identityCpf,
      fullName: "Maria da Silva",
    });

    const pending = await prisma.groupPendingMembership.findFirstOrThrow({
      where: { userId: invitedId, groupId },
    });

    await activation.activate(invitedId, pending.id);
    const second = await activation.activate(invitedId, pending.id);

    expect(second.role).toBe(GroupRole.MEMBER);
    await expect(
      prisma.groupMembership.count({
        where: { groupId, userId: invitedId },
      }),
    ).resolves.toBe(1);
  });

  it("does not activate a pending membership owned by another user", async () => {
    const invited = await prisma.user.findUniqueOrThrow({
      where: { id: invitedId },
    });
    const issued = await invites.issue(ownerId, groupId, invited.email);
    const token = tokenFromAcceptUrl(issued.acceptUrl!);
    await invites.accept(invitedId, token);

    await identity.submit(invitedId, {
      birthDate: "1990-05-15",
      cpf: identityCpf,
      fullName: "Maria da Silva",
    });

    await expect(
      activation.activate(invitedId, "wrong-id"),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  // keep ACTIVATION_CLOCK import paths visible to future contributors if
  // service clocks are switched out for env-controlled fakes.
  void ACTIVATION_CLOCK;
});
