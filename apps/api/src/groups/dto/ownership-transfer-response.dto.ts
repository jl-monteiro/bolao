import { ApiProperty } from "@nestjs/swagger";
import { GroupOwnershipTransferStatus } from "../../generated/prisma/enums.js";

class OwnershipTransferGroupDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;
}

class OwnershipTransferUserDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ nullable: true })
  image!: string | null;
}

class OwnershipTransferMembershipDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ type: OwnershipTransferUserDto })
  user!: OwnershipTransferUserDto;
}

export class OwnershipTransferResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({
    enum: GroupOwnershipTransferStatus,
    enumName: "GroupOwnershipTransferStatus",
    example: GroupOwnershipTransferStatus.PENDING,
  })
  status!: GroupOwnershipTransferStatus;

  @ApiProperty()
  requestedAt!: Date;

  @ApiProperty()
  expiresAt!: Date;

  @ApiProperty({ nullable: true })
  acceptedAt!: Date | null;

  @ApiProperty({ nullable: true })
  revokedAt!: Date | null;

  @ApiProperty({ nullable: true })
  expiredAt!: Date | null;

  @ApiProperty({ type: OwnershipTransferGroupDto })
  group!: OwnershipTransferGroupDto;

  @ApiProperty({ type: OwnershipTransferMembershipDto })
  currentOwnerMembership!: OwnershipTransferMembershipDto;

  @ApiProperty({ type: OwnershipTransferMembershipDto })
  targetMembership!: OwnershipTransferMembershipDto;
}
