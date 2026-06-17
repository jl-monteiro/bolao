-- AddCheckConstraint
ALTER TABLE "GroupInvite"
ADD CONSTRAINT "GroupInvite_lifecycle_check"
CHECK (
  "expiresAt" > "issuedAt"
  AND (
    (
      "status" = 'PENDING'
      AND "acceptedAt" IS NULL
      AND "acceptedById" IS NULL
      AND "revokedAt" IS NULL
      AND "revokedById" IS NULL
      AND "expiredAt" IS NULL
    )
    OR (
      "status" = 'ACCEPTED'
      AND "acceptedAt" IS NOT NULL
      AND "acceptedById" IS NOT NULL
      AND "revokedAt" IS NULL
      AND "revokedById" IS NULL
      AND "expiredAt" IS NULL
    )
    OR (
      "status" = 'REVOKED'
      AND "acceptedAt" IS NULL
      AND "acceptedById" IS NULL
      AND "revokedAt" IS NOT NULL
      AND "revokedById" IS NOT NULL
      AND "expiredAt" IS NULL
    )
    OR (
      "status" = 'EXPIRED'
      AND "acceptedAt" IS NULL
      AND "acceptedById" IS NULL
      AND "revokedAt" IS NULL
      AND "revokedById" IS NULL
      AND "expiredAt" IS NOT NULL
    )
  )
);

-- AddCheckConstraint
ALTER TABLE "GroupPendingMembership"
ADD CONSTRAINT "GroupPendingMembership_lifecycle_check"
CHECK (
  "expiresAt" > "acceptedAt"
  AND (
    (
      "status" = 'PENDING'
      AND "activatedAt" IS NULL
      AND "activatedMembershipId" IS NULL
      AND "expiredAt" IS NULL
    )
    OR (
      "status" = 'ACTIVATED'
      AND "activatedAt" IS NOT NULL
      AND "activatedMembershipId" IS NOT NULL
      AND "expiredAt" IS NULL
    )
    OR (
      "status" = 'EXPIRED'
      AND "activatedAt" IS NULL
      AND "activatedMembershipId" IS NULL
      AND "expiredAt" IS NOT NULL
    )
  )
);
