import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common'
import { PrismaService } from '@/prisma/prisma.service'
import { CreateInvoiceDto, InvoiceType } from './dto/create-invoice.dto'
import { randomBytes } from 'crypto'

const REGISTRATION_FEE = 250000

@Injectable()
export class InvoicesService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters?: {
    branchId?: string
    status?: string
    type?: string
    month?: number
    year?: number
    studentId?: string
  }) {
    const invoices = await this.prisma.invoice.findMany({
      where: {
        ...(filters?.branchId && { branchId: filters.branchId }),
        ...(filters?.status && { status: filters.status as any }),
        ...(filters?.type && { type: filters.type as any }),
        ...(filters?.month && { month: filters.month }),
        ...(filters?.year && { year: filters.year }),
        ...(filters?.studentId && { studentId: filters.studentId }),
      },
      include: {
        branch: true,
        student: true,
        invoiceItems: true,
        generatedBy: true,
        payments: {
          include: { recordedBy: true },
          orderBy: { paidAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return {
      success: true,
      data: invoices.map(inv => this.formatInvoice(inv)),
    }
  }

  async findOne(id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        branch: true,
        student: true,
        invoiceItems: true,
        generatedBy: true,
        payments: {
          include: { recordedBy: true },
          orderBy: { paidAt: 'desc' },
        },
      },
    })

    if (!invoice) throw new NotFoundException('Invoice not found')

    // Get subjects for items
    const itemsWithSubjects = await Promise.all(
      invoice.invoiceItems.map(async (item: any) => {
        if (item.subjectId) {
          const subject = await this.prisma.subject.findUnique({ where: { id: item.subjectId } })
          return { ...item, subject }
        }
        return item
      }),
    )

    return {
      success: true,
      data: this.formatInvoice({ ...invoice, invoiceItems: itemsWithSubjects }),
    }
  }

  async findByToken(token: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { publicToken: token },
      include: {
        branch: true,
        student: true,
        invoiceItems: true,
        generatedBy: true,
        payments: { orderBy: { paidAt: 'desc' } },
      },
    })

    if (!invoice) throw new NotFoundException('Invoice not found')

    // Get subjects for items
    const itemsWithSubjects = await Promise.all(
      invoice.invoiceItems.map(async (item: any) => {
        if (item.subjectId) {
          const subject = await this.prisma.subject.findUnique({ where: { id: item.subjectId } })
          return { ...item, subject }
        }
        return item
      }),
    )

    return {
      success: true,
      data: this.formatInvoice({ ...invoice, invoiceItems: itemsWithSubjects }, true),
    }
  }

  async getMetrics(branchId?: string, month?: number, year?: number) {
    const now = new Date()
    const targetMonth = month ?? now.getMonth() + 1
    const targetYear = year ?? now.getFullYear()

    const where: any = {
      ...(branchId && { branchId }),
      OR: [
        { type: 'SPP', month: targetMonth, year: targetYear },
        { type: 'REGISTRATION', createdAt: { gte: new Date(targetYear, targetMonth - 1, 1) } },
      ],
    }

    const invoices = await this.prisma.invoice.findMany({ where })

    let totalAmount = 0
    let unpaidCount = 0
    let unpaidAmount = 0
    let partialCount = 0
    let partialRemaining = 0
    let paidCount = 0
    let paidAmount = 0

    for (const inv of invoices) {
      const total = parseFloat(inv.totalAmount.toString())
      const paid = parseFloat(inv.paidAmount.toString())
      totalAmount += total

      if (inv.status === 'UNPAID') {
        unpaidCount++
        unpaidAmount += total
      } else if (inv.status === 'PARTIAL') {
        partialCount++
        partialRemaining += total - paid
      } else if (inv.status === 'PAID') {
        paidCount++
        paidAmount += total
      }
    }

    return {
      success: true,
      data: {
        totalInvoices: invoices.length,
        totalAmount: totalAmount.toString(),
        unpaidCount,
        unpaidAmount: unpaidAmount.toString(),
        partialCount,
        partialRemainingAmount: partialRemaining.toString(),
        paidCount,
        paidAmount: paidAmount.toString(),
      },
    }
  }

  async create(createDto: CreateInvoiceDto, currentUserId: string) {
    // Verify student exists
    const student = await this.prisma.student.findUnique({
      where: { id: createDto.studentId },
      include: {
        branch: true,
        studentSubjects: {
          where: { isActive: true },
          include: {
            subject: true,
            sppRate: true,
          },
        },
      },
    })

    if (!student) throw new BadRequestException('Student not found')

    if (createDto.type === InvoiceType.SPP) {
      if (!createDto.month || !createDto.year) {
        throw new BadRequestException('month and year are required for SPP invoice')
      }

      // Check for duplicate (same student, same month/year, type=SPP)
      const existing = await this.prisma.invoice.findFirst({
        where: {
          studentId: createDto.studentId,
          type: 'SPP',
          month: createDto.month,
          year: createDto.year,
        },
      })
      if (existing) {
        throw new ConflictException(
          `SPP invoice for ${createDto.month}/${createDto.year} already exists for this student`,
        )
      }

      // Calculate total based on enrolled subjects
      if (student.studentSubjects.length === 0) {
        throw new BadRequestException('Student has no active enrollment')
      }

      // Generate invoice number: INV-SPP-{BRANCHCODE}-{YYYYMM}-{XXX}
      const yearMonth = `${createDto.year}${String(createDto.month).padStart(2, '0')}`
      const invoiceNumber = await this.generateInvoiceNumber('SPP', student.branch.code, yearMonth)
      const publicToken = this.generatePublicToken()

      // Create items per enrolled subject
      let totalAmount = 0
      const items = student.studentSubjects.map((ss: any) => {
        const sessionCount = ss.type === 'REGULAR' ? 12 : 8 // default sessions per month
        const sppAmount = parseFloat(ss.sppRate?.amount?.toString() || '0')
        totalAmount += sppAmount
        return {
          subjectId: ss.subjectId,
          type: 'SPP' as const,
          sppAmount,
          sessionCount,
          amount: sppAmount,
        }
      })

      const invoice = await this.prisma.invoice.create({
        data: {
          branchId: student.branchId,
          studentId: student.id,
          invoiceNumber,
          type: 'SPP',
          month: createDto.month,
          year: createDto.year,
          totalAmount,
          paidAmount: 0,
          status: 'UNPAID',
          generatedById: currentUserId,
          publicToken,
          invoiceItems: {
            create: items,
          },
        },
        include: {
          branch: true,
          student: true,
          invoiceItems: true,
          generatedBy: true,
          payments: true,
        },
      })

      return {
        success: true,
        data: this.formatInvoice(invoice),
        message: 'SPP invoice generated successfully',
      }
    } else {
      // REGISTRATION
      const yearMonth = `${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}`
      const invoiceNumber = await this.generateInvoiceNumber('REG', student.branch.code, yearMonth)
      const publicToken = this.generatePublicToken()

      const invoice = await this.prisma.invoice.create({
        data: {
          branchId: student.branchId,
          studentId: student.id,
          invoiceNumber,
          type: 'REGISTRATION',
          totalAmount: REGISTRATION_FEE,
          paidAmount: 0,
          status: 'UNPAID',
          generatedById: currentUserId,
          publicToken,
          invoiceItems: {
            create: [
              {
                type: 'REGISTRATION',
                sppAmount: REGISTRATION_FEE,
                sessionCount: 0,
                amount: REGISTRATION_FEE,
              },
            ],
          },
        },
        include: {
          branch: true,
          student: true,
          invoiceItems: true,
          generatedBy: true,
          payments: true,
        },
      })

      return {
        success: true,
        data: this.formatInvoice(invoice),
        message: 'Registration invoice generated successfully',
      }
    }
  }

  async remove(id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: { payments: true },
    })

    if (!invoice) throw new NotFoundException('Invoice not found')

    if (invoice.payments.length > 0) {
      throw new BadRequestException('Cannot delete invoice with recorded payments')
    }

    await this.prisma.invoice.delete({ where: { id } })

    return {
      success: true,
      data: null,
      message: 'Invoice deleted successfully',
    }
  }

  // Generate invoice number
  private async generateInvoiceNumber(typeCode: string, branchCode: string, yearMonth: string): Promise<string> {
    const prefix = `INV-${typeCode}-${branchCode}-${yearMonth}-`
    const last = await this.prisma.invoice.findFirst({
      where: { invoiceNumber: { startsWith: prefix } },
      orderBy: { invoiceNumber: 'desc' },
    })

    let nextSeq = 1
    if (last) {
      const lastSeq = parseInt(last.invoiceNumber.split('-').pop() || '0', 10)
      nextSeq = lastSeq + 1
    }

    return `${prefix}${String(nextSeq).padStart(3, '0')}`
  }

  // Generate public token (16-byte hex)
  private generatePublicToken(): string {
    return randomBytes(16).toString('hex')
  }

  // Helper: format invoice
  private formatInvoice(invoice: any, isPublic: boolean = false) {
    const total = parseFloat(invoice.totalAmount.toString())
    const paid = parseFloat(invoice.paidAmount.toString())
    const remaining = total - paid

    return {
      id: invoice.id,
      branchId: invoice.branchId,
      branchName: invoice.branch?.name,
      branchCode: invoice.branch?.code,
      studentId: invoice.studentId,
      studentName: invoice.student?.name,
      studentClassLevel: invoice.student?.classLevel,
      invoiceNumber: invoice.invoiceNumber,
      type: invoice.type,
      month: invoice.month,
      year: invoice.year,
      totalAmount: total.toString(),
      paidAmount: paid.toString(),
      remainingAmount: remaining.toString(),
      status: invoice.status,
      paidAt: invoice.paidAt?.toISOString(),
      publicToken: invoice.publicToken,
      publicUrl: !isPublic ? `/invoice/${invoice.publicToken}` : undefined,
      createdAt: invoice.createdAt?.toISOString(),
      generatedByName: invoice.generatedBy?.name,
      items: invoice.invoiceItems?.map((item: any) => ({
        id: item.id,
        subjectId: item.subjectId,
        subjectName: item.subject?.name,
        subjectType: item.subject?.trackingType,
        type: item.type,
        sppAmount: item.sppAmount?.toString(),
        sessionCount: item.sessionCount,
        amount: item.amount?.toString(),
      })),
      payments: invoice.payments?.map((p: any) => ({
        id: p.id,
        amount: p.amount?.toString(),
        method: p.method,
        paidAt: p.paidAt?.toISOString(),
        recordedByName: p.recordedBy?.name,
      })),
    }
  }
}
