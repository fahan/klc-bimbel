import { IsNumber, IsString, IsOptional, Min, MinLength } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class UpdateTeacherBonusDto {
  @ApiPropertyOptional({ description: 'New amount', example: 750000 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  amount?: number

  @ApiPropertyOptional({ description: 'New reason / keterangan', example: 'Bonus Kinerja Q2' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  reason?: string
}
