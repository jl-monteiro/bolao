import { jest } from "@jest/globals";
import type { UserSession } from "@thallesp/nestjs-better-auth";
import { auth } from "../auth/auth.js";
import type { IdentityService } from "../identity/identity.service.js";
import type { MfaService } from "../mfa/mfa.service.js";
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

function createMfaServiceMock() {
  return {
    beginSetup: jest.fn<(userId: string) => Promise<unknown>>(),
    confirmSetup:
      jest.fn<(userId: string, code: string) => Promise<unknown>>(),
    getStatus: jest.fn<(userId: string) => Promise<unknown>>(),
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
      createMfaServiceMock() as unknown as MfaService,
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
      createMfaServiceMock() as unknown as MfaService,
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
      createMfaServiceMock() as unknown as MfaService,
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
      createMfaServiceMock() as unknown as MfaService,
    );

    await expect(
      controller.activatePendingMembership(session, "pending-1"),
    ).resolves.toEqual({
      groupId: "group-1",
      pendingMembershipId: "pending-1",
    });

    expect(activation.activate).toHaveBeenCalledWith("user-1", "pending-1");
  });

  it("delegates MFA status to the authenticated user", async () => {
    const mfa = createMfaServiceMock();
    mfa.getStatus.mockResolvedValue({
      enabledAt: null,
      totpEnabled: false,
    });
    const controller = new MeController(
      createMeServiceMock() as unknown as MeService,
      createIdentityServiceMock() as unknown as IdentityService,
      createActivationServiceMock() as unknown as PendingMembershipActivationService,
      mfa as unknown as MfaService,
    );

    await expect(controller.mfaStatus(session)).resolves.toEqual({
      enabledAt: null,
      totpEnabled: false,
    });
    expect(mfa.getStatus).toHaveBeenCalledWith("user-1");
  });

  it("delegates MFA setup and confirmation to the authenticated user", async () => {
    const mfa = createMfaServiceMock();
    mfa.beginSetup.mockResolvedValue({ secret: "ABC" });
    mfa.confirmSetup.mockResolvedValue({
      enabledAt: new Date("2026-06-21T12:00:00.000Z"),
      totpEnabled: true,
    });
    const controller = new MeController(
      createMeServiceMock() as unknown as MeService,
      createIdentityServiceMock() as unknown as IdentityService,
      createActivationServiceMock() as unknown as PendingMembershipActivationService,
      mfa as unknown as MfaService,
    );

    await expect(controller.mfaSetup(session)).resolves.toEqual({
      secret: "ABC",
    });
    await expect(
      controller.mfaConfirm(session, { code: "123456" }),
    ).resolves.toMatchObject({
      totpEnabled: true,
    });
    expect(mfa.beginSetup).toHaveBeenCalledWith("user-1");
    expect(mfa.confirmSetup).toHaveBeenCalledWith("user-1", "123456");
  });
});
