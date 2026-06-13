import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module.js";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
  });
  const config = app.get(ConfigService);
  const port = config.get<number>("PORT", 3001);
  const webUrl = config.get<string>("WEB_URL", "http://localhost:3000");

  app.enableCors({
    origin: webUrl,
    credentials: true,
  });
  app.setGlobalPrefix("v1");
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  const openApiConfig = new DocumentBuilder()
    .setTitle("Bolao API")
    .setDescription("API da plataforma Bolao")
    .setVersion("1.0")
    .addCookieAuth("better-auth.session_token")
    .build();
  const documentFactory = () =>
    SwaggerModule.createDocument(app, openApiConfig);
  SwaggerModule.setup("docs", app, documentFactory, {
    jsonDocumentUrl: "openapi.json",
  });

  await app.listen(port);
}

void bootstrap();
