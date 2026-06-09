import { IsString, IsEnum, IsNumber, IsDateString, IsOptional, Min } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import { BillingType, SppRateType } from '@prisma/client'

export class UpdateSppRateDto {
  @ApiProperty({ example: '60db5e97-c2f8-4ab7-8c51-d3a3c4f1c5e2', required: false })
  @IsOptional()
  @IsString()
  subjectId?: string

  @ApiProperty({ enum: SppRateType, example: 'REGULAR', required: false })
  @IsOptional()
  @IsEnum(SppRateType)
  type?: SppRateType

  @ApiProperty({ enum: BillingType, example: 'FLAT_MONTHLY', required: false })
  @IsOptional()
  @IsEnum(BillingType)
  billingType?: BillingType

  @ApiProperty({ example: 500000, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number

  @ApiProperty({ example: '2024-01-01', description: 'ISO 8601 date string', required: false })
  @IsOptional()
  @IsDateString()
  effectiveFrom?: string

  @ApiProperty({ example: '2024-12-31', description: 'ISO 8601 date string', required: false })
  @IsOptional()
  @IsDateString()
  effectiveUntil?: string
}
