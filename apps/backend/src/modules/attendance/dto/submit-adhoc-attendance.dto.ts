import { IsString, IsEnum, IsOptional, IsArray, ValidateNested, IsDateString, IsInt, Min, Max, Matches } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty } from '@nestjs/swagger'
import { StudentAttendanceDto } from './submit-attendance.dto'

export class SubmitAdHocAttendanceDto {
  @ApiProperty({ example: 'branch_id_123', description: 'Branch where the ad-hoc session took place' })
  @IsString()
  branchId!: string

  @ApiProperty({ example: 'subject_id_123', description: 'Subject taught in the ad-hoc session' })
  @IsString()
  subjectId!: string

  @ApiProperty({ example: '2026-06-03', description: 'Date of the ad-hoc session (YYYY-MM-DD)' })
  @IsDateString()
  sessionDate!: string

  @ApiProperty({ example: '14:00', description: 'Start time in HH:mm format' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'startTime must be in HH:mm format' })
  startTime!: string

  @ApiProperty({ example: 60, description: 'Session duration in minutes', required: false })
  @IsOptional()
  @IsInt()
  @Min(15)
  @Max(480)
  durationMinutes?: number

  @ApiProperty({ required: false, description: 'Teacher notes / reason for this ad-hoc session' })
  @IsOptional()
  @IsString()
  notes?: string

  @ApiProperty({ type: [StudentAttendanceDto], description: 'Attendance records for each student' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StudentAttendanceDto)
  attendances!: StudentAttendanceDto[]
}

export class RejectAdHocDto {
  @ApiProperty({ example: 'Tidak ada bukti sesi berlangsung', description: 'Reason for rejection' })
  @IsString()
  reason!: string
}

export class ApproveAdHocDto {
  @ApiProperty({
    required: false,
    description: 'If true, attempt to create a recurring session schedule based on this ad-hoc session',
    example: false,
  })
  @IsOptional()
  generateSchedule?: boolean

  @ApiProperty({
    required: false,
    enum: ['REGULAR', 'PRIVATE'],
    description: 'Session type for the generated schedule (defaults to REGULAR)',
  })
  @IsOptional()
  @IsString()
  sessionType?: 'REGULAR' | 'PRIVATE'
}
