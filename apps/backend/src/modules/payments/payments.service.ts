import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common'
import { PrismaService } from '@/prisma/prisma.service'
import { RecordPaymentDto } from './dto/record-payment.dto'

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  async recordPayment(dto: RecordPaymentDto, currentUserId: string) {
    // Get invoice
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: dto.invoiceId },
      include: { payments: true },
    })

    if (!invoice) throw new NotFoundException('Invoice not found')
    if (invoice.status === 'PAID') {
      throw new BadRequestException('Invoice is already fully paid')
    }

    const total = parseFloat(invoice.totalAmount.toString())
    const currentPaid = parseFloat(invoice.paidAmount.toString())
    const remaining = total - currentPaid

    if (dto.amount > remaining) {
      throw new BadRequestException(
        `Payment amount (${dto.amount}) exceeds remaining balance (${remaining})`,
      )
    }

    const paidAt = dto.paidAt ? new Date(dto.paidAt) : new Date()

    // Create payment + update invoice in transaction
    const result = await this.prisma.$transaction(async tx => {
      // Create payment
      const payment = await tx.payment.create({
        data: {
          invoiceId: dto.invoiceId,
          branchId: invoice.branchId,
          amount: dto.amount,
          method: dto.method as any,
          recordedById: currentUserId,
          paidAt,
        },
        include: {
          recordedBy: true,
        },
      })

      // Update invoice
      const newPaidAmount = currentPaid + dto.amount
      const newStatus = newPaidAmount >= total ? 'PAID' : 'PARTIAL'
      const updatedInvoice = await tx.invoice.update({
        where: { id: dto.invoiceId },
        data: {
          paidAmount: newPaidAmount,
          status: newStatus as any,
          paidAt: newStatus === 'PAID' ? paidAt : null,
        },
        include: {
          branch: true,
          student: true,
          invoiceItems: true,
          payments: { include: { recordedBy: true } },
        },
      })

      return { payment, invoice: updatedInvoice }
    })

    return {
      success: true,
      data: {
        payment: {
          id: result.payment.id,
          invoiceId: result.payment.invoiceId,
          amount: result.payment.amount.toString(),
          method: result.payment.method,
          paidAt: result.payment.paidAt.toISOString(),
          recordedByName: result.payment.recordedBy?.name,
        },
        invoice: {
          id: result.invoice.id,
          invoiceNumber: result.invoice.invoiceNumber,
          totalAmount: result.invoice.totalAmount.toString(),
          paidAmount: result.invoice.paidAmount.toString(),
          remainingAmount: (
            parseFloat(result.invoice.totalAmount.toString()) -
            parseFloat(result.invoice.paidAmount.toString())
          ).toString(),
          status: result.invoice.status,
          paidAt: result.invoice.paidAt?.toISOString(),
        },
      },
      message:
        result.invoice.status === 'PAID'
          ? 'Payment recorded — invoice is now fully paid'
          : 'Payment recorded — partial',
    }
  }

  async getInvoicePayments(invoiceId: string) {
    const payments = await this.prisma.payment.findMany({
      where: { invoiceId },
      include: { recordedBy: true },
      orderBy: { paidAt: 'desc' },
    })

    return {
      success: true,
      data: payments.map(p => ({
        id: p.id,
        invoiceId: p.invoiceId,
        amount: p.amount.toString(),
        method: p.method,
        paidAt: p.paidAt.toISOString(),
        recordedByName: p.recordedBy?.name,
        createdAt: p.createdAt.toISOString(),
      })),
    }
  }

  async getRecentPayments(branchId?: string, limit: number = 20) {
    const payments = await this.prisma.payment.findMany({
      relationLoadStrategy: 'join',
      where: branchId ? { branchId } : undefined,
      include: {
        recordedBy: true,
        invoice: { include: { student: true } },
      },
      orderBy: { paidAt: 'desc' },
      take: limit,
    })

    return {
      success: true,
      data: payments.map(p => ({
        id: p.id,
        invoiceId: p.invoiceId,
        invoiceNumber: p.invoice?.invoiceNumber,
        studentId: p.invoice?.studentId,
        studentName: p.invoice?.student?.name,
        amount: p.amount.toString(),
        method: p.method,
        paidAt: p.paidAt.toISOString(),
        recordedByName: p.recordedBy?.name,
      })),
    }
  }

  async deletePayment(id: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id } })
    if (!payment) throw new NotFoundException('Payment not found')

    // Recalculate invoice paidAmount + status
    await this.prisma.$transaction(async tx => {
      await tx.payment.delete({ where: { id } })

      const remaining = await tx.payment.findMany({ where: { invoiceId: payment.invoiceId } })
      const newPaid = remaining.reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0)

      const invoice = await tx.invoice.findUnique({ where: { id: payment.invoiceId } })
      if (!invoice) return

      const total = parseFloat(invoice.totalAmount.toString())
      const newStatus = newPaid <= 0 ? 'UNPAID' : newPaid >= total ? 'PAID' : 'PARTIAL'

      await tx.invoice.update({
        where: { id: payment.invoiceId },
        data: {
          paidAmount: newPaid,
          status: newStatus as any,
          paidAt: newStatus === 'PAID' ? invoice.paidAt : null,
        },
      })
    })

    return {
      success: true,
      data: null,
      message: 'Payment deleted and invoice status updated',
    }
  }
}
