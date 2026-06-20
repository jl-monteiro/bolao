import { randomUUID } from "node:crypto";
import {
  ConflictException,
  ForbiddenException,
  GoneException,
  Inject,
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
  PendingMembershipStatus,
} from "../generated/prisma/enums.js";

export const ACTIVATION_CLOCK = Symbol("ActivationClock");

export type ActivationClock = {
  now(): Date;
};

export type ActivatedMembershipResult = {
  groupId: string;
  joinedAt: Date;
  pendingMembershipId: string;
  role: GroupRole;
};

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}

@Injectable()
export class PendingMembershipActivationService {
  constructor(
    private readonly prisma: PrismaClient,
    @Inject(ACTIVATION_CLOCK)
    private readonly clock: ActivationClock,
  ) {}

  async activate(
    actorUserId: string,
    pendingMembershipId: string,
  ): Promise<ActivatedMembershipResult> {
    const now = this.clock.now();

    let result!: ActivatedMembershipResult;

    try {
      result = await this.prisma.$transaction(async (transaction) => {
        const user = await transaction.user.findUnique({
          select: {
            emailVerified: true,
            identityValidatedAt: true,
          },
          where: { id: actorUserId },
        });

        if (!user?.emailVerified || !user.identityValidatedAt) {
          throw new ForbiddenException(
            "Valide sua identidade antes de ativar a associação pendente.",
          );
        }

        const pending =
          await transaction.groupPendingMembership.findFirst({
            where: {
              id: pendingMembershipId,
              userId: actorUserId,
            },
          });

        if (!pending) {
          throw new NotFoundException(
            "Associação pendente não encontrada.",
          );
        }

        if (pending.status === PendingMembershipStatus.EXPIRED) {
          throw new GoneException(
            "Esta associação pendente já expirou.",
          );
        }

        if (pending.status === PendingMembershipStatus.ACTIVATED) {
          const existing = await this.findExistingActivatedMembership(
            transaction,
            pending,
          );

          if (!existing) {
            throw new ConflictException(
              "Esta associação pendente não está mais disponível para ativação.",
            );
          }

          return {
            groupId: pending.groupId,
            joinedAt: existing.createdAt,
            pendingMembershipId: pending.id,
            role: existing.role,
          };
        }

        if (pending.expiresAt.getTime() <= now.getTime()) {
          await this.expireStalePending(transaction, pending, now);
          throw new GoneException(
            "Esta associação pendente já expirou.",
          );
        }

        const membershipId = randomUUID();
        const transition =
          await transaction.groupPendingMembership.updateMany({
            data: {
              activatedAt: now,
              activatedMembershipId: membershipId,
              status: PendingMembershipStatus.ACTIVATED,
            },
            where: {
              expiresAt: { gt: now },
              id: pending.id,
              status: PendingMembershipStatus.PENDING,
              userId: actorUserId,
            },
          });

        if (transition.count === 0) {
          throw new ConflictException(
            "Esta associação pendente não está mais disponível para ativação.",
          );
        }

        const membership =
          await transaction.groupMembership.create({
            data: {
              createdAt: now,
              groupId: pending.groupId,
              id: membershipId,
              role: GroupRole.MEMBER,
              updatedAt: now,
              userId: actorUserId,
            },
            select: {
              createdAt: true,
              id: true,
              role: true,
            },
          });

        await transaction.auditLog.create({
          data: {
            action: AuditAction.GROUP_MEMBERSHIP_ACTIVATED,
            actorId: actorUserId,
            actorType: AuditActorType.USER,
            groupId: pending.groupId,
            newValues: {
              activatedAt: now.toISOString(),
              membershipId: membership.id,
              pendingMembershipId: pending.id,
              role: membership.role,
              status: PendingMembershipStatus.ACTIVATED,
              userId: actorUserId,
            },
            previousValues: {
              status: PendingMembershipStatus.PENDING,
            },
          },
        });

        return {
          groupId: pending.groupId,
          joinedAt: membership.createdAt,
          pendingMembershipId: pending.id,
          role: membership.role,
        };
      });
    } catch (error: unknown) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException(
          "Esta pessoa já é membro deste Grupo.",
        );
      }

      throw error;
    }

    return result;
  }

  private async findExistingActivatedMembership(
    transaction: Prisma.TransactionClient,
    pending: {
      activatedMembershipId: string | null;
      groupId: string;
      userId: string;
    },
  ): Promise<{ createdAt: Date; id: string; role: GroupRole } | null> {
    if (pending.activatedMembershipId) {
      const membership = await transaction.groupMembership.findUnique({
        select: {
          createdAt: true,
          id: true,
          role: true,
        },
        where: {
          id: pending.activatedMembershipId,
        },
      });

      if (membership) {
        return membership;
      }
    }

    return transaction.groupMembership.findFirst({
      select: {
        createdAt: true,
        id: true,
        role: true,
      },
      where: {
        groupId: pending.groupId,
        userId: pending.userId,
      },
    });
  }

  private async expireStalePending(
    transaction: Prisma.TransactionClient,
    pending: { groupId: string; id: string },
    now: Date,
  ): Promise<void> {
    const transition =
      await transaction.groupPendingMembership.updateMany({
        data: {
          expiredAt: now,
          status: PendingMembershipStatus.EXPIRED,
        },
        where: {
          expiresAt: { lte: now },
          id: pending.id,
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
        groupId: pending.groupId,
        newValues: {
          expiredAt: now.toISOString(),
          pendingMembershipId: pending.id,
          status: PendingMembershipStatus.EXPIRED,
        },
        previousValues: {
          status: PendingMembershipStatus.PENDING,
        },
      },
    });
  }
}
