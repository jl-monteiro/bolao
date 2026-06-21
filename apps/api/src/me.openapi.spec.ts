import { Test } from "@nestjs/testing";
import { SwaggerModule } from "@nestjs/swagger";
import { ACTIVATION_CLOCK } from "./groups/pending-membership-activation.service.js";
import { IDENTITY_CLOCK } from "./identity/identity.service.js";
import { IdentityService } from "./identity/identity.service.js";
import { MeController } from "./groups/me.controller.js";
import { MeService } from "./groups/me.service.js";
import { MfaService } from "./mfa/mfa.service.js";
import { PendingMembershipActivationService } from "./groups/pending-membership-activation.service.js";

function expectResponseCodes(
  responses: Record<string, unknown> | undefined,
  codes: string[],
) {
  for (const code of codes) {
    expect(responses).toHaveProperty(code);
  }
}

describe("OpenAPI /me contract", () => {
  it("documents identity submit and pending-membership activation paths", async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [MeController],
      providers: [
        {
          provide: MeService,
          useValue: {},
        },
        {
          provide: IdentityService,
          useValue: {},
        },
        {
          provide: PendingMembershipActivationService,
          useValue: {},
        },
        {
          provide: MfaService,
          useValue: {},
        },
        {
          provide: IDENTITY_CLOCK,
          useValue: { now: () => new Date() },
        },
        {
          provide: ACTIVATION_CLOCK,
          useValue: { now: () => new Date() },
        },
      ],
    }).compile();

    const app = moduleRef.createNestApplication();
    app.setGlobalPrefix("v1");
    await app.init();

    const document = SwaggerModule.createDocument(
      app,
      {} as Parameters<typeof SwaggerModule.createDocument>[1],
    );

    expect(document.paths).toHaveProperty(
      "/v1/me/pending-memberships/{pendingId}/activate",
    );
    expect(document.paths).toHaveProperty("/v1/me/identity");
    expect(document.paths).toHaveProperty("/v1/me/mfa");
    expect(document.paths).toHaveProperty("/v1/me/mfa/totp/setup");
    expect(document.paths).toHaveProperty("/v1/me/mfa/totp/confirm");

    expectResponseCodes(
      document.paths["/v1/me/identity"]?.post?.responses,
      ["201", "400", "401", "403", "409"],
    );
    expectResponseCodes(
      document.paths[
        "/v1/me/pending-memberships/{pendingId}/activate"
      ]?.post?.responses,
      ["200", "401", "403", "404", "409", "410"],
    );
    expectResponseCodes(
      document.paths["/v1/me/mfa"]?.get?.responses,
      ["200", "401"],
    );
    expectResponseCodes(
      document.paths["/v1/me/mfa/totp/setup"]?.post?.responses,
      ["201", "400", "401"],
    );
    expectResponseCodes(
      document.paths["/v1/me/mfa/totp/confirm"]?.post?.responses,
      ["200", "400", "401"],
    );

    expect(document.components?.schemas).toHaveProperty(
      "SubmitIdentityDto",
    );
    expect(document.components?.schemas).toHaveProperty(
      "SubmitIdentityResponseDto",
    );
    expect(document.components?.schemas).toHaveProperty(
      "ActivatedPendingMembershipResponseDto",
    );
    expect(document.components?.schemas).toHaveProperty(
      "MfaStatusResponseDto",
    );
    expect(document.components?.schemas).toHaveProperty(
      "MfaSetupResponseDto",
    );
    expect(document.components?.schemas).toHaveProperty("ConfirmMfaDto");

    await app.close();
  });
});
