import { jest } from "@jest/globals";
import type { UserSession } from "@thallesp/nestjs-better-auth";
import { auth } from "../auth/auth.js";
import { GroupInvitesController } from "./group-invites.controller.js";
import type { GroupInvitesService } from "./group-invites.service.js";

const session = {
  user: {
    id: "user-1",
  },
} as UserSession<typeof auth>;

function createServiceMock() {
  return {
    accept: jest.fn<(userId: string, token: string) => Promise<unknown>>(),
    activatePendingMember:
      jest.fn<
        (
          userId: string,
          groupId: string,
          pendingMemberId: string,
        ) => Promise<unknown>
      >(),
    issue:
      jest.fn<
        (
          userId: string,
          groupId: string,
          email: string,
        ) => Promise<unknown>
      >(),
    list:
      jest.fn<
        (userId: string, groupId: string) => Promise<unknown>
      >(),
    listPendingMembers:
      jest.fn<
        (userId: string, groupId: string) => Promise<unknown>
      >(),
    preview:
      jest.fn<(userId: string, token: string) => Promise<unknown>>(),
    revoke:
      jest.fn<
        (
          userId: string,
          groupId: string,
          inviteId: string,
        ) => Promise<void>
      >(),
  };
}

describe("GroupInvitesController", () => {
  it("delegates invitation issuance using the authenticated user", async () => {
    const service = createServiceMock();
    service.issue.mockResolvedValue({ id: "invite-1" });
    const controller = new GroupInvitesController(
      service as unknown as GroupInvitesService,
    );

    await controller.issue(session, "group-1", {
      email: "pessoa@example.com",
    });

    expect(service.issue).toHaveBeenCalledWith(
      "user-1",
      "group-1",
      "pessoa@example.com",
    );
  });

  it("delegates preview and acceptance with a body token", async () => {
    const service = createServiceMock();
    service.preview.mockResolvedValue({ id: "invite-1" });
    service.accept.mockResolvedValue({ id: "pending-1" });
    const controller = new GroupInvitesController(
      service as unknown as GroupInvitesService,
    );

    await controller.preview(session, { token: "raw_token-123" });
    await controller.accept(session, { token: "raw_token-123" });

    expect(service.preview).toHaveBeenCalledWith(
      "user-1",
      "raw_token-123",
    );
    expect(service.accept).toHaveBeenCalledWith(
      "user-1",
      "raw_token-123",
    );
  });

  it("delegates pending member activation to the authenticated administrator", async () => {
    const service = createServiceMock();
    service.activatePendingMember.mockResolvedValue({
      id: "membership-1",
    });
    const controller = new GroupInvitesController(
      service as unknown as GroupInvitesService,
    );

    await expect(
      controller.activatePendingMember(
        session,
        "group-1",
        "pending-1",
      ),
    ).resolves.toEqual({
      id: "membership-1",
    });

    expect(service.activatePendingMember).toHaveBeenCalledWith(
      "user-1",
      "group-1",
      "pending-1",
    );
  });
});
