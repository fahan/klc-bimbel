import { IsEnum } from "class-validator"
import { ApiProperty } from "@nestjs/swagger"

export class UpdateRoleDto {
  @ApiProperty({
    enum: ["OWNER", "ADMIN_GLOBAL", "ADMIN_CABANG", "GURU"],
    example: "ADMIN_CABANG",
    description: "The new role for the user",
  })
  @IsEnum(["OWNER", "ADMIN_GLOBAL", "ADMIN_CABANG", "GURU"])
  role!: "OWNER" | "ADMIN_GLOBAL" | "ADMIN_CABANG" | "GURU"
}
