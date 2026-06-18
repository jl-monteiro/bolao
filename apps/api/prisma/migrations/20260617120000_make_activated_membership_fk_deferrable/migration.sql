-- Make the activated-membership foreign key deferrable so that the
-- member-activation transaction can transition GroupPendingMembership from
-- PENDING to ACTIVATED (setting activatedMembershipId) before the linked
-- GroupMembership row physically exists. The constraint still guarantees the
-- existence of the referenced row at COMMIT time.

ALTER TABLE "GroupPendingMembership"
DROP CONSTRAINT "GroupPendingMembership_activatedMembershipId_fkey";

ALTER TABLE "GroupPendingMembership"
ADD CONSTRAINT "GroupPendingMembership_activatedMembershipId_fkey"
FOREIGN KEY ("activatedMembershipId") REFERENCES "GroupMembership"("id")
ON DELETE RESTRICT ON UPDATE CASCADE
DEFERRABLE INITIALLY DEFERRED;
