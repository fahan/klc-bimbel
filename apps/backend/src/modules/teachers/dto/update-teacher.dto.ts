import { IsString, IsOptional, IsEmail, MinLength, MaxLength, IsArray, IsBoolean } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class UpdateTeacherDto {
  @ApiProperty({ example: 'Ibu Siti Rahayu', required: false })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name?: string

  @ApiProperty({ example: 'siti.rahayu@bimbel.com', required: false })
  @IsOptional()
  @IsEmail()
  email?: string

  @ApiProperty({ example: '081234567890', required: false })
  @IsOptional()
  @IsString()
  phone?: string

  @ApiProperty({
    example: ['branch_id_1', 'branch_id_2'],
    description: 'Array of branch IDs to reassign teacher. First branch is primary.',
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  branchIds?: string[]

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}
