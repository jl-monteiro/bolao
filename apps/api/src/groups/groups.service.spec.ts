import { jest } from "@jest/globals";
import {
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import {
  Prisma,
  type PrismaClient,
} from "../generated/prisma/client.js";
import { GroupRole } from "../generated/prisma/enums.js";
import { GroupRolePolicy } from "./group-role.policy.js";
import { GroupsService } from "./groups.service.js";

const createdAt = new Date("2026-06-13T12:00:00.000Z");
const updatedAt = new Date("2026-06-13T12:00:00.000Z");

type GroupRecord = {
  createdAt: Date;
  description: string | null;
  id: string;
  image: string | null;
  name: string;
  updatedAt: Date;
};

type CreatedGroupRecord = GroupRecord & {
  memberships: Array<{
    role: GroupRole;
  }>;
};

type MembershipRecord = {
  createdAt?: Date;
  group: GroupRecord;
  role: GroupRole;
};

type GroupMemberRecord = {
  createdAt: Date;
  id: string;
  role: GroupRole;
  user: {
    image: string | null;
    name: string;
  };
};

function createPrismaMock() {
  const transaction = {
    auditLog: {
      create: jest.fn<(input: unknown) => Promise<unknown>>(),
    },
    group: {
      create: jest.fn<(input: unknown) => Promise<CreatedGroupRecord>>(),
      update: jest.fn<(input: unknown) => Promise<GroupRecord>>(),
    },
    groupMembership: {
      findMany:
        jest.fn<
          (
            input: unknown,
          ) => Promise<Array<GroupMemberRecord | MembershipRecord>>
        >(),
      findUnique:
        jest.fn<
          (input: unknown) => Promise<MembershipRecord | null>
        >(),
    },
  };

  return {
    $transaction: jest.fn(
      async (
        operation: (client: typeof transaction) => Promise<unknown>,
      ) => operation(transaction),
    ),
    group: {
      create: jest.fn<(input: unknown) => Promise<CreatedGroupRecord>>(),
    },
    groupMembership: transaction.groupMembership,
    transaction,
  };
}

function createService(prisma: ReturnType<typeof createPrismaMock>) {
  return new GroupsService(
    prisma as unknown as PrismaClient,
    new GroupRolePolicy(),
  );
}

describe("GroupsService", () => {
  it("creates the group and OWNER membership atomically", async () => {
    const prisma = createPrismaMock();
    const createdGroup = {
      createdAt,
      description: "Amigos da Copa",
      id: "group-1",
      image: null,
      memberships: [{ role: GroupRole.OWNER }],
      name: "Copa 2026",
      updatedAt,
    };
    prisma.group.create.mockResolvedValue(createdGroup);
    prisma.transaction.group.create.mockResolvedValue(createdGroup);
    prisma.transaction.auditLog.create.mockResolvedValue({
      id: "audit-1",
    });
    const service = createService(prisma);

    const result = await service.create("user-1", {
      description: "Amigos da Copa",
      name: "Copa 2026",
    });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.transaction.group.create).toHaveBeenCalledWith({
      data: {
        description: "Amigos da Copa",
        memberships: {
          create: {
            role: "OWNER",
            userId: "user-1",
          },
        },
        name: "Copa 2026",
      },
      include: {
        memberships: {
          select: {
            role: true,
          },
        },
      },
    });
    expect(prisma.transaction.auditLog.create).toHaveBeenCalledWith({
      data: {
        action: "GROUP_CREATED",
        actorId: "user-1",
        groupId: "group-1",
        newValues: {
          description: "Amigos da Copa",
          name: "Copa 2026",
        },
        previousValues: Prisma.DbNull,
      },
    });
    expect(result).toEqual({
      createdAt,
      description: "Amigos da Copa",
      id: "group-1",
      image: null,
      name: "Copa 2026",
      role: "OWNER",
      updatedAt,
    });
  });

  it("lists only memberships belonging to the current user", async () => {
    const prisma = createPrismaMock();
    prisma.groupMembership.findMany.mockResolvedValue([
      {
        createdAt,
        group: {
          createdAt,
          description: null,
          id: "group-1",
          image: null,
          name: "Família",
          updatedAt,
        },
        role: GroupRole.MEMBER,
      },
    ]);
    const service = createService(prisma);

    const result = await service.list("user-1");

    expect(prisma.groupMembership.findMany).toHaveBeenCalledWith({
      include: {
        group: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      where: {
        userId: "user-1",
      },
    });
    expect(result).toEqual([
      {
        createdAt,
        description: null,
        id: "group-1",
        image: null,
        name: "Família",
        role: "MEMBER",
        updatedAt,
      },
    ]);
  });

  it("returns a group only when the current user is a member", async () => {
    const prisma = createPrismaMock();
    prisma.groupMembership.findUnique.mockResolvedValue({
      group: {
        createdAt,
        description: null,
        id: "group-1",
        image: null,
        name: "Trabalho",
        updatedAt,
      },
      role: GroupRole.ORGANIZER,
    });
    const service = createService(prisma);

    const result = await service.getById("user-1", "group-1");

    expect(prisma.groupMembership.findUnique).toHaveBeenCalledWith({
      include: {
        group: true,
      },
      where: {
        groupId_userId: {
          groupId: "group-1",
          userId: "user-1",
        },
      },
    });
    expect(result.role).toBe("ORGANIZER");
    expect(result.id).toBe("group-1");
  });

  it("hides a group from a non-member", async () => {
    const prisma = createPrismaMock();
    prisma.groupMembership.findUnique.mockResolvedValue(null);
    const service = createService(prisma);

    await expect(
      service.getById("user-2", "group-1"),
    ).rejects.toEqual(new NotFoundException("Grupo não encontrado."));
  });

  it("lists Group members without exposing private user data", async () => {
    const prisma = createPrismaMock();
    prisma.groupMembership.findUnique.mockResolvedValue({
      group: {
        createdAt,
        description: null,
        id: "group-1",
        image: null,
        name: "Família",
        updatedAt,
      },
      role: GroupRole.MEMBER,
    });
    prisma.groupMembership.findMany.mockResolvedValue([
      {
        createdAt,
        id: "membership-1",
        role: GroupRole.OWNER,
        user: {
          image: "https://example.com/avatar.png",
          name: "Ana",
        },
      },
    ]);
    const service = createService(prisma);

    await expect(
      service.listMembers("user-1", "group-1"),
    ).resolves.toEqual([
      {
        id: "membership-1",
        image: "https://example.com/avatar.png",
        joinedAt: createdAt,
        name: "Ana",
        role: GroupRole.OWNER,
      },
    ]);
    expect(prisma.groupMembership.findUnique).toHaveBeenCalledWith({
      select: {
        id: true,
      },
      where: {
        groupId_userId: {
          groupId: "group-1",
          userId: "user-1",
        },
      },
    });
    expect(prisma.groupMembership.findMany).toHaveBeenCalledWith({
      orderBy: {
        createdAt: "asc",
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
      where: {
        groupId: "group-1",
      },
    });
  });

  it("hides the member list from a non-member", async () => {
    const prisma = createPrismaMock();
    prisma.groupMembership.findUnique.mockResolvedValue(null);
    const service = createService(prisma);

    await expect(
      service.listMembers("user-2", "group-1"),
    ).rejects.toEqual(new NotFoundException("Grupo não encontrado."));
    expect(prisma.groupMembership.findMany).not.toHaveBeenCalled();
  });

  it("updates Group details as Owner and records previous and new values", async () => {
    const prisma = createPrismaMock();
    prisma.transaction.groupMembership.findUnique.mockResolvedValue({
      group: {
        createdAt,
        description: "Descrição anterior",
        id: "group-1",
        image: null,
        name: "Nome anterior",
        updatedAt,
      },
      role: GroupRole.OWNER,
    });
    prisma.transaction.group.update.mockResolvedValue({
      createdAt,
      description: "Descrição nova",
      id: "group-1",
      image: null,
      name: "Nome novo",
      updatedAt,
    });
    prisma.transaction.auditLog.create.mockResolvedValue({
      id: "audit-2",
    });
    const service = createService(prisma);

    await expect(
      service.update("user-1", "group-1", {
        description: "Descrição nova",
        name: "Nome novo",
      }),
    ).resolves.toEqual({
      createdAt,
      description: "Descrição nova",
      id: "group-1",
      image: null,
      name: "Nome novo",
      role: GroupRole.OWNER,
      updatedAt,
    });
    expect(
      prisma.transaction.groupMembership.findUnique,
    ).toHaveBeenCalledWith({
      include: {
        group: true,
      },
      where: {
        groupId_userId: {
          groupId: "group-1",
          userId: "user-1",
        },
      },
    });
    expect(prisma.transaction.group.update).toHaveBeenCalledWith({
      data: {
        description: "Descrição nova",
        name: "Nome novo",
      },
      where: {
        id: "group-1",
      },
    });
    expect(prisma.transaction.auditLog.create).toHaveBeenCalledWith({
      data: {
        action: "GROUP_UPDATED",
        actorId: "user-1",
        groupId: "group-1",
        newValues: {
          description: "Descrição nova",
          name: "Nome novo",
        },
        previousValues: {
          description: "Descrição anterior",
          name: "Nome anterior",
        },
      },
    });
  });

  it("allows an Organizer to update Group details", async () => {
    const prisma = createPrismaMock();
    prisma.transaction.groupMembership.findUnique.mockResolvedValue({
      group: {
        createdAt,
        description: null,
        id: "group-1",
        image: null,
        name: "Nome anterior",
        updatedAt,
      },
      role: GroupRole.ORGANIZER,
    });
    prisma.transaction.group.update.mockResolvedValue({
      createdAt,
      description: null,
      id: "group-1",
      image: null,
      name: "Nome novo",
      updatedAt,
    });
    prisma.transaction.auditLog.create.mockResolvedValue({
      id: "audit-2",
    });
    const service = createService(prisma);

    await expect(
      service.update("user-2", "group-1", {
        name: "Nome novo",
      }),
    ).resolves.toMatchObject({
      name: "Nome novo",
      role: GroupRole.ORGANIZER,
    });
  });

  it("forbids a Member from updating Group details", async () => {
    const prisma = createPrismaMock();
    prisma.transaction.groupMembership.findUnique.mockResolvedValue({
      group: {
        createdAt,
        description: null,
        id: "group-1",
        image: null,
        name: "Família",
        updatedAt,
      },
      role: GroupRole.MEMBER,
    });
    const service = createService(prisma);

    await expect(
      service.update("user-2", "group-1", {
        name: "Nome indevido",
      }),
    ).rejects.toMatchObject({
      status: 403,
    });
    expect(prisma.transaction.group.update).not.toHaveBeenCalled();
    expect(prisma.transaction.auditLog.create).not.toHaveBeenCalled();
  });

  it("hides Group updates from a non-member", async () => {
    const prisma = createPrismaMock();
    prisma.transaction.groupMembership.findUnique.mockResolvedValue(null);
    const service = createService(prisma);

    await expect(
      service.update("user-3", "group-1", {
        name: "Nome indevido",
      }),
    ).rejects.toEqual(new NotFoundException("Grupo não encontrado."));
    expect(prisma.transaction.group.update).not.toHaveBeenCalled();
    expect(prisma.transaction.auditLog.create).not.toHaveBeenCalled();
  });

  it("rejects an update without Group fields", async () => {
    const prisma = createPrismaMock();
    const service = createService(prisma);

    await expect(
      service.update("user-1", "group-1", {}),
    ).rejects.toEqual(
      new BadRequestException(
        "Informe nome ou descrição para atualizar o Grupo.",
      ),
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
