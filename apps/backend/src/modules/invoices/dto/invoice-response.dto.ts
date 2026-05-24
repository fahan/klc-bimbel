import { ApiProperty } from '@nestjs/swagger'

export class InvoiceItemDto {
  @ApiProperty()
  id!: string

  @ApiProperty({ required: false })
  subjectId?: string

  @ApiProperty({ required: false })
  subjectName?: string

  @ApiProperty({ required: false })
  subjectType?: string

  @ApiProperty()
  type!: string

  @ApiProperty()
  sppAmount!: string

  @ApiProperty()
  sessionCount!: number

  @ApiProperty()
  amount!: string
}

export class InvoicePaymentDto {
  @ApiProperty()
  id!: string

  @ApiProperty()
  amount!: string

  @ApiProperty()
  method!: string

  @ApiProperty()
  paidAt!: string

  @ApiProperty({ required: false })
  recordedByName?: string
}

export class InvoiceDto {
  @ApiProperty()
  id!: string

  @ApiProperty()
  branchId!: string

  @ApiProperty()
  branchName!: string

  @ApiProperty()
  branchCode!: string

  @ApiProperty()
  studentId!: string

  @ApiProperty()
  studentName!: string

  @ApiProperty({ required: false })
  studentClassLevel?: string

  @ApiProperty()
  invoiceNumber!: string

  @ApiProperty()
  type!: string

  @ApiProperty({ required: false })
  month?: number

  @ApiProperty({ required: false })
  year?: number

  @ApiProperty()
  totalAmount!: string

  @ApiProperty()
  paidAmount!: string

  @ApiProperty()
  remainingAmount!: string

  @ApiProperty()
  status!: string

  @ApiProperty({ required: false })
  paidAt?: string

  @ApiProperty()
  publicToken!: string

  @ApiProperty({ required: false })
  publicUrl?: string

  @ApiProperty()
  createdAt!: string

  @ApiProperty({ required: false })
  generatedByName?: string

  @ApiProperty({ type: [InvoiceItemDto], required: false })
  items?: InvoiceItemDto[]

  @ApiProperty({ type: [InvoicePaymentDto], required: false })
  payments?: InvoicePaymentDto[]
}

export class InvoiceMetricsDto {
  @ApiProperty()
  totalInvoices!: number

  @ApiProperty()
  totalAmount!: string

  @ApiProperty()
  unpaidCount!: number

  @ApiProperty()
  unpaidAmount!: string

  @ApiProperty()
  partialCount!: number

  @ApiProperty()
  partialRemainingAmount!: string

  @ApiProperty()
  paidCount!: number

  @ApiProperty()
  paidAmount!: string
}

export class InvoiceResponseDto {
  @ApiProperty()
  success!: boolean

  @ApiProperty({ type: InvoiceDto })
  data?: InvoiceDto | InvoiceDto[] | InvoiceMetricsDto

  @ApiProperty({ required: false })
  message?: string
}
