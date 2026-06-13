import { Transform } from "class-transformer";
import { IsOptional, IsString, Length, MaxLength } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateGroupDto {
  @ApiProperty({
    example: "Copa 2026",
    maxLength: 80,
    minLength: 3,
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim() : value,
  )
  @IsString()
  @Length(3, 80)
  name!: string;

  @ApiPropertyOptional({
    example: "Grupo dos amigos para acompanhar a Copa.",
    maxLength: 500,
  })
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value !== "string") {
      return value;
    }

    const description = value.trim();
    return description.length > 0 ? description : undefined;
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
