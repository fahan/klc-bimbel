import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger'
import { PaymentsService } from './payments.service'
import { RecordPaymentDto } from './dto/record-payment.dto'
import { JwtAuthGuard } from '@/common/guards/jwt.guard'
import { RolesGuard } from '@/common/guards/roles.guard'
import { Roles } from '@/common/decorators/roles.decorator'
import { CurrentUser } from '@/common/decorators/current-user.decorator'

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Post('record')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN_GLOBAL', 'ADMIN_CABANG')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Record payment for an invoice',
    description:
      'Record a payment. Auto-updates invoice status (UNPAID → PARTIAL → PAID) based on cumulative payments.',
  })
  @ApiResponse({ status: 201, description: 'Payment recorded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid amount or invoice already paid' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async recordPayment(@Body() dto: RecordPaymentDto, @CurrentUser() user: any): Promise<any> {
    return this.paymentsService.recordPayment(dto, user.id)
  }

  @Get('invoice/:invoiceId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all payments for an invoice' })
  async getInvoicePayments(@Param('invoiceId') invoiceId: string): Promise<any> {
    return this.paymentsService.getInvoicePayments(invoiceId)
  }

  @Get('recent')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get recent payments (default: last 20)' })
  async getRecent(
    @Query('branchId') branchId?: string,
    @Query('limit') limit?: string,
  ): Promise<any> {
    return this.paymentsService.getRecentPayments(branchId, limit ? parseInt(limit, 10) : 20)
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN_GLOBAL')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete payment (recalculates invoice status)',
    description: 'Reverses a payment. Used for correction. Recomputes invoice paidAmount and status.',
  })
  async deletePayment(@Param('id') id: string): Promise<any> {
    return this.paymentsService.deletePayment(id)
  }
}
