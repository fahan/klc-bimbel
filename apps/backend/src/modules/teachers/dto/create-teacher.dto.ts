import { IsString, IsOptional, IsEmail, MinLength, MaxLength, IsArray, ArrayMinSize } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class CreateTeacherDto {
  @ApiProperty({ example: 'Ibu Siti Rahayu' })
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name!: string

  @ApiProperty({ example: 'siti.rahayu@bimbel.com' })
  @IsEmail()
  email!: string

  @ApiProperty({ example: 'password123', description: 'Password awal guru (min 6 karakter)' })
  @IsString()
  @MinLength(6)
  password!: string

  @ApiProperty({ example: '081234567890', required: false })
  @IsOptional()
  @IsString()
  phone?: string

  @ApiProperty({
    example: ['branch_id_1', 'branch_id_2'],
    description: 'Array of branch IDs to assign the teacher to. First branch is set as primary.',
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  branchIds!: string[]
}
