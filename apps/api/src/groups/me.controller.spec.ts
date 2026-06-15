import { jest } from "@jest/globals";
import type { UserSession } from "@thallesp/nestjs-better-auth";
import { auth } from "../auth/auth.js";
import { MeController } from "./me.controller.js";
import type { MeService } from "./me.service.js";

const session = { user: { id: "user-1" } } as UserSession<typeof auth>;

function createServiceMock() {
  return {
    listIncomingInvites: jest.fn<() => Promise<unknown>>(),
    listPendingMemberships: jest.fn<() => Promise<unknown>>(),
  };
}

describe("MeController", () => {
  it("delegates listIncomingInvites to the authenticated user", async () => {
    const service = createServiceMock();
    service.listIncomingInvites.mockResolvedValue([]);
    const controller = new MeController(
      service as unknown as MeService,
    );

    await controller.incomingInvites(session);

    expect(service.listIncomingInvites).toHaveBeenCalledWith("user-1");
  });

  it("delegates listPendingMemberships to the authenticated user", async () => {
    const service = createServiceMock();
    service.listPendingMemberships.mockResolvedValue([]);
    const controller = new MeController(
      service as unknown as MeService,
    );

    await controller.pendingMemberships(session);

    expect(service.listPendingMemberships).toHaveBeenCalledWith("user-1");
  });
});
