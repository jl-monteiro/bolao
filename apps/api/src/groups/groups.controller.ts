import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
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
import { CreateGroupDto } from "./dto/create-group.dto.js";
import { GroupMemberResponseDto } from "./dto/group-member-response.dto.js";
import { GroupResponseDto } from "./dto/group-response.dto.js";
import { UpdateGroupDto } from "./dto/update-group.dto.js";
import { GroupsService } from "./groups.service.js";

@ApiTags("groups")
@ApiCookieAuth()
@ApiUnauthorizedResponse({ description: "Sessão ausente ou expirada." })
@Controller("groups")
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post()
  @ApiCreatedResponse({ type: GroupResponseDto })
  create(
    @Session() session: UserSession<typeof auth>,
    @Body() input: CreateGroupDto,
  ) {
    return this.groupsService.create(session.user.id, input);
  }

  @Get()
  @ApiOkResponse({ isArray: true, type: GroupResponseDto })
  list(@Session() session: UserSession<typeof auth>) {
    return this.groupsService.list(session.user.id);
  }

  @Get(":groupId/members")
  @ApiOkResponse({ isArray: true, type: GroupMemberResponseDto })
  @ApiNotFoundResponse({ description: "Grupo não encontrado." })
  listMembers(
    @Session() session: UserSession<typeof auth>,
    @Param("groupId") groupId: string,
  ) {
    return this.groupsService.listMembers(session.user.id, groupId);
  }

  @Get(":groupId")
  @ApiOkResponse({ type: GroupResponseDto })
  @ApiNotFoundResponse({ description: "Grupo não encontrado." })
  getById(
    @Session() session: UserSession<typeof auth>,
    @Param("groupId") groupId: string,
  ) {
    return this.groupsService.getById(session.user.id, groupId);
  }

  @Patch(":groupId")
  @ApiOkResponse({ type: GroupResponseDto })
  @ApiBadRequestResponse({
    description: "Nenhum campo válido foi informado.",
  })
  @ApiForbiddenResponse({
    description: "O papel atual não permite editar o Grupo.",
  })
  @ApiNotFoundResponse({ description: "Grupo não encontrado." })
  update(
    @Session() session: UserSession<typeof auth>,
    @Param("groupId") groupId: string,
    @Body() input: UpdateGroupDto,
  ) {
    return this.groupsService.update(session.user.id, groupId, input);
  }
}
