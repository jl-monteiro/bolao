import { jest } from "@jest/globals";
import {
  ConflictException,
  ForbiddenException,
  GoneException,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { PrismaClient } from "../generated/prisma/client.js";
import {
  AuditActorType,
  GroupInviteStatus,
  GroupRole,
  PendingMembershipStatus,
} from "../generated/prisma/enums.js";
import type { EmailMessage } from "../notifications/notification-provider.js";
import {
  type GroupInviteClock,
  GroupInvitesService,
} from "./group-invites.service.js";
import { GroupRolePolicy } from "./group-role.policy.js";

const now = new Date("2026-06-14T15:00:00.000Z");
const inviteExpiresAt = new Date("2026-06-21T15:00:00.000Z");
const pendingExpiresAt = new Date("2026-07-14T15:00:00.000Z");

const membership = {
  group: {
    id: "group-1",
    name: "Copa 2026",
  },
  role: GroupRole.OWNER,
  user: {
    id: "owner-1",
    name: "Ana",
  },
};

const invite = {
  acceptedAt: null,
  acceptedById: null,
  expiredAt: null,
  expiresAt: inviteExpiresAt,
  groupId: "group-1",
  id: "invite-1",
  issuedAt: now,
  issuedBy: {
    id: "owner-1",
    name: "Ana",
  },
  issuedById: "owner-1",
  revokedAt: null,
  revokedById: null,
  status: GroupInviteStatus.PENDING,
  targetEmail: "pessoa@example.com",
  tokenHash: "stored-hash",
};

const pendingMembership = {
  acceptedAt: now,
  expiresAt: pendingExpiresAt,
  groupId: "group-1",
  id: "pending-1",
  inviteId: "invite-1",
  status: PendingMembershipStatus.PENDING,
  userId: "user-2",
};

function createPrismaMock() {
  const transaction = {
    auditLog: {
      create: jest.fn<(input: unknown) => Promise<unknown>>(),
    },
    groupInvite: {
      create: jest.fn<(input: unknown) => Promise<typeof invite>>(),
      findMany:
        jest
          .fn<(input: unknown) => Promise<unknown[]>>()
          .mockResolvedValue([]),
      findUnique: jest.fn<(input: unknown) => Promise<unknown>>(),
      updateMany:
        jest.fn<
          (input: unknown) => Promise<{ count: number }>
        >(),
    },
    groupMembership: {
      create: jest.fn<(input: unknown) => Promise<unknown>>(),
      findFirst: jest.fn<(input: unknown) => Promise<unknown>>(),
      findUnique: jest.fn<(input: unknown) => Promise<unknown>>(),
    },
    groupPendingMembership: {
      create:
        jest.fn<
          (input: unknown) => Promise<typeof pendingMembership>
        >(),
      findFirst: jest.fn<(input: unknown) => Promise<unknown>>(),
      findMany:
        jest
          .fn<(input: unknown) => Promise<unknown[]>>()
          .mockResolvedValue([]),
      findUnique: jest.fn<(input: unknown) => Promise<unknown>>(),
      update: jest.fn<(input: unknown) => Promise<unknown>>(),
      updateMany:
        jest.fn<
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
    groupInvite: {
      findMany: jest.fn<(input: unknown) => Promise<unknown[]>>(),
      findUnique: jest.fn<(input: unknown) => Promise<unknown>>(),
    },
    groupMembership: {
      findUnique: jest.fn<(input: unknown) => Promise<unknown>>(),
    },
    groupPendingMembership: {
      findMany: jest.fn<(input: unknown) => Promise<unknown[]>>(),
    },
    transaction,
  };
}

function createService(
  prisma: ReturnType<typeof createPrismaMock>,
  environment: Record<string, string> = {
    WEB_URL: "https://bolao.example.com",
  },
) {
  const notificationProvider = {
    sendEmail: jest.fn<(message: EmailMessage) => Promise<void>>(),
  };
  const tokenService = {
    generate: jest.fn(() => "raw_token-123"),
    hash: jest.fn(() => "stored-hash"),
  };
  const clock: GroupInviteClock = {
    now: () => now,
  };

  return {
    notificationProvider,
    service: new GroupInvitesService(
      prisma as unknown as PrismaClient,
      new GroupRolePolicy(),
      tokenService,
      notificationProvider,
      new ConfigService(environment),
      clock,
    ),
    tokenService,
  };
}

describe("GroupInvitesService", () => {
  it("issues a normalized seven-day invitation and returns the raw token only in acceptUrl", async () => {
    const prisma = createPrismaMock();
    prisma.transaction.groupMembership.findUnique.mockResolvedValue(
      membership,
    );
    prisma.transaction.groupMembership.findFirst.mockResolvedValue(null);
    prisma.transaction.groupPendingMembership.findFirst.mockResolvedValue(
      null,
    );
    prisma.transaction.groupInvite.create.mockResolvedValue(invite);
    prisma.transaction.auditLog.create.mockResolvedValue({
      id: "audit-1",
    });
    const { notificationProvider, service } = createService(prisma);

    const result = await service.issue(
      "owner-1",
      "group-1",
      " Pessoa@Example.COM ",
    );

    expect(prisma.transaction.groupInvite.create).toHaveBeenCalledWith({
      data: {
        expiresAt: inviteExpiresAt,
        groupId: "group-1",
        issuedAt: now,
        issuedById: "owner-1",
        targetEmail: "pessoa@example.com",
        tokenHash: "stored-hash",
      },
      include: {
        issuedBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
    expect(result).toEqual({
      acceptUrl:
        "https://bolao.example.com/convites/aceitar#token=raw_token-123",
      acceptedAt: null,
      expiredAt: null,
      expiresAt: inviteExpiresAt,
      id: "invite-1",
      issuedAt: now,
      issuedBy: {
        id: "owner-1",
        name: "Ana",
      },
      revokedAt: null,
      status: GroupInviteStatus.PENDING,
      targetEmail: "pessoa@example.com",
    });
    expect(notificationProvider.sendEmail).toHaveBeenCalledTimes(1);
    const sentEmail = notificationProvider.sendEmail.mock.calls[0][0];
    expect(sentEmail.text).toContain("#token=raw_token-123");
    expect(sentEmail.to).toBe("pessoa@example.com");

    const auditInput =
      prisma.transaction.auditLog.create.mock.calls[0][0];
    expect(JSON.stringify(auditInput)).not.toContain("pessoa@example.com");
    expect(JSON.stringify(auditInput)).not.toContain("raw_token-123");
    expect(JSON.stringify(auditInput)).not.toContain("stored-hash");
  });

  it("activates a pending member as MEMBER and audits the transition atomically", async () => {
    const prisma = createPrismaMock();
    prisma.transaction.groupMembership.findUnique.mockResolvedValue({
      role: GroupRole.OWNER,
    });
    prisma.transaction.groupPendingMembership.findUnique.mockResolvedValue(
      {
        ...pendingMembership,
        user: {
          image: null,
          name: "Pessoa Convidada",
        },
      },
    );
    prisma.transaction.groupPendingMembership.updateMany.mockResolvedValue({
      count: 1,
    });
    prisma.transaction.groupMembership.create.mockResolvedValue({
      createdAt: now,
      id: "membership-2",
      role: GroupRole.MEMBER,
      user: {
        image: null,
        name: "Pessoa Convidada",
      },
    });
    prisma.transaction.groupPendingMembership.update.mockResolvedValue({
      id: "pending-1",
    });
    prisma.transaction.auditLog.create.mockResolvedValue({
      id: "audit-activation",
    });
    const { service } = createService(prisma);

    await expect(
      service.activatePendingMember(
        "owner-1",
        "group-1",
        "pending-1",
      ),
    ).resolves.toEqual({
      id: "membership-2",
      image: null,
      joinedAt: now,
      name: "Pessoa Convidada",
      role: GroupRole.MEMBER,
    });

    expect(
      prisma.transaction.groupPendingMembership.updateMany,
    ).toHaveBeenCalledWith({
      data: {
        activatedAt: now,
        status: PendingMembershipStatus.ACTIVATED,
      },
      where: {
        expiresAt: {
          gt: now,
        },
        groupId: "group-1",
        id: "pending-1",
        status: PendingMembershipStatus.PENDING,
      },
    });
    expect(
      prisma.transaction.groupMembership.create,
    ).toHaveBeenCalledWith({
      data: {
        groupId: "group-1",
        role: GroupRole.MEMBER,
        userId: "user-2",
      },
      select: {
        createdAt: true,
        id: true,
        role: true,
        user: {
          select: {
            image: true,
            name: true,
          },
        },
      },
    });
    expect(
      prisma.transaction.groupPendingMembership.update,
    ).toHaveBeenCalledWith({
      data: {
        activatedMembershipId: "membership-2",
      },
      where: {
        id: "pending-1",
      },
    });
    expect(prisma.transaction.auditLog.create).toHaveBeenCalledWith({
      data: {
        action: "GROUP_MEMBERSHIP_ACTIVATED",
        actorId: "owner-1",
        actorType: AuditActorType.USER,
        groupId: "group-1",
        newValues: {
          activatedAt: now.toISOString(),
          membershipId: "membership-2",
          pendingMembershipId: "pending-1",
          role: GroupRole.MEMBER,
          status: PendingMembershipStatus.ACTIVATED,
          userId: "user-2",
        },
        previousValues: {
          status: PendingMembershipStatus.PENDING,
        },
      },
    });
  });

  it("forbids a Member from issuing invitations", async () => {
    const prisma = createPrismaMock();
    prisma.transaction.groupMembership.findUnique.mockResolvedValue({
      ...membership,
      role: GroupRole.MEMBER,
    });
    const { service } = createService(prisma);

    await expect(
      service.issue("member-1", "group-1", "pessoa@example.com"),
    ).rejects.toEqual(
      new ForbiddenException(
        "Você não pode administrar Convites deste Grupo.",
      ),
    );
    expect(prisma.transaction.groupInvite.create).not.toHaveBeenCalled();
  });

  it("does not expose the raw invitation URL in production responses", async () => {
    const prisma = createPrismaMock();
    prisma.transaction.groupMembership.findUnique.mockResolvedValue(
      membership,
    );
    prisma.transaction.groupMembership.findFirst.mockResolvedValue(null);
    prisma.transaction.groupPendingMembership.findFirst.mockResolvedValue(
      null,
    );
    prisma.transaction.groupInvite.create.mockResolvedValue(invite);
    prisma.transaction.auditLog.create.mockResolvedValue({
      id: "audit-1",
    });
    const { notificationProvider, service } = createService(prisma, {
      NODE_ENV: "production",
      WEB_URL: "https://bolao.example.com",
    });

    const result = await service.issue(
      "owner-1",
      "group-1",
      "pessoa@example.com",
    );

    expect(result).not.toHaveProperty("acceptUrl");
    const sentEmail = notificationProvider.sendEmail.mock.calls[0][0];
    expect(sentEmail.text).toContain("#token=raw_token-123");
  });

  it("hides invitation management from an outsider", async () => {
    const prisma = createPrismaMock();
    prisma.transaction.groupMembership.findUnique.mockResolvedValue(null);
    const { service } = createService(prisma);

    await expect(
      service.issue("outsider-1", "group-1", "pessoa@example.com"),
    ).rejects.toEqual(new NotFoundException("Grupo não encontrado."));
  });

  it("rejects an invitation for an existing member", async () => {
    const prisma = createPrismaMock();
    prisma.transaction.groupMembership.findUnique.mockResolvedValue(
      membership,
    );
    prisma.transaction.groupMembership.findFirst.mockResolvedValue({
      id: "membership-2",
    });
    const { service } = createService(prisma);

    await expect(
      service.issue("owner-1", "group-1", "pessoa@example.com"),
    ).rejects.toEqual(
      new ConflictException("Esta pessoa já é membro do Grupo."),
    );
  });

  it("rejects an invitation for an active pending member", async () => {
    const prisma = createPrismaMock();
    prisma.transaction.groupMembership.findUnique.mockResolvedValue(
      membership,
    );
    prisma.transaction.groupMembership.findFirst.mockResolvedValue(null);
    prisma.transaction.groupPendingMembership.findFirst.mockResolvedValue(
      pendingMembership,
    );
    const { service } = createService(prisma);

    await expect(
      service.issue("owner-1", "group-1", "pessoa@example.com"),
    ).rejects.toEqual(
      new ConflictException(
        "Esta pessoa já possui uma associação pendente.",
      ),
    );
  });

  it("expires a stale invitation before issuing a replacement", async () => {
    const prisma = createPrismaMock();
    prisma.transaction.groupMembership.findUnique.mockResolvedValue(
      membership,
    );
    prisma.transaction.groupInvite.findMany.mockResolvedValue([
      {
        expiresAt: now,
        groupId: "group-1",
        id: "expired-invite",
        status: GroupInviteStatus.PENDING,
      },
    ]);
    prisma.transaction.groupInvite.updateMany.mockResolvedValue({
      count: 1,
    });
    prisma.transaction.groupMembership.findFirst.mockResolvedValue(null);
    prisma.transaction.groupPendingMembership.findFirst.mockResolvedValue(
      null,
    );
    prisma.transaction.groupInvite.create.mockResolvedValue(invite);
    prisma.transaction.auditLog.create.mockResolvedValue({
      id: "audit-1",
    });
    const { service } = createService(prisma);

    await expect(
      service.issue("owner-1", "group-1", "pessoa@example.com"),
    ).resolves.toMatchObject({
      id: "invite-1",
      status: GroupInviteStatus.PENDING,
    });
    expect(prisma.transaction.groupInvite.updateMany).toHaveBeenCalledWith({
      data: {
        expiredAt: now,
        status: GroupInviteStatus.EXPIRED,
      },
      where: {
        expiresAt: {
          lte: now,
        },
        id: "expired-invite",
        status: GroupInviteStatus.PENDING,
      },
    });
    expect(prisma.transaction.auditLog.create).toHaveBeenCalledWith({
      data: {
        action: "GROUP_INVITE_EXPIRED",
        actorId: null,
        actorType: AuditActorType.SYSTEM,
        groupId: "group-1",
        newValues: {
          expiredAt: now.toISOString(),
          inviteId: "expired-invite",
          status: GroupInviteStatus.EXPIRED,
        },
        previousValues: {
          status: GroupInviteStatus.PENDING,
        },
      },
    });
  });

  it("lists invitations without exposing token hashes", async () => {
    const prisma = createPrismaMock();
    prisma.groupMembership.findUnique.mockResolvedValue(membership);
    prisma.groupInvite.findMany.mockResolvedValue([invite]);
    const { service } = createService(prisma);

    const result = await service.list("owner-1", "group-1");

    expect(result).toEqual([
      {
        acceptedAt: null,
        expiredAt: null,
        expiresAt: inviteExpiresAt,
        id: "invite-1",
        issuedAt: now,
        issuedBy: {
          id: "owner-1",
          name: "Ana",
        },
        revokedAt: null,
        status: GroupInviteStatus.PENDING,
        targetEmail: "pessoa@example.com",
      },
    ]);
    expect(JSON.stringify(result)).not.toContain("stored-hash");
  });

  it("does not audit an already revoked invitation again", async () => {
    const prisma = createPrismaMock();
    prisma.transaction.groupMembership.findUnique.mockResolvedValue(
      membership,
    );
    prisma.transaction.groupInvite.findUnique.mockResolvedValue({
      ...invite,
      status: GroupInviteStatus.REVOKED,
    });
    const { service } = createService(prisma);

    await expect(
      service.revoke("owner-1", "group-1", "invite-1"),
    ).resolves.toBeUndefined();
    expect(prisma.transaction.groupInvite.updateMany).not.toHaveBeenCalled();
    expect(prisma.transaction.auditLog.create).not.toHaveBeenCalled();
  });

  it("previews an invitation for the intended verified account without exposing its target email", async () => {
    const prisma = createPrismaMock();
    prisma.transaction.user.findUnique.mockResolvedValue({
      email: "pessoa@example.com",
      emailVerified: true,
      id: "user-2",
    });
    prisma.transaction.groupInvite.findUnique.mockResolvedValue({
      ...invite,
      group: {
        id: "group-1",
        name: "Copa 2026",
      },
      pendingMembership: null,
    });
    const { service } = createService(prisma);

    const result = await service.preview("user-2", "raw_token-123");

    expect(result).toEqual({
      expiresAt: inviteExpiresAt,
      group: {
        id: "group-1",
        name: "Copa 2026",
      },
      id: "invite-1",
      issuedBy: {
        id: "owner-1",
        name: "Ana",
      },
      status: GroupInviteStatus.PENDING,
    });
    expect(JSON.stringify(result)).not.toContain("pessoa@example.com");
    expect(JSON.stringify(result)).not.toContain("raw_token-123");
    expect(JSON.stringify(result)).not.toContain("stored-hash");
  });

  it("does not reveal an invitation to the wrong account", async () => {
    const prisma = createPrismaMock();
    prisma.transaction.user.findUnique.mockResolvedValue({
      email: "outra@example.com",
      emailVerified: true,
      id: "user-3",
    });
    prisma.transaction.groupInvite.findUnique.mockResolvedValue(invite);
    const { service } = createService(prisma);

    await expect(
      service.preview("user-3", "raw_token-123"),
    ).rejects.toEqual(new NotFoundException("Convite indisponível."));
  });

  it("accepts exactly once into a thirty-day pending membership", async () => {
    const prisma = createPrismaMock();
    prisma.transaction.user.findUnique.mockResolvedValue({
      email: "pessoa@example.com",
      emailVerified: true,
      id: "user-2",
    });
    prisma.transaction.groupInvite.findUnique.mockResolvedValue({
      ...invite,
      pendingMembership: null,
    });
    prisma.transaction.groupMembership.findUnique.mockResolvedValue(null);
    prisma.transaction.groupPendingMembership.findFirst.mockResolvedValue(
      null,
    );
    prisma.transaction.groupInvite.updateMany.mockResolvedValue({
      count: 1,
    });
    prisma.transaction.groupPendingMembership.create.mockResolvedValue(
      pendingMembership,
    );
    prisma.transaction.auditLog.create.mockResolvedValue({
      id: "audit-2",
    });
    const { service } = createService(prisma);

    const result = await service.accept("user-2", "raw_token-123");

    expect(
      prisma.transaction.groupPendingMembership.create,
    ).toHaveBeenCalledWith({
      data: {
        acceptedAt: now,
        expiresAt: pendingExpiresAt,
        groupId: "group-1",
        inviteId: "invite-1",
        userId: "user-2",
      },
    });
    expect(result).toEqual({
      outcome: "PENDING_IDENTITY_VALIDATION",
      pendingMembership,
    });
    expect(prisma.transaction.auditLog.create).toHaveBeenCalledWith({
      data: {
        action: "GROUP_INVITE_ACCEPTED",
        actorId: "user-2",
        actorType: AuditActorType.USER,
        groupId: "group-1",
        newValues: {
          acceptedAt: now.toISOString(),
          expiresAt: pendingExpiresAt.toISOString(),
          inviteId: "invite-1",
          pendingMembershipId: "pending-1",
          status: PendingMembershipStatus.PENDING,
        },
        previousValues: {
          status: GroupInviteStatus.PENDING,
        },
      },
    });
    expect(
      prisma.transaction.groupMembership.create,
    ).not.toHaveBeenCalled();
  });

  it("returns the same pending membership on sequential duplicate acceptance", async () => {
    const prisma = createPrismaMock();
    prisma.transaction.user.findUnique.mockResolvedValue({
      email: "pessoa@example.com",
      emailVerified: true,
      id: "user-2",
    });
    prisma.transaction.groupInvite.findUnique.mockResolvedValue({
      ...invite,
      acceptedById: "user-2",
      pendingMembership,
      status: GroupInviteStatus.ACCEPTED,
    });
    const { service } = createService(prisma);

    await expect(
      service.accept("user-2", "raw_token-123"),
    ).resolves.toEqual({
      outcome: "PENDING_IDENTITY_VALIDATION",
      pendingMembership,
    });
    expect(
      prisma.transaction.groupPendingMembership.create,
    ).not.toHaveBeenCalled();
    expect(prisma.transaction.auditLog.create).not.toHaveBeenCalled();
  });

  it("returns the matching pending membership when a concurrent acceptance commits between reads", async () => {
    const prisma = createPrismaMock();
    prisma.transaction.user.findUnique.mockResolvedValue({
      email: "pessoa@example.com",
      emailVerified: true,
      id: "user-2",
    });
    prisma.transaction.groupInvite.findUnique.mockResolvedValue({
      ...invite,
      pendingMembership: null,
    });
    prisma.transaction.groupMembership.findUnique.mockResolvedValue(null);
    prisma.transaction.groupPendingMembership.findFirst.mockResolvedValue(
      pendingMembership,
    );
    const { service } = createService(prisma);

    await expect(
      service.accept("user-2", "raw_token-123"),
    ).resolves.toEqual({
      outcome: "PENDING_IDENTITY_VALIDATION",
      pendingMembership,
    });
    expect(prisma.transaction.groupInvite.updateMany).not.toHaveBeenCalled();
    expect(
      prisma.transaction.groupPendingMembership.create,
    ).not.toHaveBeenCalled();
    expect(prisma.transaction.auditLog.create).not.toHaveBeenCalled();
  });

  it("returns the persisted pending membership when concurrent acceptance hits a unique constraint", async () => {
    const prisma = createPrismaMock();
    prisma.$transaction.mockRejectedValueOnce({
      code: "P2002",
    });
    prisma.groupInvite.findUnique.mockResolvedValue({
      ...invite,
      acceptedById: "user-2",
      pendingMembership,
      status: GroupInviteStatus.ACCEPTED,
    });
    const { service } = createService(prisma);

    await expect(
      service.accept("user-2", "raw_token-123"),
    ).resolves.toEqual({
      outcome: "PENDING_IDENTITY_VALIDATION",
      pendingMembership,
    });
    expect(prisma.groupInvite.findUnique).toHaveBeenCalledWith({
      include: {
        pendingMembership: true,
      },
      where: {
        tokenHash: "stored-hash",
      },
    });
  });

  it("does not reuse an accepted invitation after its pending membership expired", async () => {
    const prisma = createPrismaMock();
    prisma.transaction.user.findUnique.mockResolvedValue({
      email: "pessoa@example.com",
      emailVerified: true,
      id: "user-2",
    });
    prisma.transaction.groupInvite.findUnique.mockResolvedValue({
      ...invite,
      acceptedById: "user-2",
      pendingMembership: {
        ...pendingMembership,
        status: PendingMembershipStatus.EXPIRED,
      },
      status: GroupInviteStatus.ACCEPTED,
    });
    const { service } = createService(prisma);

    await expect(
      service.accept("user-2", "raw_token-123"),
    ).rejects.toEqual(new NotFoundException("Convite indisponível."));
    expect(
      prisma.transaction.groupPendingMembership.create,
    ).not.toHaveBeenCalled();
  });

  it("returns gone when expiration wins the acceptance transition", async () => {
    const prisma = createPrismaMock();
    prisma.transaction.user.findUnique.mockResolvedValue({
      email: "pessoa@example.com",
      emailVerified: true,
      id: "user-2",
    });
    prisma.transaction.groupInvite.findUnique
      .mockResolvedValueOnce({
        ...invite,
        pendingMembership: null,
      })
      .mockResolvedValueOnce({
        ...invite,
        pendingMembership: null,
        status: GroupInviteStatus.EXPIRED,
      });
    prisma.transaction.groupMembership.findUnique.mockResolvedValue(null);
    prisma.transaction.groupPendingMembership.findFirst.mockResolvedValue(
      null,
    );
    prisma.transaction.groupInvite.updateMany.mockResolvedValue({
      count: 0,
    });
    const { service } = createService(prisma);

    await expect(
      service.accept("user-2", "raw_token-123"),
    ).rejects.toEqual(new GoneException("Este Convite expirou."));
    expect(
      prisma.transaction.groupPendingMembership.create,
    ).not.toHaveBeenCalled();
  });

  it("expires a due invitation as SYSTEM and returns gone", async () => {
    const prisma = createPrismaMock();
    prisma.transaction.user.findUnique.mockResolvedValue({
      email: "pessoa@example.com",
      emailVerified: true,
      id: "user-2",
    });
    prisma.transaction.groupInvite.findUnique.mockResolvedValue({
      ...invite,
      expiresAt: now,
      pendingMembership: null,
    });
    prisma.transaction.groupInvite.updateMany.mockResolvedValue({
      count: 1,
    });
    prisma.transaction.auditLog.create.mockResolvedValue({
      id: "audit-expired",
    });
    const { service } = createService(prisma);

    await expect(
      service.accept("user-2", "raw_token-123"),
    ).rejects.toEqual(new GoneException("Este Convite expirou."));
    expect(prisma.transaction.auditLog.create).toHaveBeenCalledWith({
      data: {
        action: "GROUP_INVITE_EXPIRED",
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
  });

  it("does not consume an invitation for an unverified account", async () => {
    const prisma = createPrismaMock();
    prisma.transaction.user.findUnique.mockResolvedValue({
      email: "pessoa@example.com",
      emailVerified: false,
      id: "user-2",
    });
    prisma.transaction.groupInvite.findUnique.mockResolvedValue(invite);
    const { service } = createService(prisma);

    await expect(
      service.accept("user-2", "raw_token-123"),
    ).rejects.toEqual(
      new ForbiddenException(
        "Confirme seu e-mail antes de aceitar Convites.",
      ),
    );
    expect(prisma.transaction.groupInvite.updateMany).not.toHaveBeenCalled();
  });

  it("rejects a duplicate active invitation reported by the database", async () => {
    const prisma = createPrismaMock();
    prisma.transaction.groupMembership.findUnique.mockResolvedValue(
      membership,
    );
    prisma.transaction.groupMembership.findFirst.mockResolvedValue(null);
    prisma.transaction.groupPendingMembership.findFirst.mockResolvedValue(
      null,
    );
    prisma.transaction.groupInvite.create.mockRejectedValue({
      code: "P2002",
    });
    const { service } = createService(prisma);

    await expect(
      service.issue("owner-1", "group-1", "pessoa@example.com"),
    ).rejects.toEqual(
      new ConflictException(
        "Já existe um Convite pendente para este e-mail.",
      ),
    );
  });
});
