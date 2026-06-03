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

    // Build 6-month trend date ranges upfront
    const trendRanges = Array.from({ length: 6 }, (_, i) => {
      const tDate = new Date(year, month - 1 - (5 - i), 1)
      const tYear = tDate.getFullYear()
      const tMonth = tDate.getMonth() + 1
      return { year: tYear, month: tMonth, start: tDate, end: new Date(tYear, tMonth, 1) }
    })

    // Phase 1: current month — 6 queries parallel (max concurrent = 6)
    const [sppAgg, regAgg, salesAgg, commissionAgg, stockIn, unpaidInvoices] = await Promise.all([
      this.prisma.payment.aggregate({
        _sum: { amount: true },
        where: { ...branchFilter, paidAt: { gte: startDate, lt: endDate }, invoice: { type: 'SPP' } },
      }),
      this.prisma.payment.aggregate({
        _sum: { amount: true },
        where: { ...branchFilter, paidAt: { gte: startDate, lt: endDate }, invoice: { type: 'REGISTRATION' } },
      }),
      this.prisma.sale.aggregate({
        _sum: { totalAmount: true },
        where: { ...branchFilter, createdAt: { gte: startDate, lt: endDate } },
      }),
      this.prisma.commission.aggregate({
        _sum: { totalAmount: true },
        where: { ...branchFilter, month, year, status: 'APPROVED' },
      }),
      this.prisma.stockMutation.findMany({
        where: { ...branchFilter, type: 'IN', createdAt: { gte: startDate, lt: endDate } },
        select: { quantity: true, product: { select: { price: true } } },
      }),
      this.prisma.invoice.findMany({
        where: { ...branchFilter, status: { in: ['UNPAID', 'PARTIAL'] }, type: 'SPP' },
        select: { studentId: true, totalAmount: true, paidAmount: true },
      }),
    ])

    // Phase 2: trend — each month runs 4 queries in parallel, 6 months concurrently (max = 4)
    const trend = await Promise.all(
      trendRanges.map(async r => {
        const [tSpp, tReg, tSales, tComm] = await Promise.all([
          this.prisma.payment.aggregate({
            _sum: { amount: true },
            where: { ...branchFilter, paidAt: { gte: r.start, lt: r.end }, invoice: { type: 'SPP' } },
          }),
          this.prisma.payment.aggregate({
            _sum: { amount: true },
            where: { ...branchFilter, paidAt: { gte: r.start, lt: r.end }, invoice: { type: 'REGISTRATION' } },
          }),
          this.prisma.sale.aggregate({
            _sum: { totalAmount: true },
            where: { ...branchFilter, createdAt: { gte: r.start, lt: r.end } },
          }),
          this.prisma.commission.aggregate({
            _sum: { totalAmount: true },
            where: { ...branchFilter, month: r.month, year: r.year, status: 'APPROVED' },
          }),
        ])
        const tIncome =
          parseFloat((tSpp._sum.amount || 0).toString()) +
          parseFloat((tReg._sum.amount || 0).toString()) +
          parseFloat((tSales._sum.totalAmount || 0).toString())
        const tExpense = parseFloat((tComm._sum.totalAmount || 0).toString())
        return { month: r.month, year: r.year, income: tIncome, expense: tExpense, net: tIncome - tExpense }
      }),
    )

    // Current month calculations
    const sppIncome = parseFloat((sppAgg._sum.amount || 0).toString())
    const regIncome = parseFloat((regAgg._sum.amount || 0).toString())
    const storeIncome = parseFloat((salesAgg._sum.totalAmount || 0).toString())
    const totalIncome = sppIncome + regIncome + storeIncome

    const commissionExpense = parseFloat((commissionAgg._sum.totalAmount || 0).toString())
    const stockExpense = stockIn.reduce(
      (sum, m) => sum + m.quantity * parseFloat(m.product.price.toString()),
      0,
    )
    const totalExpense = commissionExpense + stockExpense
    const netBalance = totalIncome - totalExpense

    const unpaidAmount = unpaidInvoices.reduce(
      (sum, i) => sum + parseFloat(i.totalAmount.toString()) - parseFloat(i.paidAmount.toString()),
      0,
    )
    const uniqueStudents = new Set(unpaidInvoices.map(i => i.studentId)).size

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
          income: { spp: sppIncome, registration: regIncome, store: storeIncome },
          expense: { commission: commissionExpense, stock: stockExpense },
        },
        trend,
      },
    }
  }

  async getRecentTransactions(branchId: string | undefined, limit: number = 20) {
    const branchFilter = branchId ? { branchId } : {}

    const [payments, sales, commissions] = await Promise.all([
      this.prisma.payment.findMany({
        where: branchFilter,
        include: {
          invoice: { include: { student: true } },
          recordedBy: true,
        },
        orderBy: { paidAt: 'desc' },
        take: limit,
      }),
      this.prisma.sale.findMany({
        where: branchFilter,
        include: {
          student: true,
          createdBy: true,
          saleItems: { include: { product: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      this.prisma.commission.findMany({
        where: { ...branchFilter, status: 'APPROVED' },
        include: { teacher: true, approvedBy: true },
        orderBy: { approvedAt: 'desc' },
        take: limit,
      }),
    ])

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
