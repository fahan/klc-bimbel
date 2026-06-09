import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common'
import { PrismaService } from '@/prisma/prisma.service'
import { CommissionFormulasService } from '../commission-formulas/commission-formulas.service'

@Injectable()
export class CommissionsService {
  /**
   * Formula is resolved dynamically per subject + session type via SubjectCommissionFormula.
   * Default: MONTHLY_RATE → spp_rate ÷ 12 × commission_pct × sessions_attended
   * Alternative: PER_SESSION → spp_rate ÷ total_sessions_in_month × commission_pct × sessions_attended
   *
   * Commission goes to actual_teacher_id (handles replacement teacher scenario).
   */
  constructor(
    private prisma: PrismaService,
    private formulasService: CommissionFormulasService,
  ) {}

  private applyFormula(
    sppAmount: number,
    commissionPercentage: number,
    sessionsAttended: number,
    totalSessionsInMonth: number,
    formulaType: 'MONTHLY_RATE' | 'PER_SESSION',
  ): number {
    if (formulaType === 'PER_SESSION') {
      if (totalSessionsInMonth === 0) return 0
      return (sppAmount / totalSessionsInMonth) * commissionPercentage * sessionsAttended
    }
    // MONTHLY_RATE (default)
    return (sppAmount / 12) * commissionPercentage * sessionsAttended
  }

  async calculateForMonth(branchId: string, month: number, year: number) {
    if (month < 1 || month > 12) {
      throw new BadRequestException('Month must be 1-12')
    }

    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 1)

    // ── Step 1: Load all completed session logs with attendances ──────────────
    const sessionLogs = await this.prisma.sessionLog.findMany({
      where: {
        sessionDate: { gte: startDate, lt: endDate },
        status: 'COMPLETED',
        OR: [
          { isAdHoc: false, session: { branchId } },
          { isAdHoc: true, adHocBranchId: branchId },
        ],
      },
      include: {
        session: { include: { subject: true } },
        adHocSubject: true,
        actualTeacher: true,
        attendances: {
          where: { status: 'HADIR' },
          include: { student: true },
        },
      },
    })

    // ── Step 2: Collect all unique (studentId, subjectId) pairs & teacher IDs ─
    const neededStudentIds = new Set<string>()
    const neededSubjectIds = new Set<string>()
    const neededTeacherIds = new Set<string>()

    for (const log of sessionLogs) {
      const subjectId = log.isAdHoc ? log.adHocSubjectId : log.session?.subjectId
      if (!subjectId) continue
      neededSubjectIds.add(subjectId)
      if (log.actualTeacherId) neededTeacherIds.add(log.actualTeacherId)
      for (const att of log.attendances) {
        neededStudentIds.add(att.studentId)
      }
    }

    // ── Step 3: Bulk pre-load — studentSubjects, teachers ────────────────────
    const [allStudentSubjects, allTeachers] = await Promise.all([
      this.prisma.studentSubject.findMany({
        where: {
          studentId: { in: Array.from(neededStudentIds) },
          subjectId: { in: Array.from(neededSubjectIds) },
          isActive: true,
        },
        include: { sppRate: true, subject: true },
      }),
      this.prisma.user.findMany({
        where: { id: { in: Array.from(neededTeacherIds) } },
      }),
    ])

    // Build O(1) lookup maps
    const studentSubjectMap = new Map<string, any>()
    for (const ss of allStudentSubjects) {
      studentSubjectMap.set(`${ss.studentId}|${ss.subjectId}`, ss)
    }
    const teacherLookup = new Map(allTeachers.map(t => [t.id, t]))

    // ── Step 4: Caches for repeated-query results (same pair across many logs) ─
    // key: `${studentId}|${subjectId}` → total sessions in month
    const sessionCountCache = new Map<string, number>()
    // key: `${subjectId}|${sessionType}` → formula
    const formulaCache = new Map<string, any>()

    const getFormula = async (subjectId: string, sessionType: string) => {
      const key = `${subjectId}|${sessionType}`
      if (!formulaCache.has(key)) {
        const f = await this.formulasService.getEffectiveFormula(
          subjectId,
          sessionType as 'REGULAR' | 'PRIVATE',
        )
        formulaCache.set(key, f)
      }
      return formulaCache.get(key)!
    }

    const getTotalSessions = async (studentId: string, subjectId: string) => {
      const key = `${studentId}|${subjectId}`
      if (!sessionCountCache.has(key)) {
        const [regular, adHoc] = await Promise.all([
          this.prisma.sessionLog.count({
            where: {
              sessionDate: { gte: startDate, lt: endDate },
              status: 'COMPLETED',
              isAdHoc: false,
              session: {
                subjectId,
                studentSessions: { some: { studentId, isActive: true } },
              },
            },
          }),
          this.prisma.sessionLog.count({
            where: {
              sessionDate: { gte: startDate, lt: endDate },
              status: 'COMPLETED',
              isAdHoc: true,
              adHocSubjectId: subjectId,
              attendances: { some: { studentId } },
            },
          }),
        ])
        sessionCountCache.set(key, regular + adHoc)
      }
      return sessionCountCache.get(key)!
    }

    // ── Step 5: Group logs by teacher & calculate commissions ─────────────────
    const teacherLogsMap = new Map<string, any[]>()
    for (const log of sessionLogs) {
      const tid = log.actualTeacherId
      if (!tid) continue
      if (!teacherLogsMap.has(tid)) teacherLogsMap.set(tid, [])
      teacherLogsMap.get(tid)!.push(log)
    }

    const results: any[] = []

    for (const [teacherId, logs] of teacherLogsMap.entries()) {
      const teacher = teacherLookup.get(teacherId)
      if (!teacher) continue

      const commissionDetails: any[] = []
      let totalCommission = 0

      for (const log of logs) {
        const subjectId = log.isAdHoc ? log.adHocSubjectId : log.session?.subjectId
        if (!subjectId) continue

        const sessionType: 'REGULAR' | 'PRIVATE' =
          (log.session?.type as 'REGULAR' | 'PRIVATE') ?? 'REGULAR'

        // Cached formula lookup (no DB hit for repeated subject+type combos)
        const formula = await getFormula(subjectId, sessionType)

        for (const attendance of log.attendances) {
          // O(1) map lookup — no DB query
          const studentSubject = studentSubjectMap.get(
            `${attendance.studentId}|${subjectId}`,
          )
          if (!studentSubject || !studentSubject.sppRate) continue

          // totalSessionsInMonth cached — needed only as denominator for PER_SESSION formula
          // sessionsAttended is always 1 here: each attendance record = one session occurrence.
          // The formula is applied per-session and aggregated across commission details,
          // preventing double-counting when the same student appears in multiple session logs.
          const totalSessionsInMonth = await getTotalSessions(attendance.studentId, subjectId)
          const sessionsAttendedThisRecord = 1

          const masterRate = parseFloat(studentSubject.sppRate.amount.toString())
          const billingType: string =
            (studentSubject.sppRate as any).billingType ?? 'FLAT_MONTHLY'
          let effectiveSppBase: number
          let commissionAmount: number

          if (billingType === 'PER_SESSION') {
            // Billing per-sesi: komisi = rate × pct × 1 (per kehadiran)
            effectiveSppBase =
              studentSubject.customSppAmount && studentSubject.discountAffectsCommission
                ? parseFloat(studentSubject.customSppAmount.toString())
                : masterRate
            commissionAmount = effectiveSppBase * formula.commissionPercentage * sessionsAttendedThisRecord
          } else {
            // FLAT_MONTHLY: formula distribusi per-sesi, dijumlahkan lintas detail
            effectiveSppBase =
              studentSubject.customSppAmount && studentSubject.discountAffectsCommission
                ? parseFloat(studentSubject.customSppAmount.toString())
                : masterRate

            if (formula.formulaType === 'PER_SESSION' && totalSessionsInMonth === 0)
              continue

            commissionAmount = this.applyFormula(
              effectiveSppBase,
              formula.commissionPercentage,
              sessionsAttendedThisRecord,   // 1 per session record
              totalSessionsInMonth,
              formula.formulaType,
            )
          }

          const dupKey = `${log.id}-${attendance.studentId}`
          if (commissionDetails.some(c => c._dupKey === dupKey)) continue

          commissionDetails.push({
            _dupKey: dupKey,
            sessionLogId: log.id,
            studentId: attendance.studentId,
            subjectId,
            sppAmount: effectiveSppBase,
            totalSessionsInMonth,
            sessionsAttended: sessionsAttendedThisRecord,  // 1 per record; display aggregates
            commissionAmount,
            isReplacement: log.isReplacement,
            formulaType: formula.formulaType,
            commissionPercentage: formula.commissionPercentage,
          })

          totalCommission += commissionAmount
        }
      }

      results.push({
        teacherId,
        teacherName: teacher.name,
        commissionDetails,
        totalAmount: totalCommission,
      })
    }

    for (const r of results) {
      const existing = await this.prisma.commission.findUnique({
        where: {
          branchId_teacherId_month_year: {
            branchId,
            teacherId: r.teacherId,
            month,
            year,
          },
        },
      })

      if (existing && existing.status === 'APPROVED') continue

      const commission = await this.prisma.commission.upsert({
        where: {
          branchId_teacherId_month_year: {
            branchId,
            teacherId: r.teacherId,
            month,
            year,
          },
        },
        create: {
          branchId,
          teacherId: r.teacherId,
          month,
          year,
          totalAmount: r.totalAmount,
          status: 'CALCULATED',
          calculatedAt: new Date(),
        },
        update: {
          totalAmount: r.totalAmount,
          status: 'CALCULATED',
          calculatedAt: new Date(),
        },
      })

      await this.prisma.commissionDetail.deleteMany({
        where: { commissionId: commission.id },
      })

      await this.prisma.commissionDetail.createMany({
        data: r.commissionDetails.map((d: any) => ({
          commissionId: commission.id,
          sessionLogId: d.sessionLogId,
          studentId: d.studentId,
          subjectId: d.subjectId,
          sppAmount: d.sppAmount,
          totalSessionsInMonth: d.totalSessionsInMonth,
          sessionsAttended: d.sessionsAttended,
          commissionAmount: d.commissionAmount,
          isReplacement: d.isReplacement,
          formulaType: d.formulaType,
          commissionPercentage: d.commissionPercentage,
        })),
      })
    }

    return {
      success: true,
      data: results.map(r => ({
        teacherId: r.teacherId,
        teacherName: r.teacherName,
        totalAmount: r.totalAmount.toFixed(2),
        sessionsCount: r.commissionDetails.length,
      })),
      message: `Calculated commissions for ${results.length} teachers in ${month}/${year}`,
    }
  }

  async getCommissionsByMonth(branchId: string, month: number, year: number) {
    const commissions = await this.prisma.commission.findMany({
      where: { branchId, month, year },
      include: {
        teacher: true,
        approvedBy: true,
        commissionDetails: {
          include: {
            student: true,
            subject: true,
            sessionLog: {
              include: {
                session: { include: { subject: true } },
              },
            },
          },
        },
      },
      orderBy: { teacher: { name: 'asc' } },
    })

    const data = commissions.map(c => {
      let regularSessions = 0
      let replacementSessions = 0
      const subjectIds = new Set<string>()

      for (const d of c.commissionDetails) {
        if (d.isReplacement) replacementSessions++
        else regularSessions++
        subjectIds.add(d.subjectId)
      }

      return {
        id: c.id,
        teacherId: c.teacherId,
        teacherName: c.teacher.name,
        month: c.month,
        year: c.year,
        regularSessions,
        replacementSessions,
        totalSessions: regularSessions + replacementSessions,
        subjectsCount: subjectIds.size,
        totalAmount: c.totalAmount.toString(),
        status: c.status,
        calculatedAt: c.calculatedAt?.toISOString(),
        approvedAt: c.approvedAt?.toISOString(),
        approvedByName: c.approvedBy?.name,
      }
    })

    const totalEstimated = data.reduce((sum, c) => sum + parseFloat(c.totalAmount), 0)
    const approved = data.filter(c => c.status === 'APPROVED')
    const totalApproved = approved.reduce((sum, c) => sum + parseFloat(c.totalAmount), 0)
    const totalSessions = data.reduce((sum, c) => sum + c.totalSessions, 0)
    const totalReplacement = data.reduce((sum, c) => sum + c.replacementSessions, 0)

    return {
      success: true,
      data: {
        commissions: data,
        metrics: {
          totalEstimated: totalEstimated.toFixed(2),
          totalApproved: totalApproved.toFixed(2),
          approvedTeachersCount: approved.length,
          totalTeachers: data.length,
          totalSessions,
          totalReplacementSessions: totalReplacement,
        },
      },
    }
  }

  async getCommissionDetail(commissionId: string) {
    const commission = await this.prisma.commission.findUnique({
      where: { id: commissionId },
      include: {
        teacher: true,
        approvedBy: true,
        branch: true,
        commissionDetails: {
          include: {
            student: true,
            subject: true,
            sessionLog: {
              include: {
                session: { include: { subject: true } },
              },
            },
          },
        },
      },
    })

    if (!commission) throw new NotFoundException('Commission not found')

    // Bulk-load billingType for all (studentId, subjectId) pairs in this commission
    // so we can display the correct formula (PER_SESSION billing vs FLAT_MONTHLY)
    const uniqueStudentIds = [...new Set(commission.commissionDetails.map(d => d.studentId))]
    const uniqueSubjectIds = [...new Set(commission.commissionDetails.map(d => d.subjectId))]
    const studentSubjectsForBilling = await this.prisma.studentSubject.findMany({
      where: {
        studentId: { in: uniqueStudentIds },
        subjectId: { in: uniqueSubjectIds },
      },
      include: { sppRate: true },
    })
    // key: `${studentId}|${subjectId}` → billingType
    const billingTypeMap = new Map<string, string>()
    for (const ss of studentSubjectsForBilling) {
      billingTypeMap.set(
        `${ss.studentId}|${ss.subjectId}`,
        (ss.sppRate as any)?.billingType ?? 'FLAT_MONTHLY',
      )
    }

    const bySubject = new Map<string, any>()
    for (const d of commission.commissionDetails) {
      if (!bySubject.has(d.subjectId)) {
        // Derive billingType from first student encountered for this subject
        const bt = billingTypeMap.get(`${d.studentId}|${d.subjectId}`) ?? 'FLAT_MONTHLY'
        bySubject.set(d.subjectId, {
          subjectId: d.subjectId,
          subjectName: d.subject.name,
          subjectCode: d.subject.code,
          sessionType: d.sessionLog.session?.type ?? 'REGULAR',
          formulaType: d.formulaType,
          billingType: bt,
          commissionPercentage: parseFloat(d.commissionPercentage.toString()),
          students: new Map<string, any>(),
          subtotal: 0,
        })
      }

      const subject = bySubject.get(d.subjectId)
      const studentKey = d.studentId
      if (!subject.students.has(studentKey)) {
        const bt = billingTypeMap.get(`${d.studentId}|${d.subjectId}`) ?? 'FLAT_MONTHLY'
        subject.students.set(studentKey, {
          studentId: d.studentId,
          studentName: d.student.name,
          billingType: bt,
          sppAmount: parseFloat(d.sppAmount.toString()),
          totalSessionsInMonth: d.totalSessionsInMonth,
          sessionsAttended: 0,
          commissionAmount: 0,
          isReplacement: false,
        })
      }

      const student = subject.students.get(studentKey)
      student.sessionsAttended += 1
      student.commissionAmount += parseFloat(d.commissionAmount.toString())
      if (d.isReplacement) student.isReplacement = true
      subject.subtotal += parseFloat(d.commissionAmount.toString())
    }

    return {
      success: true,
      data: {
        id: commission.id,
        teacherId: commission.teacherId,
        teacherName: commission.teacher.name,
        branchId: commission.branchId,
        branchName: commission.branch.name,
        month: commission.month,
        year: commission.year,
        totalAmount: commission.totalAmount.toString(),
        status: commission.status,
        calculatedAt: commission.calculatedAt?.toISOString(),
        approvedAt: commission.approvedAt?.toISOString(),
        approvedByName: commission.approvedBy?.name,
        bySubject: Array.from(bySubject.values()).map(s => ({
          subjectId: s.subjectId,
          subjectName: s.subjectName,
          subjectCode: s.subjectCode,
          sessionType: s.sessionType,
          formulaType: s.formulaType,
          billingType: s.billingType,
          commissionPercentage: s.commissionPercentage,
          students: Array.from(s.students.values()).map((st: any) => ({
            ...st,
            sppAmount: st.sppAmount.toString(),
            commissionAmount: st.commissionAmount.toFixed(2),
          })),
          subtotal: s.subtotal.toFixed(2),
        })),
      },
    }
  }

  async approve(commissionId: string, currentUserId: string) {
    const commission = await this.prisma.commission.findUnique({ where: { id: commissionId } })
    if (!commission) throw new NotFoundException('Commission not found')

    if (commission.status === 'APPROVED') {
      throw new BadRequestException('Commission already approved')
    }

    const updated = await this.prisma.commission.update({
      where: { id: commissionId },
      data: {
        status: 'APPROVED',
        approvedById: currentUserId,
        approvedAt: new Date(),
      },
      include: { teacher: true, approvedBy: true },
    })

    return {
      success: true,
      data: {
        id: updated.id,
        teacherName: updated.teacher.name,
        status: updated.status,
        totalAmount: updated.totalAmount.toString(),
        approvedAt: updated.approvedAt?.toISOString(),
        approvedByName: updated.approvedBy?.name,
      },
      message: 'Commission approved successfully',
    }
  }

  async approveAll(branchId: string, month: number, year: number, currentUserId: string) {
    const result = await this.prisma.commission.updateMany({
      where: {
        branchId,
        month,
        year,
        status: { in: ['DRAFT', 'CALCULATED'] },
      },
      data: {
        status: 'APPROVED',
        approvedById: currentUserId,
        approvedAt: new Date(),
      },
    })

    return {
      success: true,
      data: { approvedCount: result.count },
      message: `${result.count} commissions approved`,
    }
  }

  async getMyCommissions(teacherId: string, year?: number) {
    const commissions = await this.prisma.commission.findMany({
      where: {
        teacherId,
        ...(year && { year }),
      },
      include: { branch: true },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    })

    return {
      success: true,
      data: commissions.map(c => ({
        id: c.id,
        branchName: c.branch.name,
        month: c.month,
        year: c.year,
        totalAmount: c.totalAmount.toString(),
        status: c.status,
        calculatedAt: c.calculatedAt?.toISOString(),
        approvedAt: c.approvedAt?.toISOString(),
      })),
    }
  }
}
