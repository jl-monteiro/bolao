import { Test } from "@nestjs/testing";
import { SwaggerModule } from "@nestjs/swagger";
import { GroupInvitesController } from "./groups/group-invites.controller.js";
import { GroupInvitesService } from "./groups/group-invites.service.js";
import { createOpenApiConfig } from "./openapi.js";

function expectResponseCodes(
  responses: Record<string, unknown> | undefined,
  codes: string[],
) {
  for (const code of codes) {
    expect(responses).toHaveProperty(code);
  }
}

describe("OpenAPI invitation contract", () => {
  it("documents invitation paths, cookie auth, schemas, and response codes", async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [GroupInvitesController],
      providers: [
        {
          provide: GroupInvitesService,
          useValue: {},
        },
      ],
    }).compile();
    const app = moduleRef.createNestApplication();
    app.setGlobalPrefix("v1");
    await app.init();

    const document = SwaggerModule.createDocument(
      app,
      createOpenApiConfig(),
    );

    expect(document.components?.securitySchemes).toHaveProperty(
      ["better-auth.session_token"],
    );
    expect(document.paths).toHaveProperty("/v1/groups/{groupId}/invites");
    expect(document.paths).toHaveProperty(
      "/v1/groups/{groupId}/invites/{inviteId}",
    );
    expect(document.paths).toHaveProperty(
      "/v1/groups/{groupId}/pending-members",
    );
    expect(document.paths).toHaveProperty(
      "/v1/groups/{groupId}/pending-members/{pendingMemberId}/activate",
    );
    expect(document.paths).toHaveProperty("/v1/group-invites/preview");
    expect(document.paths).toHaveProperty("/v1/group-invites/accept");
    expectResponseCodes(
      document.paths["/v1/groups/{groupId}/invites"]?.post?.responses,
      ["201", "400", "401", "403", "404", "409", "503"],
    );
    expectResponseCodes(
      document.paths["/v1/groups/{groupId}/invites"]?.get?.responses,
      ["200", "401", "403", "404"],
    );
    expectResponseCodes(
      document.paths[
        "/v1/groups/{groupId}/invites/{inviteId}"
      ]?.delete?.responses,
      ["204", "401", "403", "404", "409"],
    );
    expectResponseCodes(
      document.paths[
        "/v1/groups/{groupId}/pending-members/{pendingMemberId}/activate"
      ]?.post?.responses,
      ["200", "401", "403", "404", "409", "410"],
    );
    expectResponseCodes(
      document.paths["/v1/group-invites/preview"]?.post?.responses,
      ["200", "400", "401", "403", "404", "410"],
    );
    expectResponseCodes(
      document.paths["/v1/group-invites/accept"]?.post?.responses,
      ["200", "400", "401", "403", "404", "409", "410"],
    );
    expect(document.components?.schemas).toHaveProperty(
      "GroupInviteIssuedResponseDto",
    );
    expect(document.components?.schemas).toHaveProperty(
      "GroupInvitePreviewResponseDto",
    );
    expect(document.components?.schemas).toHaveProperty(
      "GroupInviteAcceptedResponseDto",
    );
    expect(document.components?.schemas).toHaveProperty(
      "GroupMemberResponseDto",
    );
    expect(document.components?.schemas).toHaveProperty(
      "GroupInviteStatus",
    );
    expect(document.components?.schemas).toHaveProperty(
      "PendingMembershipStatus",
    );
    expect(
      JSON.stringify(
        document.components?.schemas?.GroupInviteIssuedResponseDto,
      ),
    ).toContain("acceptUrl");
    expect(JSON.stringify(document.components?.schemas)).not.toContain(
      "tokenHash",
    );

    await app.close();
  });
});
