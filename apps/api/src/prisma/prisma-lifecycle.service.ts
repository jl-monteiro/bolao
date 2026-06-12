import { Injectable, OnApplicationShutdown } from "@nestjs/common";
import { prisma } from "./prisma-client.js";

@Injectable()
export class PrismaLifecycleService implements OnApplicationShutdown {
  async onApplicationShutdown() {
    await prisma.$disconnect();
  }
}
