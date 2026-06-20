import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiGoneResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import {
  Session,
  type UserSession,
} from "@thallesp/nestjs-better-auth";
import { auth } from "../auth/auth.js";
import { AcceptGroupInviteDto } from "./dto/accept-group-invite.dto.js";
import { CreateGroupInviteDto } from "./dto/create-group-invite.dto.js";
import {
  GroupInviteIssuedResponseDto,
  GroupInviteResponseDto,
} from "./dto/group-invite-response.dto.js";
import { GroupInvitePreviewResponseDto } from "./dto/group-invite-preview-response.dto.js";
import {
  GroupInviteAcceptedResponseDto,
  GroupPendingMemberResponseDto,
} from "./dto/group-pending-member-response.dto.js";
import { GroupInvitesService } from "./group-invites.service.js";

@ApiTags("group-invites")
@ApiCookieAuth("better-auth.session_token")
@ApiUnauthorizedResponse({ description: "Sessão ausente ou expirada." })
@Controller()
export class GroupInvitesController {
  constructor(
    private readonly groupInvitesService: GroupInvitesService,
  ) {}

  @Post("groups/:groupId/invites")
  @ApiCreatedResponse({ type: GroupInviteIssuedResponseDto })
  @ApiBadRequestResponse({ description: "E-mail inválido." })
  @ApiForbiddenResponse({
    description: "O papel atual não permite administrar Convites.",
  })
  @ApiNotFoundResponse({ description: "Grupo não encontrado." })
  @ApiConflictResponse({
    description:
      "Destinatário já é membro, pendente ou já possui Convite ativo.",
  })
  @ApiServiceUnavailableResponse({
    description:
      "Convite persistido, mas a entrega do e-mail falhou.",
  })
  issue(
    @Session() session: UserSession<typeof auth>,
    @Param("groupId") groupId: string,
    @Body() input: CreateGroupInviteDto,
  ) {
    return this.groupInvitesService.issue(
      session.user.id,
      groupId,
      input.email,
    );
  }

  @Get("groups/:groupId/invites")
  @ApiOkResponse({ isArray: true, type: GroupInviteResponseDto })
  @ApiForbiddenResponse({
    description: "O papel atual não permite administrar Convites.",
  })
  @ApiNotFoundResponse({ description: "Grupo não encontrado." })
  list(
    @Session() session: UserSession<typeof auth>,
    @Param("groupId") groupId: string,
  ) {
    return this.groupInvitesService.list(session.user.id, groupId);
  }

  @Delete("groups/:groupId/invites/:inviteId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: "Convite revogado." })
  @ApiForbiddenResponse({
    description: "O papel atual não permite administrar Convites.",
  })
  @ApiNotFoundResponse({
    description: "Grupo ou Convite não encontrado.",
  })
  @ApiConflictResponse({
    description: "O Convite não está mais pendente.",
  })
  revoke(
    @Session() session: UserSession<typeof auth>,
    @Param("groupId") groupId: string,
    @Param("inviteId") inviteId: string,
  ) {
    return this.groupInvitesService.revoke(
      session.user.id,
      groupId,
      inviteId,
    );
  }

  @Get("groups/:groupId/pending-members")
  @ApiOkResponse({
    isArray: true,
    type: GroupPendingMemberResponseDto,
  })
  @ApiForbiddenResponse({
    description:
      "O papel atual não permite consultar membros pendentes.",
  })
  @ApiNotFoundResponse({ description: "Grupo não encontrado." })
  listPendingMembers(
    @Session() session: UserSession<typeof auth>,
    @Param("groupId") groupId: string,
  ) {
    return this.groupInvitesService.listPendingMembers(
      session.user.id,
      groupId,
    );
  }

  @Post("group-invites/preview")
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: GroupInvitePreviewResponseDto })
  @ApiBadRequestResponse({ description: "Token inválido." })
  @ApiForbiddenResponse({
    description: "A conta ainda não confirmou o e-mail.",
  })
  @ApiNotFoundResponse({ description: "Convite indisponível." })
  @ApiGoneResponse({ description: "Convite expirado." })
  preview(
    @Session() session: UserSession<typeof auth>,
    @Body() input: AcceptGroupInviteDto,
  ) {
    return this.groupInvitesService.preview(
      session.user.id,
      input.token,
    );
  }

  @Post("group-invites/accept")
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: GroupInviteAcceptedResponseDto })
  @ApiBadRequestResponse({ description: "Token inválido." })
  @ApiForbiddenResponse({
    description: "A conta ainda não confirmou o e-mail.",
  })
  @ApiNotFoundResponse({ description: "Convite indisponível." })
  @ApiConflictResponse({
    description:
      "A conta já é membro ou possui outra associação pendente.",
  })
  @ApiGoneResponse({ description: "Convite expirado." })
  accept(
    @Session() session: UserSession<typeof auth>,
    @Body() input: AcceptGroupInviteDto,
  ) {
    return this.groupInvitesService.accept(
      session.user.id,
      input.token,
    );
  }
}
