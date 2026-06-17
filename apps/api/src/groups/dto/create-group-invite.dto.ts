import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsEmail, IsString, MaxLength } from "class-validator";

export class CreateGroupInviteDto {
  @ApiProperty({
    example: "pessoa@example.com",
    format: "email",
    maxLength: 320,
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim().toLowerCase() : value,
  )
  @IsString()
  @IsEmail()
  @MaxLength(320)
  email!: string;
}
