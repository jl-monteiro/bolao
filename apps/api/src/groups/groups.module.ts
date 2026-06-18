import { Module } from "@nestjs/common";
import {
  ACTIVATION_CLOCK,
  PendingMembershipActivationService,
} from "./pending-membership-activation.service.js";
import {
  IDENTITY_CLOCK,
  IdentityService,
} from "../identity/identity.service.js";
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
      provide: ACTIVATION_CLOCK,
      useValue: {
        now: () => new Date(),
      },
    },
    {
      provide: GROUP_INVITE_CLOCK,
      useValue: {
        now: () => new Date(),
      },
    },
    {
      provide: IDENTITY_CLOCK,
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
    IdentityService,
    MeService,
    PendingMembershipActivationService,
  ],
})
export class GroupsModule {}
