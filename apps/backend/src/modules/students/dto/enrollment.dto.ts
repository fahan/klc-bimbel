import { ApiProperty } from '@nestjs/swagger'
import { IsString, IsArray, IsEnum, ValidateNested, IsOptional } from 'class-validator'
import { Type } from 'class-transformer'

export class EnrollSubjectDto {
  @ApiProperty({ example: 'subject_id_123' })
  @IsString()
  subjectId!: string

  @ApiProperty({ enum: ['REGULAR', 'PRIVATE'], example: 'REGULAR' })
  @IsEnum(['REGULAR', 'PRIVATE'])
  type!: string

  @ApiProperty({ example: 'session_id_123' })
  @IsString()
  sessionId!: string
}

export class EnrollmentRequestDto {
  @ApiProperty({ type: [EnrollSubjectDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EnrollSubjectDto)
  subjects!: EnrollSubjectDto[]
}

export class EnrolledSubjectSummaryDto {
  @ApiProperty()
  subjectId!: string

  @ApiProperty()
  subjectName!: string

  @ApiProperty()
  type!: string

  @ApiProperty()
  sppAmount!: string

  @ApiProperty()
  sessionDay!: string

  @ApiProperty()
  sessionTime!: string

  @ApiProperty()
  teacherName!: string
}

export class EnrollmentResponseDto {
  @ApiProperty()
  success!: boolean

  @ApiProperty()
  data?: {
    studentId: string
    studentName: string
    enrolledSubjects: EnrolledSubjectSummaryDto[]
    registrationFee: number
    totalSppFirstMonth: number
    totalFirstBill: number
    sppLockDate: string
  }

  @ApiProperty({ required: false })
  message?: string
}

// For step-by-step enrollment validation
export class EnrollmentStepResponseDto {
  @ApiProperty()
  success!: boolean

  @ApiProperty()
  data?: any

  @ApiProperty({ required: false })
  message?: string
}

// ===== ADD SUBJECT TO EXISTING STUDENT =====
export class AddSubjectDto {
  @ApiProperty({ example: 'subject_id_123' })
  @IsString()
  subjectId!: string

  @ApiProperty({ enum: ['REGULAR', 'PRIVATE'], example: 'REGULAR' })
  @IsEnum(['REGULAR', 'PRIVATE'])
  type!: string
}

export class AddSubjectResponseDto {
  @ApiProperty()
  success!: boolean

  @ApiProperty()
  data?: {
    studentId: string
    addedSubject: {
      subjectId: string
      subjectName: string
      type: string
      sppAmount: string
      sppLockDate: string
    }
    registrationFee: number
    totalFirstBill: number
  }

  @ApiProperty({ required: false })
  message?: string
}

// ===== UPDATE SUBJECT (EDIT TYPE & SESSION) =====
export class UpdateSubjectDto {
  @ApiProperty({ enum: ['REGULAR', 'PRIVATE'], example: 'REGULAR', required: false })
  @IsEnum(['REGULAR', 'PRIVATE'])
  @IsOptional()
  type?: string

  @ApiProperty({ example: 'session_id_123', required: false })
  @IsString()
  @IsOptional()
  sessionId?: string
}

export class UpdateSubjectResponseDto {
  @ApiProperty()
  success!: boolean

  @ApiProperty()
  data?: {
    studentSubjectId: string
    subjectName: string
    type: string
    sessionId?: string
    sessionDay?: string
    sessionTime?: string
    sppAmount: string
    sppLockDate: string
  }

  @ApiProperty({ required: false })
  message?: string
}
