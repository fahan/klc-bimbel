import { IsString, IsEnum, IsOptional, IsArray, ValidateNested, IsDateString } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty } from '@nestjs/swagger'

export enum AttendanceStatus {
  HADIR = 'HADIR',
  ABSEN = 'ABSEN',
  IZIN = 'IZIN',
  SAKIT = 'SAKIT',
}

export class StudentAttendanceDto {
  @ApiProperty({ example: 'student_id_123' })
  @IsString()
  studentId!: string

  @ApiProperty({ enum: AttendanceStatus, example: 'HADIR' })
  @IsEnum(AttendanceStatus)
  status!: AttendanceStatus
}

export class SubmitAttendanceDto {
  @ApiProperty({ example: 'session_id_123' })
  @IsString()
  sessionId!: string

  @ApiProperty({ example: '2026-04-29', description: 'Date of session in YYYY-MM-DD format' })
  @IsDateString()
  sessionDate!: string

  @ApiProperty({ type: [StudentAttendanceDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StudentAttendanceDto)
  attendances!: StudentAttendanceDto[]

  @ApiProperty({ required: false, description: 'Optional notes from teacher about the session' })
  @IsOptional()
  @IsString()
  notes?: string

  @ApiProperty({ required: false, description: 'Reason for substitution if teacher is replacing another teacher' })
  @IsOptional()
  @IsString()
  substitutionReason?: string
}
