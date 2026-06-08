import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator'
import { Type } from 'class-transformer'

export class CreateExpenseDto {
  @ApiProperty({ example: 'branch-id-123' })
  @IsString()
  @IsNotEmpty()
  branchId!: string

  @ApiProperty({ enum: ['OPERATIONAL', 'ASSET'] })
  @IsEnum(['OPERATIONAL', 'ASSET'])
  category!: 'OPERATIONAL' | 'ASSET'

  @ApiProperty({ example: 'Biaya listrik bulan Juni' })
  @IsString()
  @IsNotEmpty()
  description!: string

  @ApiProperty({ example: 500000 })
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  amount!: number

  @ApiProperty({ example: '2026-06-01' })
  @IsString()
  @IsNotEmpty()
  date!: string

  @ApiPropertyOptional({ example: 'Tagihan PLN' })
  @IsOptional()
  @IsString()
  notes?: string
}
