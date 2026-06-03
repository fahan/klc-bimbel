import { IsEnum, IsNumber, IsOptional, Min, Max } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class UpsertCommissionFormulaDto {
  @ApiProperty({ enum: ['REGULAR', 'PRIVATE'] })
  @IsEnum(['REGULAR', 'PRIVATE'])
  sessionType!: 'REGULAR' | 'PRIVATE'

  @ApiProperty({ enum: ['MONTHLY_RATE', 'PER_SESSION'] })
  @IsEnum(['MONTHLY_RATE', 'PER_SESSION'])
  formulaType!: 'MONTHLY_RATE' | 'PER_SESSION'

  @ApiProperty({ description: 'Commission percentage (0.0 - 1.0)', example: 0.4 })
  @IsNumber()
  @Min(0)
  @Max(1)
  commissionPercentage!: number

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  isActive?: boolean
}
