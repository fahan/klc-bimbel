import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class UpdateStudentDto {
  @ApiProperty({ example: 'Ahmad Rizki', required: false })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name?: string

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
}
