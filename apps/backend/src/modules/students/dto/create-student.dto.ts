import { IsString, IsOptional, IsEmail, MinLength, MaxLength } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class CreateStudentDto {
  @ApiProperty({ example: 'Ahmad Rizki' })
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name!: string

  @ApiProperty({ example: '10 SMA', required: false })
  @IsOptional()
  @IsString()
  classLevel?: string

  @ApiProperty({ example: 'Ibu Sarah', required: false })
  @IsOptional()
  @IsString()
  parentName?: string

  @ApiProperty({ example: '081234567890', required: false })
  @IsOptional()
  @IsString()
  parentPhone?: string

  @ApiProperty({ example: 'branch_id_123' })
  @IsString()
  branchId!: string
}
