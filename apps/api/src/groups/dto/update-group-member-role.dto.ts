import { ApiProperty } from "@nestjs/swagger";
import { IsIn } from "class-validator";
import { GroupRole } from "../../generated/prisma/enums.js";

export const MANAGEABLE_GROUP_ROLES = [
  GroupRole.ORGANIZER,
  GroupRole.MEMBER,
] as const;

export type ManageableGroupRole = (typeof MANAGEABLE_GROUP_ROLES)[number];

export class UpdateGroupMemberRoleDto {
  @ApiProperty({
    enum: MANAGEABLE_GROUP_ROLES,
    example: GroupRole.ORGANIZER,
  })
  @IsIn(MANAGEABLE_GROUP_ROLES)
  role!: ManageableGroupRole;
}
