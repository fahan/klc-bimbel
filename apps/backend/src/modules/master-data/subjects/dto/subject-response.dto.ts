import { ApiProperty } from '@nestjs/swagger'
import { SubjectTrackingType } from '@prisma/client'

export class SubjectDto {
  @ApiProperty()
  id!: string

  @ApiProperty()
  name!: string

  @ApiProperty()
  code!: string

  @ApiProperty({ enum: SubjectTrackingType })
  trackingType!: SubjectTrackingType

  @ApiProperty({ description: 'Max capacity for regular classes' })
  maxCapacityRegular!: number

  @ApiProperty({ description: 'Max capacity for private classes' })
  maxCapacityPrivate!: number

  @ApiProperty()
  isActive!: boolean

  @ApiProperty()
  createdAt!: string
}

export class SubjectResponseDto {
  @ApiProperty()
  success!: boolean

  @ApiProperty({ type: SubjectDto })
  data?: SubjectDto | SubjectDto[]

  @ApiProperty()
  message?: string
}
