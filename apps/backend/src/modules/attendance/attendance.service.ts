import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common'
import { PrismaService } from '@/prisma/prisma.service'
import { SubmitAttendanceDto } from './dto/submit-attendance.dto'
import { SubmitAdHocAttendanceDto } from './dto/submit-adhoc-attendance.dto'

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

    // Find or create session log (unique constraint replaced with index — use findFirst)
    let sessionLog = await this.prisma.sessionLog.findFirst({
      where: {
        sessionId: submitDto.sessionId,
        sessionDate,
        isAdHoc: false,
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

    const sessionLog = await this.prisma.sessionLog.findFirst({
      where: {
        sessionId,
        sessionDate: date,
        isAdHoc: false,
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

    // Add branch filter if provided (covers both regular and ad-hoc)
    if (filters.branchId) {
      where.OR = [
        { isAdHoc: false, session: { branchId: filters.branchId } },
        { isAdHoc: true, adHocBranchId: filters.branchId },
      ]
    }

    // Add teacher filter if provided
    if (filters.teacherId) {
      where.actualTeacherId = filters.teacherId
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
        adHocBranch: true,
        adHocSubject: true,
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
      // session is nullable (null for ad-hoc logs)
      const studentCount = log.session?.studentSessions?.length ?? log.attendances.length

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
        isAdHoc: log.isAdHoc,
        date: log.sessionDate.toISOString().split('T')[0],
        sessionTime: log.isAdHoc ? (log as any).adHocStartTime : log.session?.startTime?.substring(0, 5),
        duration: log.isAdHoc ? (log as any).adHocDuration : log.session?.durationMinutes,
        subjectName: log.isAdHoc ? (log as any).adHocSubject?.name : log.session?.subject?.name,
        teacherName: log.isAdHoc ? log.actualTeacher?.name : log.session?.teacher?.name,
        branchName: log.isAdHoc ? (log as any).adHocBranch?.name : log.session?.branch?.name,
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

  // ========== AD-HOC ATTENDANCE METHODS ==========

  async submitAdHocAttendance(dto: SubmitAdHocAttendanceDto, teacherId: string) {
    if (!dto.attendances || dto.attendances.length === 0) {
      throw new BadRequestException('Minimal satu siswa harus dicatat presensinya')
    }

    // Validate branch exists
    const branch = await this.prisma.branch.findUnique({ where: { id: dto.branchId } })
    if (!branch) throw new NotFoundException('Cabang tidak ditemukan')

    // Validate subject exists
    const subject = await this.prisma.subject.findUnique({ where: { id: dto.subjectId } })
    if (!subject) throw new NotFoundException('Mata pelajaran tidak ditemukan')

    // Validate students are enrolled in this subject (at least at this branch)
    const studentIds = dto.attendances.map(a => a.studentId)
    const enrollments = await this.prisma.studentSubject.findMany({
      where: {
        studentId: { in: studentIds },
        subjectId: dto.subjectId,
        isActive: true,
      },
      select: { studentId: true },
    })
    const enrolledIds = new Set(enrollments.map(e => e.studentId))
    const notEnrolled = studentIds.filter(id => !enrolledIds.has(id))
    if (notEnrolled.length > 0) {
      throw new BadRequestException(
        `${notEnrolled.length} siswa tidak terdaftar di mata pelajaran ini. Pastikan siswa sudah di-enroll.`
      )
    }

    const sessionDate = new Date(dto.sessionDate)
    sessionDate.setHours(0, 0, 0, 0)

    // Create the ad-hoc session log with PENDING_APPROVAL status
    const sessionLog = await this.prisma.sessionLog.create({
      data: {
        sessionId: null,
        sessionDate,
        scheduledTeacherId: teacherId,
        actualTeacherId: teacherId,
        isReplacement: false,
        isAdHoc: true,
        adHocBranchId: dto.branchId,
        adHocSubjectId: dto.subjectId,
        adHocStartTime: dto.startTime,
        adHocDuration: dto.durationMinutes ?? 60,
        adHocNotes: dto.notes ?? null,
        status: 'PENDING_APPROVAL',
      },
    })

    // Create attendance records
    const recordedAt = new Date()
    await this.prisma.attendance.createMany({
      data: dto.attendances.map(att => ({
        sessionLogId: sessionLog.id,
        studentId: att.studentId,
        status: att.status as any,
        recordedById: teacherId,
        recordedAt,
      })),
    })

    const result = await this.prisma.sessionLog.findUnique({
      where: { id: sessionLog.id },
      include: {
        actualTeacher: true,
        adHocBranch: true,
        adHocSubject: true,
        attendances: { include: { student: true } },
      },
    })

    return {
      success: true,
      data: this.formatAdHocLog(result),
      message: 'Sesi darurat berhasil dicatat. Menunggu persetujuan admin.',
    }
  }

  async getAdHocPending(branchId?: string) {
    const where: any = {
      isAdHoc: true,
      status: 'PENDING_APPROVAL',
    }
    if (branchId) where.adHocBranchId = branchId

    const logs = await this.prisma.sessionLog.findMany({
      where,
      include: {
        actualTeacher: true,
        adHocBranch: true,
        adHocSubject: true,
        attendances: { include: { student: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return {
      success: true,
      data: logs.map(l => this.formatAdHocLog(l)),
    }
  }

  async approveAdHoc(sessionLogId: string, adminId: string) {
    const log = await this.prisma.sessionLog.findUnique({ where: { id: sessionLogId } })
    if (!log) throw new NotFoundException('Session log tidak ditemukan')
    if (!log.isAdHoc) throw new BadRequestException('Hanya sesi darurat yang dapat di-approve di sini')
    if (log.status !== 'PENDING_APPROVAL') {
      throw new BadRequestException(`Status saat ini: ${log.status}. Hanya PENDING_APPROVAL yang bisa di-approve.`)
    }

    const updated = await this.prisma.sessionLog.update({
      where: { id: sessionLogId },
      data: {
        status: 'COMPLETED',
        reviewedById: adminId,
        reviewedAt: new Date(),
      },
      include: {
        actualTeacher: true,
        adHocBranch: true,
        adHocSubject: true,
        reviewedBy: true,
        attendances: { include: { student: true } },
      },
    })

    return {
      success: true,
      data: this.formatAdHocLog(updated),
      message: 'Sesi darurat disetujui. Komisi akan terhitung saat kalkulasi bulan ini.',
    }
  }

  async rejectAdHoc(sessionLogId: string, adminId: string, reason: string) {
    const log = await this.prisma.sessionLog.findUnique({ where: { id: sessionLogId } })
    if (!log) throw new NotFoundException('Session log tidak ditemukan')
    if (!log.isAdHoc) throw new BadRequestException('Hanya sesi darurat yang dapat ditolak di sini')
    if (log.status !== 'PENDING_APPROVAL') {
      throw new BadRequestException(`Status saat ini: ${log.status}. Hanya PENDING_APPROVAL yang bisa ditolak.`)
    }

    const updated = await this.prisma.sessionLog.update({
      where: { id: sessionLogId },
      data: {
        status: 'REJECTED',
        reviewedById: adminId,
        reviewedAt: new Date(),
        rejectionReason: reason,
      },
      include: {
        actualTeacher: true,
        adHocBranch: true,
        adHocSubject: true,
        reviewedBy: true,
      },
    })

    return {
      success: true,
      data: this.formatAdHocLog(updated),
      message: 'Sesi darurat ditolak.',
    }
  }

  async getEligibleStudents(branchId: string, subjectId: string) {
    // Students at branch who are enrolled in the given subject
    const studentSubjects = await this.prisma.studentSubject.findMany({
      where: {
        subjectId,
        isActive: true,
        student: { branchId, isActive: true },
      },
      include: {
        student: { select: { id: true, name: true, classLevel: true } },
      },
    })

    return {
      success: true,
      data: studentSubjects.map(ss => ({
        studentId: ss.studentId,
        studentName: ss.student.name,
        classLevel: ss.student.classLevel,
      })),
    }
  }

  async getSessionLogById(sessionLogId: string) {
    const log = await this.prisma.sessionLog.findUnique({
      where: { id: sessionLogId },
      include: {
        session: { include: { subject: true, teacher: true } },
        adHocBranch: true,
        adHocSubject: true,
        actualTeacher: true,
        attendances: { include: { student: true } },
      },
    })

    if (!log) throw new NotFoundException('Session log tidak ditemukan')

    return {
      success: true,
      data: {
        id: log.id,
        isAdHoc: log.isAdHoc,
        sessionDate: log.sessionDate.toISOString().split('T')[0],
        status: log.status,
        // Regular session fields
        subjectId: log.isAdHoc ? log.adHocSubjectId : log.session?.subjectId,
        subjectName: log.isAdHoc ? log.adHocSubject?.name : log.session?.subject?.name,
        subjectTrackingType: log.isAdHoc ? log.adHocSubject?.trackingType : log.session?.subject?.trackingType,
        // Ad-hoc fields
        adHocBranchId: log.adHocBranchId,
        adHocBranchName: log.adHocBranch?.name,
        adHocStartTime: log.adHocStartTime,
        adHocDuration: log.adHocDuration,
        teacherName: log.actualTeacher?.name,
        attendances: log.attendances.map(att => ({
          id: att.id,
          studentId: att.studentId,
          studentName: att.student?.name,
          status: att.status,
        })),
      },
    }
  }

  async getMyAdHocHistory(teacherId: string) {
    const logs = await this.prisma.sessionLog.findMany({
      where: { isAdHoc: true, actualTeacherId: teacherId },
      include: {
        adHocBranch: true,
        adHocSubject: true,
        reviewedBy: true,
        attendances: { include: { student: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
    })

    return {
      success: true,
      data: logs.map(l => this.formatAdHocLog(l)),
    }
  }

  // Helper: format ad-hoc session log
  private formatAdHocLog(log: any) {
    if (!log) return null
    const hadirCount = log.attendances?.filter((a: any) => a.status === 'HADIR').length ?? 0
    return {
      id: log.id,
      isAdHoc: true,
      sessionDate: log.sessionDate?.toISOString().split('T')[0],
      branchId: log.adHocBranchId,
      branchName: log.adHocBranch?.name,
      subjectId: log.adHocSubjectId,
      subjectName: log.adHocSubject?.name,
      startTime: log.adHocStartTime,
      durationMinutes: log.adHocDuration,
      notes: log.adHocNotes,
      teacherId: log.actualTeacherId,
      teacherName: log.actualTeacher?.name,
      status: log.status,
      reviewedById: log.reviewedById,
      reviewedByName: log.reviewedBy?.name,
      reviewedAt: log.reviewedAt?.toISOString(),
      rejectionReason: log.rejectionReason,
      createdAt: log.createdAt?.toISOString(),
      studentCount: log.attendances?.length ?? 0,
      hadirCount,
      attendances: log.attendances?.map((att: any) => ({
        id: att.id,
        studentId: att.studentId,
        studentName: att.student?.name,
        status: att.status,
      })),
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
