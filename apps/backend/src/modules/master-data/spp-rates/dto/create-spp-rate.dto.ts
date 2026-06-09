import { IsString, IsEnum, IsNumber, IsDateString, IsOptional, Min } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import { BillingType, SppRateType } from '@prisma/client'

export class CreateSppRateDto {
  @ApiProperty({ example: '60db5e97-c2f8-4ab7-8c51-d3a3c4f1c5e2' })
  @IsString()
  subjectId!: string

  @ApiProperty({ enum: SppRateType, example: 'REGULAR' })
  @IsEnum(SppRateType)
  type!: SppRateType

  @ApiProperty({
    enum: BillingType,
    example: 'FLAT_MONTHLY',
    required: false,
    description: 'FLAT_MONTHLY = nominal/bulan (default). PER_SESSION = nominal/sesi × sesi hadir.',
  })
  @IsOptional()
  @IsEnum(BillingType)
  billingType?: BillingType

  @ApiProperty({
    example: 500000,
    description: 'Untuk FLAT_MONTHLY: tarif per bulan. Untuk PER_SESSION: tarif per sesi.',
  })
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
