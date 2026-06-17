import {
  ConflictException,
  ForbiddenException,
  GoneException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  Prisma,
  PrismaClient,
} from "../generated/prisma/client.js";
import {
  AuditAction,
  AuditActorType,
  GroupInviteStatus,
  GroupRole,
  PendingMembershipStatus,
} from "../generated/prisma/enums.js";
import { buildGroupInviteAcceptUrl, buildGroupInviteEmail } from "../notifications/group-invite-email.js";
import {
  NOTIFICATION_PROVIDER,
  type NotificationProvider,
} from "../notifications/notification-provider.js";
import { GroupInviteTokenService } from "./group-invite-token.service.js";
import { GroupRolePolicy } from "./group-role.policy.js";

const INVITE_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;
const PENDING_MEMBERSHIP_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;

export const GROUP_INVITE_CLOCK = Symbol("GroupInviteClock");

export type GroupInviteClock = {
  now(): Date;
};

type InviteWithIssuer = {
  acceptedAt: Date | null;
  expiredAt: Date | null;
  expiresAt: Date;
  id: string;
  issuedAt: Date;
  issuedBy: {
    id: string;
    name: string;
  };
  revokedAt: Date | null;
  status: GroupInviteStatus;
  targetEmail: string;
};

type ActivatedMembershipWithUser = {
  createdAt: Date;
  id: string;
  role: GroupRole;
  user: {
    image: string | null;
    name: string;
  };
};

type TokenOperationResult<T> =
  | { kind: "ok"; value: T }
  | { kind: "expired" }
  | { kind: "unavailable" };

function addMilliseconds(date: Date, milliseconds: number): Date {
  return new Date(date.getTime() + milliseconds);
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

function toInviteResponse(invite: InviteWithIssuer) {
  return {
    acceptedAt: invite.acceptedAt,
    expiredAt: invite.expiredAt,
    expiresAt: invite.expiresAt,
    id: invite.id,
    issuedAt: invite.issuedAt,
    issuedBy: invite.issuedBy,
    revokedAt: invite.revokedAt,
    status: invite.status,
    targetEmail: invite.targetEmail,
  };
}

function toActivatedMemberResponse(
  membership: ActivatedMembershipWithUser,
) {
  return {
    id: membership.id,
    image: membership.user.image,
    joinedAt: membership.createdAt,
    name: membership.user.name,
    role: membership.role,
  };
}

@Injectable()
export class GroupInvitesService {
  private readonly exposeIssuedAcceptUrl: boolean;
  private readonly webUrl: string;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly rolePolicy: GroupRolePolicy,
    private readonly tokenService: GroupInviteTokenService,
    @Inject(NOTIFICATION_PROVIDER)
    private readonly notificationProvider: NotificationProvider,
    config: ConfigService,
    @Inject(GROUP_INVITE_CLOCK)
    private readonly clock: GroupInviteClock,
  ) {
    this.webUrl = config.get<string>(
      "WEB_URL",
      "http://localhost:3000",
    );
    this.exposeIssuedAcceptUrl =
      config.get<string>("NODE_ENV", "development") !== "production";
  }

  async issue(userId: string, groupId: string, email: string) {
    const targetEmail = email.trim().toLowerCase();
    const rawToken = this.tokenService.generate();
    const tokenHash = this.tokenService.hash(rawToken);
    const issuedAt = this.clock.now();
    const expiresAt = addMilliseconds(issuedAt, INVITE_LIFETIME_MS);

    let issued: {
      groupName: string;
      inviterName: string;
      invite: InviteWithIssuer;
    };

    try {
      issued = await this.prisma.$transaction(async (transaction) => {
        const membership =
          await transaction.groupMembership.findUnique({
            select: {
              group: {
                select: {
                  id: true,
                  name: true,
                },
              },
              role: true,
              user: {
                select: {
                  id: true,
                  name: true,
                },
              },
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

        this.rolePolicy.assertCanManageInvites(membership.role);
        await this.expireConflictingRecords(
          transaction,
          groupId,
          targetEmail,
          issuedAt,
        );

        const existingMembership =
          await transaction.groupMembership.findFirst({
            select: {
              id: true,
            },
            where: {
              groupId,
              user: {
                email: targetEmail,
              },
            },
          });

        if (existingMembership) {
          throw new ConflictException(
            "Esta pessoa já é membro do Grupo.",
          );
        }

        const existingPending =
          await transaction.groupPendingMembership.findFirst({
            select: {
              id: true,
            },
            where: {
              expiresAt: {
                gt: issuedAt,
              },
              groupId,
              status: PendingMembershipStatus.PENDING,
              user: {
                email: targetEmail,
              },
            },
          });

        if (existingPending) {
          throw new ConflictException(
            "Esta pessoa já possui uma associação pendente.",
          );
        }

        const invite = await transaction.groupInvite.create({
          data: {
            expiresAt,
            groupId,
            issuedAt,
            issuedById: userId,
            targetEmail,
            tokenHash,
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

        await transaction.auditLog.create({
          data: {
            action: AuditAction.GROUP_INVITE_ISSUED,
            actorId: userId,
            actorType: AuditActorType.USER,
            groupId,
            newValues: {
              expiresAt: expiresAt.toISOString(),
              inviteId: invite.id,
              issuedAt: issuedAt.toISOString(),
              status: GroupInviteStatus.PENDING,
            },
            previousValues: Prisma.DbNull,
          },
        });

        return {
          groupName: membership.group.name,
          invite,
          inviterName: membership.user.name,
        };
      });
    } catch (error: unknown) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException(
          "Já existe um Convite pendente para este e-mail.",
        );
      }

      throw error;
    }

    const acceptUrl = buildGroupInviteAcceptUrl({
      rawToken,
      webUrl: this.webUrl,
    });

    try {
      await this.notificationProvider.sendEmail(
        buildGroupInviteEmail({
          groupName: issued.groupName,
          inviterName: issued.inviterName,
          rawToken,
          recipientEmail: targetEmail,
          webUrl: this.webUrl,
        }),
      );
    } catch {
      throw new ServiceUnavailableException(
        "Convite emitido, mas não foi possível enviar o e-mail. Revogue-o e envie novamente.",
      );
    }

    return {
      ...toInviteResponse(issued.invite),
      ...(this.exposeIssuedAcceptUrl ? { acceptUrl } : {}),
    };
  }

  async list(userId: string, groupId: string) {
    await this.assertCanManage(userId, groupId);

    const invites = await this.prisma.groupInvite.findMany({
      orderBy: {
        issuedAt: "desc",
      },
      select: {
        acceptedAt: true,
        expiredAt: true,
        expiresAt: true,
        id: true,
        issuedAt: true,
        issuedBy: {
          select: {
            id: true,
            name: true,
          },
        },
        revokedAt: true,
        status: true,
        targetEmail: true,
      },
      where: {
        groupId,
      },
    });

    return invites.map(toInviteResponse);
  }

  async revoke(
    userId: string,
    groupId: string,
    inviteId: string,
  ): Promise<void> {
    const revokedAt = this.clock.now();

    await this.prisma.$transaction(async (transaction) => {
      const membership =
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

      if (!membership) {
        throw new NotFoundException("Grupo não encontrado.");
      }

      this.rolePolicy.assertCanManageInvites(membership.role);

      const invite = await transaction.groupInvite.findUnique({
        select: {
          id: true,
          status: true,
        },
        where: {
          id: inviteId,
          groupId,
        },
      });

      if (!invite) {
        throw new NotFoundException("Convite não encontrado.");
      }

      if (invite.status === GroupInviteStatus.REVOKED) {
        return;
      }

      if (invite.status !== GroupInviteStatus.PENDING) {
        throw new ConflictException(
          "Somente Convites pendentes podem ser revogados.",
        );
      }

      const transition = await transaction.groupInvite.updateMany({
        data: {
          revokedAt,
          revokedById: userId,
          status: GroupInviteStatus.REVOKED,
        },
        where: {
          id: inviteId,
          status: GroupInviteStatus.PENDING,
        },
      });

      if (transition.count === 0) {
        const current = await transaction.groupInvite.findUnique({
          select: {
            status: true,
          },
          where: {
            id: inviteId,
          },
        });

        if (current?.status === GroupInviteStatus.REVOKED) {
          return;
        }

        throw new ConflictException(
          "Somente Convites pendentes podem ser revogados.",
        );
      }

      await transaction.auditLog.create({
        data: {
          action: AuditAction.GROUP_INVITE_REVOKED,
          actorId: userId,
          actorType: AuditActorType.USER,
          groupId,
          newValues: {
            inviteId,
            revokedAt: revokedAt.toISOString(),
            status: GroupInviteStatus.REVOKED,
          },
          previousValues: {
            status: GroupInviteStatus.PENDING,
          },
        },
      });
    });
  }

  async listPendingMembers(userId: string, groupId: string) {
    await this.assertCanManage(userId, groupId);

    return this.prisma.groupPendingMembership.findMany({
      orderBy: {
        acceptedAt: "asc",
      },
      select: {
        acceptedAt: true,
        expiresAt: true,
        id: true,
        status: true,
        user: {
          select: {
            id: true,
            image: true,
            name: true,
          },
        },
      },
      where: {
        groupId,
        status: PendingMembershipStatus.PENDING,
      },
    });
  }

  async activatePendingMember(
    userId: string,
    groupId: string,
    pendingMemberId: string,
  ) {
    const activatedAt = this.clock.now();

    try {
      return await this.prisma.$transaction(async (transaction) => {
        const membership =
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

        if (!membership) {
          throw new NotFoundException("Grupo nÃ£o encontrado.");
        }

        this.rolePolicy.assertCanActivatePendingMembers(
          membership.role,
        );

        const pendingMembership =
          await transaction.groupPendingMembership.findUnique({
            select: {
              expiresAt: true,
              groupId: true,
              id: true,
              status: true,
              userId: true,
            },
            where: {
              groupId,
              id: pendingMemberId,
            },
          });

        if (!pendingMembership) {
          throw new NotFoundException(
            "Membro Pendente nÃ£o encontrado.",
          );
        }

        const expired = await this.expirePendingMembershipIfDue(
          transaction,
          pendingMembership,
          activatedAt,
        );

        if (expired) {
          throw new GoneException("Este Membro Pendente expirou.");
        }

        if (pendingMembership.status !== PendingMembershipStatus.PENDING) {
          throw new ConflictException(
            "Somente Membros Pendentes podem ser ativados.",
          );
        }

        const transition =
          await transaction.groupPendingMembership.updateMany({
            data: {
              activatedAt,
              status: PendingMembershipStatus.ACTIVATED,
            },
            where: {
              expiresAt: {
                gt: activatedAt,
              },
              groupId,
              id: pendingMemberId,
              status: PendingMembershipStatus.PENDING,
            },
          });

        if (transition.count === 0) {
          throw new ConflictException(
            "Este Membro Pendente nÃ£o estÃ¡ mais disponÃ­vel para ativaÃ§Ã£o.",
          );
        }

        const activatedMembership =
          await transaction.groupMembership.create({
            data: {
              groupId,
              role: GroupRole.MEMBER,
              userId: pendingMembership.userId,
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

        await transaction.groupPendingMembership.update({
          data: {
            activatedMembershipId: activatedMembership.id,
          },
          where: {
            id: pendingMemberId,
          },
        });

        await transaction.auditLog.create({
          data: {
            action: AuditAction.GROUP_MEMBERSHIP_ACTIVATED,
            actorId: userId,
            actorType: AuditActorType.USER,
            groupId,
            newValues: {
              activatedAt: activatedAt.toISOString(),
              membershipId: activatedMembership.id,
              pendingMembershipId: pendingMemberId,
              role: GroupRole.MEMBER,
              status: PendingMembershipStatus.ACTIVATED,
              userId: pendingMembership.userId,
            },
            previousValues: {
              status: PendingMembershipStatus.PENDING,
            },
          },
        });

        return toActivatedMemberResponse(activatedMembership);
      });
    } catch (error: unknown) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException(
          "Esta pessoa jÃ¡ Ã© membro deste Grupo.",
        );
      }

      throw error;
    }
  }

  async preview(userId: string, rawToken: string) {
    const now = this.clock.now();
    const tokenHash = this.tokenService.hash(rawToken);
    const result = await this.prisma.$transaction(
      async (transaction): Promise<TokenOperationResult<unknown>> => {
        const user = await transaction.user.findUnique({
          select: {
            email: true,
            emailVerified: true,
            id: true,
          },
          where: {
            id: userId,
          },
        });

        if (!user?.emailVerified) {
          throw new ForbiddenException(
            "Confirme seu e-mail antes de aceitar Convites.",
          );
        }

        const invite = await transaction.groupInvite.findUnique({
          include: {
            group: {
              select: {
                id: true,
                name: true,
              },
            },
            issuedBy: {
              select: {
                id: true,
                name: true,
              },
            },
            pendingMembership: true,
          },
          where: {
            tokenHash,
          },
        });

        if (!invite) {
          return { kind: "unavailable" };
        }

        const expired = await this.expireInviteIfDue(
          transaction,
          invite,
          now,
        );
        if (expired) {
          return { kind: "expired" };
        }

        if (
          invite.status === GroupInviteStatus.REVOKED ||
          invite.targetEmail !== user.email.toLowerCase()
        ) {
          return { kind: "unavailable" };
        }

        if (invite.status === GroupInviteStatus.ACCEPTED) {
          if (
            invite.acceptedById !== userId ||
            invite.pendingMembership?.status !==
              PendingMembershipStatus.PENDING
          ) {
            return { kind: "unavailable" };
          }
        }

        return {
          kind: "ok",
          value: {
            expiresAt: invite.expiresAt,
            group: invite.group,
            id: invite.id,
            issuedBy: invite.issuedBy,
            status: invite.status,
          },
        };
      },
    );

    return this.unwrapTokenResult(result);
  }

  async accept(userId: string, rawToken: string) {
    const acceptedAt = this.clock.now();
    const tokenHash = this.tokenService.hash(rawToken);

    let result: TokenOperationResult<unknown>;
    try {
      result = await this.prisma.$transaction(
        async (transaction): Promise<TokenOperationResult<unknown>> => {
          const user = await transaction.user.findUnique({
            select: {
              email: true,
              emailVerified: true,
              id: true,
            },
            where: {
              id: userId,
            },
          });

          if (!user?.emailVerified) {
            throw new ForbiddenException(
              "Confirme seu e-mail antes de aceitar Convites.",
            );
          }

          const invite = await transaction.groupInvite.findUnique({
            include: {
              pendingMembership: true,
            },
            where: {
              tokenHash,
            },
          });

          if (!invite) {
            return { kind: "unavailable" };
          }

          const expired = await this.expireInviteIfDue(
            transaction,
            invite,
            acceptedAt,
          );
          if (expired) {
            return { kind: "expired" };
          }

          if (
            invite.status === GroupInviteStatus.REVOKED ||
            invite.targetEmail !== user.email.toLowerCase()
          ) {
            return { kind: "unavailable" };
          }

          if (invite.status === GroupInviteStatus.ACCEPTED) {
            if (
              invite.acceptedById === userId &&
              invite.pendingMembership?.userId === userId &&
              invite.pendingMembership.status ===
                PendingMembershipStatus.PENDING
            ) {
              return {
                kind: "ok",
                value: this.toAcceptedResult(
                  invite.pendingMembership,
                ),
              };
            }

            return { kind: "unavailable" };
          }

          const existingMembership =
            await transaction.groupMembership.findUnique({
              select: {
                id: true,
              },
              where: {
                groupId_userId: {
                  groupId: invite.groupId,
                  userId,
                },
              },
            });

          if (existingMembership) {
            throw new ConflictException(
              "Você já é membro deste Grupo.",
            );
          }

          const existingPending =
            await transaction.groupPendingMembership.findFirst({
              where: {
                groupId: invite.groupId,
                status: PendingMembershipStatus.PENDING,
                userId,
              },
            });

          if (existingPending) {
            if (
              existingPending.inviteId === invite.id &&
              existingPending.userId === userId
            ) {
              return {
                kind: "ok",
                value: this.toAcceptedResult(existingPending),
              };
            }

            throw new ConflictException(
              "Você já possui uma associação pendente neste Grupo.",
            );
          }

          const transition =
            await transaction.groupInvite.updateMany({
              data: {
                acceptedAt,
                acceptedById: userId,
                status: GroupInviteStatus.ACCEPTED,
              },
              where: {
                expiresAt: {
                  gt: acceptedAt,
                },
                id: invite.id,
                status: GroupInviteStatus.PENDING,
              },
            });

          if (transition.count === 0) {
            const current =
              await transaction.groupInvite.findUnique({
                include: {
                  pendingMembership: true,
                },
                where: {
                  id: invite.id,
                },
              });

            if (
              current?.status === GroupInviteStatus.ACCEPTED &&
              current.acceptedById === userId &&
              current.pendingMembership?.userId === userId &&
              current.pendingMembership.status ===
                PendingMembershipStatus.PENDING
            ) {
              return {
                kind: "ok",
                value: this.toAcceptedResult(
                  current.pendingMembership,
                ),
              };
            }

            if (current?.status === GroupInviteStatus.EXPIRED) {
              return { kind: "expired" };
            }

            return { kind: "unavailable" };
          }

          const pending = await transaction.groupPendingMembership.create(
            {
              data: {
                acceptedAt,
                expiresAt: addMilliseconds(
                  acceptedAt,
                  PENDING_MEMBERSHIP_LIFETIME_MS,
                ),
                groupId: invite.groupId,
                inviteId: invite.id,
                userId,
              },
            },
          );

          await transaction.auditLog.create({
            data: {
              action: AuditAction.GROUP_INVITE_ACCEPTED,
              actorId: userId,
              actorType: AuditActorType.USER,
              groupId: invite.groupId,
              newValues: {
                acceptedAt: acceptedAt.toISOString(),
                expiresAt: pending.expiresAt.toISOString(),
                inviteId: invite.id,
                pendingMembershipId: pending.id,
                status: PendingMembershipStatus.PENDING,
              },
              previousValues: {
                status: GroupInviteStatus.PENDING,
              },
            },
          });

          return {
            kind: "ok",
            value: this.toAcceptedResult(pending),
          };
        },
      );
    } catch (error: unknown) {
      if (isUniqueConstraintError(error)) {
        const acceptedInvite = await this.prisma.groupInvite.findUnique({
          include: {
            pendingMembership: true,
          },
          where: {
            tokenHash,
          },
        });

        if (
          acceptedInvite?.status === GroupInviteStatus.ACCEPTED &&
          acceptedInvite.acceptedById === userId &&
          acceptedInvite.pendingMembership?.userId === userId &&
          acceptedInvite.pendingMembership.status ===
            PendingMembershipStatus.PENDING
        ) {
          return this.toAcceptedResult(
            acceptedInvite.pendingMembership,
          );
        }

        throw new ConflictException(
          "Você já possui uma associação pendente neste Grupo.",
        );
      }

      throw error;
    }

    return this.unwrapTokenResult(result);
  }

  private async assertCanManage(
    userId: string,
    groupId: string,
  ): Promise<void> {
    const membership = await this.prisma.groupMembership.findUnique({
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

    this.rolePolicy.assertCanManageInvites(membership.role);
  }

  private async expireConflictingRecords(
    transaction: Prisma.TransactionClient,
    groupId: string,
    targetEmail: string,
    now: Date,
  ): Promise<void> {
    const [invites, pendingMemberships] = await Promise.all([
      transaction.groupInvite.findMany({
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
          status: GroupInviteStatus.PENDING,
          targetEmail,
        },
      }),
      transaction.groupPendingMembership.findMany({
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
          status: PendingMembershipStatus.PENDING,
          user: {
            email: targetEmail,
          },
        },
      }),
    ]);

    for (const invite of invites) {
      await this.expireInviteIfDue(transaction, invite, now);
    }

    for (const pendingMembership of pendingMemberships) {
      await this.expirePendingMembershipIfDue(
        transaction,
        pendingMembership,
        now,
      );
    }
  }

  private async expireInviteIfDue(
    transaction: Prisma.TransactionClient,
    invite: {
      expiresAt: Date;
      groupId: string;
      id: string;
      status: GroupInviteStatus;
    },
    now: Date,
  ): Promise<boolean> {
    if (invite.status === GroupInviteStatus.EXPIRED) {
      return true;
    }

    if (
      invite.status !== GroupInviteStatus.PENDING ||
      invite.expiresAt.getTime() > now.getTime()
    ) {
      return false;
    }

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

    if (transition.count > 0) {
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
    }

    return true;
  }

  private async expirePendingMembershipIfDue(
    transaction: Prisma.TransactionClient,
    pendingMembership: {
      expiresAt: Date;
      groupId: string;
      id: string;
      status: PendingMembershipStatus;
    },
    now: Date,
  ): Promise<boolean> {
    if (pendingMembership.status === PendingMembershipStatus.EXPIRED) {
      return true;
    }

    if (
      pendingMembership.status !== PendingMembershipStatus.PENDING ||
      pendingMembership.expiresAt.getTime() > now.getTime()
    ) {
      return false;
    }

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
      return false;
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

    return true;
  }

  private toAcceptedResult(pendingMembership: {
    acceptedAt: Date;
    expiresAt: Date;
    groupId: string;
    id: string;
    inviteId: string;
    status: PendingMembershipStatus;
    userId: string;
  }) {
    return {
      outcome: "PENDING_IDENTITY_VALIDATION" as const,
      pendingMembership: {
        acceptedAt: pendingMembership.acceptedAt,
        expiresAt: pendingMembership.expiresAt,
        groupId: pendingMembership.groupId,
        id: pendingMembership.id,
        inviteId: pendingMembership.inviteId,
        status: pendingMembership.status,
        userId: pendingMembership.userId,
      },
    };
  }

  private unwrapTokenResult<T>(result: TokenOperationResult<T>): T {
    if (result.kind === "expired") {
      throw new GoneException("Este Convite expirou.");
    }

    if (result.kind === "unavailable") {
      throw new NotFoundException("Convite indisponível.");
    }

    return result.value;
  }
}
