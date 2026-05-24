import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/prisma/prisma.service'

@Injectable()
export class FinanceService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get financial overview for given month/year.
   * Returns metrics, breakdown, and trend data.
   */
  async getOverview(branchId: string | undefined, month: number, year: number) {
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 1)

    const branchFilter = branchId ? { branchId } : {}

    // ===== INCOME =====
    // SPP from invoices (paid)
    const sppPayments = await this.prisma.payment.findMany({
      where: {
        ...branchFilter,
        paidAt: { gte: startDate, lt: endDate },
        invoice: { type: 'SPP' },
      },
    })
    const sppIncome = sppPayments.reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0)

    // Registration from invoices (paid)
    const regPayments = await this.prisma.payment.findMany({
      where: {
        ...branchFilter,
        paidAt: { gte: startDate, lt: endDate },
        invoice: { type: 'REGISTRATION' },
      },
    })
    const regIncome = regPayments.reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0)

    // Store sales
    const sales = await this.prisma.sale.findMany({
      where: {
        ...branchFilter,
        createdAt: { gte: startDate, lt: endDate },
      },
    })
    const storeIncome = sales.reduce((sum, s) => sum + parseFloat(s.totalAmount.toString()), 0)

    const totalIncome = sppIncome + regIncome + storeIncome

    // ===== EXPENSES =====
    // Teacher commissions (only approved)
    const commissions = await this.prisma.commission.findMany({
      where: {
        ...branchFilter,
        month,
        year,
        status: 'APPROVED',
      },
    })
    const commissionExpense = commissions.reduce(
      (sum, c) => sum + parseFloat(c.totalAmount.toString()),
      0,
    )

    // Stock purchases (IN mutations)
    const stockIn = await this.prisma.stockMutation.findMany({
      where: {
        ...branchFilter,
        type: 'IN',
        createdAt: { gte: startDate, lt: endDate },
      },
      include: { product: true },
    })
    const stockExpense = stockIn.reduce(
      (sum, m) => sum + m.quantity * parseFloat(m.product.price.toString()),
      0,
    )

    const totalExpense = commissionExpense + stockExpense

    const netBalance = totalIncome - totalExpense

    // ===== UNPAID SPP =====
    const unpaidInvoices = await this.prisma.invoice.findMany({
      where: {
        ...branchFilter,
        status: { in: ['UNPAID', 'PARTIAL'] },
        type: 'SPP',
      },
    })
    const unpaidAmount = unpaidInvoices.reduce(
      (sum, i) =>
        sum + (parseFloat(i.totalAmount.toString()) - parseFloat(i.paidAmount.toString())),
      0,
    )
    const uniqueStudents = new Set(unpaidInvoices.map(i => i.studentId)).size

    // ===== TREND (6 months) =====
    const trend: Array<{ month: number; year: number; income: number; expense: number; net: number }> = []
    for (let i = 5; i >= 0; i--) {
      const tMonth = month - i
      const tDate = new Date(year, tMonth - 1, 1)
      const tYear = tDate.getFullYear()
      const tMonthFinal = tDate.getMonth() + 1
      const tStart = tDate
      const tEnd = new Date(tYear, tMonthFinal, 1)

      const tSpp = await this.prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          ...branchFilter,
          paidAt: { gte: tStart, lt: tEnd },
          invoice: { type: 'SPP' },
        },
      })
      const tReg = await this.prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          ...branchFilter,
          paidAt: { gte: tStart, lt: tEnd },
          invoice: { type: 'REGISTRATION' },
        },
      })
      const tSales = await this.prisma.sale.aggregate({
        _sum: { totalAmount: true },
        where: {
          ...branchFilter,
          createdAt: { gte: tStart, lt: tEnd },
        },
      })
      const tCommissions = await this.prisma.commission.aggregate({
        _sum: { totalAmount: true },
        where: {
          ...branchFilter,
          month: tMonthFinal,
          year: tYear,
          status: 'APPROVED',
        },
      })

      const tIncome =
        parseFloat((tSpp._sum.amount || 0).toString()) +
        parseFloat((tReg._sum.amount || 0).toString()) +
        parseFloat((tSales._sum.totalAmount || 0).toString())
      const tExpense = parseFloat((tCommissions._sum.totalAmount || 0).toString())

      trend.push({
        month: tMonthFinal,
        year: tYear,
        income: tIncome,
        expense: tExpense,
        net: tIncome - tExpense,
      })
    }

    return {
      success: true,
      data: {
        period: { month, year },
        metrics: {
          totalIncome: totalIncome.toString(),
          totalExpense: totalExpense.toString(),
          netBalance: netBalance.toString(),
          unpaidSppAmount: unpaidAmount.toString(),
          unpaidStudentsCount: uniqueStudents,
        },
        breakdown: {
          income: {
            spp: sppIncome,
            registration: regIncome,
            store: storeIncome,
          },
          expense: {
            commission: commissionExpense,
            stock: stockExpense,
          },
        },
        trend,
      },
    }
  }

  async getRecentTransactions(branchId: string | undefined, limit: number = 20) {
    const branchFilter = branchId ? { branchId } : {}

    // Get recent payments + sales (combined ordered by date)
    const payments = await this.prisma.payment.findMany({
      where: branchFilter,
      include: {
        invoice: { include: { student: true } },
        recordedBy: true,
      },
      orderBy: { paidAt: 'desc' },
      take: limit,
    })

    const sales = await this.prisma.sale.findMany({
      where: branchFilter,
      include: {
        student: true,
        createdBy: true,
        saleItems: { include: { product: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    const commissions = await this.prisma.commission.findMany({
      where: { ...branchFilter, status: 'APPROVED' },
      include: { teacher: true, approvedBy: true },
      orderBy: { approvedAt: 'desc' },
      take: limit,
    })

    // Combine + sort by date
    const transactions: any[] = []

    payments.forEach(p => {
      transactions.push({
        id: p.id,
        date: p.paidAt.toISOString(),
        type: p.invoice.type === 'SPP' ? 'SPP' : 'REGISTRATION',
        description: `${p.invoice.student.name} · ${p.invoice.invoiceNumber}`,
        recordedByName: p.recordedBy?.name,
        amount: parseFloat(p.amount.toString()),
        direction: 'IN',
      })
    })

    sales.forEach(s => {
      const itemsLabel = s.saleItems.map(i => `${i.product.name} ×${i.quantity}`).join(', ')
      transactions.push({
        id: s.id,
        date: s.createdAt.toISOString(),
        type: 'SALE',
        description: `${s.student?.name || 'Pelanggan umum'} · ${itemsLabel}`,
        recordedByName: s.createdBy?.name,
        amount: parseFloat(s.totalAmount.toString()),
        direction: 'IN',
      })
    })

    commissions.forEach(c => {
      transactions.push({
        id: c.id,
        date: c.approvedAt!.toISOString(),
        type: 'COMMISSION',
        description: `Komisi ${c.teacher.name} · ${this.monthName(c.month)} ${c.year}`,
        recordedByName: c.approvedBy?.name,
        amount: parseFloat(c.totalAmount.toString()),
        direction: 'OUT',
      })
    })

    // Sort by date desc
    transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    return {
      success: true,
      data: transactions.slice(0, limit),
    }
  }

  private monthName(m: number) {
    const names = [
      'Januari',
      'Februari',
      'Maret',
      'April',
      'Mei',
      'Juni',
      'Juli',
      'Agustus',
      'September',
      'Oktober',
      'November',
      'Desember',
    ]
    return names[m - 1] || String(m)
  }
}
