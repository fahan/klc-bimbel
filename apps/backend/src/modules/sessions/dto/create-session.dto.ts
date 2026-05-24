import { IsString, IsEnum, IsInt, Min, Max, Matches, IsOptional, IsArray } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export enum DayOfWeek {
  SENIN = 'SENIN',
  SELASA = 'SELASA',
  RABU = 'RABU',
  KAMIS = 'KAMIS',
  JUMAT = 'JUMAT',
  SABTU = 'SABTU',
  MINGGU = 'MINGGU',
}

export enum SessionType {
  REGULAR = 'REGULAR',
  PRIVATE = 'PRIVATE',
}

export class CreateSessionDto {
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

  @ApiProperty({ enum: DayOfWeek, example: 'SENIN' })
  @IsEnum(DayOfWeek)
  dayOfWeek!: DayOfWeek

  @ApiProperty({ example: '08:00', description: 'Format HH:mm (24-hour)' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'startTime must be in HH:mm format' })
  startTime!: string

  @ApiProperty({ example: 90, description: 'Session duration in minutes' })
  @IsInt()
  @Min(30)
  @Max(240)
  durationMinutes!: number

  @ApiProperty({
    type: [String],
    required: false,
    description: 'Array of student IDs to assign to this session. Optional - can be empty. Students will be auto-enrolled to the subject if they are not already enrolled.'
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  studentIds?: string[]
}
