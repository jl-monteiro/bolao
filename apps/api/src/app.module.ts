import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { AuthModule } from "@thallesp/nestjs-better-auth";
import { auth } from "./auth/auth.js";
import { GroupsModule } from "./groups/groups.module.js";
import { HealthModule } from "./health/health.module.js";
import { PrismaModule } from "./prisma/prisma.module.js";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ["../../.env", ".env"],
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule.forRoot({
      auth,
      bodyParser: {
        json: {
          limit: "1mb",
        },
        rawBody: true,
        urlencoded: {
          extended: true,
          limit: "1mb",
        },
      },
    }),
    HealthModule,
    GroupsModule,
  ],
})
export class AppModule {}
