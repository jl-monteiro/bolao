import { ApiProperty } from "@nestjs/swagger";
import { IsString, Matches } from "class-validator";

export class AcceptGroupInviteDto {
  @ApiProperty({
    description:
      "Token recebido no fragmento da URL do Convite.",
    example: "K7X4Yv3zQhL8aP2dN6mR9sT1uW5cB0eFjGkIoUaVsZQ",
    maxLength: 43,
    minLength: 43,
    pattern: "^[A-Za-z0-9_-]{43}$",
  })
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{43}$/)
  token!: string;
}
