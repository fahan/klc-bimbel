import { ApiProperty } from '@nestjs/swagger'

export class BranchDto {
  @ApiProperty()
  id!: string

  @ApiProperty()
  name!: string

  @ApiProperty()
  code!: string

  @ApiProperty()
  address?: string

  @ApiProperty()
  phone?: string

  @ApiProperty()
  isActive!: boolean

  @ApiProperty()
  createdAt!: string

  @ApiProperty()
  updatedAt!: string
}

export class BranchResponseDto {
  @ApiProperty()
  success!: boolean

  @ApiProperty({ type: BranchDto })
  data?: BranchDto | BranchDto[]

  @ApiProperty()
  message?: string
}
