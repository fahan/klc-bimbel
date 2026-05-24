import { IsString, IsEnum, IsNumber, Min, IsOptional, IsDateString } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export enum PaymentMethod {
  CASH = 'CASH',
  TRANSFER = 'TRANSFER',
  OTHER = 'OTHER',
}

export class RecordPaymentDto {
  @ApiProperty({ example: 'invoice_id_123' })
  @IsString()
  invoiceId!: string

  @ApiProperty({ example: 350000, description: 'Amount paid (numeric)' })
  @IsNumber()
  @Min(1)
  amount!: number

  @ApiProperty({ enum: PaymentMethod, example: 'TRANSFER' })
  @IsEnum(PaymentMethod)
  method!: PaymentMethod

  @ApiProperty({
    example: '2026-04-29',
    description: 'Date of payment (defaults to now if not provided)',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  paidAt?: string
}
