import { ApiProperty } from '@nestjs/swagger'
import { IsString, IsArray, IsEnum, ValidateNested, IsOptional, IsDateString, IsNumber, Min } from 'class-validator'
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

  @ApiProperty({
    example: '2024-01-15',
    description: 'Tanggal masuk aktual siswa (untuk input data historis). Kosongkan untuk pakai tanggal hari ini.',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  enrolledAt?: string
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

  @ApiProperty({
    example: '2024-01-15',
    description: 'Tanggal masuk aktual (untuk input data historis). Kosongkan untuk pakai tanggal hari ini.',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  enrolledAt?: string
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

// ===== UPDATE SUBJECT DISCOUNT =====
export class UpdateSubjectDiscountDto {
  @ApiProperty({ example: 50000, required: false, description: 'Nominal diskon per bulan (Rp). Kosongkan untuk hapus diskon.' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number | null

  @ApiProperty({ example: 'Diskon kakak-adik', required: false })
  @IsOptional()
  @IsString()
  discountNote?: string | null
}

// ===== UPDATE SUBJECT SPP RATE =====
export class UpdateSubjectSppRateDto {
  @ApiProperty({ example: 'spp_rate_id_123', description: 'ID tarif SPP yang akan dikunci untuk enrollment ini' })
  @IsString()
  sppRateId!: string
}

// ===== END SUBJECT ENROLLMENT =====
export class EndEnrollmentDto {
  @ApiProperty({
    enum: ['COMPLETED', 'DROPPED_OUT'],
    example: 'COMPLETED',
    description: 'Status akhir enrollment: COMPLETED (selesai/lulus) atau DROPPED_OUT (keluar)',
  })
  @IsEnum(['COMPLETED', 'DROPPED_OUT'])
  status!: string

  @ApiProperty({
    example: '2026-06-03',
    description: 'Tanggal berakhir enrollment. Kosongkan untuk pakai tanggal hari ini.',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  endDate?: string
}
