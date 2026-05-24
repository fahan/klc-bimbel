import { ApiProperty } from '@nestjs/swagger'
import { IsEmail, IsNotEmpty, IsEnum, IsOptional, MinLength, IsArray, IsUUID } from 'class-validator'

export class CreateUserDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address',
  })
  @IsNotEmpty()
  @IsEmail()
  email!: string

  @ApiProperty({
    example: 'password123',
    description: 'User password (min 6 characters)',
  })
  @IsNotEmpty()
  @MinLength(6)
  password!: string

  @ApiProperty({
    example: 'John Doe',
    description: 'User full name',
  })
  @IsNotEmpty()
  name!: string

  @ApiProperty({
    example: '+62812345678',
    description: 'User phone number',
  })
  @IsOptional()
  phone?: string

  @ApiProperty({
    enum: ['OWNER', 'ADMIN_GLOBAL', 'ADMIN_CABANG', 'GURU'],
    example: 'ADMIN_CABANG',
    description: 'User role',
  })
  @IsNotEmpty()
  @IsEnum(['OWNER', 'ADMIN_GLOBAL', 'ADMIN_CABANG', 'GURU'])
  role!: string

  @ApiProperty({
    example: ['123e4567-e89b-12d3-a456-426614174000'],
    description: 'Array of branch IDs to assign to user',
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  branchIds?: string[]
}
