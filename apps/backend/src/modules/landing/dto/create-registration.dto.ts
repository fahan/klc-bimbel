import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsArray, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator'

export class CreateRegistrationDto {
  @ApiProperty({ example: 'Aira Putri Maharani' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  childName!: string

  @ApiProperty({ example: 'Ibu Diah Hasanah' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  parentName!: string

  @ApiProperty({ example: '08123456789' })
  @IsString()
  @IsNotEmpty()
  @MinLength(9)
  @MaxLength(15)
  phone!: string

  @ApiProperty({ example: 'Kelas 5 SD' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  grade!: string

  @ApiProperty({ example: ['AHE', 'Matematika'] })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  subjects!: string[]

  @ApiPropertyOptional({ example: 'PWK' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  branchCode?: string

  @ApiPropertyOptional({ example: 'Anak saya belum lancar perkalian' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string
}
