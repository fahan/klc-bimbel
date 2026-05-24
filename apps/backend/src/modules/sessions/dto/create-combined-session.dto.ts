import {
  IsString,
  IsEnum,
  IsInt,
  Min,
  Max,
  Matches,
  IsOptional,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { DayOfWeek, SessionType } from './create-session.dto'

export class CombinedSessionSubjectItem {
  @ApiProperty({ example: 'subject_id_123' })
  @IsString()
  subjectId!: string

  @ApiProperty({ enum: SessionType, example: 'REGULAR' })
  @IsEnum(SessionType)
  type!: SessionType

  @ApiProperty({
    type: [String],
    required: false,
    description: 'Array of student IDs for this combined session. Optional. Same students will be enrolled to both subjects.',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  studentIds?: string[]
}

export class CreateCombinedSessionDto {
  @ApiProperty({ example: 'branch_id_123' })
  @IsString()
  branchId!: string

  @ApiProperty({ example: 'teacher_id_123' })
  @IsString()
  teacherId!: string

  @ApiProperty({ enum: DayOfWeek, example: 'SENIN' })
  @IsEnum(DayOfWeek)
  dayOfWeek!: DayOfWeek

  @ApiProperty({ example: '08:00', description: 'Format HH:mm (24-hour)' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'startTime must be in HH:mm format' })
  startTime!: string

  @ApiProperty({ example: 90, description: 'Session duration in minutes (same for all subjects)' })
  @IsInt()
  @Min(30)
  @Max(240)
  durationMinutes!: number

  @ApiProperty({
    type: [CombinedSessionSubjectItem],
    description: 'Array of exactly 2 subjects to combine in this session (MAX 2 SUBJECTS)',
    minItems: 2,
    maxItems: 2,
  })
  @IsArray()
  @ArrayMinSize(2, { message: 'Combined session must have at least 2 subjects' })
  @ArrayMaxSize(2, { message: 'Combined session can have maximum 2 subjects' })
  @ValidateNested({ each: true })
  @Type(() => CombinedSessionSubjectItem)
  subjects!: CombinedSessionSubjectItem[]
}

export class CreateCombinedSessionResponseDto {
  @ApiProperty()
  success!: boolean

  @ApiProperty()
  data!: {
    sessionGroupId: string
    subjects: Array<{
      id: string
      subject: string
      type: SessionType
      subjectCapacity: number
    }>
    minCapacity: number
    totalEnrolled: number
    message: string
  }
}

export class CapacityInfo {
  subject!: string
  type!: SessionType
  capacity!: number
}
