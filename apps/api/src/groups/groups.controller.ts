import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import {
  ApiCookieAuth,
  ApiCreatedResponse,
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
import { GroupResponseDto } from "./dto/group-response.dto.js";
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

  @Get(":groupId")
  @ApiOkResponse({ type: GroupResponseDto })
  @ApiNotFoundResponse({ description: "Grupo não encontrado." })
  getById(
    @Session() session: UserSession<typeof auth>,
    @Param("groupId") groupId: string,
  ) {
    return this.groupsService.getById(session.user.id, groupId);
  }
}
