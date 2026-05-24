import { ApiProperty } from '@nestjs/swagger'
import { IsEnum, IsNotEmpty } from 'class-validator'

export class UpdateUserRoleDto {
  @ApiProperty({
    enum: ['OWNER', 'ADMIN_GLOBAL', 'ADMIN_CABANG', 'GURU'],
    example: 'ADMIN_CABANG',
  })
  @IsNotEmpty()
  @IsEnum(['OWNER', 'ADMIN_GLOBAL', 'ADMIN_CABANG', 'GURU'])
  role!: string
}
