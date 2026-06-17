import {
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { PrismaClient } from "../generated/prisma/client.js";
import { GroupInviteStatus } from "../generated/prisma/enums.js";
import {
  PendingMembershipStatus,
} from "../generated/prisma/enums.js";

@Injectable()
export class MeService {
  constructor(private readonly prisma: PrismaClient) {}

  async listIncomingInvites(userId: string) {
    const user = await this.prisma.user.findUnique({
      select: { email: true },
      where: { id: userId },
    });

    if (!user?.email) {
      throw new ForbiddenException(
        "Confirme seu e-mail antes de visualizar Convites.",
      );
    }

    const rows = await this.prisma.groupInvite.findMany({
      orderBy: { expiresAt: "asc" },
      where: {
        status: GroupInviteStatus.PENDING,
        targetEmail: user.email.toLowerCase(),
      },
      select: {
        expiresAt: true,
        id: true,
        issuedAt: true,
        issuedBy: {
          select: { id: true, name: true },
        },
        group: {
          select: { id: true, name: true },
        },
        status: true,
      },
    });

    return rows.map((row) => ({
      id: row.id,
      expiresAt: row.expiresAt,
      issuedAt: row.issuedAt,
      status: row.status,
      group: { id: row.group.id, name: row.group.name },
      issuedBy: {
        id: row.issuedBy.id,
        name: row.issuedBy.name,
      },
    }));
  }

  async listPendingMemberships(userId: string) {
    const rows = await this.prisma.groupPendingMembership.findMany({
      orderBy: { expiresAt: "asc" },
      where: {
        status: PendingMembershipStatus.PENDING,
        userId,
      },
      select: {
        acceptedAt: true,
        expiresAt: true,
        id: true,
        status: true,
        group: {
          select: { id: true, name: true },
        },
      },
    });

    return rows.map((row) => ({
      id: row.id,
      acceptedAt: row.acceptedAt,
      expiresAt: row.expiresAt,
      status: row.status,
      group: { id: row.group.id, name: row.group.name },
    }));
  }
}
