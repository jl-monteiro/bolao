import { Injectable } from "@nestjs/common";
import { Interval } from "@nestjs/schedule";
import { PrismaClient } from "../generated/prisma/client.js";
import {
  AuditAction,
  AuditActorType,
  GroupInviteStatus,
  PendingMembershipStatus,
} from "../generated/prisma/enums.js";

const EXPIRATION_INTERVAL_MS = 60_000;
const EXPIRATION_BATCH_SIZE = 100;

type ExpirableRecord = {
  groupId: string;
  id: string;
};

@Injectable()
export class GroupInviteExpirationService {
  constructor(private readonly prisma: PrismaClient) {}

  @Interval("group-invite-expiration", EXPIRATION_INTERVAL_MS)
  expireScheduledRecords(): Promise<void> {
    return this.expireDueRecords(new Date());
  }

  async expireDueRecords(now: Date): Promise<void> {
    const [invites, pendingMemberships] = await Promise.all([
      this.prisma.groupInvite.findMany({
        orderBy: [{ expiresAt: "asc" }, { id: "asc" }],
        select: {
          groupId: true,
          id: true,
        },
        take: EXPIRATION_BATCH_SIZE,
        where: {
          expiresAt: {
            lte: now,
          },
          status: GroupInviteStatus.PENDING,
        },
      }),
      this.prisma.groupPendingMembership.findMany({
        orderBy: [{ expiresAt: "asc" }, { id: "asc" }],
        select: {
          groupId: true,
          id: true,
        },
        take: EXPIRATION_BATCH_SIZE,
        where: {
          expiresAt: {
            lte: now,
          },
          status: PendingMembershipStatus.PENDING,
        },
      }),
    ]);

    await Promise.allSettled([
      ...invites.map((invite) => this.expireInvite(invite, now)),
      ...pendingMemberships.map((pendingMembership) =>
        this.expirePendingMembership(pendingMembership, now),
      ),
    ]);
  }

  private async expireInvite(
    invite: ExpirableRecord,
    now: Date,
  ): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      const transition = await transaction.groupInvite.updateMany({
        data: {
          expiredAt: now,
          status: GroupInviteStatus.EXPIRED,
        },
        where: {
          expiresAt: {
            lte: now,
          },
          id: invite.id,
          status: GroupInviteStatus.PENDING,
        },
      });

      if (transition.count === 0) {
        return;
      }

      await transaction.auditLog.create({
        data: {
          action: AuditAction.GROUP_INVITE_EXPIRED,
          actorId: null,
          actorType: AuditActorType.SYSTEM,
          groupId: invite.groupId,
          newValues: {
            expiredAt: now.toISOString(),
            inviteId: invite.id,
            status: GroupInviteStatus.EXPIRED,
          },
          previousValues: {
            status: GroupInviteStatus.PENDING,
          },
        },
      });
    });
  }

  private async expirePendingMembership(
    pendingMembership: ExpirableRecord,
    now: Date,
  ): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      const transition =
        await transaction.groupPendingMembership.updateMany({
          data: {
            expiredAt: now,
            status: PendingMembershipStatus.EXPIRED,
          },
          where: {
            expiresAt: {
              lte: now,
            },
            id: pendingMembership.id,
            status: PendingMembershipStatus.PENDING,
          },
        });

      if (transition.count === 0) {
        return;
      }

      await transaction.auditLog.create({
        data: {
          action: AuditAction.GROUP_PENDING_MEMBERSHIP_EXPIRED,
          actorId: null,
          actorType: AuditActorType.SYSTEM,
          groupId: pendingMembership.groupId,
          newValues: {
            expiredAt: now.toISOString(),
            pendingMembershipId: pendingMembership.id,
            status: PendingMembershipStatus.EXPIRED,
          },
          previousValues: {
            status: PendingMembershipStatus.PENDING,
          },
        },
      });
    });
  }
}
