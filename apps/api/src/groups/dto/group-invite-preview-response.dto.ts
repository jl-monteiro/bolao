import { ApiProperty } from "@nestjs/swagger";
import { GroupInviteStatus } from "../../generated/prisma/enums.js";
import { GroupInviteIssuerResponseDto } from "./group-invite-response.dto.js";

export class GroupInvitePreviewGroupResponseDto {
  @ApiProperty({ example: "group-1" })
  id!: string;

  @ApiProperty({ example: "Copa 2026" })
  name!: string;
}

export class GroupInvitePreviewResponseDto {
  @ApiProperty({ example: "invite-1" })
  id!: string;

  @ApiProperty({
    enum: GroupInviteStatus,
    enumName: "GroupInviteStatus",
  })
  status!: GroupInviteStatus;

  @ApiProperty({ format: "date-time", type: String })
  expiresAt!: Date;

  @ApiProperty({ type: GroupInvitePreviewGroupResponseDto })
  group!: GroupInvitePreviewGroupResponseDto;

  @ApiProperty({ type: GroupInviteIssuerResponseDto })
  issuedBy!: GroupInviteIssuerResponseDto;
}
