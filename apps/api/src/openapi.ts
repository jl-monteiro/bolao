import { DocumentBuilder } from "@nestjs/swagger";

export function createOpenApiConfig() {
  return new DocumentBuilder()
    .setTitle("Bolao API")
    .setDescription("API da plataforma Bolao")
    .setVersion("1.0")
    .addCookieAuth(
      "better-auth.session_token",
      undefined,
      "better-auth.session_token",
    )
    .build();
}
