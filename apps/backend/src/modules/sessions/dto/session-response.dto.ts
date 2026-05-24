import { ApiProperty } from '@nestjs/swagger'

export class SessionStudentDto {
  @ApiProperty()
  id!: string

  @ApiProperty()
  studentId!: string

  @ApiProperty()
  studentName!: string

  @ApiProperty()
  joinedAt!: string

  @ApiProperty()
  isActive!: boolean
}

export class SessionDto {
  @ApiProperty()
  id!: string

  @ApiProperty()
  branchId!: string

  @ApiProperty()
  branchName!: string

  @ApiProperty()
  subjectId!: string

  @ApiProperty()
  subjectName!: string

  @ApiProperty()
  teacherId!: string

  @ApiProperty()
  teacherName!: string

  @ApiProperty({ example: 'REGULAR' })
  type!: string

  @ApiProperty({ example: 'SENIN' })
  dayOfWeek!: string

  @ApiProperty({ example: '08:00' })
  startTime!: string

  @ApiProperty()
  durationMinutes!: number

  @ApiProperty()
  isActive!: boolean

  @ApiProperty()
  createdAt!: string

  @ApiProperty()
  capacity!: {
    current: number
    max: number
    available: number
    isFull: boolean
  }

  @ApiProperty({ type: [SessionStudentDto], required: false })
  students?: SessionStudentDto[]
}

export class SessionResponseDto {
  @ApiProperty()
  success!: boolean

  @ApiProperty({ type: SessionDto })
  data?: SessionDto | SessionDto[]

  @ApiProperty({ required: false })
  message?: string
}
