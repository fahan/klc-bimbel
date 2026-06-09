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

    const teacherMap = new Map<string, any[]>()
    for (const log of sessionLogs) {
      const tid = log.actualTeacherId
      if (!teacherMap.has(tid)) teacherMap.set(tid, [])
      teacherMap.get(tid)!.push(log)
    }

    const results: any[] = []

    for (const [teacherId, logs] of teacherMap.entries()) {
      const teacher = await this.prisma.user.findUnique({ where: { id: teacherId } })
      if (!teacher) continue

      const commissionDetails: any[] = []
      let totalCommission = 0

      for (const log of logs) {
        const subjectId = log.isAdHoc ? log.adHocSubjectId : log.session?.subjectId
        if (!subjectId) continue

        // Resolve session type for formula lookup
        const sessionType: 'REGULAR' | 'PRIVATE' =
          (log.session?.type as 'REGULAR' | 'PRIVATE') ?? 'REGULAR'

        // Get effective formula for this subject + session type
        const formula = await this.formulasService.getEffectiveFormula(subjectId, sessionType)

        for (const attendance of log.attendances) {
          const studentSubject = await this.prisma.studentSubject.findFirst({
            where: {
              studentId: attendance.studentId,
              subjectId,
              isActive: true,
            },
            include: { sppRate: true, subject: true },
          })

          if (!studentSubject || !studentSubject.sppRate) continue

          const regularSessionCount = await this.prisma.sessionLog.count({
            where: {
              sessionDate: { gte: startDate, lt: endDate },
              status: 'COMPLETED',
              isAdHoc: false,
              session: {
                subjectId,
                studentSessions: {
                  some: { studentId: attendance.studentId, isActive: true },
                },
              },
            },
          })

          const adHocSessionCount = await this.prisma.sessionLog.count({
            where: {
              sessionDate: { gte: startDate, lt: endDate },
              status: 'COMPLETED',
              isAdHoc: true,
              adHocSubjectId: subjectId,
              attendances: { some: { studentId: attendance.studentId } },
            },
          })

          const totalSessionsInMonth = regularSessionCount + adHocSessionCount

          const sessionsAttended = await this.prisma.attendance.count({
            where: {
              studentId: attendance.studentId,
              status: 'HADIR',
              sessionLog: {
                sessionDate: { gte: startDate, lt: endDate },
                actualTeacherId: teacherId,
                OR: [
                  { isAdHoc: false, session: { subjectId } },
                  { isAdHoc: true, adHocSubjectId: subjectId },
                ],
              },
            },
          })

          const masterRate = parseFloat(studentSubject.sppRate.amount.toString())
          const billingType: string = (studentSubject.sppRate as any).billingType ?? 'FLAT_MONTHLY'
          // effectiveSppBase = nilai SPP yang dipakai sebagai basis kalkulasi komisi
          let effectiveSppBase: number
          let commissionAmount: number

          if (billingType === 'PER_SESSION') {
            // Per-sesi: komisi langsung dari rate × sesi hadir siswa bersama guru ini
            // Tidak menggunakan applyFormula — formulaType tidak relevan untuk model ini
            effectiveSppBase = studentSubject.customSppAmount && studentSubject.discountAffectsCommission
              ? parseFloat(studentSubject.customSppAmount.toString())
              : masterRate
            commissionAmount = effectiveSppBase * formula.commissionPercentage * sessionsAttended
          } else {
            // FLAT_MONTHLY — gunakan formula distribusi (MONTHLY_RATE / PER_SESSION)
            // Tentukan basis SPP berdasarkan discountAffectsCommission
            effectiveSppBase = studentSubject.customSppAmount && studentSubject.discountAffectsCommission
              ? parseFloat(studentSubject.customSppAmount.toString())
              : masterRate

            // Guard: PER_SESSION formula needs at least 1 session
            if (formula.formulaType === 'PER_SESSION' && totalSessionsInMonth === 0) continue

            commissionAmount = this.applyFormula(
              effectiveSppBase,
              formula.commissionPercentage,
              sessionsAttended,
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
            sessionsAttended,
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

    const bySubject = new Map<string, any>()
    for (const d of commission.commissionDetails) {
      if (!bySubject.has(d.subjectId)) {
        bySubject.set(d.subjectId, {
          subjectId: d.subjectId,
          subjectName: d.subject.name,
          subjectCode: d.subject.code,
          sessionType: d.sessionLog.session?.type ?? 'REGULAR',
          formulaType: d.formulaType,
          commissionPercentage: parseFloat(d.commissionPercentage.toString()),
          students: new Map<string, any>(),
          subtotal: 0,
        })
      }

      const subject = bySubject.get(d.subjectId)
      const studentKey = d.studentId
      if (!subject.students.has(studentKey)) {
        subject.students.set(studentKey, {
          studentId: d.studentId,
          studentName: d.student.name,
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
