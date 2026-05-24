import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common'
import { PrismaService } from '@/prisma/prisma.service'

@Injectable()
export class CommissionsService {
  /**
   * Commission Formula (per business-rule.md section 8):
   *   commission = (SPP ÷ total_sessions_in_month) × commissionPercentage × sessions_attended
   *
   * commissionPercentage comes from Subject.commissionPercentage (default 40%).
   * Commission goes to actual_teacher_id (recorded in session_logs),
   * not the regular teacher. This handles replacement teacher scenario.
   */
  constructor(private prisma: PrismaService) {}

  async calculateForMonth(branchId: string, month: number, year: number) {
    // Validate inputs
    if (month < 1 || month > 12) {
      throw new BadRequestException('Month must be 1-12')
    }

    // Get all session logs in the month for this branch
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 1)

    const sessionLogs = await this.prisma.sessionLog.findMany({
      where: {
        sessionDate: { gte: startDate, lt: endDate },
        status: 'COMPLETED',
        session: { branchId },
      },
      include: {
        session: {
          include: {
            subject: true,
          },
        },
        actualTeacher: true,
        attendances: {
          where: { status: 'HADIR' },
          include: { student: true },
        },
      },
    })

    // Group by actual_teacher_id
    const teacherMap = new Map<string, any[]>()
    for (const log of sessionLogs) {
      const tid = log.actualTeacherId
      if (!teacherMap.has(tid)) teacherMap.set(tid, [])
      teacherMap.get(tid)!.push(log)
    }

    // For each teacher, compute commission
    const results: any[] = []

    for (const [teacherId, logs] of teacherMap.entries()) {
      // Get teacher
      const teacher = await this.prisma.user.findUnique({ where: { id: teacherId } })
      if (!teacher) continue

      // For each session log, compute commission per student
      const commissionDetails: any[] = []
      let totalCommission = 0

      for (const log of logs) {
        // For each student that attended (HADIR), compute commission
        for (const attendance of log.attendances) {
          // Get student's SPP rate and subject's commission percentage
          const studentSubject = await this.prisma.studentSubject.findFirst({
            where: {
              studentId: attendance.studentId,
              subjectId: log.session.subjectId,
              isActive: true,
            },
            include: { sppRate: true, subject: true },
          })

          if (!studentSubject || !studentSubject.sppRate) continue

          // Total sessions in month for this student in this subject
          const totalSessionsInMonth = await this.prisma.sessionLog.count({
            where: {
              sessionDate: { gte: startDate, lt: endDate },
              session: {
                subjectId: log.session.subjectId,
                studentSessions: {
                  some: { studentId: attendance.studentId, isActive: true },
                },
              },
            },
          })

          // Sessions actually attended by this student in this subject
          const sessionsAttended = await this.prisma.attendance.count({
            where: {
              studentId: attendance.studentId,
              status: 'HADIR',
              sessionLog: {
                sessionDate: { gte: startDate, lt: endDate },
                actualTeacherId: teacherId,
                session: { subjectId: log.session.subjectId },
              },
            },
          })

          if (totalSessionsInMonth === 0) continue

          const sppAmount = parseFloat(studentSubject.sppRate.amount.toString())
          const commissionRate = parseFloat(studentSubject.subject.commissionPercentage.toString())
          const commissionAmount = (sppAmount / totalSessionsInMonth) * commissionRate

          // Avoid duplicates - only count once per (sessionLog, student)
          const dupKey = `${log.id}-${attendance.studentId}`
          if (commissionDetails.some(c => c._dupKey === dupKey)) continue

          commissionDetails.push({
            _dupKey: dupKey,
            sessionLogId: log.id,
            studentId: attendance.studentId,
            subjectId: log.session.subjectId,
            sppAmount,
            totalSessionsInMonth,
            sessionsAttended,
            commissionAmount,
            isReplacement: log.isReplacement,
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

    // Save / update commission records (use upsert)
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

      if (existing && existing.status === 'APPROVED') {
        // Skip approved entries
        continue
      }

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

      // Replace details
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

    // Aggregate session counts: regular vs replacement
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

    // Aggregate metrics
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

    // Group by subject
    const bySubject = new Map<string, any>()
    for (const d of commission.commissionDetails) {
      if (!bySubject.has(d.subjectId)) {
        bySubject.set(d.subjectId, {
          subjectId: d.subjectId,
          subjectName: d.subject.name,
          subjectCode: d.subject.code,
          sessionType: d.sessionLog.session.type,
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
