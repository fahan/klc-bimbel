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
    // The whole trend window (oldest month start .. current month end). Current
    // month is trendRanges[5], so its start/end equal startDate/endDate.
    const windowStart = trendRanges[0].start

    // Fetch every row needed for the 6-month window in ONE parallel batch, then
    // bucket per month in JS. This replaces 51 sequential aggregate() round-trips
    // (9 + 6×7) with 7 queries — the same date/category boundaries are applied
    // in-memory below, so the numbers are identical.
    const [payments, sales, commissions, bonuses, expenses, stockIn, unpaidInvoices] = await Promise.all([
      this.prisma.payment.findMany({
        relationLoadStrategy: 'join',
        where: { ...branchFilter, paidAt: { gte: windowStart, lt: endDate } },
        select: { paidAt: true, amount: true, invoice: { select: { type: true } } },
      }),
      this.prisma.sale.findMany({
        where: { ...branchFilter, createdAt: { gte: windowStart, lt: endDate } },
        select: { createdAt: true, totalAmount: true },
      }),
      this.prisma.commission.findMany({
        where: {
          ...branchFilter,
          status: 'APPROVED',
          OR: trendRanges.map(r => ({ month: r.month, year: r.year })),
        },
        select: { month: true, year: true, totalAmount: true },
      }),
      this.prisma.teacherBonus.findMany({
        where: {
          ...branchFilter,
          status: 'APPROVED',
          OR: trendRanges.map(r => ({ month: r.month, year: r.year })),
        },
        select: { month: true, year: true, amount: true },
      }),
      this.prisma.expense.findMany({
        where: { ...branchFilter, date: { gte: windowStart, lt: endDate } },
        select: { date: true, category: true, amount: true },
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

    const num = (v: any) => parseFloat((v ?? 0).toString())
    // Per-range JS reducers mirror the original WHERE clauses exactly.
    const sumPayments = (start: Date, end: Date, type: string) =>
      payments.reduce(
        (s, p) => (p.paidAt >= start && p.paidAt < end && p.invoice.type === type ? s + num(p.amount) : s),
        0,
      )
    const sumSales = (start: Date, end: Date) =>
      sales.reduce((s, x) => (x.createdAt >= start && x.createdAt < end ? s + num(x.totalAmount) : s), 0)
    const sumCommission = (m: number, y: number) =>
      commissions.reduce((s, c) => (c.month === m && c.year === y ? s + num(c.totalAmount) : s), 0)
    const sumBonus = (m: number, y: number) =>
      bonuses.reduce((s, b) => (b.month === m && b.year === y ? s + num(b.amount) : s), 0)
    const sumExpense = (start: Date, end: Date, category: string) =>
      expenses.reduce(
        (s, e) => (e.date >= start && e.date < end && e.category === category ? s + num(e.amount) : s),
        0,
      )

    // Phase 2: trend (stock is intentionally excluded from trend expense, as before)
    const trend = trendRanges.map(r => {
      const tIncome =
        sumPayments(r.start, r.end, 'SPP') + sumPayments(r.start, r.end, 'REGISTRATION') + sumSales(r.start, r.end)
      const tExpense =
        sumCommission(r.month, r.year) +
        sumBonus(r.month, r.year) +
        sumExpense(r.start, r.end, 'OPERATIONAL') +
        sumExpense(r.start, r.end, 'ASSET')
      return { month: r.month, year: r.year, income: tIncome, expense: tExpense, net: tIncome - tExpense }
    })

    // Current month calculations
    const sppIncome = sumPayments(startDate, endDate, 'SPP')
    const regIncome = sumPayments(startDate, endDate, 'REGISTRATION')
    const storeIncome = sumSales(startDate, endDate)
    const totalIncome = sppIncome + regIncome + storeIncome

    const commissionExpense = sumCommission(month, year)
    const bonusExpense = sumBonus(month, year)
    const stockExpense = stockIn.reduce(
      (sum, m) => sum + m.quantity * parseFloat(m.product.price.toString()),
      0,
    )
    const operationalExpense = sumExpense(startDate, endDate, 'OPERATIONAL')
    const assetExpense = sumExpense(startDate, endDate, 'ASSET')
    const totalExpense = commissionExpense + bonusExpense + stockExpense + operationalExpense + assetExpense
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
          expense: { commission: commissionExpense, bonus: bonusExpense, stock: stockExpense, operational: operationalExpense, asset: assetExpense },
        },
        trend,
      },
    }
  }

  async getRecentTransactions(branchId: string | undefined, limit: number = 20) {
    const branchFilter = branchId ? { branchId } : {}

    // relationLoadStrategy: 'join' resolves each query's relations in a single
    // SQL JOIN instead of one extra round-trip per relation.
    const [payments, sales, commissions, bonuses, expenses] = await Promise.all([
      this.prisma.payment.findMany({
        relationLoadStrategy: 'join',
        where: branchFilter,
        include: {
          invoice: { include: { student: true } },
          recordedBy: true,
        },
        orderBy: { paidAt: 'desc' },
        take: limit,
      }),
      this.prisma.sale.findMany({
        relationLoadStrategy: 'join',
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
        relationLoadStrategy: 'join',
        where: { ...branchFilter, status: 'APPROVED' },
        include: { teacher: true, approvedBy: true },
        orderBy: { approvedAt: 'desc' },
        take: limit,
      }),
      this.prisma.teacherBonus.findMany({
        relationLoadStrategy: 'join',
        where: { ...branchFilter, status: 'APPROVED' },
        include: { teacher: true, approvedBy: true },
        orderBy: { approvedAt: 'desc' },
        take: limit,
      }),
      this.prisma.expense.findMany({
        relationLoadStrategy: 'join',
        where: branchFilter,
        include: { branch: true, recordedBy: true },
        orderBy: { date: 'desc' },
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

    bonuses.forEach(b => {
      transactions.push({
        id: b.id,
        date: b.approvedAt!.toISOString(),
        type: 'BONUS',
        description: `Bonus ${b.teacher.name} · ${b.reason} · ${this.monthName(b.month)} ${b.year}`,
        recordedByName: b.approvedBy?.name,
        amount: parseFloat(b.amount.toString()),
        direction: 'OUT',
      })
    })

    expenses.forEach(e => {
      transactions.push({
        id: e.id,
        date: e.date instanceof Date ? e.date.toISOString() : String(e.date),
        type: e.category === 'OPERATIONAL' ? 'EXPENSE_OPERATIONAL' : 'EXPENSE_ASSET',
        description: e.description,
        recordedByName: e.recordedBy?.name,
        amount: parseFloat(e.amount.toString()),
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
