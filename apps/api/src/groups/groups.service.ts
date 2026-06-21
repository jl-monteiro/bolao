import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  Prisma,
  PrismaClient,
} from "../generated/prisma/client.js";
import {
  AuditAction,
  AuditActorType,
  GroupRole,
} from "../generated/prisma/enums.js";
import { CreateGroupDto } from "./dto/create-group.dto.js";
import { UpdateGroupMemberRoleDto } from "./dto/update-group-member-role.dto.js";
import { UpdateGroupDto } from "./dto/update-group.dto.js";
import { GroupRolePolicy } from "./group-role.policy.js";

export type GroupResult = {
  createdAt: Date;
  description: string | null;
  id: string;
  image: string | null;
  name: string;
  role: GroupRole;
  updatedAt: Date;
};

export type GroupMemberResult = {
  id: string;
  image: string | null;
  joinedAt: Date;
  name: string;
  role: GroupRole;
};

type GroupRecord = Omit<GroupResult, "role">;

type GroupMemberRecord = {
  createdAt: Date;
  id: string;
  role: GroupRole;
  user: {
    image: string | null;
    name: string;
  };
};

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

function toGroupMemberResult(
  membership: GroupMemberRecord,
): GroupMemberResult {
  return {
    id: membership.id,
    image: membership.user.image,
    joinedAt: membership.createdAt,
    name: membership.user.name,
    role: membership.role,
  };
}

@Injectable()
export class GroupsService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly rolePolicy: GroupRolePolicy,
  ) {}

  async create(userId: string, input: CreateGroupDto): Promise<GroupResult> {
    return this.prisma.$transaction(async (transaction) => {
      const group = await transaction.group.create({
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

      await transaction.auditLog.create({
        data: {
          action: AuditAction.GROUP_CREATED,
          actorId: userId,
          groupId: group.id,
          newValues: {
            description: input.description ?? null,
            name: input.name,
          },
          previousValues: Prisma.DbNull,
        },
      });

      return toGroupResult(group, group.memberships[0].role);
    });
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

  async listMembers(
    userId: string,
    groupId: string,
  ): Promise<GroupMemberResult[]> {
    const requesterMembership =
      await this.prisma.groupMembership.findUnique({
        select: {
          id: true,
        },
        where: {
          groupId_userId: {
            groupId,
            userId,
          },
        },
      });

    if (!requesterMembership) {
      throw new NotFoundException("Grupo não encontrado.");
    }

    const memberships = await this.prisma.groupMembership.findMany({
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
        groupId,
      },
    });

    return memberships.map(toGroupMemberResult);
  }

  async updateMemberRole(
    userId: string,
    groupId: string,
    membershipId: string,
    input: UpdateGroupMemberRoleDto,
  ): Promise<GroupMemberResult> {
    return this.prisma.$transaction(async (transaction) => {
      const requesterMembership =
        await transaction.groupMembership.findUnique({
          select: {
            role: true,
          },
          where: {
            groupId_userId: {
              groupId,
              userId,
            },
          },
        });

      if (!requesterMembership) {
        throw new NotFoundException("Grupo não encontrado.");
      }

      this.rolePolicy.assertCanManageMemberRoles(
        requesterMembership.role,
      );

      const targetMembership =
        await transaction.groupMembership.findFirst({
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
            groupId,
            id: membershipId,
          },
        });

      if (!targetMembership) {
        throw new NotFoundException("Membro do Grupo não encontrado.");
      }

      if (targetMembership.role === GroupRole.OWNER) {
        throw new ForbiddenException(
          "Você não pode alterar o papel do Proprietário do Grupo.",
        );
      }

      if (targetMembership.role === input.role) {
        return toGroupMemberResult(targetMembership);
      }

      const updatedMembership =
        await transaction.groupMembership.update({
          data: {
            role: input.role,
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
            id: membershipId,
          },
        });

      await transaction.auditLog.create({
        data: {
          action: AuditAction.GROUP_MEMBER_ROLE_UPDATED,
          actorId: userId,
          actorType: AuditActorType.USER,
          groupId,
          newValues: {
            membershipId,
            role: updatedMembership.role,
          },
          previousValues: {
            membershipId,
            role: targetMembership.role,
          },
        },
      });

      return toGroupMemberResult(updatedMembership);
    });
  }

  async update(
    userId: string,
    groupId: string,
    input: UpdateGroupDto,
  ): Promise<GroupResult> {
    const data: {
      description?: string | null;
      name?: string;
    } = {};

    if (input.name !== undefined) {
      data.name = input.name;
    }

    if (input.description !== undefined) {
      data.description = input.description;
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException(
        "Informe nome ou descrição para atualizar o Grupo.",
      );
    }

    return this.prisma.$transaction(async (transaction) => {
      const membership =
        await transaction.groupMembership.findUnique({
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

      this.rolePolicy.assertCanUpdate(membership.role);

      const group = await transaction.group.update({
        data,
        where: {
          id: groupId,
        },
      });

      await transaction.auditLog.create({
        data: {
          action: AuditAction.GROUP_UPDATED,
          actorId: userId,
          groupId,
          newValues: {
            description: group.description,
            name: group.name,
          },
          previousValues: {
            description: membership.group.description,
            name: membership.group.name,
          },
        },
      });

      return toGroupResult(group, membership.role);
    });
  }
}
