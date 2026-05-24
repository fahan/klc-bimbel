import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class UpdateUserInfoDto {
  @ApiProperty({ example: 'Budi Santoso' })
  @IsString()
  @MinLength(3, { message: 'Nama minimal 3 karakter' })
  @MaxLength(100)
  name!: string

  @ApiProperty({ example: 'budi@bimbel.com' })
  @IsEmail({}, { message: 'Format email tidak valid' })
  email!: string

  @ApiProperty({ example: '08123456789', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string
}
