import { IsString, IsOptional, IsDateString, IsBoolean, MinLength, MaxLength } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class UpdateStudentDto {
  @ApiProperty({ example: 'Ahmad Rizki', required: false })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name?: string

  @ApiProperty({ example: 'Rizki', required: false })
  @IsOptional()
  @IsString()
  sureName?: string

  @ApiProperty({ example: '10 SMA', required: false })
  @IsOptional()
  @IsString()
  classLevel?: string

  @ApiProperty({ example: '2010-05-20', required: false })
  @IsOptional()
  @IsDateString()
  birthDate?: string

  @ApiProperty({ example: 'Purwokerto', required: false })
  @IsOptional()
  @IsString()
  birthPlace?: string

  @ApiProperty({ example: 'Ibu Sarah', required: false })
  @IsOptional()
  @IsString()
  parentName?: string

  @ApiProperty({ example: '081234567890', required: false })
  @IsOptional()
  @IsString()
  parentPhone?: string

  @ApiProperty({ example: 'Jl. Merdeka No. 1, Bumiayu', required: false })
  @IsOptional()
  @IsString()
  address?: string

  @ApiProperty({ example: '2026-12-31', required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}
