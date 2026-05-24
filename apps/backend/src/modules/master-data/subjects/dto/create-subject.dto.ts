import { IsString, IsOptional, IsEnum, IsNumber, Min, MinLength, MaxLength } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import { SubjectTrackingType } from '@prisma/client'

export class CreateSubjectDto {
  @ApiProperty({ example: 'Matematika' })
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name!: string

  @ApiProperty({ example: 'MAT' })
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  code!: string

  @ApiProperty({ enum: SubjectTrackingType, example: 'MODULE_BASED' })
  @IsEnum(SubjectTrackingType)
  trackingType!: SubjectTrackingType

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
}
