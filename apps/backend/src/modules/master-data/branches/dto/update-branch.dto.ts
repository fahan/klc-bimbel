import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class UpdateBranchDto {
  @ApiProperty({ example: 'Cabang Purwokerto Updated', required: false })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name?: string

  @ApiProperty({ example: 'PWK', required: false })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  code?: string

  @ApiProperty({ example: 'Jl. Jendral Sudirman No. 123', required: false })
  @IsOptional()
  @IsString()
  address?: string

  @ApiProperty({ example: '0281-6123456', required: false })
  @IsOptional()
  @IsString()
  phone?: string
}
