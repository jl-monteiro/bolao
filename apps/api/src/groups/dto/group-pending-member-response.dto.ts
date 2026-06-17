import { ApiProperty } from "@nestjs/swagger";
import { PendingMembershipStatus } from "../../generated/prisma/enums.js";

export class GroupPendingMemberUserResponseDto {
  @ApiProperty({ example: "user-2" })
  id!: string;

  @ApiProperty({ example: "Bruno" })
  name!: string;

  @ApiProperty({
    example: "https://example.com/avatar.png",
    nullable: true,
    type: String,
  })
  image!: string | null;
}

export class GroupPendingMemberResponseDto {
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

  @ApiProperty({ type: GroupPendingMemberUserResponseDto })
  user!: GroupPendingMemberUserResponseDto;
}

export class AcceptedPendingMembershipResponseDto {
  @ApiProperty({ example: "pending-1" })
  id!: string;

  @ApiProperty({ example: "group-1" })
  groupId!: string;

  @ApiProperty({ example: "user-2" })
  userId!: string;

  @ApiProperty({ example: "invite-1" })
  inviteId!: string;

  @ApiProperty({
    enum: PendingMembershipStatus,
    enumName: "PendingMembershipStatus",
  })
  status!: PendingMembershipStatus;

  @ApiProperty({ format: "date-time", type: String })
  acceptedAt!: Date;

  @ApiProperty({ format: "date-time", type: String })
  expiresAt!: Date;
}

export class GroupInviteAcceptedResponseDto {
  @ApiProperty({
    enum: ["PENDING_IDENTITY_VALIDATION"],
    example: "PENDING_IDENTITY_VALIDATION",
  })
  outcome!: "PENDING_IDENTITY_VALIDATION";

  @ApiProperty({ type: AcceptedPendingMembershipResponseDto })
  pendingMembership!: AcceptedPendingMembershipResponseDto;
}
