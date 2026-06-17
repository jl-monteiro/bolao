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

  assertCanActivatePendingMembers(role: GroupRole): void {
    if (this.isAdministrativeRole(role)) {
      return;
    }

    throw new ForbiddenException(
      "VocÃª nÃ£o pode ativar Membros Pendentes deste Grupo.",
    );
  }

  private isAdministrativeRole(role: GroupRole): boolean {
    return role === GroupRole.OWNER || role === GroupRole.ORGANIZER;
  }
}
