import { ApiProperty } from '@nestjs/swagger'

export class StudentSubjectDto {
  @ApiProperty()
  id!: string

  @ApiProperty()
  subjectId!: string

  @ApiProperty()
  subjectName!: string

  @ApiProperty()
  type!: string

  @ApiProperty()
  sppAmount!: string

  @ApiProperty()
  enrolledAt!: string

  @ApiProperty()
  isActive!: boolean
}

export class StudentDto {
  @ApiProperty()
  id!: string

  @ApiProperty()
  branchId!: string

  @ApiProperty()
  name!: string

  @ApiProperty({ required: false })
  classLevel?: string

  @ApiProperty({ required: false })
  parentName?: string

  @ApiProperty({ required: false })
  parentPhone?: string

  @ApiProperty()
  registeredAt!: string

  @ApiProperty()
  isActive!: boolean

  @ApiProperty()
  createdAt!: string

  @ApiProperty({ type: [StudentSubjectDto], required: false })
  subjects?: StudentSubjectDto[]
}

export class StudentResponseDto {
  @ApiProperty()
  success!: boolean

  @ApiProperty({ type: StudentDto })
  data?: StudentDto | StudentDto[]

  @ApiProperty({ required: false })
  message?: string
}
