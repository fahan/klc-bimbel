import { IsString, IsBoolean, IsOptional } from "class-validator"
import { ApiProperty } from "@nestjs/swagger"

export class AssignBranchDto {
  @ApiProperty({
    example: "branch-123",
    description: "The ID of the branch to assign",
  })
  @IsString()
  branchId!: string

  @ApiProperty({
    example: false,
    description: "Whether this branch should be set as the primary branch for the user",
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean = false
}
