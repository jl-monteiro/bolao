import { jest } from "@jest/globals";
import type { UserSession } from "@thallesp/nestjs-better-auth";
import { auth } from "../auth/auth.js";
import { GroupRole } from "../generated/prisma/enums.js";
import { GroupsController } from "./groups.controller.js";
import type {
  GroupMemberResult,
  GroupResult,
  GroupsService,
} from "./groups.service.js";

const group: GroupResult = {
  createdAt: new Date("2026-06-13T12:00:00.000Z"),
  description: null,
  id: "group-1",
  image: null,
  name: "Copa 2026",
  role: GroupRole.OWNER,
  updatedAt: new Date("2026-06-13T12:00:00.000Z"),
};

const session = {
  user: {
    id: "user-1",
  },
} as UserSession<typeof auth>;

const member: GroupMemberResult = {
  id: "membership-1",
  image: null,
  joinedAt: new Date("2026-06-13T12:00:00.000Z"),
  name: "Teste E2E",
  role: GroupRole.OWNER,
};

function createServiceMock() {
  return {
    create: jest.fn<
      (userId: string, input: { name: string }) => Promise<GroupResult>
    >(),
    getById: jest.fn<
      (userId: string, groupId: string) => Promise<GroupResult>
    >(),
    list: jest.fn<(userId: string) => Promise<GroupResult[]>>(),
    listMembers: jest.fn<
      (userId: string, groupId: string) => Promise<GroupMemberResult[]>
    >(),
    updateMemberRole: jest.fn<
      (
        userId: string,
        groupId: string,
        membershipId: string,
        input: { role: "ORGANIZER" | "MEMBER" },
      ) => Promise<GroupMemberResult>
    >(),
    update: jest.fn<
      (
        userId: string,
        groupId: string,
        input: { description?: string | null; name?: string },
      ) => Promise<GroupResult>
    >(),
  };
}

describe("GroupsController", () => {
  it("creates a group for the authenticated user", async () => {
    const service = createServiceMock();
    service.create.mockResolvedValue(group);
    const controller = new GroupsController(
      service as unknown as GroupsService,
    );

    await expect(
      controller.create(session, { name: "Copa 2026" }),
    ).resolves.toBe(group);
    expect(service.create).toHaveBeenCalledWith("user-1", {
      name: "Copa 2026",
    });
  });

  it("lists groups for the authenticated user", async () => {
    const service = createServiceMock();
    service.list.mockResolvedValue([group]);
    const controller = new GroupsController(
      service as unknown as GroupsService,
    );

    await expect(controller.list(session)).resolves.toEqual([group]);
    expect(service.list).toHaveBeenCalledWith("user-1");
  });

  it("gets a group for the authenticated user", async () => {
    const service = createServiceMock();
    service.getById.mockResolvedValue(group);
    const controller = new GroupsController(
      service as unknown as GroupsService,
    );

    await expect(
      controller.getById(session, "group-1"),
    ).resolves.toBe(group);
    expect(service.getById).toHaveBeenCalledWith("user-1", "group-1");
  });

  it("lists members for the authenticated Group member", async () => {
    const service = createServiceMock();
    service.listMembers.mockResolvedValue([member]);
    const controller = new GroupsController(
      service as unknown as GroupsService,
    );

    await expect(
      controller.listMembers(session, "group-1"),
    ).resolves.toEqual([member]);
    expect(service.listMembers).toHaveBeenCalledWith(
      "user-1",
      "group-1",
    );
  });

  it("updates a Group member role for the authenticated user", async () => {
    const service = createServiceMock();
    service.updateMemberRole.mockResolvedValue({
      ...member,
      role: GroupRole.ORGANIZER,
    });
    const controller = new GroupsController(
      service as unknown as GroupsService,
    );
    const input = {
      role: GroupRole.ORGANIZER,
    };

    await expect(
      controller.updateMemberRole(
        session,
        "group-1",
        "membership-1",
        input,
      ),
    ).resolves.toEqual({
      ...member,
      role: GroupRole.ORGANIZER,
    });
    expect(service.updateMemberRole).toHaveBeenCalledWith(
      "user-1",
      "group-1",
      "membership-1",
      input,
    );
  });

  it("updates a Group for the authenticated user", async () => {
    const service = createServiceMock();
    service.update.mockResolvedValue(group);
    const controller = new GroupsController(
      service as unknown as GroupsService,
    );
    const input = {
      description: "Descrição atualizada",
      name: "Copa atualizada",
    };

    await expect(
      controller.update(session, "group-1", input),
    ).resolves.toBe(group);
    expect(service.update).toHaveBeenCalledWith(
      "user-1",
      "group-1",
      input,
    );
  });
});
