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
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import {
  Session,
  type UserSession,
} from "@thallesp/nestjs-better-auth";
import { auth } from "../auth/auth.js";
import { AcceptOwnershipTransferDto } from "./dto/accept-ownership-transfer.dto.js";
import { CreateOwnershipTransferDto } from "./dto/create-ownership-transfer.dto.js";
import { OwnershipTransferResponseDto } from "./dto/ownership-transfer-response.dto.js";
import { OwnershipTransferService } from "./ownership-transfer.service.js";

@ApiTags("ownership-transfers")
@ApiCookieAuth("better-auth.session_token")
@ApiUnauthorizedResponse({ description: "Sessão ausente ou expirada." })
@Controller()
export class OwnershipTransferController {
  constructor(
    private readonly ownershipTransferService: OwnershipTransferService,
  ) {}

  @Post("groups/:groupId/ownership-transfers")
  @ApiCreatedResponse({ type: OwnershipTransferResponseDto })
  @ApiBadRequestResponse({ description: "Membro de destino inválido." })
  @ApiForbiddenResponse({
    description:
      "O papel atual não permite transferir a propriedade do Grupo.",
  })
  @ApiNotFoundResponse({
    description: "Grupo ou Membro do Grupo não encontrado.",
  })
  @ApiConflictResponse({
    description: "Já existe uma transferência pendente.",
  })
  request(
    @Session() session: UserSession<typeof auth>,
    @Param("groupId") groupId: string,
    @Body() input: CreateOwnershipTransferDto,
  ) {
    return this.ownershipTransferService.request(
      session.user.id,
      groupId,
      input.targetMembershipId,
    );
  }

  @Get("groups/:groupId/ownership-transfers")
  @ApiOkResponse({ isArray: true, type: OwnershipTransferResponseDto })
  @ApiForbiddenResponse({
    description:
      "O papel atual não permite consultar transferências do Grupo.",
  })
  @ApiNotFoundResponse({ description: "Grupo não encontrado." })
  listForGroup(
    @Session() session: UserSession<typeof auth>,
    @Param("groupId") groupId: string,
  ) {
    return this.ownershipTransferService.listForGroup(
      session.user.id,
      groupId,
    );
  }

  @Delete("groups/:groupId/ownership-transfers/:transferId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({
    description: "Transferência de Propriedade revogada.",
  })
  @ApiForbiddenResponse({
    description:
      "O papel atual não permite revogar transferências do Grupo.",
  })
  @ApiNotFoundResponse({
    description: "Grupo ou Transferência de Propriedade não encontrada.",
  })
  @ApiConflictResponse({
    description: "A transferência não está mais pendente.",
  })
  @ApiGoneResponse({
    description: "Transferência de Propriedade expirada.",
  })
  revoke(
    @Session() session: UserSession<typeof auth>,
    @Param("groupId") groupId: string,
    @Param("transferId") transferId: string,
  ) {
    return this.ownershipTransferService.revoke(
      session.user.id,
      groupId,
      transferId,
    );
  }

  @Get("me/ownership-transfers")
  @ApiOkResponse({ isArray: true, type: OwnershipTransferResponseDto })
  listForTarget(@Session() session: UserSession<typeof auth>) {
    return this.ownershipTransferService.listForTarget(session.user.id);
  }

  @Post("me/ownership-transfers/:transferId/accept")
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: OwnershipTransferResponseDto })
  @ApiBadRequestResponse({ description: "Código MFA inválido." })
  @ApiForbiddenResponse({
    description: "MFA TOTP ausente ou código inválido.",
  })
  @ApiNotFoundResponse({
    description: "Transferência de Propriedade não encontrada.",
  })
  @ApiConflictResponse({
    description: "Transferência de Propriedade indisponível.",
  })
  @ApiGoneResponse({
    description: "Transferência de Propriedade expirada.",
  })
  accept(
    @Session() session: UserSession<typeof auth>,
    @Param("transferId") transferId: string,
    @Body() input: AcceptOwnershipTransferDto,
  ) {
    return this.ownershipTransferService.accept(
      session.user.id,
      transferId,
      input.totpCode,
    );
  }
}
