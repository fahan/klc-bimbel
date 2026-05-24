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
} from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { DayOfWeek, SessionType } from './create-session.dto'

export class BulkSessionRequestItem {
  @ApiProperty({ enum: DayOfWeek, example: 'SENIN' })
  @IsEnum(DayOfWeek)
  dayOfWeek!: DayOfWeek

  @ApiProperty({ example: '08:00', description: 'Format HH:mm (24-hour)' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'startTime must be in HH:mm format' })
  startTime!: string

  @ApiProperty({
    type: [String],
    required: false,
    description: 'Array of student IDs for this specific session. Optional.',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  studentIds?: string[]
}

export class CreateBulkSessionsDto {
  @ApiProperty({ example: 'branch_id_123' })
  @IsString()
  branchId!: string

  @ApiProperty({ example: 'subject_id_123' })
  @IsString()
  subjectId!: string

  @ApiProperty({ example: 'teacher_id_123' })
  @IsString()
  teacherId!: string

  @ApiProperty({ enum: SessionType, example: 'REGULAR' })
  @IsEnum(SessionType)
  type!: SessionType

  @ApiProperty({ example: 90, description: 'Session duration in minutes (same for all sessions)' })
  @IsInt()
  @Min(30)
  @Max(240)
  durationMinutes!: number

  @ApiProperty({
    type: [BulkSessionRequestItem],
    description: 'Array of 1-10 sessions to create',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkSessionRequestItem)
  sessions!: BulkSessionRequestItem[]
}

export class CreateBulkSessionsResponseDto {
  @ApiProperty()
  success!: boolean

  @ApiProperty()
  data!: {
    branchId: string
    branchName: string
    branchCode: string
    subjectId: string
    subjectName: string
    subjectCode: string
    teacherId: string
    teacherName: string
    type: SessionType
    sessionsCreated: number
    sessions: any[]
    totalStudentsEnrolled: number
  }

  @ApiProperty()
  message!: string
}
