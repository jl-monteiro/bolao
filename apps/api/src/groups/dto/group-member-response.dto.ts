import { ApiProperty } from "@nestjs/swagger";
import { GroupRole } from "../../generated/prisma/enums.js";

export class GroupMemberResponseDto {
  @ApiProperty({ example: "cm123membership" })
  id!: string;

  @ApiProperty({ example: "Ana Silva" })
  name!: string;

  @ApiProperty({
    example: "https://example.com/avatar.png",
    nullable: true,
    type: String,
  })
  image!: string | null;

  @ApiProperty({
    enum: GroupRole,
    enumName: "GroupRole",
    example: GroupRole.MEMBER,
  })
  role!: GroupRole;

  @ApiProperty({
    example: "2026-06-13T12:00:00.000Z",
    format: "date-time",
    type: String,
  })
  joinedAt!: Date;
}
