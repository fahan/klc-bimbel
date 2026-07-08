import { IsString, IsEnum, IsOptional, IsArray, ValidateNested, ArrayMinSize } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty } from '@nestjs/swagger'
import { AttendanceStatus } from './submit-attendance.dto'

export class QuickStudentEntryDto {
  @ApiProperty({ example: 'student_id_123' })
  @IsString()
  studentId!: string

  @ApiProperty({
    required: false,
    description: 'Required when the student has 0 or >1 active subject enrollments. Ignored when exactly 1.',
  })
  @IsOptional()
  @IsString()
  subjectId?: string

  @ApiProperty({ enum: AttendanceStatus, example: 'HADIR' })
  @IsEnum(AttendanceStatus)
  status!: AttendanceStatus
}

export class SubmitQuickAttendanceDto {
  @ApiProperty({ example: 'branch_id_123' })
  @IsString()
  branchId!: string

  @ApiProperty({ type: [QuickStudentEntryDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => QuickStudentEntryDto)
  students!: QuickStudentEntryDto[]
}

export class BatchApproveItemDto {
  @ApiProperty({ example: 'session_log_id' })
  @IsString()
  sessionLogId!: string

  @ApiProperty({ required: false, description: 'Optional corrected start time (HH:mm) applied before approval' })
  @IsOptional()
  @IsString()
  startTime?: string
}

export class ApproveAdHocBatchDto {
  @ApiProperty({ type: [BatchApproveItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BatchApproveItemDto)
  items!: BatchApproveItemDto[]
}

export class RejectAdHocBatchDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  sessionLogIds!: string[]

  @ApiProperty({ required: false, description: 'Shared rejection reason; defaults to a generic one' })
  @IsOptional()
  @IsString()
  reason?: string
}
