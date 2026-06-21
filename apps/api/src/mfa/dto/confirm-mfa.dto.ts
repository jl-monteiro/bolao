import { ApiProperty } from "@nestjs/swagger";
import { IsString, Matches } from "class-validator";

export class ConfirmMfaDto {
  @ApiProperty({
    example: "123456",
    minLength: 6,
    maxLength: 6,
  })
  @IsString()
  @Matches(/^\d{6}$/)
  code!: string;
}
