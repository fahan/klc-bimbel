import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common'
import { PrismaService } from '@/prisma/prisma.service'
import { SubmitAttendanceDto, AttendanceStatus } from './dto/submit-attendance.dto'
import { SubmitAdHocAttendanceDto } from './dto/submit-adhoc-attendance.dto'
import { SubmitQuickAttendanceDto } from './dto/submit-quick-attendance.dto'
import { jakartaNow } from '@/common/utils/jakarta-time'

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  async submitAttendance(submitDto: SubmitAttendanceDto, currentUserId: string, substitutionReason?: string) {
    // Verify session exists
    const session = await this.prisma.session.findUnique({
      relationLoadStrategy: 'join',
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
      relationLoadStrategy: 'join',
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
      relationLoadStrategy: 'join',
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
      relationLoadStrategy: 'join',
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

    // Fetch the paginated page, total count, and summary aggregates in a single
    // parallel wave. Only the fields used below are selected (the previous
    // version eagerly loaded full relations — including unused student rows).
    const [sessionLogs, total, statusGroups, attendanceGroups] = await Promise.all([
      this.prisma.sessionLog.findMany({
        where,
        select: {
          id: true,
          sessionId: true,
          isAdHoc: true,
          sessionDate: true,
          status: true,
          adHocStartTime: true,
          adHocDuration: true,
          actualTeacher: { select: { name: true } },
          adHocBranch: { select: { name: true } },
          adHocSubject: { select: { name: true } },
          session: {
            select: {
              startTime: true,
              durationMinutes: true,
              teacher: { select: { name: true } },
              branch: { select: { name: true } },
              subject: { select: { name: true } },
              _count: { select: { studentSessions: { where: { isActive: true } } } },
            },
          },
          attendances: { select: { status: true } },
        },
        orderBy: { sessionDate: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.sessionLog.count({ where }),
      this.prisma.sessionLog.groupBy({ by: ['status'], where, _count: { id: true } }),
      this.prisma.attendance.groupBy({
        by: ['sessionLogId', 'status'],
        where: { sessionLog: { is: where } },
        _count: { id: true },
      }),
    ])

    // Format data
    const data = sessionLogs.map(log => {
      // session is nullable (null for ad-hoc logs)
      const studentCount = log.session?._count?.studentSessions ?? log.attendances.length

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

    // Summary from aggregates — replicates the previous per-log (HADIR / total
    // attendances) rate averaged over every matching log, but without fetching
    // all logs and their attendance rows.
    const statusCount = (status: string) =>
      statusGroups.find(g => g.status === status)?._count.id ?? 0

    const perLog = new Map<string, { hadir: number; total: number }>()
    for (const g of attendanceGroups) {
      const entry = perLog.get(g.sessionLogId) ?? { hadir: 0, total: 0 }
      entry.total += g._count.id
      if (g.status === 'HADIR') entry.hadir += g._count.id
      perLog.set(g.sessionLogId, entry)
    }
    let ratioSum = 0
    for (const entry of perLog.values()) {
      ratioSum += entry.total > 0 ? entry.hadir / entry.total : 0
    }

    const summary = {
      totalSessions: total,
      completedSessions: statusCount('COMPLETED'),
      pendingSessions: statusCount('SCHEDULED'),
      cancelledSessions: statusCount('CANCELLED'),
      averageAttendanceRate: total > 0 ? parseFloat((ratioSum / total * 100).toFixed(1)) : 0,
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

    // Validate startTime is within operational hours (05:00–22:00 WIB)
    const [startHour] = dto.startTime.split(':').map(Number)
    if (startHour < 5 || startHour >= 22) {
      throw new BadRequestException(
        `Jam mulai sesi (${dto.startTime}) tidak valid. Gunakan format 24 jam antara 05:00 – 22:00. ` +
        `Contoh: jam 2 siang ditulis 14:00, bukan 02:00.`
      )
    }

    const studentIds = dto.attendances.map(a => a.studentId)

    // Validate branch/subject/students in one round-trip instead of three serial ones —
    // the DB is latency-bound (see perf-db-latency-seoul memory), so each serial await here
    // used to cost a full network round-trip.
    const [branch, subject, existingStudents, teacher] = await Promise.all([
      this.prisma.branch.findUnique({ where: { id: dto.branchId } }),
      this.prisma.subject.findUnique({ where: { id: dto.subjectId } }),
      this.prisma.student.findMany({
        where: { id: { in: studentIds }, isActive: true },
        select: { id: true, name: true },
      }),
      this.prisma.user.findUnique({ where: { id: teacherId }, select: { id: true, name: true } }),
    ])
    if (!branch) throw new NotFoundException('Cabang tidak ditemukan')
    if (!subject) throw new NotFoundException('Mata pelajaran tidak ditemukan')

    const studentById = new Map(existingStudents.map(s => [s.id, s]))
    const notFound = studentIds.filter(id => !studentById.has(id))
    if (notFound.length > 0) {
      throw new BadRequestException(`${notFound.length} siswa tidak ditemukan di sistem.`)
    }
    // Note: commission will only be calculated for students who have active enrollment (studentSubject).
    // Non-enrolled students can attend ad-hoc sessions but won't generate commission.

    const sessionDate = new Date(dto.sessionDate)
    sessionDate.setHours(0, 0, 0, 0)
    const recordedAt = new Date()

    // Create the session log + its attendance rows atomically — previously these were two
    // unguarded writes, so a failed createMany left an orphaned PENDING_APPROVAL log with no attendances.
    const { sessionLog, attendances } = await this.prisma.$transaction(async tx => {
      const sessionLog = await tx.sessionLog.create({
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

      const attendances = await tx.attendance.createManyAndReturn({
        data: dto.attendances.map(att => ({
          sessionLogId: sessionLog.id,
          studentId: att.studentId,
          status: att.status as any,
          recordedById: teacherId,
          recordedAt,
        })),
      })

      return { sessionLog, attendances }
    })

    // Build the response from data already in hand instead of re-fetching the session log
    // with joins — that final round-trip was pure overhead since nothing here changed underneath us.
    const result = {
      id: sessionLog.id,
      sessionDate,
      adHocBranchId: dto.branchId,
      adHocBranch: branch,
      adHocSubjectId: dto.subjectId,
      adHocSubject: subject,
      adHocStartTime: dto.startTime,
      adHocDuration: dto.durationMinutes ?? 60,
      adHocNotes: dto.notes ?? null,
      actualTeacherId: teacherId,
      actualTeacher: teacher,
      status: 'PENDING_APPROVAL',
      reviewedById: null,
      reviewedBy: null,
      reviewedAt: null,
      rejectionReason: null,
      createdAt: sessionLog.createdAt,
      attendances: attendances.map(att => {
        const student = studentById.get(att.studentId)
        return {
          id: att.id,
          studentId: att.studentId,
          student: { name: student?.name },
          status: att.status,
        }
      }),
    }

    return {
      success: true,
      data: this.formatAdHocLog(result),
      message: 'Sesi darurat berhasil dicatat. Menunggu persetujuan admin.',
    }
  }

  /** Tag prepended to adHocNotes so admin can distinguish Presensi Cepat from Sesi Darurat. */
  static readonly QUICK_TAG = '[PRESENSI-CEPAT]'

  /**
   * Presensi Cepat: teacher submits students + statuses only. Subject is resolved
   * from active enrollments, date/time from submission time, duration fixed at 30min.
   * Students are grouped per subject; one PENDING_APPROVAL SessionLog per group.
   */
  async submitQuickAttendance(dto: SubmitQuickAttendanceDto, teacherId: string) {
    const studentIds = [...new Set(dto.students.map(s => s.studentId))]
    if (studentIds.length !== dto.students.length) {
      throw new BadRequestException('Terdapat siswa duplikat dalam satu submit')
    }

    const [branch, students, enrollments] = await Promise.all([
      this.prisma.branch.findUnique({ where: { id: dto.branchId } }),
      this.prisma.student.findMany({
        where: { id: { in: studentIds }, isActive: true },
        select: { id: true, name: true, sureName: true },
      }),
      this.prisma.studentSubject.findMany({
        where: { studentId: { in: studentIds }, isActive: true },
        select: { studentId: true, subjectId: true },
      }),
    ])
    if (!branch) throw new NotFoundException('Cabang tidak ditemukan')

    const studentById = new Map(students.map(s => [s.id, s]))
    const missing = studentIds.filter(id => !studentById.has(id))
    if (missing.length > 0) {
      throw new BadRequestException(`${missing.length} siswa tidak ditemukan atau tidak aktif.`)
    }

    const enrollmentsByStudent = new Map<string, string[]>()
    for (const e of enrollments) {
      const arr = enrollmentsByStudent.get(e.studentId) ?? []
      arr.push(e.subjectId)
      enrollmentsByStudent.set(e.studentId, arr)
    }

    // Resolve subject per student
    const resolved: { studentId: string; subjectId: string; status: AttendanceStatus }[] = []
    for (const s of dto.students) {
      const active = enrollmentsByStudent.get(s.studentId) ?? []
      let subjectId: string
      if (active.length === 1) {
        subjectId = active[0]
      } else {
        if (!s.subjectId) {
          const name = studentById.get(s.studentId)?.name
          throw new BadRequestException(`Pilih mata pelajaran untuk siswa ${name}.`)
        }
        if (active.length > 1 && !active.includes(s.subjectId)) {
          const name = studentById.get(s.studentId)?.name
          throw new BadRequestException(`Mapel yang dipilih tidak sesuai enrollment aktif siswa ${name}.`)
        }
        subjectId = s.subjectId
      }
      resolved.push({ studentId: s.studentId, subjectId, status: s.status })
    }

    const subjectIds = [...new Set(resolved.map(r => r.subjectId))]
    const subjects = await this.prisma.subject.findMany({ where: { id: { in: subjectIds } } })
    const subjectById = new Map(subjects.map(s => [s.id, s]))
    const missingSubjects = subjectIds.filter(id => !subjectById.has(id))
    if (missingSubjects.length > 0) {
      throw new NotFoundException('Mata pelajaran tidak ditemukan')
    }

    // Date/time from submission moment in WIB (UTC+7) — server may run UTC, so a
    // 00:30 WIB submit must still land on the WIB calendar day, not the UTC one.
    // sessionDate is built exactly like the darurat flow builds it from its
    // YYYY-MM-DD dto (new Date(dateStr) + setHours(0,0,0,0)), so the same-day
    // duplicate query compares like-for-like against existing ad-hoc logs.
    const now = jakartaNow()
    const wibDateStr = now.toISOString().split('T')[0]
    const sessionDate = new Date(wibDateStr)
    sessionDate.setHours(0, 0, 0, 0)
    const startTime = `${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}`

    // Duplicate detection: same student + subject + date, any flow (not blocking)
    const existingToday = await this.prisma.attendance.findMany({
      where: {
        studentId: { in: studentIds },
        sessionLog: { sessionDate, status: { in: ['PENDING_APPROVAL', 'COMPLETED'] } },
      },
      select: {
        studentId: true,
        sessionLog: { select: { adHocSubjectId: true, session: { select: { subjectId: true } } } },
      },
    })
    const duplicates = resolved.filter(r =>
      existingToday.some(
        d =>
          d.studentId === r.studentId &&
          (d.sessionLog.adHocSubjectId ?? d.sessionLog.session?.subjectId) === r.subjectId,
      ),
    )

    // Group per subject
    const groups = new Map<string, typeof resolved>()
    for (const r of resolved) {
      const g = groups.get(r.subjectId) ?? []
      g.push(r)
      groups.set(r.subjectId, g)
    }

    const recordedAt = new Date()
    const createdLogs = await this.prisma.$transaction(async tx => {
      const logs: { log: any; subjectId: string; members: typeof resolved }[] = []
      for (const [subjectId, members] of groups) {
        const log = await tx.sessionLog.create({
          data: {
            sessionId: null,
            sessionDate,
            scheduledTeacherId: teacherId,
            actualTeacherId: teacherId,
            isReplacement: false,
            isAdHoc: true,
            adHocBranchId: dto.branchId,
            adHocSubjectId: subjectId,
            adHocStartTime: startTime,
            adHocDuration: 30,
            adHocNotes: AttendanceService.QUICK_TAG,
            status: 'PENDING_APPROVAL',
          },
        })
        await tx.attendance.createMany({
          data: members.map(m => ({
            sessionLogId: log.id,
            studentId: m.studentId,
            status: m.status as any,
            recordedById: teacherId,
            recordedAt,
          })),
        })
        logs.push({ log, subjectId, members })
      }
      return logs
    })

    return {
      success: true,
      data: {
        sessionLogs: createdLogs.map(({ log, subjectId, members }) => ({
          id: log.id,
          subjectId,
          subjectName: subjectById.get(subjectId)!.name,
          trackingType: subjectById.get(subjectId)!.trackingType,
          studentCount: members.length,
          hadirCount: members.filter(m => m.status === 'HADIR').length,
        })),
        duplicateWarnings: duplicates.map(d => ({
          studentId: d.studentId,
          studentName: studentById.get(d.studentId)?.name,
          subjectName: subjectById.get(d.subjectId)?.name,
        })),
      },
      message: `Presensi tercatat (${createdLogs.length} sesi). Menunggu persetujuan admin.`,
    }
  }

  async getAdHocPending(filters: {
    branchId?: string
    teacherId?: string
    dateFrom?: string
    dateTo?: string
  } = {}) {
    const where: any = {
      isAdHoc: true,
      status: 'PENDING_APPROVAL',
    }
    if (filters.branchId) where.adHocBranchId = filters.branchId
    if (filters.teacherId) where.actualTeacherId = filters.teacherId
    if (filters.dateFrom || filters.dateTo) {
      where.sessionDate = {}
      if (filters.dateFrom) {
        const d = new Date(filters.dateFrom)
        d.setHours(0, 0, 0, 0)
        where.sessionDate.gte = d
      }
      if (filters.dateTo) {
        const d = new Date(filters.dateTo)
        d.setHours(23, 59, 59, 999)
        where.sessionDate.lte = d
      }
    }

    const logs = await this.prisma.sessionLog.findMany({
      // Single JOIN for relations instead of one query per relation.
      relationLoadStrategy: 'join',
      where,
      include: {
        actualTeacher: true,
        adHocBranch: true,
        adHocSubject: true,
        attendances: { include: { student: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Badge data: walk-in (no active enrollment for the log's subject) and
    // duplicate (same student+subject+date in another pending/completed log).
    const allStudentIds = [...new Set(logs.flatMap(l => l.attendances.map(a => a.studentId)))]
    const logSubjectIds = [...new Set(logs.map(l => l.adHocSubjectId).filter(Boolean))] as string[]
    // Only look up duplicates on the exact dates the pending logs span — otherwise the
    // query pulls every attendance a student ever had. Mirrors submitQuickAttendance's
    // sessionDate-scoped duplicate check.
    const logDates = [...new Set(logs.map(l => l.sessionDate.getTime()))].map(t => new Date(t))

    const [activeEnrollments, sameDayAttendances] = allStudentIds.length
      ? await Promise.all([
          this.prisma.studentSubject.findMany({
            where: { studentId: { in: allStudentIds }, subjectId: { in: logSubjectIds }, isActive: true },
            select: { studentId: true, subjectId: true },
          }),
          this.prisma.attendance.findMany({
            where: {
              studentId: { in: allStudentIds },
              sessionLog: { status: { in: ['PENDING_APPROVAL', 'COMPLETED'] }, sessionDate: { in: logDates } },
            },
            select: {
              studentId: true,
              sessionLogId: true,
              sessionLog: {
                select: {
                  sessionDate: true,
                  adHocSubjectId: true,
                  session: { select: { subjectId: true } },
                },
              },
            },
          }),
        ])
      : [[], []]

    const enrolledSet = new Set(activeEnrollments.map(e => `${e.studentId}:${e.subjectId}`))

    return {
      success: true,
      data: logs.map(l => {
        const dateKey = l.sessionDate.toISOString().split('T')[0]
        const duplicateStudentNames = l.attendances
          .filter(att =>
            sameDayAttendances.some(
              other =>
                other.sessionLogId !== l.id &&
                other.studentId === att.studentId &&
                other.sessionLog.sessionDate.toISOString().split('T')[0] === dateKey &&
                (other.sessionLog.adHocSubjectId ?? other.sessionLog.session?.subjectId) === l.adHocSubjectId,
            ),
          )
          .map(att => att.student?.name)
        return {
          ...this.formatAdHocLog(l),
          source: l.adHocNotes?.startsWith(AttendanceService.QUICK_TAG) ? 'CEPAT' : 'DARURAT',
          hasWalkIn: l.adHocSubjectId
            ? l.attendances.some(att => !enrolledSet.has(`${att.studentId}:${l.adHocSubjectId}`))
            : false,
          duplicateStudentNames,
        }
      }),
    }
  }

  async approveAdHoc(
    sessionLogId: string,
    adminId: string,
    options?: { generateSchedule?: boolean; sessionType?: 'REGULAR' | 'PRIVATE'; startTimeCorrection?: string },
  ) {
    const log = await this.prisma.sessionLog.findUnique({ where: { id: sessionLogId } })
    if (!log) throw new NotFoundException('Session log tidak ditemukan')
    if (!log.isAdHoc) throw new BadRequestException('Hanya sesi darurat yang dapat di-approve di sini')
    if (log.status !== 'PENDING_APPROVAL') {
      throw new BadRequestException(`Status saat ini: ${log.status}. Hanya PENDING_APPROVAL yang bisa di-approve.`)
    }

    // 1. Approve the session log. An optional startTime correction is folded into
    // this same write so status + time change atomically — if this update throws,
    // neither the approval nor the correction persists.
    const updated = await this.prisma.sessionLog.update({
      relationLoadStrategy: 'join',
      where: { id: sessionLogId },
      data: {
        status: 'COMPLETED',
        reviewedById: adminId,
        reviewedAt: new Date(),
        ...(options?.startTimeCorrection ? { adHocStartTime: options.startTimeCorrection } : {}),
      },
      include: {
        actualTeacher: true,
        adHocBranch: true,
        adHocSubject: true,
        reviewedBy: true,
        attendances: { include: { student: true } },
      },
    })

    // 2. Optionally generate a recurring schedule
    let scheduleResult: {
      created: boolean
      sessionId?: string
      conflictReason?: string
      dayOfWeek?: string
    } | null = null

    if (options?.generateSchedule && log.adHocBranchId && log.adHocSubjectId && log.adHocStartTime) {
      scheduleResult = await this.tryCreateScheduleFromAdHoc(log, options.sessionType ?? 'REGULAR')
    }

    const baseMessage = 'Sesi darurat disetujui. Komisi akan terhitung saat kalkulasi bulan ini.'
    const scheduleMessage = scheduleResult
      ? scheduleResult.created
        ? ` Jadwal reguler (${scheduleResult.dayOfWeek}) berhasil dibuat.`
        : ` Jadwal tidak dibuat: ${scheduleResult.conflictReason}`
      : ''

    return {
      success: true,
      data: {
        ...this.formatAdHocLog(updated),
        scheduleResult,
      },
      message: baseMessage + scheduleMessage,
    }
  }

  /** Attempt to create a recurring Session from an approved ad-hoc log. Never throws — returns result object. */
  private async tryCreateScheduleFromAdHoc(
    log: any,
    sessionType: 'REGULAR' | 'PRIVATE',
  ): Promise<{ created: boolean; sessionId?: string; conflictReason?: string; dayOfWeek?: string; enrolledCount?: number; skippedCount?: number }> {
    try {
      const days = ['MINGGU', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU']
      const sessionDate = new Date(log.sessionDate)
      const dayOfWeek = days[sessionDate.getDay()] as any

      const startTime: string = log.adHocStartTime   // HH:mm
      const duration: number  = log.adHocDuration ?? 60

      // --- Conflict check 1: exact duplicate ---
      const duplicate = await this.prisma.session.findFirst({
        where: {
          branchId:  log.adHocBranchId,
          subjectId: log.adHocSubjectId,
          teacherId: log.actualTeacherId,
          dayOfWeek,
          startTime,
          isActive: true,
        },
      })
      if (duplicate) {
        return {
          created: false,
          dayOfWeek,
          conflictReason: `Jadwal identik sudah ada (${dayOfWeek} ${startTime}).`,
        }
      }

      // --- Conflict check 2: time overlap for the same teacher on same day ---
      const teacherSessions = await this.prisma.session.findMany({
        where: { teacherId: log.actualTeacherId, dayOfWeek, isActive: true },
      })

      const newStart = this.adHocTimeToMinutes(startTime)
      const newEnd   = newStart + duration

      for (const s of teacherSessions) {
        const eStart = this.adHocTimeToMinutes(s.startTime)
        const eEnd   = eStart + s.durationMinutes
        if (newStart < eEnd && newEnd > eStart) {
          return {
            created: false,
            dayOfWeek,
            conflictReason: `Guru sudah memiliki sesi di hari ${dayOfWeek} jam ${s.startTime} (durasi ${s.durationMinutes} menit) yang bentrok.`,
          }
        }
      }

      // --- Conflict check 3: same branch + day + overlapping time ---
      const branchSessions = await this.prisma.session.findMany({
        where: { branchId: log.adHocBranchId, dayOfWeek, isActive: true },
      })

      for (const s of branchSessions) {
        const eStart = this.adHocTimeToMinutes(s.startTime)
        const eEnd   = eStart + s.durationMinutes
        if (newStart < eEnd && newEnd > eStart) {
          return {
            created: false,
            dayOfWeek,
            conflictReason: `Cabang sudah memiliki sesi di hari ${dayOfWeek} jam ${s.startTime} yang bentrok di ruangan yang sama.`,
          }
        }
      }

      // --- Fetch subject for capacity ---
      const subject = await this.prisma.subject.findUnique({ where: { id: log.adHocSubjectId } })
      const maxCapacity = sessionType === 'PRIVATE'
        ? (subject?.maxCapacityPrivate ?? 1)
        : (subject?.maxCapacityRegular ?? 3)

      // --- Fetch attendances for this ad-hoc log (all statuses) ---
      const attendances = await this.prisma.attendance.findMany({
        where: { sessionLogId: log.id },
        select: { studentId: true },
      })
      const studentIds = attendances.map(a => a.studentId)

      // --- Only enroll students who have active StudentSubject for this subject ---
      // (guards against non-enrolled students added manually to ad-hoc)
      const validEnrollments = studentIds.length > 0
        ? await this.prisma.studentSubject.findMany({
            where: {
              studentId: { in: studentIds },
              subjectId: log.adHocSubjectId,
              isActive: true,
            },
            select: { studentId: true },
          })
        : []
      const enrollableIds = validEnrollments.map(e => e.studentId)
      const skippedCount  = studentIds.length - enrollableIds.length

      // --- Create session + enroll students in a transaction ---
      const newSession = await this.prisma.$transaction(async tx => {
        const session = await tx.session.create({
          data: {
            branchId:        log.adHocBranchId,
            subjectId:       log.adHocSubjectId,
            teacherId:       log.actualTeacherId,
            type:            sessionType,
            dayOfWeek,
            startTime,
            durationMinutes: duration,
            maxCapacity,
            currentEnrolled: enrollableIds.length,
            createdReason:   'SINGLE',
            status:          'ACTIVE',
            isActive:        true,
            notes:           `Dibuat otomatis dari sesi darurat (log ID: ${log.id})`,
          },
        })

        if (enrollableIds.length > 0) {
          await tx.sessionStudent.createMany({
            data: enrollableIds.map(studentId => ({
              sessionId: session.id,
              studentId,
              joinedAt: new Date(),
              isActive: true,
            })),
            skipDuplicates: true,
          })
        }

        return session
      })

      return {
        created: true,
        sessionId: newSession.id,
        dayOfWeek,
        enrolledCount: enrollableIds.length,
        skippedCount,
      }
    } catch (err: any) {
      // Never propagate — approval should still succeed
      return {
        created: false,
        conflictReason: `Terjadi kesalahan saat membuat jadwal: ${err?.message ?? 'unknown error'}`,
      }
    }
  }

  private adHocTimeToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number)
    return h * 60 + m
  }

  async rejectAdHoc(sessionLogId: string, adminId: string, reason: string) {
    const log = await this.prisma.sessionLog.findUnique({ where: { id: sessionLogId } })
    if (!log) throw new NotFoundException('Session log tidak ditemukan')
    if (!log.isAdHoc) throw new BadRequestException('Hanya sesi darurat yang dapat ditolak di sini')
    if (log.status !== 'PENDING_APPROVAL') {
      throw new BadRequestException(`Status saat ini: ${log.status}. Hanya PENDING_APPROVAL yang bisa ditolak.`)
    }

    const updated = await this.prisma.sessionLog.update({
      relationLoadStrategy: 'join',
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

  /** Batch approve pending ad-hoc logs. Each item is independent: failures/already-processed
   *  items are skipped and reported, the rest proceed. Optional per-item startTime correction.
   *  Schedule generation stays a single-item action (not available in batch). */
  async approveAdHocBatch(items: { sessionLogId: string; startTime?: string }[], adminId: string) {
    const approved: string[] = []
    const skipped: { sessionLogId: string; reason: string }[] = []

    for (const item of items) {
      try {
        // Delegate validation + the atomic status/time write to approveAdHoc.
        // The startTime correction is folded into approveAdHoc's own COMPLETED
        // update, so a failed approval never leaves a mutated adHocStartTime behind.
        await this.approveAdHoc(item.sessionLogId, adminId, { startTimeCorrection: item.startTime })
        approved.push(item.sessionLogId)
      } catch (err: any) {
        skipped.push({ sessionLogId: item.sessionLogId, reason: err?.message ?? 'unknown error' })
      }
    }

    return {
      success: true,
      data: { approved, skipped },
      message: `${approved.length} sesi disetujui${skipped.length ? `, ${skipped.length} dilewati` : ''}.`,
    }
  }

  /** Batch reject pending ad-hoc logs with a shared reason. Same skip semantics as approveAdHocBatch. */
  async rejectAdHocBatch(sessionLogIds: string[], adminId: string, reason?: string) {
    const rejected: string[] = []
    const skipped: { sessionLogId: string; reason: string }[] = []
    const finalReason = reason?.trim() || 'Ditolak melalui aksi batch oleh admin'

    for (const id of sessionLogIds) {
      try {
        await this.rejectAdHoc(id, adminId, finalReason)
        rejected.push(id)
      } catch (err: any) {
        skipped.push({ sessionLogId: id, reason: err?.message ?? 'unknown error' })
      }
    }

    return {
      success: true,
      data: { rejected, skipped },
      message: `${rejected.length} sesi ditolak${skipped.length ? `, ${skipped.length} dilewati` : ''}.`,
    }
  }

  async getEligibleStudents(branchId: string, subjectId: string) {
    // Students at branch who are enrolled in the given subject
    const studentSubjects = await this.prisma.studentSubject.findMany({
      relationLoadStrategy: 'join',
      where: {
        subjectId,
        isActive: true,
        student: { branchId, isActive: true },
      },
      include: {
        student: { select: { id: true, name: true, sureName: true, classLevel: true } },
      },
    })

    return {
      success: true,
      data: studentSubjects.map(ss => ({
        studentId: ss.studentId,
        studentName: ss.student.sureName?.trim() || ss.student.name,
        fullName: ss.student.name,
        classLevel: ss.student.classLevel,
      })),
    }
  }

  async getSessionLogById(sessionLogId: string) {
    const log = await this.prisma.sessionLog.findUnique({
      relationLoadStrategy: 'join',
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
      relationLoadStrategy: 'join',
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
