-- AlterTable
ALTER TABLE "User"
ADD COLUMN "birthDate" TIMESTAMP(3),
ADD COLUMN "cpf" TEXT,
ADD COLUMN "identityValidatedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "User_cpf_key" ON "User"("cpf");

-- AddCheckConstraint
ALTER TABLE "User"
ADD CONSTRAINT "User_cpf_digits_check"
CHECK ("cpf" IS NULL OR "cpf" ~ '^[0-9]{11}$');

-- AddCheckConstraint
ALTER TABLE "User"
ADD CONSTRAINT "User_identity_validated_consistency_check"
CHECK (
  "identityValidatedAt" IS NULL
  OR (
    "birthDate" IS NOT NULL
    AND "cpf" IS NOT NULL
  )
);
