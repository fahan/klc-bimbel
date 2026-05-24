import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common'
import { PrismaService } from '@/prisma/prisma.service'
import { SubmitAttendanceDto } from './dto/submit-attendance.dto'

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  async submitAttendance(submitDto: SubmitAttendanceDto, currentUserId: string, substitutionReason?: string) {
    // Verify session exists
    const session = await this.prisma.session.findUnique({
      where: { id: submitDto.sessionId },
      include: {
        teacher: true,
        studentSessions: {
          where: { isActive: true },
          include: { student: true },
        },
      },
    })

    if (!session) {
      throw new NotFoundException('Session not found')
    }

    // Check if recording teacher is replacement (different from session's regular teacher)
    const isReplacement = session.teacherId !== currentUserId

    const sessionDate = new Date(submitDto.sessionDate)
    sessionDate.setHours(0, 0, 0, 0)

    // Find or create session log
    let sessionLog = await this.prisma.sessionLog.findUnique({
      where: {
        sessionId_sessionDate: {
          sessionId: submitDto.sessionId,
          sessionDate,
        },
      },
    })

    if (sessionLog) {
      // Prevent double marking: if already has actualTeacherId and it's different from current user
      if (sessionLog.actualTeacherId && sessionLog.actualTeacherId !== currentUserId) {
        const actualTeacher = await this.prisma.user.findUnique({
          where: { id: sessionLog.actualTeacherId },
          select: { name: true }
        })
        throw new BadRequestException(
          `Sesi ini sudah dihandle oleh ${actualTeacher?.name}. Hubungi admin jika ada kesalahan.`
        )
      }

      // Update existing - if status is COMPLETED, prevent re-submission
      if (sessionLog.status === 'COMPLETED') {
        throw new BadRequestException('Attendance for this session has already been recorded')
      }

      sessionLog = await this.prisma.sessionLog.update({
        where: { id: sessionLog.id },
        data: {
          scheduledTeacherId: session.teacherId, // Ensure scheduled teacher is set
          actualTeacherId: currentUserId,
          isReplacement,
          substitutionReason: substitutionReason || null,
          status: 'COMPLETED',
        },
      })
    } else {
      sessionLog = await this.prisma.sessionLog.create({
        data: {
          sessionId: submitDto.sessionId,
          sessionDate,
          scheduledTeacherId: session.teacherId, // Original teacher
          actualTeacherId: currentUserId, // Teacher submitting attendance
          isReplacement,
          substitutionReason: substitutionReason || null,
          status: 'COMPLETED',
        },
      })
    }

    // Validate all students belong to the session
    const enrolledStudentIds = session.studentSessions.map(ss => ss.studentId)
    for (const att of submitDto.attendances) {
      if (!enrolledStudentIds.includes(att.studentId)) {
        throw new BadRequestException(
          `Student ${att.studentId} is not enrolled in this session`,
        )
      }
    }

    // Delete old attendance records for this session log if any (re-submit case)
    await this.prisma.attendance.deleteMany({
      where: { sessionLogId: sessionLog.id },
    })

    // Create attendance records
    const recordedAt = new Date()
    await this.prisma.attendance.createMany({
      data: submitDto.attendances.map(att => ({
        sessionLogId: sessionLog!.id,
        studentId: att.studentId,
        status: att.status as any,
        recordedById: currentUserId,
        recordedAt,
      })),
    })

    // Get the complete session log with attendances
    const result = await this.prisma.sessionLog.findUnique({
      where: { id: sessionLog.id },
      include: {
        actualTeacher: true,
        attendances: {
          include: { student: true },
        },
      },
    })

    return {
      success: true,
      data: this.formatSessionLog(result),
      message: isReplacement
        ? 'Attendance recorded as replacement teacher. Commission will be assigned to you.'
        : 'Attendance recorded successfully',
    }
  }

  async getSessionLog(sessionId: string, sessionDate: string) {
    const date = new Date(sessionDate)
    date.setHours(0, 0, 0, 0)

    const sessionLog = await this.prisma.sessionLog.findUnique({
      where: {
        sessionId_sessionDate: {
          sessionId,
          sessionDate: date,
        },
      },
      include: {
        actualTeacher: true,
        attendances: {
          include: { student: true },
        },
      },
    })

    if (!sessionLog) {
      return {
        success: true,
        data: null,
        message: 'No attendance recorded yet',
      }
    }

    return {
      success: true,
      data: this.formatSessionLog(sessionLog),
    }
  }

  async getAttendanceHistory(sessionId: string) {
    const sessionLogs = await this.prisma.sessionLog.findMany({
      where: { sessionId },
      include: {
        actualTeacher: true,
        attendances: {
          include: { student: true },
        },
      },
      orderBy: { sessionDate: 'desc' },
    })

    return {
      success: true,
      data: sessionLogs.map(log => this.formatSessionLog(log)),
    }
  }

  async getAttendanceReport(filters: {
    dateFrom?: string
    dateTo?: string
    branchId?: string
    teacherId?: string
    page?: number
    limit?: number
  }) {
    const page = filters.page || 1
    const limit = filters.limit || 10
    const skip = (page - 1) * limit

    // Parse dates
    const dateFrom = filters.dateFrom ? new Date(filters.dateFrom) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const dateTo = filters.dateTo ? new Date(filters.dateTo) : new Date()
    dateFrom.setHours(0, 0, 0, 0)
    dateTo.setHours(23, 59, 59, 999)

    // Build where clause
    const where: any = {
      sessionDate: {
        gte: dateFrom,
        lte: dateTo,
      },
    }

    // Add branch filter if provided
    if (filters.branchId) {
      where.session = {
        branchId: filters.branchId,
      }
    }

    // Add teacher filter if provided
    if (filters.teacherId) {
      where.session = {
        ...where.session,
        teacherId: filters.teacherId,
      }
    }

    // Fetch session logs with related data
    const sessionLogs = await this.prisma.sessionLog.findMany({
      where,
      include: {
        session: {
          include: {
            teacher: true,
            branch: true,
            subject: true,
            studentSessions: {
              where: { isActive: true },
            },
          },
        },
        actualTeacher: true,
        attendances: {
          include: { student: true },
        },
      },
      orderBy: { sessionDate: 'desc' },
      skip,
      take: limit,
    })

    // Count total for pagination
    const total = await this.prisma.sessionLog.count({ where })

    // Format data
    const data = sessionLogs.map(log => {
      const attendanceMap = new Map(log.attendances.map(a => [a.studentId, a.status]))
      const studentCount = log.session.studentSessions.length

      // Count attendances
      const attendanceCounts = {
        hadir: 0,
        absen: 0,
        izin: 0,
        sakit: 0,
      }

      log.attendances.forEach(att => {
        if (att.status === 'HADIR') attendanceCounts.hadir++
        else if (att.status === 'ABSEN') attendanceCounts.absen++
        else if (att.status === 'IZIN') attendanceCounts.izin++
        else if (att.status === 'SAKIT') attendanceCounts.sakit++
      })

      return {
        id: log.id,
        sessionId: log.sessionId,
        date: log.sessionDate.toISOString().split('T')[0],
        sessionTime: log.session.startTime?.substring(0, 5),
        duration: log.session.durationMinutes,
        subjectName: log.session.subject?.name,
        teacherName: log.session.teacher?.name,
        branchName: log.session.branch?.name,
        status: log.status,
        studentCount,
        completedCount: log.attendances.length,
        haidirCount: attendanceCounts.hadir,
        absenCount: attendanceCounts.absen,
        izinCount: attendanceCounts.izin,
        sakitCount: attendanceCounts.sakit,
        attendanceRate: studentCount > 0 ? (attendanceCounts.hadir / studentCount * 100).toFixed(1) : '0',
      }
    })

    // Calculate summary
    const allLogs = await this.prisma.sessionLog.findMany({
      where,
      include: {
        attendances: true,
      },
    })

    const summary = {
      totalSessions: total,
      completedSessions: allLogs.filter(l => l.status === 'COMPLETED').length,
      pendingSessions: allLogs.filter(l => l.status === 'SCHEDULED').length,
      cancelledSessions: allLogs.filter(l => l.status === 'CANCELLED').length,
      averageAttendanceRate: 0 as number,
    }

    // Calculate average attendance rate
    if (allLogs.length > 0) {
      const totalAttendance = allLogs.reduce((sum, log) => {
        const attendanceCount = log.attendances.filter(a => a.status === 'HADIR').length
        const studentCount = log.attendances.length
        return sum + (studentCount > 0 ? attendanceCount / studentCount : 0)
      }, 0)
      summary.averageAttendanceRate = parseFloat((totalAttendance / allLogs.length * 100).toFixed(1))
    }

    return {
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
      summary,
    }
  }

  // Helper: format session log
  private formatSessionLog(log: any) {
    if (!log) return null
    return {
      id: log.id,
      sessionId: log.sessionId,
      sessionDate: log.sessionDate.toISOString().split('T')[0],
      actualTeacherId: log.actualTeacherId,
      actualTeacherName: log.actualTeacher?.name,
      isReplacement: log.isReplacement,
      status: log.status,
      createdAt: log.createdAt?.toISOString(),
      attendances: log.attendances?.map((att: any) => ({
        id: att.id,
        studentId: att.studentId,
        studentName: att.student?.name,
        status: att.status,
        recordedAt: att.recordedAt?.toISOString(),
      })),
    }
  }
}
