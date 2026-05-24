import { ApiProperty } from '@nestjs/swagger'
import { SppRateType } from '@prisma/client'
import { SubjectDto } from '../../subjects/dto/subject-response.dto'

export class SppRateDto {
  @ApiProperty()
  id!: string

  @ApiProperty()
  subjectId!: string

  @ApiProperty()
  type!: SppRateType

  @ApiProperty({ type: 'string', description: 'Amount in IDR' })
  amount!: string

  @ApiProperty()
  effectiveFrom!: string

  @ApiProperty({ required: false })
  effectiveUntil?: string | null

  @ApiProperty()
  createdAt!: string

  @ApiProperty({ type: SubjectDto, required: false })
  subject?: SubjectDto
}

export class SppRateResponseDto {
  @ApiProperty()
  success!: boolean

  @ApiProperty({ type: SppRateDto })
  data?: SppRateDto | SppRateDto[]

  @ApiProperty()
  message?: string
}
