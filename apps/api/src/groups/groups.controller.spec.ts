import { jest } from "@jest/globals";
import type { UserSession } from "@thallesp/nestjs-better-auth";
import { auth } from "../auth/auth.js";
import { GroupRole } from "../generated/prisma/enums.js";
import { GroupsController } from "./groups.controller.js";
import type { GroupResult, GroupsService } from "./groups.service.js";

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

function createServiceMock() {
  return {
    create: jest.fn<
      (userId: string, input: { name: string }) => Promise<GroupResult>
    >(),
    getById: jest.fn<
      (userId: string, groupId: string) => Promise<GroupResult>
    >(),
    list: jest.fn<(userId: string) => Promise<GroupResult[]>>(),
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
});
