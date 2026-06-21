-- CreateEnum
CREATE TYPE "GroupOwnershipTransferStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED');

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'GROUP_OWNERSHIP_TRANSFER_REQUESTED';
ALTER TYPE "AuditAction" ADD VALUE 'GROUP_OWNERSHIP_TRANSFER_REVOKED';
ALTER TYPE "AuditAction" ADD VALUE 'GROUP_OWNERSHIP_TRANSFER_EXPIRED';
ALTER TYPE "AuditAction" ADD VALUE 'GROUP_OWNERSHIP_TRANSFER_ACCEPTED';

-- AlterTable
ALTER TABLE "User"
ADD COLUMN "totpSecretEncrypted" TEXT,
ADD COLUMN "totpEnabledAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "GroupOwnershipTransfer" (
    "id" TEXT NOT NULL,
    "status" "GroupOwnershipTransferStatus" NOT NULL DEFAULT 'PENDING',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "expiredAt" TIMESTAMP(3),
    "groupId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "currentOwnerMembershipId" TEXT NOT NULL,
    "targetMembershipId" TEXT NOT NULL,
    "acceptedById" TEXT,
    "revokedById" TEXT,

    CONSTRAINT "GroupOwnershipTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GroupOwnershipTransfer_groupId_status_expiresAt_idx"
ON "GroupOwnershipTransfer"("groupId", "status", "expiresAt");

-- CreateIndex
CREATE INDEX "GroupOwnershipTransfer_targetMembershipId_status_expiresAt_idx"
ON "GroupOwnershipTransfer"("targetMembershipId", "status", "expiresAt");

-- CreateIndex
CREATE INDEX "GroupOwnershipTransfer_currentOwnerMembershipId_idx"
ON "GroupOwnershipTransfer"("currentOwnerMembershipId");

-- CreateIndex
CREATE UNIQUE INDEX "GroupOwnershipTransfer_one_pending_per_group_key"
ON "GroupOwnershipTransfer"("groupId")
WHERE "status" = 'PENDING';

-- CreateIndex
CREATE UNIQUE INDEX "GroupMembership_one_owner_per_group_key"
ON "GroupMembership"("groupId")
WHERE "role" = 'OWNER';

-- AddForeignKey
ALTER TABLE "GroupOwnershipTransfer"
ADD CONSTRAINT "GroupOwnershipTransfer_groupId_fkey"
FOREIGN KEY ("groupId") REFERENCES "Group"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupOwnershipTransfer"
ADD CONSTRAINT "GroupOwnershipTransfer_requestedById_fkey"
FOREIGN KEY ("requestedById") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupOwnershipTransfer"
ADD CONSTRAINT "GroupOwnershipTransfer_currentOwnerMembershipId_fkey"
FOREIGN KEY ("currentOwnerMembershipId") REFERENCES "GroupMembership"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupOwnershipTransfer"
ADD CONSTRAINT "GroupOwnershipTransfer_targetMembershipId_fkey"
FOREIGN KEY ("targetMembershipId") REFERENCES "GroupMembership"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupOwnershipTransfer"
ADD CONSTRAINT "GroupOwnershipTransfer_acceptedById_fkey"
FOREIGN KEY ("acceptedById") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupOwnershipTransfer"
ADD CONSTRAINT "GroupOwnershipTransfer_revokedById_fkey"
FOREIGN KEY ("revokedById") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
