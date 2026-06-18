import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "../generated/prisma/client.js";
import { isValidCpf, normaliseCpf } from "./cpf.js";

export const IDENTITY_CLOCK = Symbol("IdentityClock");

export type IdentityClock = {
  now(): Date;
};

export type IdentitySubmission = {
  birthDate: string;
  cpf: string;
  fullName: string;
};

export type IdentityRecord = {
  birthDate: Date;
  cpf: string;
  identityValidatedAt: Date;
  name: string;
};

const MINIMUM_LEGAL_AGE = 18;

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}

function calculateAge(birthDate: Date, now: Date): number {
  let age = now.getUTCFullYear() - birthDate.getUTCFullYear();
  const monthDiff = now.getUTCMonth() - birthDate.getUTCMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && now.getUTCDate() < birthDate.getUTCDate())
  ) {
    age -= 1;
  }

  return age;
}

function hasTwoSeparatedTokens(name: string): boolean {
  const tokens = name.split(/\s+/).filter((token) => token.length > 0);
  return tokens.length >= 2;
}

@Injectable()
export class IdentityService {
  constructor(
    private readonly prisma: import("../generated/prisma/client.js").PrismaClient,
    @Inject(IDENTITY_CLOCK)
    private readonly clock: IdentityClock,
  ) {}

  async submit(
    actorUserId: string,
    submission: IdentitySubmission,
  ): Promise<IdentityRecord> {
    const fullName = submission.fullName.trim();
    const normalisedCpf = normaliseCpf(submission.cpf);

    if (!hasTwoSeparatedTokens(fullName)) {
      throw new BadRequestException(
        "Informe o nome completo (nome e sobrenome).",
      );
    }

    if (!isValidCpf(normalisedCpf)) {
      throw new BadRequestException("CPF inválido.");
    }

    const birthDate = new Date(submission.birthDate);
    const now = this.clock.now();

    if (Number.isNaN(birthDate.getTime())) {
      throw new BadRequestException("Data de nascimento inválida.");
    }

    if (calculateAge(birthDate, now) < MINIMUM_LEGAL_AGE) {
      throw new BadRequestException(
        "A idade mínima para validar a identidade é 18 anos.",
      );
    }

    const user = await this.prisma.user.findUnique({
      select: {
        emailVerified: true,
        id: true,
      },
      where: { id: actorUserId },
    });

    if (!user) {
      throw new NotFoundException("Conta não encontrada.");
    }

    if (!user.emailVerified) {
      throw new ForbiddenException(
        "Confirme seu e-mail antes de validar a identidade.",
      );
    }

    const data = {
      birthDate,
      cpf: normalisedCpf,
      identityValidatedAt: now,
      name: fullName,
    } satisfies Prisma.UserUpdateInput;

    try {
      const updated = await this.prisma.user.update({
        data,
        select: {
          birthDate: true,
          cpf: true,
          identityValidatedAt: true,
          name: true,
        },
        where: { id: actorUserId },
      });

      if (
        updated.birthDate === null ||
        updated.cpf === null ||
        updated.identityValidatedAt === null
      ) {
        throw new Error(
          "User updated with missing identity columns",
        );
      }

      return {
        birthDate: updated.birthDate,
        cpf: updated.cpf,
        identityValidatedAt: updated.identityValidatedAt,
        name: updated.name,
      };
    } catch (error: unknown) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException(
          "Este CPF já está vinculado a outra conta.",
        );
      }

      throw error;
    }
  }

  async refreshValidationIfPreviouslyValidated(
    actorUserId: string,
  ): Promise<IdentityRecord | null> {
    const existing = await this.prisma.user.findUnique({
      select: {
        birthDate: true,
        cpf: true,
        identityValidatedAt: true,
        name: true,
      },
      where: { id: actorUserId },
    });

    if (
      !existing?.identityValidatedAt ||
      !existing.cpf ||
      !existing.birthDate
    ) {
      return null;
    }

    return {
      birthDate: existing.birthDate,
      cpf: existing.cpf,
      identityValidatedAt: existing.identityValidatedAt,
      name: existing.name,
    };
  }
}
