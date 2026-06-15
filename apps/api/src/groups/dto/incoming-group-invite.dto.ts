import { ApiProperty } from "@nestjs/swagger";
import { GroupInviteStatus } from "../../generated/prisma/enums.js";

export class IncomingGroupInviteGroupDto {
  @ApiProperty({ example: "group-1" })
  id!: string;

  @ApiProperty({ example: "Copa 2026" })
  name!: string;
}

export class IncomingGroupInviteIssuerDto {
  @ApiProperty({ example: "user-1" })
  id!: string;

  @ApiProperty({ example: "João" })
  name!: string;
}

export class IncomingGroupInviteDto {
  @ApiProperty({ example: "invite-1" })
  id!: string;

  @ApiProperty({ format: "date-time", type: String })
  expiresAt!: Date;

  @ApiProperty({ format: "date-time", type: String })
  issuedAt!: Date;

  @ApiProperty({ enum: GroupInviteStatus, enumName: "GroupInviteStatus" })
  status!: GroupInviteStatus;

  @ApiProperty({ type: IncomingGroupInviteGroupDto })
  group!: IncomingGroupInviteGroupDto;

  @ApiProperty({ type: IncomingGroupInviteIssuerDto })
  issuedBy!: IncomingGroupInviteIssuerDto;
}
