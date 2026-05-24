import { ApiProperty } from '@nestjs/swagger'

export class CurriculumModuleDto {
  @ApiProperty()
  id!: string

  @ApiProperty()
  subjectId!: string

  @ApiProperty()
  orderNumber!: number

  @ApiProperty()
  name!: string

  @ApiProperty()
  totalChapters!: number

  @ApiProperty()
  createdAt!: string
}

export class CurriculumModuleResponseDto {
  @ApiProperty()
  success!: boolean

  @ApiProperty({ type: CurriculumModuleDto })
  data?: CurriculumModuleDto | CurriculumModuleDto[]

  @ApiProperty()
  message?: string
}
