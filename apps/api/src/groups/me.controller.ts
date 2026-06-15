import { Controller, Get } from "@nestjs/common";
import {
  ApiCookieAuth,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import {
  Session,
  type UserSession,
} from "@thallesp/nestjs-better-auth";
import { auth } from "../auth/auth.js";
import { IncomingGroupInviteDto } from "./dto/incoming-group-invite.dto.js";
import { MePendingMembershipDto } from "./dto/me-pending-membership.dto.js";
import { MeService } from "./me.service.js";

@ApiTags("me")
@ApiCookieAuth("better-auth.session_token")
@ApiUnauthorizedResponse({ description: "Sessão ausente ou expirada." })
@Controller("me")
export class MeController {
  constructor(private readonly meService: MeService) {}

  @Get("incoming-invites")
  @ApiOkResponse({ isArray: true, type: IncomingGroupInviteDto })
  incomingInvites(@Session() session: UserSession<typeof auth>) {
    return this.meService.listIncomingInvites(session.user.id);
  }

  @Get("pending-memberships")
  @ApiOkResponse({
    isArray: true,
    type: MePendingMembershipDto,
  })
  pendingMemberships(@Session() session: UserSession<typeof auth>) {
    return this.meService.listPendingMemberships(session.user.id);
  }
}
