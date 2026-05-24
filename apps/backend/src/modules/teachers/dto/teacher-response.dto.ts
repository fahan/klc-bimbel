import { ApiProperty } from '@nestjs/swagger'

export class TeacherBranchDto {
  @ApiProperty()
  id!: string

  @ApiProperty()
  branchId!: string

  @ApiProperty()
  branchName!: string

  @ApiProperty()
  branchCode!: string

  @ApiProperty()
  isPrimary!: boolean
}

export class TeacherDto {
  @ApiProperty()
  id!: string

  @ApiProperty()
  name!: string

  @ApiProperty()
  email!: string

  @ApiProperty({ required: false })
  phone?: string

  @ApiProperty({ example: 'GURU' })
  role!: string

  @ApiProperty()
  isActive!: boolean

  @ApiProperty()
  createdAt!: string

  @ApiProperty()
  updatedAt!: string

  @ApiProperty({ type: [TeacherBranchDto], required: false })
  branches?: TeacherBranchDto[]

  @ApiProperty({ required: false, description: 'Total active sessions taught by this teacher' })
  totalSessions?: number
}

export class TeacherResponseDto {
  @ApiProperty()
  success!: boolean

  @ApiProperty({ type: TeacherDto })
  data?: TeacherDto | TeacherDto[]

  @ApiProperty({ required: false })
  message?: string
}
