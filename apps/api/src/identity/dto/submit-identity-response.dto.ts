import { ApiProperty } from "@nestjs/swagger";

export class SubmitIdentityResponseDto {
  @ApiProperty({ example: "Maria da Silva" })
  name!: string;

  @ApiProperty({ example: "11144477735" })
  cpf!: string;

  @ApiProperty({ format: "date", type: String })
  birthDate!: Date;

  @ApiProperty({ format: "date-time", type: String })
  identityValidatedAt!: Date;
}
