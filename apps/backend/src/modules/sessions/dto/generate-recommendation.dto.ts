import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
  IsArray, IsEnum, IsInt, IsNotEmpty, IsObject, IsOptional, IsString, Matches, Max, Min,
} from 'class-validator'

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/

export class TimeRangeDto {
  @ApiProperty({ example: '14:00' })
  @Matches(HHMM, { message: 'start harus format HH:mm' })
  start!: string

  @ApiProperty({ example: '20:00' })
  @Matches(HHMM, { message: 'end harus format HH:mm' })
  end!: string
}

export class GenerateRecommendationDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  branchId!: string

  @ApiProperty({ enum: ['FILL_UNSCHEDULED', 'FULL_REGENERATE'] })
  @IsEnum(['FILL_UNSCHEDULED', 'FULL_REGENERATE'] as any)
  mode!: 'FILL_UNSCHEDULED' | 'FULL_REGENERATE'

  @ApiProperty({ example: 60, minimum: 30, maximum: 240 })
  @IsInt()
  @Min(30)
  @Max(240)
  durationMinutes!: number

  @ApiProperty({ example: ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT'] })
  @IsArray()
  @IsEnum(
    ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU', 'MINGGU'] as any,
    { each: true },
  )
  activeDays!: string[]

  @ApiProperty({ type: TimeRangeDto })
  @IsObject()
  timeWindow!: TimeRangeDto

  @ApiPropertyOptional({ type: TimeRangeDto, nullable: true })
  @IsOptional()
  @IsObject()
  breakWindow?: TimeRangeDto | null

  @ApiPropertyOptional({ example: 1, minimum: 1, maximum: 7 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(7)
  sessionsPerWeek?: number
}
