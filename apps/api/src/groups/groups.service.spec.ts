import { jest } from "@jest/globals";
import { NotFoundException } from "@nestjs/common";
import type { PrismaClient } from "../generated/prisma/client.js";
import { GroupRole } from "../generated/prisma/enums.js";
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

function createPrismaMock() {
  return {
    group: {
      create: jest.fn<(input: unknown) => Promise<CreatedGroupRecord>>(),
    },
    groupMembership: {
      findMany:
        jest.fn<(input: unknown) => Promise<MembershipRecord[]>>(),
      findUnique:
        jest.fn<
          (input: unknown) => Promise<MembershipRecord | null>
        >(),
    },
  };
}

describe("GroupsService", () => {
  it("creates the group and OWNER membership atomically", async () => {
    const prisma = createPrismaMock();
    prisma.group.create.mockResolvedValue({
      createdAt,
      description: "Amigos da Copa",
      id: "group-1",
      image: null,
      memberships: [{ role: GroupRole.OWNER }],
      name: "Copa 2026",
      updatedAt,
    });
    const service = new GroupsService(prisma as unknown as PrismaClient);

    const result = await service.create("user-1", {
      description: "Amigos da Copa",
      name: "Copa 2026",
    });

    expect(prisma.group.create).toHaveBeenCalledWith({
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
    const service = new GroupsService(prisma as unknown as PrismaClient);

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
    const service = new GroupsService(prisma as unknown as PrismaClient);

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
    const service = new GroupsService(prisma as unknown as PrismaClient);

    await expect(
      service.getById("user-2", "group-1"),
    ).rejects.toEqual(new NotFoundException("Grupo não encontrado."));
  });
});
