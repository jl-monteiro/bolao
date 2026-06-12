import { Global, Module } from "@nestjs/common";
import { PrismaClient } from "../generated/prisma/client.js";
import { prisma } from "./prisma-client.js";
import { PrismaLifecycleService } from "./prisma-lifecycle.service.js";

@Global()
@Module({
  providers: [
    {
      provide: PrismaClient,
      useValue: prisma,
    },
    PrismaLifecycleService,
  ],
  exports: [PrismaClient],
})
export class PrismaModule {}
