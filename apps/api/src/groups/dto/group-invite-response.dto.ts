import { ApiProperty } from "@nestjs/swagger";
import { GroupInviteStatus } from "../../generated/prisma/enums.js";

export class GroupInviteIssuerResponseDto {
  @ApiProperty({ example: "user-1" })
  id!: string;

  @ApiProperty({ example: "Ana" })
  name!: string;
}

export class GroupInviteResponseDto {
  @ApiProperty({ example: "invite-1" })
  id!: string;

  @ApiProperty({ example: "pessoa@example.com", format: "email" })
  targetEmail!: string;

  @ApiProperty({
    enum: GroupInviteStatus,
    enumName: "GroupInviteStatus",
  })
  status!: GroupInviteStatus;

  @ApiProperty({ format: "date-time", type: String })
  issuedAt!: Date;

  @ApiProperty({ format: "date-time", type: String })
  expiresAt!: Date;

  @ApiProperty({ format: "date-time", nullable: true, type: String })
  acceptedAt!: Date | null;

  @ApiProperty({ format: "date-time", nullable: true, type: String })
  revokedAt!: Date | null;

  @ApiProperty({ format: "date-time", nullable: true, type: String })
  expiredAt!: Date | null;

  @ApiProperty({ type: GroupInviteIssuerResponseDto })
  issuedBy!: GroupInviteIssuerResponseDto;
}

export class GroupInviteIssuedResponseDto extends GroupInviteResponseDto {
  @ApiProperty({
    description:
      "URL exposta somente fora de produção para testes locais; o token fica no fragmento.",
    example:
      "https://bolao.example.com/convites/aceitar#token=K7X4Yv3zQhL8aP2dN6mR9sT1uW5cB0eFjGkIoUaVsZQ",
    required: false,
  })
  acceptUrl?: string;
}
