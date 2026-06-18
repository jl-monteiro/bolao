import { jest } from "@jest/globals";
import type { UserSession } from "@thallesp/nestjs-better-auth";
import { auth } from "../auth/auth.js";
import type { IdentityService } from "../identity/identity.service.js";
import type { PendingMembershipActivationService } from "./pending-membership-activation.service.js";
import { MeController } from "./me.controller.js";
import type { MeService } from "./me.service.js";

const session = { user: { id: "user-1" } } as UserSession<typeof auth>;

function createMeServiceMock() {
  return {
    listIncomingInvites: jest.fn<() => Promise<unknown>>(),
    listPendingMemberships: jest.fn<() => Promise<unknown>>(),
  };
}

function createIdentityServiceMock() {
  return {
    submit: jest.fn<(userId: string, input: unknown) => Promise<unknown>>(),
  };
}

function createActivationServiceMock() {
  return {
    activate:
      jest.fn<
        (userId: string, pendingId: string) => Promise<unknown>
      >(),
  };
}

describe("MeController", () => {
  it("delegates listIncomingInvites to the authenticated user", async () => {
    const service = createMeServiceMock();
    service.listIncomingInvites.mockResolvedValue([]);
    const controller = new MeController(
      service as unknown as MeService,
      createIdentityServiceMock() as unknown as IdentityService,
      createActivationServiceMock() as unknown as PendingMembershipActivationService,
    );

    await controller.incomingInvites(session);

    expect(service.listIncomingInvites).toHaveBeenCalledWith("user-1");
  });

  it("delegates listPendingMemberships to the authenticated user", async () => {
    const service = createMeServiceMock();
    service.listPendingMemberships.mockResolvedValue([]);
    const controller = new MeController(
      service as unknown as MeService,
      createIdentityServiceMock() as unknown as IdentityService,
      createActivationServiceMock() as unknown as PendingMembershipActivationService,
    );

    await controller.pendingMemberships(session);

    expect(service.listPendingMemberships).toHaveBeenCalledWith("user-1");
  });

  it("submits identity using the authenticated user id", async () => {
    const identity = createIdentityServiceMock();
    identity.submit.mockResolvedValue({ cpf: "11144477735" });
    const controller = new MeController(
      createMeServiceMock() as unknown as MeService,
      identity as unknown as IdentityService,
      createActivationServiceMock() as unknown as PendingMembershipActivationService,
    );

    await expect(
      controller.submitIdentity(session, {
        birthDate: "1990-05-15",
        cpf: "111.444.777-35",
        fullName: "Maria da Silva",
      }),
    ).resolves.toEqual({ cpf: "11144477735" });

    expect(identity.submit).toHaveBeenCalledWith("user-1", {
      birthDate: "1990-05-15",
      cpf: "111.444.777-35",
      fullName: "Maria da Silva",
    });
  });

  it("activates a pending membership via the activation service", async () => {
    const activation = createActivationServiceMock();
    activation.activate.mockResolvedValue({
      groupId: "group-1",
      pendingMembershipId: "pending-1",
    });
    const controller = new MeController(
      createMeServiceMock() as unknown as MeService,
      createIdentityServiceMock() as unknown as IdentityService,
      activation as unknown as PendingMembershipActivationService,
    );

    await expect(
      controller.activatePendingMembership(session, "pending-1"),
    ).resolves.toEqual({
      groupId: "group-1",
      pendingMembershipId: "pending-1",
    });

    expect(activation.activate).toHaveBeenCalledWith("user-1", "pending-1");
  });
});
