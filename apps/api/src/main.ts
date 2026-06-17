import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module.js";
import { createOpenApiConfig } from "./openapi.js";

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

  const documentFactory = () =>
    SwaggerModule.createDocument(app, createOpenApiConfig());
  SwaggerModule.setup("docs", app, documentFactory, {
    jsonDocumentUrl: "openapi.json",
  });

  await app.listen(port);
}

void bootstrap();
