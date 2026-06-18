import { Test } from "@nestjs/testing";
import { SwaggerModule } from "@nestjs/swagger";
import { ACTIVATION_CLOCK } from "./groups/pending-membership-activation.service.js";
import { IDENTITY_CLOCK } from "./identity/identity.service.js";
import { IdentityService } from "./identity/identity.service.js";
import { MeController } from "./groups/me.controller.js";
import { MeService } from "./groups/me.service.js";
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
      () => ({ addCookieAuth: () => ({ build: () => ({}) }) }),
    );

    expect(document.paths).toHaveProperty(
      "/v1/me/pending-memberships/{pendingId}/activate",
    );
    expect(document.paths).toHaveProperty("/v1/me/identity");

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

    expect(document.components?.schemas).toHaveProperty(
      "SubmitIdentityDto",
    );
    expect(document.components?.schemas).toHaveProperty(
      "SubmitIdentityResponseDto",
    );
    expect(document.components?.schemas).toHaveProperty(
      "ActivatedPendingMembershipResponseDto",
    );

    await app.close();
  });
});
