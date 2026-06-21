import { ApiProperty } from "@nestjs/swagger";

export class MfaStatusResponseDto {
  @ApiProperty({
    example: true,
  })
  totpEnabled!: boolean;

  @ApiProperty({
    example: "2026-06-21T12:00:00.000Z",
    nullable: true,
  })
  enabledAt!: Date | null;
}
