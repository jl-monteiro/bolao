import { Module } from "@nestjs/common";
import { GroupRolePolicy } from "./group-role.policy.js";
import { GroupsController } from "./groups.controller.js";
import { GroupsService } from "./groups.service.js";

@Module({
  controllers: [GroupsController],
  providers: [GroupRolePolicy, GroupsService],
})
export class GroupsModule {}
