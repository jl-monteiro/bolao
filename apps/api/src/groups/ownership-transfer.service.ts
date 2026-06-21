import {
  BadRequestException,
  ConflictException,
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
  GroupOwnershipTransferStatus,
  GroupRole,
} from "../generated/prisma/enums.js";
import { MfaService } from "../mfa/mfa.service.js";
import { GroupRolePolicy } from "./group-role.policy.js";

const OWNERSHIP_TRANSFER_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

export const OWNERSHIP_TRANSFER_CLOCK = Symbol(
  "OwnershipTransferClock",
);

export type OwnershipTransferClock = {
  now(): Date;
};

type OwnershipTransferRecord = {
  acceptedAt: Date | null;
  currentOwnerMembership: {
    id: string;
    user: {
      id: string;
      image: string | null;
      name: string;
    };
  };
  expiredAt: Date | null;
  expiresAt: Date;
  group: {
    id: string;
    name: string;
  };
  id: string;
  requestedAt: Date;
  revokedAt: Date | null;
  status: GroupOwnershipTransferStatus;
  targetMembership: {
    id: string;
    user: {
      id: string;
      image: string | null;
      name: string;
    };
  };
};

export type OwnershipTransferResult = ReturnType<
  typeof toOwnershipTransferResult
>;

function addMilliseconds(date: Date, milliseconds: number): Date {
  return new Date(date.getTime() + milliseconds);
}

function toOwnershipTransferResult(transfer: OwnershipTransferRecord) {
  return {
    acceptedAt: transfer.acceptedAt,
    currentOwnerMembership: transfer.currentOwnerMembership,
    expiredAt: transfer.expiredAt,
    expiresAt: transfer.expiresAt,
    group: transfer.group,
    id: transfer.id,
    requestedAt: transfer.requestedAt,
    revokedAt: transfer.revokedAt,
    status: transfer.status,
    targetMembership: transfer.targetMembership,
  };
}

@Injectable()
export class OwnershipTransferService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly rolePolicy: GroupRolePolicy,
    private readonly mfaService: MfaService,
    @Inject(OWNERSHIP_TRANSFER_CLOCK)
    private readonly clock: OwnershipTransferClock,
  ) {}

  async request(
    userId: string,
    groupId: string,
    targetMembershipId: string,
  ): Promise<OwnershipTransferResult> {
    const requestedAt = this.clock.now();
    const expiresAt = addMilliseconds(
      requestedAt,
      OWNERSHIP_TRANSFER_LIFETIME_MS,
    );

    return this.prisma.$transaction(async (transaction) => {
      const requesterMembership =
        await transaction.groupMembership.findUnique({
          select: {
            id: true,
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

      this.rolePolicy.assertCanTransferOwnership(
        requesterMembership.role,
      );
      await this.lockGroup(transaction, groupId);
      await this.expirePendingTransfersForGroup(
        transaction,
        groupId,
        requestedAt,
      );

      const pending =
        await transaction.groupOwnershipTransfer.findFirst({
          select: {
            id: true,
          },
          where: {
            groupId,
            status: GroupOwnershipTransferStatus.PENDING,
          },
        });

      if (pending) {
        throw new ConflictException(
          "Revogue a transferência pendente antes de iniciar outra.",
        );
      }

      const targetMembership =
        await transaction.groupMembership.findFirst({
          select: {
            id: true,
            role: true,
          },
          where: {
            groupId,
            id: targetMembershipId,
          },
        });

      if (!targetMembership) {
        throw new NotFoundException("Membro do Grupo não encontrado.");
      }

      if (targetMembership.role === GroupRole.OWNER) {
        throw new BadRequestException(
          "Escolha um Membro que ainda não seja Proprietário.",
        );
      }

      const transfer =
        await transaction.groupOwnershipTransfer.create({
          data: {
            currentOwnerMembershipId: requesterMembership.id,
            expiresAt,
            groupId,
            requestedAt,
            requestedById: userId,
            targetMembershipId,
          },
          select: this.transferSelect(),
        });

      await transaction.auditLog.create({
        data: {
          action: AuditAction.GROUP_OWNERSHIP_TRANSFER_REQUESTED,
          actorId: userId,
          actorType: AuditActorType.USER,
          groupId,
          newValues: {
            currentOwnerMembershipId: requesterMembership.id,
            expiresAt: expiresAt.toISOString(),
            requestedAt: requestedAt.toISOString(),
            status: GroupOwnershipTransferStatus.PENDING,
            targetMembershipId,
            transferId: transfer.id,
          },
          previousValues: Prisma.DbNull,
        },
      });

      return toOwnershipTransferResult(transfer);
    });
  }

  async listForGroup(
    userId: string,
    groupId: string,
  ): Promise<OwnershipTransferResult[]> {
    const now = this.clock.now();

    await this.prisma.$transaction(async (transaction) => {
      const membership = await transaction.groupMembership.findUnique({
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

      if (!membership) {
        throw new NotFoundException("Grupo não encontrado.");
      }

      this.rolePolicy.assertCanTransferOwnership(membership.role);
      await this.expirePendingTransfersForGroup(transaction, groupId, now);
    });

    const transfers =
      await this.prisma.groupOwnershipTransfer.findMany({
        orderBy: {
          requestedAt: "desc",
        },
        select: this.transferSelect(),
        where: {
          groupId,
        },
      });

    return transfers.map(toOwnershipTransferResult);
  }

  async listForTarget(userId: string): Promise<OwnershipTransferResult[]> {
    const now = this.clock.now();

    await this.prisma.$transaction(async (transaction) => {
      const due = await transaction.groupOwnershipTransfer.findMany({
        select: {
          groupId: true,
        },
        where: {
          expiresAt: {
            lte: now,
          },
          status: GroupOwnershipTransferStatus.PENDING,
          targetMembership: {
            userId,
          },
        },
      });

      for (const transfer of due) {
        await this.expirePendingTransfersForGroup(
          transaction,
          transfer.groupId,
          now,
        );
      }
    });

    const transfers =
      await this.prisma.groupOwnershipTransfer.findMany({
        orderBy: {
          expiresAt: "asc",
        },
        select: this.transferSelect(),
        where: {
          status: GroupOwnershipTransferStatus.PENDING,
          targetMembership: {
            userId,
          },
        },
      });

    return transfers.map(toOwnershipTransferResult);
  }

  async revoke(
    userId: string,
    groupId: string,
    transferId: string,
  ): Promise<void> {
    const revokedAt = this.clock.now();

    await this.prisma.$transaction(async (transaction) => {
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

      this.rolePolicy.assertCanTransferOwnership(
        requesterMembership.role,
      );
      await this.lockGroup(transaction, groupId);

      const transfer =
        await transaction.groupOwnershipTransfer.findFirst({
          select: {
            expiresAt: true,
            groupId: true,
            id: true,
            status: true,
          },
          where: {
            groupId,
            id: transferId,
          },
        });

      if (!transfer) {
        throw new NotFoundException(
          "Transferência de Propriedade não encontrada.",
        );
      }

      if (transfer.status === GroupOwnershipTransferStatus.REVOKED) {
        return;
      }

      if (
        transfer.status === GroupOwnershipTransferStatus.PENDING &&
        transfer.expiresAt.getTime() <= revokedAt.getTime()
      ) {
        await this.expirePendingTransfer(transaction, transfer, revokedAt);
        throw new GoneException("Transferência de Propriedade expirada.");
      }

      if (transfer.status !== GroupOwnershipTransferStatus.PENDING) {
        throw new ConflictException(
          "Somente transferências pendentes podem ser revogadas.",
        );
      }

      const transition =
        await transaction.groupOwnershipTransfer.updateMany({
          data: {
            revokedAt,
            revokedById: userId,
            status: GroupOwnershipTransferStatus.REVOKED,
          },
          where: {
            id: transferId,
            status: GroupOwnershipTransferStatus.PENDING,
          },
        });

      if (transition.count === 0) {
        throw new ConflictException(
          "Somente transferências pendentes podem ser revogadas.",
        );
      }

      await transaction.auditLog.create({
        data: {
          action: AuditAction.GROUP_OWNERSHIP_TRANSFER_REVOKED,
          actorId: userId,
          actorType: AuditActorType.USER,
          groupId,
          newValues: {
            revokedAt: revokedAt.toISOString(),
            status: GroupOwnershipTransferStatus.REVOKED,
            transferId,
          },
          previousValues: {
            status: GroupOwnershipTransferStatus.PENDING,
          },
        },
      });
    });
  }

  async accept(
    userId: string,
    transferId: string,
    totpCode: string,
  ): Promise<OwnershipTransferResult> {
    const acceptedAt = this.clock.now();

    return this.prisma.$transaction(async (transaction) => {
      const transfer =
        await transaction.groupOwnershipTransfer.findFirst({
          select: {
            acceptedById: true,
            currentOwnerMembershipId: true,
            expiresAt: true,
            groupId: true,
            id: true,
            status: true,
            targetMembership: {
              select: {
                id: true,
                role: true,
                userId: true,
              },
            },
          },
          where: {
            id: transferId,
            targetMembership: {
              userId,
            },
          },
        });

      if (!transfer) {
        throw new NotFoundException(
          "Transferência de Propriedade não encontrada.",
        );
      }

      if (
        transfer.status === GroupOwnershipTransferStatus.ACCEPTED &&
        transfer.acceptedById === userId
      ) {
        return this.getById(transaction, transferId);
      }

      await this.lockGroup(transaction, transfer.groupId);

      if (
        transfer.status === GroupOwnershipTransferStatus.PENDING &&
        transfer.expiresAt.getTime() <= acceptedAt.getTime()
      ) {
        await this.expirePendingTransfer(transaction, transfer, acceptedAt);
        throw new GoneException("Transferência de Propriedade expirada.");
      }

      if (transfer.status !== GroupOwnershipTransferStatus.PENDING) {
        throw new ConflictException(
          "Transferência de Propriedade indisponível.",
        );
      }

      await this.mfaService.assertTotpCode(
        transaction,
        userId,
        totpCode,
      );

      const transition =
        await transaction.groupOwnershipTransfer.updateMany({
          data: {
            acceptedAt,
            acceptedById: userId,
            status: GroupOwnershipTransferStatus.ACCEPTED,
          },
          where: {
            expiresAt: {
              gt: acceptedAt,
            },
            id: transferId,
            status: GroupOwnershipTransferStatus.PENDING,
          },
        });

      if (transition.count === 0) {
        throw new ConflictException(
          "Transferência de Propriedade indisponível.",
        );
      }

      const oldOwnerUpdate = await transaction.groupMembership.updateMany({
        data: {
          role: GroupRole.ORGANIZER,
        },
        where: {
          id: transfer.currentOwnerMembershipId,
          role: GroupRole.OWNER,
        },
      });

      const targetUpdate = await transaction.groupMembership.updateMany({
        data: {
          role: GroupRole.OWNER,
        },
        where: {
          groupId: transfer.groupId,
          id: transfer.targetMembership.id,
        },
      });

      if (oldOwnerUpdate.count !== 1 || targetUpdate.count !== 1) {
        throw new ConflictException(
          "Transferência de Propriedade não pôde ser concluída.",
        );
      }

      await transaction.auditLog.create({
        data: {
          action: AuditAction.GROUP_OWNERSHIP_TRANSFER_ACCEPTED,
          actorId: userId,
          actorType: AuditActorType.USER,
          groupId: transfer.groupId,
          newValues: {
            acceptedAt: acceptedAt.toISOString(),
            currentOwnerMembershipId: transfer.currentOwnerMembershipId,
            currentOwnerRole: GroupRole.ORGANIZER,
            status: GroupOwnershipTransferStatus.ACCEPTED,
            targetMembershipId: transfer.targetMembership.id,
            targetRole: GroupRole.OWNER,
            transferId,
          },
          previousValues: {
            currentOwnerMembershipId: transfer.currentOwnerMembershipId,
            currentOwnerRole: GroupRole.OWNER,
            status: GroupOwnershipTransferStatus.PENDING,
            targetMembershipId: transfer.targetMembership.id,
            targetRole: transfer.targetMembership.role,
          },
        },
      });

      return this.getById(transaction, transferId);
    });
  }

  private async getById(
    transaction: Prisma.TransactionClient,
    transferId: string,
  ): Promise<OwnershipTransferResult> {
    const transfer =
      await transaction.groupOwnershipTransfer.findUniqueOrThrow({
        select: this.transferSelect(),
        where: {
          id: transferId,
        },
      });

    return toOwnershipTransferResult(transfer);
  }

  private async lockGroup(
    transaction: Prisma.TransactionClient,
    groupId: string,
  ): Promise<void> {
    await transaction.$queryRaw`
      SELECT "id" FROM "Group" WHERE "id" = ${groupId} FOR UPDATE
    `;
  }

  private async expirePendingTransfersForGroup(
    transaction: Prisma.TransactionClient,
    groupId: string,
    now: Date,
  ): Promise<void> {
    const transfers = await transaction.groupOwnershipTransfer.findMany({
      select: {
        expiresAt: true,
        groupId: true,
        id: true,
        status: true,
      },
      where: {
        expiresAt: {
          lte: now,
        },
        groupId,
        status: GroupOwnershipTransferStatus.PENDING,
      },
    });

    for (const transfer of transfers) {
      await this.expirePendingTransfer(transaction, transfer, now);
    }
  }

  private async expirePendingTransfer(
    transaction: Prisma.TransactionClient,
    transfer: {
      expiresAt: Date;
      groupId: string;
      id: string;
      status: GroupOwnershipTransferStatus;
    },
    now: Date,
  ): Promise<void> {
    if (transfer.status !== GroupOwnershipTransferStatus.PENDING) {
      return;
    }

    const transition =
      await transaction.groupOwnershipTransfer.updateMany({
        data: {
          expiredAt: now,
          status: GroupOwnershipTransferStatus.EXPIRED,
        },
        where: {
          expiresAt: {
            lte: now,
          },
          id: transfer.id,
          status: GroupOwnershipTransferStatus.PENDING,
        },
      });

    if (transition.count === 0) {
      return;
    }

    await transaction.auditLog.create({
      data: {
        action: AuditAction.GROUP_OWNERSHIP_TRANSFER_EXPIRED,
        actorId: null,
        actorType: AuditActorType.SYSTEM,
        groupId: transfer.groupId,
        newValues: {
          expiredAt: now.toISOString(),
          status: GroupOwnershipTransferStatus.EXPIRED,
          transferId: transfer.id,
        },
        previousValues: {
          status: GroupOwnershipTransferStatus.PENDING,
        },
      },
    });
  }

  private transferSelect() {
    return {
      acceptedAt: true,
      currentOwnerMembership: {
        select: {
          id: true,
          user: {
            select: {
              id: true,
              image: true,
              name: true,
            },
          },
        },
      },
      expiredAt: true,
      expiresAt: true,
      group: {
        select: {
          id: true,
          name: true,
        },
      },
      id: true,
      requestedAt: true,
      revokedAt: true,
      status: true,
      targetMembership: {
        select: {
          id: true,
          user: {
            select: {
              id: true,
              image: true,
              name: true,
            },
          },
        },
      },
    } satisfies Prisma.GroupOwnershipTransferSelect;
  }
}
