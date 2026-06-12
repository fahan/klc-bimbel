import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/prisma/prisma.service'

const DAYS = ['MINGGU', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU']

function toNum(val: any): number {
  if (val === null || val === undefined) return 0
  return parseFloat(val.toString())
}

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getAnalytics(branchId: string | undefined, month: number, year: number) {
    // Jakarta timezone (UTC+7)
    const jakartaNow = new Date(Date.now() + 7 * 60 * 60 * 1000)
    const todayDow = DAYS[jakartaNow.getUTCDay()] as any

    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 1)
    const branchFilter = branchId ? { branchId } : {}
    const teacherBranchCond = branchId
      ? { branches: { some: { branchId } } }
      : {}

    // Build 6-month trend ranges (oldest → newest; last range is current month)
    const trendRanges = Array.from({ length: 6 }, (_, i) => {
      const tDate = new Date(year, month - 1 - (5 - i), 1)
      const tYear = tDate.getFullYear()
      const tMonth = tDate.getMonth() + 1
      return { year: tYear, month: tMonth, start: tDate, end: new Date(tYear, tMonth, 1) }
    })
    const trendStart = trendRanges[0].start // earliest month boundary
    const trendEnd = endDate // current month boundary (== trendRanges[5].end)

    // =========================================================
    // SINGLE QUERY WAVE — all queries are independent, so fire them
    // together (no phase barriers) to keep the connection pool saturated.
    // The 6-month trend is computed from 3 windowed queries + JS bucketing
    // instead of 24 per-month aggregates (4 metrics × 6 months).
    // =========================================================
    const [
      // counts & current-month aggregates
      totalStudents,
      totalTeachers,
      branches,
      totalSubjects,
      totalSppRates,
      totalCurriculumModules,
      invoiceCounts,
      sppAgg,
      regAgg,
      salesAgg,
      commissionAgg,
      stockIn,
      unpaidInvoices,
      // row data with JOINs (small limits)
      todaySessions,
      recentStudents,
      topTeachers,
      recentPayments,
      recentSales,
      // 6-month trend source rows (bucketed in JS below)
      trendPayments,
      trendSales,
      trendCommissions,
    ] = await Promise.all([
      // Counts
      this.prisma.student.count({ where: { isActive: true, ...branchFilter } }),
      this.prisma.user.count({ where: { role: 'GURU', isActive: true, ...teacherBranchCond } }),
      this.prisma.branch.findMany({
        where: { isActive: true },
        select: { id: true, name: true, code: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.subject.count({ where: { isActive: true } }),
      this.prisma.sppRate.count(),
      this.prisma.curriculumModule.count(),

      // Invoice status counts for current month
      this.prisma.invoice.groupBy({
        by: ['status'],
        where: { ...branchFilter, month, year },
        _count: { id: true },
        _sum: { totalAmount: true, paidAmount: true },
      }),

      // Income aggregates for current month
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

      // Expense aggregates
      this.prisma.commission.aggregate({
        _sum: { totalAmount: true },
        where: { ...branchFilter, month, year, status: 'APPROVED' },
      }),
      this.prisma.stockMutation.findMany({
        where: { ...branchFilter, type: 'IN', createdAt: { gte: startDate, lt: endDate } },
        select: { quantity: true, product: { select: { price: true } } },
      }),

      // Unpaid invoice amounts (need row-level diff, only 3 fields)
      this.prisma.invoice.findMany({
        where: { ...branchFilter, status: { in: ['UNPAID', 'PARTIAL'] }, type: 'SPP' },
        select: { studentId: true, totalAmount: true, paidAmount: true },
      }),

      // Today's sessions (up to 10)
      this.prisma.session.findMany({
        where: { isActive: true, dayOfWeek: todayDow, ...branchFilter },
        include: {
          branch: { select: { name: true } },
          subject: { select: { name: true } },
          teacher: { select: { name: true } },
          studentSessions: { where: { isActive: true }, select: { id: true } },
        },
        orderBy: { startTime: 'asc' },
        take: 10,
      }),

      // 4 most recent students
      this.prisma.student.findMany({
        where: { isActive: true, ...branchFilter },
        select: {
          id: true,
          name: true,
          classLevel: true,
          isActive: true,
          createdAt: true,
          studentSubjects: { where: { isActive: true }, select: { id: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 4,
      }),

      // Top 4 teachers by session count
      this.prisma.user.findMany({
        where: { role: 'GURU', isActive: true, ...teacherBranchCond },
        select: {
          id: true,
          name: true,
          branches: { select: { branch: { select: { name: true, code: true } } } },
          _count: { select: { sessionsAsTeacher: { where: { isActive: true } } } },
        },
        orderBy: { sessionsAsTeacher: { _count: 'desc' } },
        take: 4,
      }),

      // Recent 4 payments
      this.prisma.payment.findMany({
        where: branchFilter,
        include: {
          invoice: { select: { type: true, invoiceNumber: true, student: { select: { name: true } } } },
          recordedBy: { select: { name: true } },
        },
        orderBy: { paidAt: 'desc' },
        take: 4,
      }),

      // Recent 4 sales
      this.prisma.sale.findMany({
        where: branchFilter,
        include: {
          student: { select: { name: true } },
          saleItems: { include: { product: { select: { name: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        take: 4,
      }),

      // 6-month trend — payments in window, bucketed by month + invoice type in JS
      this.prisma.payment.findMany({
        where: { ...branchFilter, paidAt: { gte: trendStart, lt: trendEnd } },
        select: { amount: true, paidAt: true, invoice: { select: { type: true } } },
      }),
      // 6-month trend — sales in window, bucketed by month in JS
      this.prisma.sale.findMany({
        where: { ...branchFilter, createdAt: { gte: trendStart, lt: trendEnd } },
        select: { totalAmount: true, createdAt: true },
      }),
      // 6-month trend — approved commissions grouped by (month, year) natively
      this.prisma.commission.groupBy({
        by: ['month', 'year'],
        where: {
          ...branchFilter,
          status: 'APPROVED',
          OR: trendRanges.map(r => ({ month: r.month, year: r.year })),
        },
        _sum: { totalAmount: true },
      }),
    ])

    // =========================================================
    // Build 6-month finance trend from windowed rows (JS bucketing)
    // =========================================================
    const trendKey = (y: number, m: number) => `${y}-${m}`
    const trendBuckets = new Map(
      trendRanges.map(r => [trendKey(r.year, r.month), { spp: 0, reg: 0, sales: 0, comm: 0 }]),
    )
    const findBucket = (date: Date) => {
      for (const r of trendRanges) {
        if (date >= r.start && date < r.end) return trendBuckets.get(trendKey(r.year, r.month))
      }
      return undefined
    }
    for (const p of trendPayments) {
      const b = findBucket(p.paidAt)
      if (!b) continue
      if (p.invoice.type === 'SPP') b.spp += toNum(p.amount)
      else if (p.invoice.type === 'REGISTRATION') b.reg += toNum(p.amount)
    }
    for (const s of trendSales) {
      const b = findBucket(s.createdAt)
      if (b) b.sales += toNum(s.totalAmount)
    }
    for (const c of trendCommissions) {
      const b = trendBuckets.get(trendKey(c.year, c.month))
      if (b) b.comm += toNum(c._sum.totalAmount)
    }
    const financeTrend = trendRanges.map(r => {
      const b = trendBuckets.get(trendKey(r.year, r.month))!
      const income = b.spp + b.reg + b.sales
      const expense = b.comm
      return { month: r.month, year: r.year, income, expense, net: income - expense }
    })

    // =========================================================
    // COMPOSE RESPONSE
    // =========================================================

    // Invoice metrics from groupBy result
    const invoiceMap = Object.fromEntries(
      invoiceCounts.map(g => [g.status, { count: g._count.id, total: toNum(g._sum.totalAmount), paid: toNum(g._sum.paidAmount) }]),
    ) as Record<string, { count: number; total: number; paid: number }>

    const invoiceMetrics = {
      paidCount: invoiceMap['PAID']?.count ?? 0,
      unpaidCount: invoiceMap['UNPAID']?.count ?? 0,
      partialCount: invoiceMap['PARTIAL']?.count ?? 0,
      paidAmount: invoiceMap['PAID']?.paid ?? 0,
      unpaidAmount: unpaidInvoices.reduce(
        (s, i) => s + toNum(i.totalAmount) - toNum(i.paidAmount),
        0,
      ),
      unpaidStudents: new Set(unpaidInvoices.map(i => i.studentId)).size,
    }

    // Finance metrics
    const sppIncome = toNum(sppAgg._sum.amount)
    const regIncome = toNum(regAgg._sum.amount)
    const storeIncome = toNum(salesAgg._sum.totalAmount)
    const totalIncome = sppIncome + regIncome + storeIncome
    const commissionExpense = toNum(commissionAgg._sum.totalAmount)
    const stockExpense = stockIn.reduce(
      (s, m) => s + m.quantity * toNum(m.product.price),
      0,
    )
    const totalExpense = commissionExpense + stockExpense

    // Format sessions
    const sessions = todaySessions.map(s => ({
      id: s.id,
      subjectName: s.subject.name,
      branchName: s.branch.name,
      teacherName: s.teacher.name,
      startTime: s.startTime,
      durationMinutes: s.durationMinutes,
      dayOfWeek: s.dayOfWeek,
      capacity: { current: s.studentSessions.length, max: s.maxCapacity },
    }))

    // Format students
    const students = recentStudents.map(s => ({
      id: s.id,
      name: s.name,
      classLevel: s.classLevel,
      isActive: s.isActive,
      createdAt: s.createdAt.toISOString(),
      subjectCount: s.studentSubjects.length,
    }))

    // Format teachers
    const teachers = topTeachers.map(t => ({
      id: t.id,
      name: t.name,
      totalSessions: t._count.sessionsAsTeacher,
      branchCount: t.branches.length,
    }))

    // Format recent transactions (merge payments + sales, sort by date, take 4)
    const transactions: any[] = [
      ...recentPayments.map(p => ({
        id: p.id,
        date: p.paidAt.toISOString(),
        type: p.invoice.type === 'SPP' ? 'SPP' : 'REGISTRATION',
        description: `${p.invoice.student.name} · ${p.invoice.invoiceNumber}`,
        amount: toNum(p.amount),
        direction: 'IN',
      })),
      ...recentSales.map(s => ({
        id: s.id,
        date: s.createdAt.toISOString(),
        type: 'SALE',
        description: `${s.student?.name ?? 'Pelanggan umum'} · ${s.saleItems.map(i => i.product.name).join(', ')}`,
        amount: toNum(s.totalAmount),
        direction: 'IN',
      })),
    ]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 4)

    return {
      success: true,
      data: {
        generatedAt: new Date().toISOString(),
        period: { month, year },
        metrics: {
          totalStudents,
          totalTeachers,
          totalSessionsToday: sessions.length,
          sppCollectedThisMonth: sppIncome,
          totalCommissionThisMonth: commissionExpense,
        },
        masterData: {
          branches: branches.length,
          subjects: totalSubjects,
          sppRates: totalSppRates,
          curriculumModules: totalCurriculumModules,
        },
        invoiceMetrics,
        financeBreakdown: {
          income: { spp: sppIncome, registration: regIncome, store: storeIncome, total: totalIncome },
          expense: { commission: commissionExpense, stock: stockExpense, total: totalExpense },
          netBalance: totalIncome - totalExpense,
        },
        financeTrend,
        todaySessions: sessions,
        recentStudents: students,
        topTeachers: teachers,
        recentTransactions: transactions,
        branches,
      },
    }
  }
}
