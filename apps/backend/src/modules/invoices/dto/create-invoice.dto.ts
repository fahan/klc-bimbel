import { IsString, IsEnum, IsOptional, IsInt, IsNumber, Min, Max } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export enum InvoiceType {
  SPP = 'SPP',
  REGISTRATION = 'REGISTRATION',
}

export class CreateInvoiceDto {
  @ApiProperty({ example: 'student_id_123' })
  @IsString()
  studentId!: string

  @ApiProperty({ enum: InvoiceType, example: 'SPP' })
  @IsEnum(InvoiceType)
  type!: InvoiceType

  @ApiProperty({ example: 4, required: false, description: 'Required for SPP. 1-12.' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number

  @ApiProperty({ example: 2026, required: false, description: 'Required for SPP.' })
  @IsOptional()
  @IsInt()
  @Min(2020)
  @Max(2100)
  year?: number

  @ApiProperty({ example: 50000, required: false, description: 'Diskon tambahan manual (nominal Rp). Ditambahkan di atas diskon enrollment.' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  additionalDiscountAmount?: number

  @ApiProperty({ example: 'Diskon event khusus', required: false })
  @IsOptional()
  @IsString()
  discountNote?: string
}
