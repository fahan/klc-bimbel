import { ApiProperty } from '@nestjs/swagger'

export class AttendanceItemDto {
  @ApiProperty()
  id!: string

  @ApiProperty()
  studentId!: string

  @ApiProperty()
  studentName!: string

  @ApiProperty()
  status!: string

  @ApiProperty()
  recordedAt!: string
}

export class SessionLogDto {
  @ApiProperty()
  id!: string

  @ApiProperty()
  sessionId!: string

  @ApiProperty()
  sessionDate!: string

  @ApiProperty()
  actualTeacherId!: string

  @ApiProperty()
  actualTeacherName!: string

  @ApiProperty()
  isReplacement!: boolean

  @ApiProperty()
  status!: string

  @ApiProperty({ type: [AttendanceItemDto], required: false })
  attendances?: AttendanceItemDto[]
}

export class AttendanceResponseDto {
  @ApiProperty()
  success!: boolean

  @ApiProperty({ type: SessionLogDto })
  data?: SessionLogDto | SessionLogDto[]

  @ApiProperty({ required: false })
  message?: string
}
