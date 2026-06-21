import assert from "node:assert/strict";
import type { PrismaClient } from "../src/generated/prisma/client.js";
import { MeService } from "../src/groups/me.service.js";
import { createTestPrismaClient } from "./database.js";

describe("MeService inbox", () => {
  let prisma: PrismaClient;
  let me: MeService;

  beforeAll(() => {
    prisma = createTestPrismaClient();
    me = new MeService(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.auditLog.deleteMany({});
    await prisma.groupOwnershipTransfer.deleteMany({});
    await prisma.groupPendingMembership.deleteMany({});
    await prisma.groupInvite.deleteMany({});
    await prisma.groupMembership.deleteMany({});
    await prisma.group.deleteMany({});
    await prisma.session.deleteMany({});
    await prisma.account.deleteMany({});
    await prisma.verification.deleteMany({});
    await prisma.user.deleteMany({});
  });

  it("lists invites whose target email matches the authenticated user", async () => {
    const owner = await prisma.user.create({
      data: {
        email: "owner@example.com",
        emailVerified: true,
        id: "owner-1",
        name: "Owner",
      },
    });
    const invitee = await prisma.user.create({
      data: {
        email: "Invitee@Example.com",
        emailVerified: true,
        id: "invitee-1",
        name: "Invitee",
      },
    });
    const group = await prisma.group.create({
      data: {
        id: "group-1",
        memberships: {
          create: { id: "mem-1", role: "OWNER", userId: owner.id },
        },
        name: "Copa 2026",
      },
    });
    await prisma.groupInvite.create({
      data: {
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        groupId: group.id,
        id: "invite-pending-1",
        issuedById: owner.id,
        targetEmail: "invitee@example.com",
        tokenHash: "hash-pending",
      },
    });
    await prisma.groupInvite.create({
      data: {
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        groupId: group.id,
        id: "invite-revoked-1",
        issuedById: owner.id,
        targetEmail: "invitee@example.com",
        revokedAt: new Date(),
        revokedById: owner.id,
        status: "REVOKED",
        tokenHash: "hash-revoked",
      },
    });

    const rows = await me.listIncomingInvites(invitee.id);
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.id, "invite-pending-1");
    assert.equal(rows[0]?.group.name, "Copa 2026");
    assert.equal(rows[0]?.group.id, group.id);
  });

  it("lists pending memberships belonging to the authenticated user", async () => {
    const owner = await prisma.user.create({
      data: {
        email: "owner@example.com",
        emailVerified: true,
        id: "owner-1",
        name: "Owner",
      },
    });
    const invitee = await prisma.user.create({
      data: {
        email: "invitee@example.com",
        emailVerified: true,
        id: "invitee-1",
        name: "Invitee",
      },
    });
    const group = await prisma.group.create({
      data: {
        id: "group-1",
        memberships: {
          create: { id: "mem-1", role: "OWNER", userId: owner.id },
        },
        name: "Copa 2026",
      },
    });
    const invite = await prisma.groupInvite.create({
      data: {
        acceptedAt: new Date(),
        acceptedById: invitee.id,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        groupId: group.id,
        id: "invite-1",
        issuedById: owner.id,
        status: "ACCEPTED",
        targetEmail: "invitee@example.com",
        tokenHash: "hash-1",
      },
    });
    await prisma.groupPendingMembership.create({
      data: {
        acceptedAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        groupId: group.id,
        id: "pending-1",
        inviteId: invite.id,
        status: "PENDING",
        userId: invitee.id,
      },
    });

    const rows = await me.listPendingMemberships(invitee.id);
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.id, "pending-1");
    assert.equal(rows[0]?.group.name, "Copa 2026");
  });
});
