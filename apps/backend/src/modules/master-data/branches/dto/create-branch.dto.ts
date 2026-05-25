import { IsString, IsOptional, IsInt, Min, MinLength, MaxLength } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class CreateBranchDto {
  @ApiProperty({ example: 'Cabang Purwokerto' })
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name!: string

  @ApiProperty({ example: 'PWK' })
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  code!: string

  @ApiProperty({ example: 'Jl. Jendral Sudirman No. 123', required: false })
  @IsOptional()
  @IsString()
  address?: string

  @ApiProperty({ example: '0281-6123456', required: false })
  @IsOptional()
  @IsString()
  phone?: string

  @ApiProperty({ example: 200000, description: 'Biaya registrasi siswa baru (Rupiah)', required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  registrationFee?: number
}
