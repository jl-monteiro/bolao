import { ForbiddenException, Injectable } from "@nestjs/common";
import { GroupRole } from "../generated/prisma/enums.js";

@Injectable()
export class GroupRolePolicy {
  assertCanUpdate(role: GroupRole): void {
    if (role === GroupRole.OWNER || role === GroupRole.ORGANIZER) {
      return;
    }

    throw new ForbiddenException("Você não pode editar este Grupo.");
  }
}
