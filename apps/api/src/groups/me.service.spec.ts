import { jest } from "@jest/globals";
import type { PrismaClient } from "../generated/prisma/client.js";
import { MeService } from "./me.service.js";

function createPrismaMock() {
  return {
    groupInvite: {
      findMany: jest.fn<() => Promise<unknown[]>>(),
    },
    groupPendingMembership: {
      findMany: jest.fn<() => Promise<unknown[]>>(),
    },
    user: {
      findUnique: jest.fn<() => Promise<{ email: string } | null>>(),
    },
  };
}

describe("MeService — listIncomingInvites", () => {
  it("loads the current user and finds PENDING invites by lowercased email", async () => {
    const prisma = createPrismaMock();
    prisma.user.findUnique.mockResolvedValue({ email: "USER@Example.com" });
    prisma.groupInvite.findMany.mockResolvedValue([]);

    const service = new MeService(
      prisma as unknown as PrismaClient,
    );

    await service.listIncomingInvites("user-1");

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      select: { email: true },
      where: { id: "user-1" },
    });

    expect(prisma.groupInvite.findMany).toHaveBeenCalledWith({
      orderBy: { expiresAt: "asc" },
      select: expect.objectContaining({
        id: true,
        expiresAt: true,
        issuedAt: true,
        status: true,
        group: expect.anything(),
        issuedBy: expect.anything(),
      }),
      where: {
        group: undefined as never,
        status: "PENDING",
        targetEmail: "user@example.com",
      },
    });
  });

  it("throws ForbiddenException when the user has no verified email", async () => {
    const prisma = createPrismaMock();
    prisma.user.findUnique.mockResolvedValueOnce(null);

    const service = new MeService(
      prisma as unknown as PrismaClient,
    );

    await expect(
      service.listIncomingInvites("user-1"),
    ).rejects.toThrow("Confirme seu e-mail antes de visualizar Convites.");
  });

  it("shapes each row into an IncomingGroupInviteDto", async () => {
    const prisma = createPrismaMock();
    prisma.user.findUnique.mockResolvedValue({ email: "pessoa@example.com" });
    prisma.groupInvite.findMany.mockResolvedValue([
      {
        id: "invite-1",
        expiresAt: new Date("2030-01-01T00:00:00Z"),
        issuedAt: new Date("2026-06-01T00:00:00Z"),
        status: "PENDING",
        group: { id: "group-1", name: "Copa 2026" },
        issuedBy: { id: "user-2", name: "Bruno" },
      },
    ]);

    const service = new MeService(
      prisma as unknown as PrismaClient,
    );

    expect(await service.listIncomingInvites("user-1")).toEqual([
      {
        id: "invite-1",
        expiresAt: new Date("2030-01-01T00:00:00Z"),
        issuedAt: new Date("2026-06-01T00:00:00Z"),
        status: "PENDING",
        group: { id: "group-1", name: "Copa 2026" },
        issuedBy: { id: "user-2", name: "Bruno" },
      },
    ]);
  });
});
