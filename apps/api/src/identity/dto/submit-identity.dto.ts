import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  IsISO8601,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";

export class SubmitIdentityDto {
  @ApiProperty({
    description:
      "Nome completo do titular. Aceita caixa-alta; o valor é persistido sem alteração.",
    example: "Maria da Silva",
    maxLength: 200,
    minLength: 2,
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim() : value,
  )
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  @Matches(/^[A-Za-zÀ-ÿ'`\-. ]{2,200}$/, {
    message:
      "fullName deve conter apenas letras, espaços, hífen, apóstrofo e ponto.",
  })
  fullName!: string;

  @ApiProperty({
    description:
      "Data de nascimento em ISO-8601 (AAAA-MM-DD). O titular deve ter pelo menos 18 anos na submissão.",
    example: "1990-05-15",
    format: "date",
  })
  @IsISO8601({ strict: true })
  birthDate!: string;

  @ApiProperty({
    description: "CPF com 11 dígitos (aceita pontuação).",
    example: "123.456.789-09",
    maxLength: 32,
    minLength: 11,
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.replace(/[^0-9]/g, "") : value,
  )
  @IsNotEmpty()
  @IsString()
  @MinLength(11)
  @MaxLength(32)
  cpf!: string;
}
