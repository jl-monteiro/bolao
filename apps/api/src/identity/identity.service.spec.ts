import assert from "node:assert/strict";
import { jest } from "@jest/globals";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from "@nestjs/common";
import type { PrismaClient } from "../generated/prisma/client.js";
import { IdentityService } from "./identity.service.js";

const NOW = new Date("2026-06-17T12:00:00.000Z");

function createPrismaMock() {
  return {
    user: {
      findUnique: jest.fn<(input: unknown) => Promise<unknown>>(),
      update: jest.fn<(input: unknown) => Promise<unknown>>(),
    },
  };
}

function createService(prisma: ReturnType<typeof createPrismaMock>) {
  return new IdentityService(
    prisma as unknown as PrismaClient,
    { now: () => NOW },
  );
}

const INPUT = {
  birthDate: "1990-05-15",
  cpf: "111.444.777-35",
  fullName: "Maria da Silva",
};

const VALID_USER = {
  birthDate: null,
  cpf: null,
  email: "maria@example.com",
  emailVerified: true,
  id: "user-1",
  identityValidatedAt: null,
  name: "Maria",
};

describe("IdentityService", () => {
  it("stores validated identity and stamps identityValidatedAt for the first submission", async () => {
    const prisma = createPrismaMock();
    prisma.user.findUnique.mockResolvedValue(VALID_USER);
    prisma.user.update.mockResolvedValue({
      birthDate: new Date("1990-05-15T00:00:00.000Z"),
      cpf: "11144477735",
      identityValidatedAt: NOW,
      name: "Maria da Silva",
    });
    const service = createService(prisma);

    const result = await service.submit("user-1", INPUT);

    expect(prisma.user.update).toHaveBeenCalledWith({
      data: {
        birthDate: new Date("1990-05-15T00:00:00.000Z"),
        cpf: "11144477735",
        identityValidatedAt: NOW,
        name: "Maria da Silva",
      },
      select: {
        birthDate: true,
        cpf: true,
        identityValidatedAt: true,
        name: true,
      },
      where: { id: "user-1" },
    });
    expect(result).toMatchObject({
      cpf: "11144477735",
      identityValidatedAt: NOW,
    });
  });

  it("keeps the original identityValidatedAt on later submissions", async () => {
    const prisma = createPrismaMock();
    const originalValidation = new Date("2026-06-16T10:00:00.000Z");
    prisma.user.findUnique.mockResolvedValue({
      ...VALID_USER,
      identityValidatedAt: originalValidation,
    });
    prisma.user.update.mockResolvedValue({
      birthDate: new Date("1990-05-15T00:00:00.000Z"),
      cpf: "11144477735",
      identityValidatedAt: originalValidation,
      name: "Maria da Silva",
    });
    const service = createService(prisma);

    const result = await service.submit("user-1", INPUT);

    const updateInput = prisma.user.update.mock.calls[0]?.[0] as
      | { data?: { identityValidatedAt?: Date } }
      | undefined;
    assert.equal(updateInput?.data?.identityValidatedAt, originalValidation);
    expect(result.identityValidatedAt).toBe(originalValidation);
  });

  it("forbids staging identity for an unverified account", async () => {
    const prisma = createPrismaMock();
    prisma.user.findUnique.mockResolvedValue({
      ...VALID_USER,
      emailVerified: false,
    });
    const service = createService(prisma);

    await expect(
      service.submit("user-1", INPUT),
    ).rejects.toEqual(
      new ForbiddenException(
        "Confirme seu e-mail antes de validar a identidade.",
      ),
    );
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("rejects an underage birth date without persisting anything", async () => {
    const prisma = createPrismaMock();
    prisma.user.findUnique.mockResolvedValue(VALID_USER);
    const service = createService(prisma);

    const today = new Date(NOW.getTime());
    const recently = new Date(today.getTime() - 17 * 365 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    await expect(
      service.submit("user-1", {
        ...INPUT,
        birthDate: recently,
      }),
    ).rejects.toEqual(
      new BadRequestException(
        "A idade mínima para validar a identidade é 18 anos.",
      ),
    );
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("rejects an invalid CPF checksum without persisting anything", async () => {
    const prisma = createPrismaMock();
    prisma.user.findUnique.mockResolvedValue(VALID_USER);
    const service = createService(prisma);

    await expect(
      service.submit("user-1", {
        ...INPUT,
        cpf: "111.444.777-99",
      }),
    ).rejects.toEqual(
      new BadRequestException("CPF inválido."),
    );
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("returns 404 when the account does not exist", async () => {
    const prisma = createPrismaMock();
    prisma.user.findUnique.mockResolvedValue(null);
    const service = createService(prisma);

    await expect(
      service.submit("missing-user", INPUT),
    ).rejects.toMatchObject({ name: "NotFoundException" });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("translates a unique-cpf conflict raised by the database into a friendly error", async () => {
    const prisma = createPrismaMock();
    prisma.user.findUnique.mockResolvedValue(VALID_USER);
    prisma.user.update.mockRejectedValue({ code: "P2002" });
    const service = createService(prisma);

    await expect(
      service.submit("user-1", INPUT),
    ).rejects.toEqual(
      new ConflictException(
        "Este CPF já está vinculado a outra conta.",
      ),
    );
    const calls = prisma.user.update.mock.calls;
    assert.equal(calls.length, 1);
    assert.equal(
      (calls[0]?.[0] as { where?: { id?: string } } | undefined)?.where?.id,
      "user-1",
    );
  });

  it("refuses submissions shorter than two separated tokens in the full name", async () => {
    const prisma = createPrismaMock();
    prisma.user.findUnique.mockResolvedValue(VALID_USER);
    const service = createService(prisma);

    await expect(
      service.submit("user-1", {
        ...INPUT,
        fullName: "Maria",
      }),
    ).rejects.toEqual(
      new BadRequestException(
        "Informe o nome completo (nome e sobrenome).",
      ),
    );
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
