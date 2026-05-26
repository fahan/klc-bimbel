import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator'
import { TrialRegistrationStatus } from '@prisma/client'

export class UpdateRegistrationDto {
  @ApiPropertyOptional({ enum: TrialRegistrationStatus })
  @IsOptional()
  @IsEnum(TrialRegistrationStatus)
  status?: TrialRegistrationStatus

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string
}
