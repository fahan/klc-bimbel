import { IsOptional, IsString, MaxLength } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class UpdateAppSettingsDto {
  @ApiPropertyOptional({ example: 'BimbelApp' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  appName?: string

  @ApiPropertyOptional({ example: 'Manajemen Bimbel' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  tagline?: string

  @ApiPropertyOptional({ description: 'URL or base64 data URL of the logo' })
  @IsOptional()
  @IsString()
  @MaxLength(3_000_000, { message: 'Logo terlalu besar (maksimal 2MB)' })
  logoUrl?: string
}
