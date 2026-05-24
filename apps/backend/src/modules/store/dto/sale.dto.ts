import { IsString, IsEnum, IsArray, ValidateNested, ArrayMinSize, IsInt, Min, IsOptional } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty } from '@nestjs/swagger'

export enum PaymentMethod {
  CASH = 'CASH',
  TRANSFER = 'TRANSFER',
  OTHER = 'OTHER',
}

export class SaleItemDto {
  @ApiProperty({ example: 'product_id_123' })
  @IsString()
  productId!: string

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  quantity!: number
}

export class CreateSaleDto {
  @ApiProperty({ example: 'branch_id_123' })
  @IsString()
  branchId!: string

  @ApiProperty({ example: 'student_id_123', required: false, description: 'Optional buyer (student)' })
  @IsOptional()
  @IsString()
  studentId?: string

  @ApiProperty({ type: [SaleItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SaleItemDto)
  items!: SaleItemDto[]

  @ApiProperty({ enum: PaymentMethod, example: 'CASH' })
  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod
}

export class RestockDto {
  @ApiProperty({ example: 'product_id_123' })
  @IsString()
  productId!: string

  @ApiProperty({ example: 50 })
  @IsInt()
  @Min(1)
  quantity!: number

  @ApiProperty({ example: 'Restock dari supplier', required: false })
  @IsOptional()
  @IsString()
  notes?: string
}
