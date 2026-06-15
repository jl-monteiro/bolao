import { Module } from "@nestjs/common";
import {
  NOTIFICATION_PROVIDER,
  notificationProvider,
} from "../notifications/notification-provider.js";
import { GroupInvitesController } from "./group-invites.controller.js";
import {
  GROUP_INVITE_CLOCK,
  GroupInvitesService,
} from "./group-invites.service.js";
import { GroupInviteExpirationService } from "./group-invite-expiration.service.js";
import { GroupInviteTokenService } from "./group-invite-token.service.js";
import { GroupRolePolicy } from "./group-role.policy.js";
import { GroupsController } from "./groups.controller.js";
import { GroupsService } from "./groups.service.js";
import { MeController } from "./me.controller.js";
import { MeService } from "./me.service.js";

@Module({
  controllers: [GroupInvitesController, GroupsController, MeController],
  providers: [
    {
      provide: GROUP_INVITE_CLOCK,
      useValue: {
        now: () => new Date(),
      },
    },
    {
      provide: NOTIFICATION_PROVIDER,
      useValue: notificationProvider,
    },
    GroupInviteExpirationService,
    GroupInviteTokenService,
    GroupInvitesService,
    GroupRolePolicy,
    GroupsService,
    MeService,
  ],
})
export class GroupsModule {}
