import { ApiProperty } from "@nestjs/swagger";
import { GroupRole } from "../../generated/prisma/enums.js";

export class GroupResponseDto {
  @ApiProperty({ example: "cm123example" })
  id!: string;

  @ApiProperty({ example: "Copa 2026" })
  name!: string;

  @ApiProperty({
    example: "Grupo dos amigos para acompanhar a Copa.",
    nullable: true,
    type: String,
  })
  description!: string | null;

  @ApiProperty({
    example: "https://example.com/grupo.png",
    nullable: true,
    type: String,
  })
  image!: string | null;

  @ApiProperty({
    enum: GroupRole,
    enumName: "GroupRole",
    example: GroupRole.OWNER,
  })
  role!: GroupRole;

  @ApiProperty({
    example: "2026-06-13T12:00:00.000Z",
    format: "date-time",
    type: String,
  })
  createdAt!: Date;

  @ApiProperty({
    example: "2026-06-13T12:00:00.000Z",
    format: "date-time",
    type: String,
  })
  updatedAt!: Date;
}
