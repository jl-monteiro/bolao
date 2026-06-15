import { ApiProperty } from "@nestjs/swagger";
import { PendingMembershipStatus } from "../../generated/prisma/enums.js";

export class MePendingMembershipGroupDto {
  @ApiProperty({ example: "group-1" })
  id!: string;

  @ApiProperty({ example: "Copa 2026" })
  name!: string;
}

export class MePendingMembershipDto {
  @ApiProperty({ example: "pending-1" })
  id!: string;

  @ApiProperty({
    enum: PendingMembershipStatus,
    enumName: "PendingMembershipStatus",
  })
  status!: PendingMembershipStatus;

  @ApiProperty({ format: "date-time", type: String })
  acceptedAt!: Date;

  @ApiProperty({ format: "date-time", type: String })
  expiresAt!: Date;

  @ApiProperty({ type: MePendingMembershipGroupDto })
  group!: MePendingMembershipGroupDto;
}
