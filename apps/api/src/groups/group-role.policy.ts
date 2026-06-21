import { ForbiddenException, Injectable } from "@nestjs/common";
import { GroupRole } from "../generated/prisma/enums.js";

@Injectable()
export class GroupRolePolicy {
  assertCanUpdate(role: GroupRole): void {
    if (this.isAdministrativeRole(role)) {
      return;
    }

    throw new ForbiddenException("Você não pode editar este Grupo.");
  }

  assertCanManageInvites(role: GroupRole): void {
    if (this.isAdministrativeRole(role)) {
      return;
    }

    throw new ForbiddenException(
      "Você não pode administrar Convites deste Grupo.",
    );
  }

  assertCanManageMemberRoles(role: GroupRole): void {
    if (role === GroupRole.OWNER) {
      return;
    }

    throw new ForbiddenException(
      "Você não pode alterar papéis deste Grupo.",
    );
  }

  private isAdministrativeRole(role: GroupRole): boolean {
    return role === GroupRole.OWNER || role === GroupRole.ORGANIZER;
  }
}
