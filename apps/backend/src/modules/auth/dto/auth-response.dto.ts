import { ApiProperty } from '@nestjs/swagger'

export class UserDto {
  @ApiProperty()
  id!: string

  @ApiProperty()
  name!: string

  @ApiProperty()
  email!: string

  @ApiProperty()
  phone?: string

  @ApiProperty()
  role!: string

  @ApiProperty()
  isActive!: boolean

  @ApiProperty()
  createdAt!: string

  @ApiProperty()
  updatedAt!: string
}

export class AuthResponseDto {
  @ApiProperty()
  success!: boolean

  @ApiProperty()
  data?: {
    user: UserDto
    token: string
  }

  @ApiProperty()
  message?: string
}

export class GetMeResponseDto {
  @ApiProperty()
  success!: boolean

  @ApiProperty({ type: UserDto })
  data?: UserDto

  @ApiProperty()
  message?: string
}
