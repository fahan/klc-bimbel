import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsOptional, IsBoolean, IsUUID } from 'class-validator'

export class UpdateUserBranchDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Branch ID to assign',
  })
  @IsNotEmpty()
  @IsUUID()
  branchId!: string

  @ApiProperty({
    example: false,
    description: 'Set as primary branch for this user',
  })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean
}
