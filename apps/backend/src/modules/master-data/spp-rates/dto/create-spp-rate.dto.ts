import { IsString, IsEnum, IsNumber, IsDateString, IsOptional, Min, MinDate } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import { SppRateType } from '@prisma/client'

export class CreateSppRateDto {
  @ApiProperty({ example: '60db5e97-c2f8-4ab7-8c51-d3a3c4f1c5e2' })
  @IsString()
  subjectId!: string

  @ApiProperty({ enum: SppRateType, example: 'REGULAR' })
  @IsEnum(SppRateType)
  type!: SppRateType

  @ApiProperty({ example: 500000 })
  @IsNumber()
  @Min(0)
  amount!: number

  @ApiProperty({ example: '2024-01-01', description: 'ISO 8601 date string' })
  @IsDateString()
  effectiveFrom!: string

  @ApiProperty({ example: '2024-12-31', description: 'ISO 8601 date string', required: false })
  @IsOptional()
  @IsDateString()
  effectiveUntil?: string
}
