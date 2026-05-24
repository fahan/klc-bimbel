import { IsString, IsEnum, IsNumber, IsInt, Min, IsOptional, MaxLength } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export enum ProductCategory {
  STATIONARY = 'STATIONARY',
  MODULE = 'MODULE',
  UNIFORM = 'UNIFORM',
  STATIONERY = 'STATIONERY',
}

export class CreateProductDto {
  @ApiProperty({ example: 'branch_id_123' })
  @IsString()
  branchId!: string

  @ApiProperty({ example: 'Buku AHE Modul 3' })
  @IsString()
  @MaxLength(120)
  name!: string

  @ApiProperty({ enum: ProductCategory, example: 'MODULE' })
  @IsEnum(ProductCategory)
  category!: ProductCategory

  @ApiProperty({ example: 25000 })
  @IsNumber()
  @Min(0)
  price!: number

  @ApiProperty({ example: 50 })
  @IsInt()
  @Min(0)
  stock!: number

  @ApiProperty({ example: 10 })
  @IsInt()
  @Min(0)
  minStock!: number
}

export class UpdateProductDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string

  @ApiProperty({ enum: ProductCategory, required: false })
  @IsOptional()
  @IsEnum(ProductCategory)
  category?: ProductCategory

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  minStock?: number

  @ApiProperty({ required: false })
  @IsOptional()
  isActive?: boolean
}
