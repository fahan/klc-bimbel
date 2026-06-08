import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator'
import { Type } from 'class-transformer'

export class UpdateExpenseDto {
  @ApiPropertyOptional({ enum: ['OPERATIONAL', 'ASSET'] })
  @IsOptional()
  @IsEnum(['OPERATIONAL', 'ASSET'])
  category?: 'OPERATIONAL' | 'ASSET'

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  amount?: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  date?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string
}
