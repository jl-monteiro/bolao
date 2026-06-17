-- CreateEnum
CREATE TYPE "GroupInviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PendingMembershipStatus" AS ENUM ('PENDING', 'ACTIVATED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "AuditActorType" AS ENUM ('USER', 'SYSTEM');

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'GROUP_INVITE_ISSUED';
ALTER TYPE "AuditAction" ADD VALUE 'GROUP_INVITE_REVOKED';
ALTER TYPE "AuditAction" ADD VALUE 'GROUP_INVITE_ACCEPTED';
ALTER TYPE "AuditAction" ADD VALUE 'GROUP_INVITE_EXPIRED';
ALTER TYPE "AuditAction" ADD VALUE 'GROUP_PENDING_MEMBERSHIP_EXPIRED';
ALTER TYPE "AuditAction" ADD VALUE 'GROUP_MEMBERSHIP_ACTIVATED';

-- AlterTable
ALTER TABLE "AuditLog"
ADD COLUMN "actorType" "AuditActorType" NOT NULL DEFAULT 'USER',
ALTER COLUMN "actorId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "GroupInvite" (
    "id" TEXT NOT NULL,
    "targetEmail" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "status" "GroupInviteStatus" NOT NULL DEFAULT 'PENDING',
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "expiredAt" TIMESTAMP(3),
    "groupId" TEXT NOT NULL,
    "issuedById" TEXT NOT NULL,
    "acceptedById" TEXT,
    "revokedById" TEXT,

    CONSTRAINT "GroupInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupPendingMembership" (
    "id" TEXT NOT NULL,
    "status" "PendingMembershipStatus" NOT NULL DEFAULT 'PENDING',
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "activatedAt" TIMESTAMP(3),
    "expiredAt" TIMESTAMP(3),
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "inviteId" TEXT NOT NULL,
    "activatedMembershipId" TEXT,

    CONSTRAINT "GroupPendingMembership_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GroupInvite_tokenHash_key" ON "GroupInvite"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "GroupInvite_active_group_email_key"
ON "GroupInvite"("groupId", "targetEmail")
WHERE "status" = 'PENDING';

-- CreateIndex
CREATE INDEX "GroupInvite_groupId_status_expiresAt_idx"
ON "GroupInvite"("groupId", "status", "expiresAt");

-- CreateIndex
CREATE INDEX "GroupInvite_issuedById_idx" ON "GroupInvite"("issuedById");

-- CreateIndex
CREATE INDEX "GroupInvite_acceptedById_idx" ON "GroupInvite"("acceptedById");

-- CreateIndex
CREATE INDEX "GroupInvite_revokedById_idx" ON "GroupInvite"("revokedById");

-- CreateIndex
CREATE UNIQUE INDEX "GroupPendingMembership_inviteId_key"
ON "GroupPendingMembership"("inviteId");

-- CreateIndex
CREATE UNIQUE INDEX "GroupPendingMembership_activatedMembershipId_key"
ON "GroupPendingMembership"("activatedMembershipId");

-- CreateIndex
CREATE UNIQUE INDEX "GroupPendingMembership_active_group_user_key"
ON "GroupPendingMembership"("groupId", "userId")
WHERE "status" = 'PENDING';

-- CreateIndex
CREATE INDEX "GroupPendingMembership_groupId_status_expiresAt_idx"
ON "GroupPendingMembership"("groupId", "status", "expiresAt");

-- CreateIndex
CREATE INDEX "GroupPendingMembership_userId_idx"
ON "GroupPendingMembership"("userId");

-- AddCheckConstraint
ALTER TABLE "AuditLog"
ADD CONSTRAINT "AuditLog_actor_consistency_check"
CHECK (
  ("actorType" = 'USER' AND "actorId" IS NOT NULL)
  OR ("actorType" = 'SYSTEM' AND "actorId" IS NULL)
);

-- AddForeignKey
ALTER TABLE "GroupInvite"
ADD CONSTRAINT "GroupInvite_groupId_fkey"
FOREIGN KEY ("groupId") REFERENCES "Group"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupInvite"
ADD CONSTRAINT "GroupInvite_issuedById_fkey"
FOREIGN KEY ("issuedById") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupInvite"
ADD CONSTRAINT "GroupInvite_acceptedById_fkey"
FOREIGN KEY ("acceptedById") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupInvite"
ADD CONSTRAINT "GroupInvite_revokedById_fkey"
FOREIGN KEY ("revokedById") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupPendingMembership"
ADD CONSTRAINT "GroupPendingMembership_groupId_fkey"
FOREIGN KEY ("groupId") REFERENCES "Group"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupPendingMembership"
ADD CONSTRAINT "GroupPendingMembership_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupPendingMembership"
ADD CONSTRAINT "GroupPendingMembership_inviteId_fkey"
FOREIGN KEY ("inviteId") REFERENCES "GroupInvite"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupPendingMembership"
ADD CONSTRAINT "GroupPendingMembership_activatedMembershipId_fkey"
FOREIGN KEY ("activatedMembershipId") REFERENCES "GroupMembership"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
