import {
  Body,
  Controller,
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
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import {
  Session,
  type UserSession,
} from "@thallesp/nestjs-better-auth";
import { auth } from "../auth/auth.js";
import { SubmitIdentityDto } from "../identity/dto/submit-identity.dto.js";
import { SubmitIdentityResponseDto } from "../identity/dto/submit-identity-response.dto.js";
import { IdentityService } from "../identity/identity.service.js";
import { ConfirmMfaDto } from "../mfa/dto/confirm-mfa.dto.js";
import { MfaSetupResponseDto } from "../mfa/dto/mfa-setup-response.dto.js";
import { MfaStatusResponseDto } from "../mfa/dto/mfa-status-response.dto.js";
import { MfaService } from "../mfa/mfa.service.js";
import { ActivatedPendingMembershipResponseDto } from "./dto/activated-pending-membership-response.dto.js";
import { IncomingGroupInviteDto } from "./dto/incoming-group-invite.dto.js";
import { MePendingMembershipDto } from "./dto/me-pending-membership.dto.js";
import { PendingMembershipActivationService } from "./pending-membership-activation.service.js";
import { MeService } from "./me.service.js";

@ApiTags("me")
@ApiCookieAuth("better-auth.session_token")
@ApiUnauthorizedResponse({ description: "Sessão ausente ou expirada." })
@Controller("me")
export class MeController {
  constructor(
    private readonly meService: MeService,
    private readonly identityService: IdentityService,
    private readonly pendingMembershipActivationService: PendingMembershipActivationService,
    private readonly mfaService: MfaService,
  ) {}

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

  @Get("mfa")
  @ApiOkResponse({ type: MfaStatusResponseDto })
  mfaStatus(@Session() session: UserSession<typeof auth>) {
    return this.mfaService.getStatus(session.user.id);
  }

  @Post("mfa/totp/setup")
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({ type: MfaSetupResponseDto })
  @ApiBadRequestResponse({ description: "MFA TOTP já está ativo." })
  mfaSetup(@Session() session: UserSession<typeof auth>) {
    return this.mfaService.beginSetup(session.user.id);
  }

  @Post("mfa/totp/confirm")
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: MfaStatusResponseDto })
  @ApiBadRequestResponse({
    description: "Configuração ausente ou código inválido.",
  })
  mfaConfirm(
    @Session() session: UserSession<typeof auth>,
    @Body() input: ConfirmMfaDto,
  ) {
    return this.mfaService.confirmSetup(session.user.id, input.code);
  }

  @Post("identity")
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({ type: SubmitIdentityResponseDto })
  @ApiBadRequestResponse({
    description: "Dados inválidos (CPF, data ou nome).",
  })
  @ApiForbiddenResponse({
    description: "A conta ainda não confirmou o e-mail.",
  })
  @ApiConflictResponse({
    description: "CPF já vinculado a outra conta.",
  })
  submitIdentity(
    @Session() session: UserSession<typeof auth>,
    @Body() input: SubmitIdentityDto,
  ) {
    return this.identityService.submit(session.user.id, {
      birthDate: input.birthDate,
      cpf: input.cpf,
      fullName: input.fullName,
    });
  }

  @Post("pending-memberships/:pendingId/activate")
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: ActivatedPendingMembershipResponseDto })
  @ApiForbiddenResponse({
    description: "Identidade ainda não validada.",
  })
  @ApiNotFoundResponse({
    description: "Associação pendente não encontrada.",
  })
  @ApiGoneResponse({
    description: "Associação pendente expirou.",
  })
  @ApiConflictResponse({
    description:
      "Associação pendente não está mais disponível para ativação.",
  })
  activatePendingMembership(
    @Session() session: UserSession<typeof auth>,
    @Param("pendingId") pendingId: string,
  ) {
    return this.pendingMembershipActivationService.activate(
      session.user.id,
      pendingId,
    );
  }
}
