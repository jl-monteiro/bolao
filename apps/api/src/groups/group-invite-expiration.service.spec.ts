import { jest } from "@jest/globals";
import type { PrismaClient } from "../generated/prisma/client.js";
import {
  AuditAction,
  AuditActorType,
  GroupInviteStatus,
  PendingMembershipStatus,
} from "../generated/prisma/enums.js";
import {
  GroupInviteExpirationService,
} from "./group-invite-expiration.service.js";

const now = new Date("2026-06-14T15:00:00.000Z");

function createPrismaMock() {
  const transaction = {
    auditLog: {
      create: jest.fn<(input: unknown) => Promise<unknown>>(),
    },
    groupInvite: {
      updateMany:
        jest.fn<
          (input: unknown) => Promise<{ count: number }>
        >(),
    },
    groupPendingMembership: {
      updateMany:
        jest.fn<
          (input: unknown) => Promise<{ count: number }>
        >(),
    },
  };

  return {
    $transaction: jest.fn(
      async (
        operation: (client: typeof transaction) => Promise<unknown>,
      ) => operation(transaction),
    ),
    groupInvite: {
      findMany: jest.fn<(input: unknown) => Promise<unknown[]>>(),
    },
    groupPendingMembership: {
      findMany: jest.fn<(input: unknown) => Promise<unknown[]>>(),
    },
    transaction,
  };
}

describe("GroupInviteExpirationService", () => {
  it("expires due records once and audits each transition as SYSTEM", async () => {
    const prisma = createPrismaMock();
    prisma.groupInvite.findMany
      .mockResolvedValueOnce([
        {
          groupId: "group-1",
          id: "invite-1",
        },
      ])
      .mockResolvedValueOnce([]);
    prisma.groupPendingMembership.findMany
      .mockResolvedValueOnce([
        {
          groupId: "group-1",
          id: "pending-1",
        },
      ])
      .mockResolvedValueOnce([]);
    prisma.transaction.groupInvite.updateMany.mockResolvedValue({
      count: 1,
    });
    prisma.transaction.groupPendingMembership.updateMany.mockResolvedValue({
      count: 1,
    });
    prisma.transaction.auditLog.create.mockResolvedValue({
      id: "audit-1",
    });
    const service = new GroupInviteExpirationService(
      prisma as unknown as PrismaClient,
    );

    await service.expireDueRecords(now);
    await service.expireDueRecords(now);

    expect(
      prisma.transaction.groupInvite.updateMany,
    ).toHaveBeenCalledWith({
      data: {
        expiredAt: now,
        status: GroupInviteStatus.EXPIRED,
      },
      where: {
        expiresAt: {
          lte: now,
        },
        id: "invite-1",
        status: GroupInviteStatus.PENDING,
      },
    });
    expect(prisma.groupInvite.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ expiresAt: "asc" }, { id: "asc" }],
        take: 100,
      }),
    );
    expect(
      prisma.transaction.groupPendingMembership.updateMany,
    ).toHaveBeenCalledWith({
      data: {
        expiredAt: now,
        status: PendingMembershipStatus.EXPIRED,
      },
      where: {
        expiresAt: {
          lte: now,
        },
        id: "pending-1",
        status: PendingMembershipStatus.PENDING,
      },
    });
    expect(
      prisma.groupPendingMembership.findMany,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ expiresAt: "asc" }, { id: "asc" }],
        take: 100,
      }),
    );
    expect(prisma.transaction.auditLog.create).toHaveBeenCalledTimes(2);
    expect(prisma.transaction.auditLog.create).toHaveBeenCalledWith({
      data: {
        action: AuditAction.GROUP_INVITE_EXPIRED,
        actorId: null,
        actorType: AuditActorType.SYSTEM,
        groupId: "group-1",
        newValues: {
          expiredAt: now.toISOString(),
          inviteId: "invite-1",
          status: GroupInviteStatus.EXPIRED,
        },
        previousValues: {
          status: GroupInviteStatus.PENDING,
        },
      },
    });
    expect(prisma.transaction.auditLog.create).toHaveBeenCalledWith({
      data: {
        action: AuditAction.GROUP_PENDING_MEMBERSHIP_EXPIRED,
        actorId: null,
        actorType: AuditActorType.SYSTEM,
        groupId: "group-1",
        newValues: {
          expiredAt: now.toISOString(),
          pendingMembershipId: "pending-1",
          status: PendingMembershipStatus.EXPIRED,
        },
        previousValues: {
          status: PendingMembershipStatus.PENDING,
        },
      },
    });
  });

  it("does not audit a transition lost to another API instance", async () => {
    const prisma = createPrismaMock();
    prisma.groupInvite.findMany.mockResolvedValue([
      {
        groupId: "group-1",
        id: "invite-1",
      },
    ]);
    prisma.groupPendingMembership.findMany.mockResolvedValue([]);
    prisma.transaction.groupInvite.updateMany.mockResolvedValue({
      count: 0,
    });
    const service = new GroupInviteExpirationService(
      prisma as unknown as PrismaClient,
    );

    await service.expireDueRecords(now);

    expect(prisma.transaction.auditLog.create).not.toHaveBeenCalled();
  });
});
