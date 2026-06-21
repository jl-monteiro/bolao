import { ApiProperty } from "@nestjs/swagger";

export class MfaSetupResponseDto {
  @ApiProperty({
    example: "JBSWY3DPEHPK3PXP",
  })
  secret!: string;

  @ApiProperty({
    example:
      "otpauth://totp/Bolao%3Auser%40example.com?secret=JBSWY3DPEHPK3PXP&issuer=Bolao&algorithm=SHA1&digits=6&period=30",
  })
  otpauthUri!: string;
}
