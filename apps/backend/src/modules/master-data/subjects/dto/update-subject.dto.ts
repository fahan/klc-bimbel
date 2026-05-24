import { IsString, IsOptional, IsEnum, IsNumber, Min, Max, MinLength, MaxLength } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import { SubjectTrackingType } from '@prisma/client'

export class UpdateSubjectDto {
  @ApiProperty({ example: 'Matematika', required: false })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name?: string

  @ApiProperty({ example: 'MAT', required: false })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  code?: string

  @ApiProperty({ enum: SubjectTrackingType, example: 'MODULE_BASED', required: false })
  @IsOptional()
  @IsEnum(SubjectTrackingType)
  trackingType?: SubjectTrackingType

  @ApiProperty({ example: 3, description: 'Max capacity for regular classes', required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  capacity?: number

  @ApiProperty({ example: 1, description: 'Max capacity for private classes', required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxCapacity?: number

  @ApiProperty({ example: 40, description: 'Commission percentage (0-100)', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  commissionPercentage?: number
}
