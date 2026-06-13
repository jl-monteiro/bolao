import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaClient } from "../generated/prisma/client.js";
import { GroupRole } from "../generated/prisma/enums.js";
import { CreateGroupDto } from "./dto/create-group.dto.js";

export type GroupResult = {
  createdAt: Date;
  description: string | null;
  id: string;
  image: string | null;
  name: string;
  role: GroupRole;
  updatedAt: Date;
};

type GroupRecord = Omit<GroupResult, "role">;

function toGroupResult(group: GroupRecord, role: GroupRole): GroupResult {
  return {
    createdAt: group.createdAt,
    description: group.description,
    id: group.id,
    image: group.image,
    name: group.name,
    role,
    updatedAt: group.updatedAt,
  };
}

@Injectable()
export class GroupsService {
  constructor(private readonly prisma: PrismaClient) {}

  async create(userId: string, input: CreateGroupDto): Promise<GroupResult> {
    const group = await this.prisma.group.create({
      data: {
        description: input.description,
        memberships: {
          create: {
            role: GroupRole.OWNER,
            userId,
          },
        },
        name: input.name,
      },
      include: {
        memberships: {
          select: {
            role: true,
          },
        },
      },
    });

    return toGroupResult(group, group.memberships[0].role);
  }

  async list(userId: string): Promise<GroupResult[]> {
    const memberships = await this.prisma.groupMembership.findMany({
      include: {
        group: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      where: {
        userId,
      },
    });

    return memberships.map(({ group, role }) => toGroupResult(group, role));
  }

  async getById(userId: string, groupId: string): Promise<GroupResult> {
    const membership = await this.prisma.groupMembership.findUnique({
      include: {
        group: true,
      },
      where: {
        groupId_userId: {
          groupId,
          userId,
        },
      },
    });

    if (!membership) {
      throw new NotFoundException("Grupo não encontrado.");
    }

    return toGroupResult(membership.group, membership.role);
  }
}
