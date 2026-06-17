import { ApiProperty } from '@nestjs/swagger'
import {
  IsArray, IsEnum, IsInt, IsNotEmpty, IsString, Matches, ValidateNested,
} from 'class-validator'
import { Type } from 'class-transformer'

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/

export class ApplyProposalDto {
  @ApiProperty()
  @IsString()
  tempId!: string

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  subjectId!: string

  @ApiProperty({ enum: ['REGULAR', 'PRIVATE'] })
  @IsEnum(['REGULAR', 'PRIVATE'] as any)
  type!: 'REGULAR' | 'PRIVATE'

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  teacherId!: string

  @ApiProperty({ enum: ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU', 'MINGGU'] })
  @IsEnum(['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU', 'MINGGU'] as any)
  dayOfWeek!: string

  @ApiProperty({ example: '14:00' })
  @Matches(HHMM, { message: 'startTime harus format HH:mm' })
  startTime!: string

  @ApiProperty({ example: 60 })
  @IsInt()
  durationMinutes!: number

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  studentIds!: string[]
}

export class ApplyRecommendationDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  branchId!: string

  @ApiProperty({ enum: ['FILL_UNSCHEDULED', 'FULL_REGENERATE'] })
  @IsEnum(['FILL_UNSCHEDULED', 'FULL_REGENERATE'] as any)
  mode!: 'FILL_UNSCHEDULED' | 'FULL_REGENERATE'

  @ApiProperty({ type: [ApplyProposalDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApplyProposalDto)
  proposals!: ApplyProposalDto[]
}
