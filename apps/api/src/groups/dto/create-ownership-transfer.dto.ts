import { ApiProperty } from "@nestjs/swagger";
import { IsString, MinLength } from "class-validator";

export class CreateOwnershipTransferDto {
  @ApiProperty({
    example: "cmembership123",
  })
  @IsString()
  @MinLength(1)
  targetMembershipId!: string;
}
