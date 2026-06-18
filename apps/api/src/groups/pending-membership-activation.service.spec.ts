import { jest } from "@jest/globals";
import {
  ConflictException,
  ForbiddenException,
  GoneException,
  NotFoundException,
} from "@nestjs/common";
import type { PrismaClient } from "../generated/prisma/client.js";
import {
  AuditActorType,
  GroupRole,
  PendingMembershipStatus,
} from "../generated/prisma/enums.js";
import { PendingMembershipActivationService } from "./pending-membership-activation.service.js";

const NOW = new Date("2026-06-17T12:00:00.000Z");
const MEMBERSHIP_ID = "11111111-1111-1111-1111-111111111111";

function createPrismaMock() {
  const transaction = {
    auditLog: {
      create: jest.fn<(input: unknown) => Promise<unknown>>(),
    },
    groupMembership: {
      create: jest.fn<(input: unknown) => Promise<unknown>>(),
      findFirst: jest.fn<(input: unknown) => Promise<unknown>>(),
      findUnique: jest.fn<(input: unknown) => Promise<unknown>>(),
    },
    groupPendingMembership: {
      findFirst: jest.fn<(input: unknown) => Promise<unknown>>(),
      update: jest.fn<(input: unknown) => Promise<unknown>>(),
      updateMany: jest.fn<
        (input: unknown) => Promise<{ count: number }>
      >(),
    },
    user: {
      findUnique: jest.fn<(input: unknown) => Promise<unknown>>(),
    },
  };

  return {
    $transaction: jest.fn(
      async (
        operation: (client: typeof transaction) => Promise<unknown>,
      ) => operation(transaction),
    ),
    transaction,
  };
}

function createService(prisma: ReturnType<typeof createPrismaMock>) {
  return new PendingMembershipActivationService(
    prisma as unknown as PrismaClient,
    { now: () => NOW },
  );
}

const VALID_PENDING = {
  acceptedAt: new Date("2026-05-17T12:00:00.000Z"),
  expiresAt: new Date("2026-07-17T12:00:00.000Z"),
  groupId: "group-1",
  id: "pending-1",
  inviteId: "invite-1",
  status: PendingMembershipStatus.PENDING,
  userId: "user-1",
};

const VALID_USER = {
  emailVerified: true,
  id: "user-1",
  identityValidatedAt: NOW,
};

describe("PendingMembershipActivationService", () => {
  it("activates a pending membership and creates a MEMBER role atomically", async () => {
    const prisma = createPrismaMock();
    prisma.transaction.user.findUnique.mockResolvedValue(VALID_USER);
    prisma.transaction.groupMembership.findFirst.mockResolvedValue(null);
    prisma.transaction.groupPendingMembership.findFirst.mockResolvedValue(
      VALID_PENDING,
    );
    prisma.transaction.groupPendingMembership.updateMany.mockResolvedValue({
      count: 1,
    });
    prisma.transaction.groupMembership.create.mockResolvedValue({
      createdAt: NOW,
      id: MEMBERSHIP_ID,
      role: GroupRole.MEMBER,
    });
    prisma.transaction.auditLog.create.mockResolvedValue({
      id: "audit-1",
    });
    const service = createService(prisma);

    const result = await service.activate("user-1", "pending-1");

    expect(result).toEqual({
      groupId: "group-1",
      joinedAt: NOW,
      pendingMembershipId: "pending-1",
      role: GroupRole.MEMBER,
    });

    expect(
      prisma.transaction.groupPendingMembership.updateMany,
    ).toHaveBeenCalledWith({
      data: {
        activatedAt: NOW,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        activatedMembershipId: expect.any(String),
        status: PendingMembershipStatus.ACTIVATED,
      },
      where: {
        expiresAt: { gt: NOW },
        id: "pending-1",
        status: PendingMembershipStatus.PENDING,
        userId: "user-1",
      },
    });
    expect(prisma.transaction.groupMembership.create).toHaveBeenCalledWith({
      data: {
        createdAt: NOW,
        groupId: "group-1",
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        id: expect.any(String),
        role: GroupRole.MEMBER,
        updatedAt: NOW,
        userId: "user-1",
      },
      select: {
        createdAt: true,
        id: true,
        role: true,
      },
    });
    const transitionCall =
      prisma.transaction.groupPendingMembership.updateMany.mock.calls[0]?.[0] as
        | {
            data: { activatedMembershipId: string };
          }
        | undefined;
    const createCall =
      prisma.transaction.groupMembership.create.mock.calls[0]?.[0] as
        | { data: { id: string } }
        | undefined;
    expect(transitionCall?.data.activatedMembershipId).toBe(
      createCall?.data.id,
    );
    expect(prisma.transaction.auditLog.create).toHaveBeenCalledWith({
      data: {
        action: "GROUP_MEMBERSHIP_ACTIVATED",
        actorId: "user-1",
        actorType: AuditActorType.USER,
        groupId: "group-1",
        newValues: {
          activatedAt: NOW.toISOString(),
          membershipId: MEMBERSHIP_ID,
          pendingMembershipId: "pending-1",
          role: GroupRole.MEMBER,
          status: PendingMembershipStatus.ACTIVATED,
          userId: "user-1",
        },
        previousValues: {
          status: PendingMembershipStatus.PENDING,
        },
      },
    });
  });
});

describe("PendingMembershipActivationService — secondary behaviours", () => {
  it("returns the same membership idempotently when already activated", async () => {
    const existingMembership = {
      createdAt: new Date("2026-06-10T12:00:00.000Z"),
      id: "membership-existing",
      role: GroupRole.MEMBER,
    };
    const prisma = createPrismaMock();
    prisma.transaction.user.findUnique.mockResolvedValue(VALID_USER);
    prisma.transaction.groupPendingMembership.findFirst.mockResolvedValue({
      ...VALID_PENDING,
      activatedAt: existingMembership.createdAt,
      activatedMembershipId: existingMembership.id,
      status: PendingMembershipStatus.ACTIVATED,
    });
    prisma.transaction.groupMembership.findUnique.mockResolvedValue(
      existingMembership,
    );
    const service = createService(prisma);

    const result = await service.activate("user-1", "pending-1");

    expect(result).toEqual({
      groupId: "group-1",
      joinedAt: existingMembership.createdAt,
      pendingMembershipId: "pending-1",
      role: GroupRole.MEMBER,
    });
    expect(
      prisma.transaction.groupPendingMembership.updateMany,
    ).not.toHaveBeenCalled();
    expect(prisma.transaction.groupMembership.create).not.toHaveBeenCalled();
    expect(prisma.transaction.auditLog.create).not.toHaveBeenCalled();
  });

  it("returns 404 when no pending row belongs to the actor", async () => {
    const prisma = createPrismaMock();
    prisma.transaction.user.findUnique.mockResolvedValue(VALID_USER);
    prisma.transaction.groupPendingMembership.findFirst.mockResolvedValue(
      null,
    );
    const service = createService(prisma);

    await expect(
      service.activate("user-other", "pending-1"),
    ).rejects.toEqual(
      new NotFoundException("Associação pendente não encontrada."),
    );
    expect(
      prisma.transaction.groupPendingMembership.findFirst,
    ).toHaveBeenCalledWith({
      where: {
        id: "pending-1",
        userId: "user-other",
      },
    });
    expect(
      prisma.transaction.groupPendingMembership.updateMany,
    ).not.toHaveBeenCalled();
  });

  it("returns gone when the existing row is already expired", async () => {
    const prisma = createPrismaMock();
    prisma.transaction.user.findUnique.mockResolvedValue(VALID_USER);
    prisma.transaction.groupPendingMembership.findFirst.mockResolvedValue({
      ...VALID_PENDING,
      expiredAt: NOW,
      status: PendingMembershipStatus.EXPIRED,
    });
    const service = createService(prisma);

    await expect(
      service.activate("user-1", "pending-1"),
    ).rejects.toEqual(
      new GoneException("Esta associação pendente já expirou."),
    );
    expect(
      prisma.transaction.groupPendingMembership.updateMany,
    ).not.toHaveBeenCalled();
  });

  it("expires a stale but still-pending row before raising gone", async () => {
    const prisma = createPrismaMock();
    prisma.transaction.user.findUnique.mockResolvedValue(VALID_USER);
    prisma.transaction.groupPendingMembership.findFirst.mockResolvedValue({
      ...VALID_PENDING,
      expiresAt: new Date(NOW.getTime() - 1000),
    });
    prisma.transaction.groupPendingMembership.updateMany.mockResolvedValue({
      count: 1,
    });
    const service = createService(prisma);

    await expect(
      service.activate("user-1", "pending-1"),
    ).rejects.toEqual(
      new GoneException("Esta associação pendente já expirou."),
    );
    expect(
      prisma.transaction.groupPendingMembership.updateMany,
    ).toHaveBeenCalledWith({
      data: {
        expiredAt: NOW,
        status: PendingMembershipStatus.EXPIRED,
      },
      where: {
        expiresAt: { lte: NOW },
        id: "pending-1",
        status: PendingMembershipStatus.PENDING,
      },
    });
    expect(prisma.transaction.auditLog.create).toHaveBeenCalledWith({
      data: {
        action: "GROUP_PENDING_MEMBERSHIP_EXPIRED",
        actorId: null,
        actorType: AuditActorType.SYSTEM,
        groupId: "group-1",
        newValues: {
          expiredAt: NOW.toISOString(),
          pendingMembershipId: "pending-1",
          status: PendingMembershipStatus.EXPIRED,
        },
        previousValues: {
          status: PendingMembershipStatus.PENDING,
        },
      },
    });
  });

  it("raises conflict when the row becomes unavailable in flight", async () => {
    const prisma = createPrismaMock();
    prisma.transaction.user.findUnique.mockResolvedValue(VALID_USER);
    prisma.transaction.groupPendingMembership.findFirst.mockResolvedValue(
      VALID_PENDING,
    );
    prisma.transaction.groupPendingMembership.updateMany.mockResolvedValue({
      count: 0,
    });
    const service = createService(prisma);

    await expect(
      service.activate("user-1", "pending-1"),
    ).rejects.toEqual(
      new ConflictException(
        "Esta associação pendente não está mais disponível para ativação.",
      ),
    );
    expect(prisma.transaction.groupMembership.create).not.toHaveBeenCalled();
  });

  it("requires the validated identity before activation", async () => {
    const prisma = createPrismaMock();
    prisma.transaction.user.findUnique.mockResolvedValue({
      emailVerified: true,
      id: "user-1",
      identityValidatedAt: null,
    });
    const service = createService(prisma);

    await expect(
      service.activate("user-1", "pending-1"),
    ).rejects.toEqual(
      new ForbiddenException(
        "Valide sua identidade antes de ativar a associação pendente.",
      ),
    );
    expect(
      prisma.transaction.groupPendingMembership.updateMany,
    ).not.toHaveBeenCalled();
  });

  it("rejects the activation when the user has no account", async () => {
    const prisma = createPrismaMock();
    prisma.transaction.user.findUnique.mockResolvedValue(null);
    const service = createService(prisma);

    await expect(
      service.activate("user-ghost", "pending-1"),
    ).rejects.toEqual(
      new ForbiddenException(
        "Valide sua identidade antes de ativar a associação pendente.",
      ),
    );
    expect(
      prisma.transaction.groupPendingMembership.updateMany,
    ).not.toHaveBeenCalled();
  });
});
