import { IsString, MinLength } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class ChangePasswordDto {
  @ApiProperty({ example: 'passwordLama123' })
  @IsString()
  @MinLength(6, { message: 'Password minimal 6 karakter' })
  currentPassword!: string

  @ApiProperty({ example: 'passwordBaru123' })
  @IsString()
  @MinLength(6, { message: 'Password baru minimal 6 karakter' })
  newPassword!: string
}
