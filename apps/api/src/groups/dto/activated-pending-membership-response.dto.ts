import { ApiProperty } from "@nestjs/swagger";
import { GroupRole } from "../../generated/prisma/enums.js";

export class ActivatedPendingMembershipResponseDto {
  @ApiProperty({ example: "pending-1" })
  pendingMembershipId!: string;

  @ApiProperty({ example: "group-1" })
  groupId!: string;

  @ApiProperty({
    enum: GroupRole,
    enumName: "GroupRole",
    example: GroupRole.MEMBER,
  })
  role!: GroupRole;

  @ApiProperty({ format: "date-time", type: String })
  joinedAt!: Date;
}
