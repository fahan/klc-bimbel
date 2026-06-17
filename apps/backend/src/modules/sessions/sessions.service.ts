import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common'
import { PrismaService } from '@/prisma/prisma.service'
import { CreateSessionDto } from './dto/create-session.dto'
import { CreateBulkSessionsDto } from './dto/create-bulk-sessions.dto'
import { UpdateSessionDto } from './dto/update-session.dto'
import { UpdateSessionWithStudentsDto } from './dto/update-session-with-students.dto'
import { PaginationMeta } from '@/common/dto/pagination.dto'
import { GenerateRecommendationDto } from './dto/generate-recommendation.dto'
import { ApplyRecommendationDto } from './dto/apply-recommendation.dto'
import {
  buildRecommendation,
  planApply,
  timeToMinutes as engineTimeToMinutes,
} from './recommendation/recommendation.engine'
import {
  BusySlot,
  DemandItem,
  EngineDayOfWeek,
  EngineSessionType,
  StudentBusySlot,
} from './recommendation/recommendation.types'

@Injectable()
export class SessionsService {
  constructor(private prisma: PrismaService) {}

  async findAll(
    page: number = 1,
    limit: number = 10,
    filters?: { branchId?: string; teacherId?: string; subjectId?: string; dayOfWeek?: string },
  ) {
    const skip = (page - 1) * limit

    const [sessions, total] = await Promise.all([
      this.prisma.session.findMany({
        // Single JOIN for relations instead of one query per relation.
        relationLoadStrategy: 'join',
        where: {
          isActive: true,
          ...(filters?.branchId && { branchId: filters.branchId }),
          ...(filters?.teacherId && { teacherId: filters.teacherId }),
          ...(filters?.subjectId && { subjectId: filters.subjectId }),
          ...(filters?.dayOfWeek && { dayOfWeek: filters.dayOfWeek as any }),
        },
        include: {
          branch: true,
          subject: true,
          teacher: true,
          studentSessions: {
            where: { isActive: true },
            include: {
              student: true,
            },
          },
        },
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
        skip,
        take: limit,
      }),
      this.prisma.session.count({
        where: {
          isActive: true,
          ...(filters?.branchId && { branchId: filters.branchId }),
          ...(filters?.teacherId && { teacherId: filters.teacherId }),
          ...(filters?.subjectId && { subjectId: filters.subjectId }),
          ...(filters?.dayOfWeek && { dayOfWeek: filters.dayOfWeek as any }),
        },
      }),
    ])

    const totalPages = Math.ceil(total / limit)
    const pagination: PaginationMeta = {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    }

    return {
      success: true,
      data: sessions.map(s => this.formatSession(s)),
      pagination,
    }
  }

  async findOne(id: string) {
    const session = await this.prisma.session.findUnique({
      relationLoadStrategy: 'join',
      where: { id },
      include: {
        branch: true,
        subject: true,
        teacher: true,
        studentSessions: {
          where: { isActive: true },
          include: {
            student: true,
          },
        },
      },
    })

    if (!session) {
      throw new NotFoundException('Session not found')
    }

    return {
      success: true,
      data: this.formatSession(session),
    }
  }

  async findTodaySessionsForTeacher(teacherId: string) {
    // Get day of week today
    const today = new Date()
    const days = ['MINGGU', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU']
    const todayDow = days[today.getDay()]

    const sessions = await this.prisma.session.findMany({
      relationLoadStrategy: 'join',
      where: {
        teacherId,
        dayOfWeek: todayDow as any,
        isActive: true,
      },
      include: {
        branch: true,
        subject: true,
        teacher: true,
        studentSessions: {
          where: { isActive: true },
          include: {
            student: true,
          },
        },
        sessionLogs: {
          where: {
            sessionDate: {
              gte: new Date(today.setHours(0, 0, 0, 0)),
              lt: new Date(today.setHours(23, 59, 59, 999)),
            },
          },
        },
      },
      orderBy: { startTime: 'asc' },
    })

    return {
      success: true,
      data: sessions.map(s => ({
        ...this.formatSession(s),
        sessionLog: (s as any).sessionLogs?.[0] || null,
      })),
    }
  }

  async findAvailableForSubstitution(
    userId: string,
    filters?: {
      branchId?: string
      searchType?: 'guru' | 'siswa'
      searchQuery?: string
    },
  ) {
    // Get today's day of week
    const today = new Date()
    const days = ['MINGGU', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU']
    const todayDow = days[today.getDay()]

    // Determine branch: default to user's primary branch
    let queryBranchId = filters?.branchId
    if (!queryBranchId) {
      const primaryBranch = await this.prisma.userBranch.findFirst({
        where: { userId, isPrimary: true },
        select: { branchId: true },
      })
      queryBranchId = primaryBranch?.branchId
    }

    let whereClause: any = {
      dayOfWeek: todayDow as any,
      isActive: true,
      branchId: queryBranchId,
      teacherId: { not: userId }, // Exclude user's own sessions
    }

    // Search by Guru Name
    if (filters?.searchType === 'guru' && filters?.searchQuery) {
      whereClause.teacher = {
        name: { contains: filters.searchQuery, mode: 'insensitive' },
      }
    }

    // Search by Siswa
    if (filters?.searchType === 'siswa' && filters?.searchQuery) {
      whereClause.sessionStudents = {
        some: {
          isActive: true,
          student: {
            OR: [
              { name: { contains: filters.searchQuery, mode: 'insensitive' } },
              { studentNumber: { contains: filters.searchQuery, mode: 'insensitive' } },
            ],
          },
        },
      }
    }

    const sessions = await this.prisma.session.findMany({
      relationLoadStrategy: 'join',
      where: whereClause,
      include: {
        branch: true,
        subject: true,
        teacher: { select: { id: true, name: true } },
        studentSessions: {
          where: { isActive: true },
          include: { student: { select: { id: true, name: true, sureName: true } } },
        },
      },
      orderBy: [{ startTime: 'asc' }],
    })

    return {
      success: true,
      data: sessions.map(s => ({
        ...this.formatSession(s),
        scheduledTeacherId: s.teacherId,
        scheduledTeacherName: s.teacher.name,
        studentCount: s.studentSessions.length,
        studentList: s.studentSessions.map(ss => ss.student.sureName?.trim() || ss.student.name),
      })),
    }
  }

  async create(createSessionDto: CreateSessionDto) {
    // Verify branch
    const branch = await this.prisma.branch.findUnique({
      where: { id: createSessionDto.branchId },
    })
    if (!branch) throw new BadRequestException('Branch not found')

    // Verify subject
    const subject = await this.prisma.subject.findUnique({
      where: { id: createSessionDto.subjectId },
    })
    if (!subject) throw new BadRequestException('Subject not found')

    // Verify teacher exists and is a GURU
    const teacher = await this.prisma.user.findUnique({
      where: { id: createSessionDto.teacherId },
    })
    if (!teacher) throw new BadRequestException('Teacher not found')
    if (teacher.role !== 'GURU') {
      throw new BadRequestException('Selected user is not a teacher')
    }

    // Check for duplicate session (same branch, subject, teacher, day, time)
    const duplicateSession = await this.prisma.session.findFirst({
      where: {
        branchId: createSessionDto.branchId,
        subjectId: createSessionDto.subjectId,
        teacherId: createSessionDto.teacherId,
        dayOfWeek: createSessionDto.dayOfWeek as any,
        startTime: createSessionDto.startTime,
        isActive: true,
      },
    })

    if (duplicateSession) {
      throw new BadRequestException(
        `Jadwal sesi dengan kombinasi cabang, mata pelajaran, guru, hari, dan jam yang sama sudah ada`,
      )
    }

    // Check for time conflicts (same teacher, same day, overlapping times)
    const existingSessions = await this.prisma.session.findMany({
      where: {
        teacherId: createSessionDto.teacherId,
        dayOfWeek: createSessionDto.dayOfWeek as any,
        isActive: true,
      },
    })

    const newStart = this.timeToMinutes(createSessionDto.startTime)
    const newEnd = newStart + createSessionDto.durationMinutes

    for (const existing of existingSessions) {
      const existingStart = this.timeToMinutes(existing.startTime)
      const existingEnd = existingStart + existing.durationMinutes

      // Check overlap
      if (newStart < existingEnd && newEnd > existingStart) {
        throw new BadRequestException(
          `Teacher already has a session at this time (${existing.startTime} for ${existing.durationMinutes} min)`,
        )
      }
    }

    // Handle student assignment (if any)
    const studentIds = createSessionDto.studentIds ?? []

    // Calculate max capacity
    const maxCapacity =
      createSessionDto.type === 'REGULAR'
        ? subject.maxCapacityRegular || 3
        : subject.maxCapacityPrivate || 1

    // Validate student count doesn't exceed capacity
    if (studentIds.length > maxCapacity) {
      throw new BadRequestException(
        `Number of students (${studentIds.length}) exceeds capacity (${maxCapacity})`,
      )
    }

    // Validate students if any provided
    if (studentIds.length > 0) {
      const students = await this.prisma.student.findMany({
        where: { id: { in: studentIds } },
      })

      if (students.length !== studentIds.length) {
        throw new BadRequestException('One or more students not found')
      }

      // Check all students are from same branch
      const allSameBranch = students.every(s => s.branchId === createSessionDto.branchId)
      if (!allSameBranch) {
        throw new BadRequestException('All students must be from the same branch as the session')
      }

      // Check no duplicates
      if (new Set(studentIds).size !== studentIds.length) {
        throw new BadRequestException('Duplicate student IDs in request')
      }

      // Note: We don't check if student is already enrolled in this subject
      // because students can attend multiple sessions of the same subject.
      // Uniqueness per session is handled by studentSessions table.
    }

    // Create session with optional student assignment in transaction
    let session
    try {
      session = await this.prisma.$transaction(async (tx) => {
        const newSession = await tx.session.create({
          relationLoadStrategy: 'join',
          data: {
            branchId: createSessionDto.branchId,
            subjectId: createSessionDto.subjectId,
            teacherId: createSessionDto.teacherId,
            type: createSessionDto.type as any,
            dayOfWeek: createSessionDto.dayOfWeek as any,
            startTime: createSessionDto.startTime,
            durationMinutes: createSessionDto.durationMinutes,
            isActive: true,
          },
          include: {
            branch: true,
            subject: true,
            teacher: true,
            studentSessions: {
              where: { isActive: true },
              include: { student: true },
            },
          },
        })

      // Assign students if any
      if (studentIds.length > 0) {
        // Get current SPP rate
        const now = new Date()
        const sppRate = await tx.sppRate.findFirst({
          where: {
            subjectId: createSessionDto.subjectId,
            type: createSessionDto.type as any,
            effectiveFrom: { lte: now },
            OR: [{ effectiveUntil: null }, { effectiveUntil: { gte: now } }],
          },
          orderBy: { effectiveFrom: 'desc' },
        })

        if (!sppRate) {
          throw new BadRequestException(
            `No active SPP rate for subject (${createSessionDto.type})`,
          )
        }

        // Check which students already have StudentSubject enrollment
        const existingEnrollments = await tx.studentSubject.findMany({
          where: {
            studentId: { in: studentIds },
            subjectId: createSessionDto.subjectId,
          },
        })
        const existingStudentIds = new Set(existingEnrollments.map(e => e.studentId))
        const newStudentIds = studentIds.filter(id => !existingStudentIds.has(id))

        // Create StudentSubject entries only for new students
        if (newStudentIds.length > 0) {
          await Promise.all(
            newStudentIds.map(studentId =>
              tx.studentSubject.create({
                data: {
                  studentId,
                  subjectId: createSessionDto.subjectId,
                  type: createSessionDto.type as any,
                  sppRateId: sppRate.id,
                  enrolledAt: new Date(),
                  isActive: true,
                },
              }),
            ),
          )
        }

        // Create SessionStudent entries for all students
        // (both newly enrolled and already enrolled)
        await Promise.all(
          studentIds.map(studentId =>
            tx.sessionStudent.create({
              data: {
                sessionId: newSession.id,
                studentId,
                joinedAt: new Date(),
                isActive: true,
              },
            }),
          ),
        )
      }

      return newSession
      })
    } catch (error: any) {
      // Handle unique constraint violation (duplicate session)
      if (error.code === 'P2002' && error.meta?.target?.includes('startTime')) {
        throw new BadRequestException(
          'Jadwal sesi dengan kombinasi cabang, mata pelajaran, guru, hari, dan jam yang sama sudah ada',
        )
      }
      throw error
    }

    return {
      success: true,
      data: this.formatSession(session),
      message: 'Session created successfully',
    }
  }

  async bulkCreate(createBulkDto: CreateBulkSessionsDto) {
    // Verify branch
    const branch = await this.prisma.branch.findUnique({
      where: { id: createBulkDto.branchId },
    })
    if (!branch) throw new BadRequestException('Branch not found')

    // Verify subject
    const subject = await this.prisma.subject.findUnique({
      where: { id: createBulkDto.subjectId },
    })
    if (!subject) throw new BadRequestException('Subject not found')

    // Verify teacher exists and is a GURU
    const teacher = await this.prisma.user.findUnique({
      where: { id: createBulkDto.teacherId },
    })
    if (!teacher) throw new BadRequestException('Teacher not found')
    if (teacher.role !== 'GURU') {
      throw new BadRequestException('Selected user is not a teacher')
    }

    // Verify active SPP rate exists
    const now = new Date()
    const sppRate = await this.prisma.sppRate.findFirst({
      where: {
        subjectId: createBulkDto.subjectId,
        type: createBulkDto.type as any,
        effectiveFrom: { lte: now },
        OR: [{ effectiveUntil: null }, { effectiveUntil: { gte: now } }],
      },
    })
    if (!sppRate) {
      throw new BadRequestException(`No active SPP rate for subject (${createBulkDto.type})`)
    }

    // Pre-validate all sessions - check conflicts with existing sessions and within request
    await this.validateBulkSessions(createBulkDto)

    // Validate students per session if any provided
    const maxCapacity =
      createBulkDto.type === 'REGULAR'
        ? subject.maxCapacityRegular || 3
        : subject.maxCapacityPrivate || 1

    for (let i = 0; i < createBulkDto.sessions.length; i++) {
      const sessionItem = createBulkDto.sessions[i]
      const studentIds = sessionItem.studentIds ?? []

      if (studentIds.length > maxCapacity) {
        throw new BadRequestException(
          `Session ${i + 1} (${sessionItem.dayOfWeek} ${sessionItem.startTime}): student count (${studentIds.length}) exceeds capacity (${maxCapacity})`,
        )
      }

      if (studentIds.length > 0) {
        const students = await this.prisma.student.findMany({
          where: { id: { in: studentIds } },
        })

        if (students.length !== studentIds.length) {
          throw new BadRequestException(
            `Session ${i + 1}: one or more students not found`,
          )
        }

        const allSameBranch = students.every(s => s.branchId === createBulkDto.branchId)
        if (!allSameBranch) {
          throw new BadRequestException(
            `Session ${i + 1}: all students must be from the same branch`,
          )
        }

        if (new Set(studentIds).size !== studentIds.length) {
          throw new BadRequestException(`Session ${i + 1}: duplicate student IDs`)
        }
      }
    }

    // Create all sessions in transaction (with extended timeout for sequential operations)
    let createdSessions
    try {
      createdSessions = await this.prisma.$transaction(
        async (tx) => {
        const sessions = []

        for (const sessionItem of createBulkDto.sessions) {
          const newSession = await tx.session.create({
            relationLoadStrategy: 'join',
            data: {
              branchId: createBulkDto.branchId,
              subjectId: createBulkDto.subjectId,
              teacherId: createBulkDto.teacherId,
              type: createBulkDto.type as any,
              dayOfWeek: sessionItem.dayOfWeek as any,
              startTime: sessionItem.startTime,
              durationMinutes: createBulkDto.durationMinutes,
              isActive: true,
            },
            include: {
              branch: true,
              subject: true,
              teacher: true,
              studentSessions: {
                where: { isActive: true },
                include: { student: true },
              },
            },
          })

        const studentIds = sessionItem.studentIds ?? []

        // Assign students if any
        if (studentIds.length > 0) {
          const existingEnrollments = await tx.studentSubject.findMany({
            where: {
              studentId: { in: studentIds },
              subjectId: createBulkDto.subjectId,
            },
          })
          const existingStudentIds = new Set(existingEnrollments.map(e => e.studentId))
          const newStudentIds = studentIds.filter(id => !existingStudentIds.has(id))

          // Create StudentSubject entries only for new students (sequential to avoid transaction issues)
          for (const studentId of newStudentIds) {
            await tx.studentSubject.create({
              data: {
                studentId,
                subjectId: createBulkDto.subjectId,
                type: createBulkDto.type as any,
                sppRateId: sppRate.id,
                enrolledAt: new Date(),
                isActive: true,
              },
            })
          }

          // Create SessionStudent entries for all students (sequential to avoid transaction issues)
          for (const studentId of studentIds) {
            await tx.sessionStudent.create({
              data: {
                sessionId: newSession.id,
                studentId,
                joinedAt: new Date(),
                isActive: true,
              },
            })
          }
        }

        sessions.push(newSession)
      }

      return sessions
      },
        { timeout: 30000 }, // 30 second timeout for bulk operations
      )
    } catch (error: any) {
      // Handle unique constraint violation (duplicate session)
      if (error.code === 'P2002' && error.meta?.target?.includes('startTime')) {
        throw new BadRequestException(
          'Satu atau lebih jadwal sesi dengan kombinasi cabang, mata pelajaran, guru, hari, dan jam yang sama sudah ada',
        )
      }
      throw error
    }

    const totalStudents = createdSessions.reduce(
      (sum, s) => sum + (s.studentSessions?.length || 0),
      0,
    )

    return {
      success: true,
      data: {
        branchId: createBulkDto.branchId,
        branchName: branch.name,
        branchCode: branch.code,
        subjectId: createBulkDto.subjectId,
        subjectName: subject.name,
        subjectCode: subject.code,
        teacherId: createBulkDto.teacherId,
        teacherName: teacher.name,
        type: createBulkDto.type,
        sessionsCreated: createdSessions.length,
        sessions: createdSessions.map(s => this.formatSession(s)),
        totalStudentsEnrolled: totalStudents,
      },
      message: `${createdSessions.length} sesi berhasil dibuat`,
    }
  }

  async createCombined(createCombinedDto: any, userId?: string) {
    // VALIDATION: Exactly 2 subjects required
    if (createCombinedDto.subjects.length !== 2) {
      throw new BadRequestException(
        'Combined session harus memiliki tepat 2 mata pelajaran. Jika hanya 1 mata pelajaran, gunakan single session.',
      )
    }

    // Verify branch
    const branch = await this.prisma.branch.findUnique({
      where: { id: createCombinedDto.branchId },
    })
    if (!branch) throw new BadRequestException('Branch not found')

    // Verify teacher exists and is a GURU
    const teacher = await this.prisma.user.findUnique({
      where: { id: createCombinedDto.teacherId },
    })
    if (!teacher) throw new BadRequestException('Teacher not found')
    if (teacher.role !== 'GURU') {
      throw new BadRequestException('Selected user is not a teacher')
    }

    // Note: Skip validateTeacherTimeSlot for combined sessions
    // Combined sessions intentionally have the teacher teaching 2 subjects at the same time
    // The database unique constraint (teacherId, dayOfWeek, startTime) will catch conflicts with OTHER sessions
    // since both sessions in the combined pair will fail to insert if that time slot is already taken

    // Validate no duplicate subject
    const subjectIds = createCombinedDto.subjects.map((s: any) => s.subjectId)
    if (new Set(subjectIds).size !== subjectIds.length) {
      throw new BadRequestException('Tidak boleh ada mata pelajaran yang sama 2x dalam sesi gabungan')
    }

    // Fetch all subjects and validate
    const subjects = await this.prisma.subject.findMany({
      where: { id: { in: subjectIds } },
    })
    if (subjects.length !== 2) {
      throw new BadRequestException('One or more subjects not found')
    }

    // Calculate capacity: MIN of all subjects' capacities
    const capacities = createCombinedDto.subjects.map((s: any) => {
      const maxCap = s.type === 'REGULAR' ? 2 : 1
      const subject = subjects.find(subj => subj.id === s.subjectId)
      return {
        subject: subject?.name || s.subjectId,
        type: s.type,
        capacity: maxCap,
      }
    })

    const minCapacity = Math.min(...capacities.map((c: any) => c.capacity))

    // Calculate total enrolled students from request
    const totalEnrolledRequested = createCombinedDto.subjects.reduce(
      (sum: number, s: any) => sum + (s.studentIds?.length || 0),
      0,
    )

    // VALIDATE: Total enrolled must not exceed MIN capacity
    if (totalEnrolledRequested > minCapacity) {
      throw new BadRequestException({
        code: 'CAPACITY_MISMATCH',
        message: `Jumlah siswa (${totalEnrolledRequested}) melebihi kapasitas minimum (${minCapacity})`,
        minCapacity,
        totalEnrolled: totalEnrolledRequested,
        breakdown: capacities,
      })
    }

    // Validate students
    for (let i = 0; i < createCombinedDto.subjects.length; i++) {
      const subject = createCombinedDto.subjects[i]
      const studentIds = subject.studentIds ?? []

      if (studentIds.length > 0) {
        const students = await this.prisma.student.findMany({
          where: { id: { in: studentIds } },
        })

        if (students.length !== studentIds.length) {
          throw new BadRequestException(`Subject ${i + 1}: one or more students not found`)
        }

        const allSameBranch = students.every(s => s.branchId === createCombinedDto.branchId)
        if (!allSameBranch) {
          throw new BadRequestException(`Subject ${i + 1}: all students must be from same branch`)
        }

        if (new Set(studentIds).size !== studentIds.length) {
          throw new BadRequestException(`Subject ${i + 1}: duplicate student IDs`)
        }
      }
    }

    // Create combined sessions in transaction
    // sessionGroupId is a FK to Session.id — first session becomes the parent,
    // subsequent sessions point to it via sessionGroupId.
    let createdSessions: any[] = []
    let sessionGroupId: string | null = null
    try {
      createdSessions = await this.prisma.$transaction(
        async (tx) => {
          const sessions = []

          for (let idx = 0; idx < createCombinedDto.subjects.length; idx++) {
            const subject = createCombinedDto.subjects[idx]
            const subjectRecord = subjects.find(s => s.id === subject.subjectId)

            const newSession = await tx.session.create({
              relationLoadStrategy: 'join',
              data: {
                branchId: createCombinedDto.branchId,
                subjectId: subject.subjectId,
                teacherId: createCombinedDto.teacherId,
                type: subject.type as any,
                dayOfWeek: createCombinedDto.dayOfWeek as any,
                startTime: createCombinedDto.startTime,
                durationMinutes: createCombinedDto.durationMinutes,
                // First session is the parent (no sessionGroupId);
                // subsequent sessions reference the parent's id.
                sessionGroupId: idx === 0 ? null : sessionGroupId,
                groupSize: 2,
                maxCapacity: minCapacity,
                createdReason: 'COMBINED_2SUBJECTS',
                createdBy: userId,
                notes: `Combined dengan ${createCombinedDto.subjects.length} mata pelajaran. Kapasitas MIN = ${minCapacity}`,
                isActive: true,
              },
              include: {
                branch: true,
                subject: true,
                teacher: true,
                studentSessions: {
                  where: { isActive: true },
                  include: { student: true },
                },
              },
            })

            // First session becomes the group parent — capture its id
            if (idx === 0) {
              sessionGroupId = newSession.id
            }

            // Enroll students if provided
            const studentIds = subject.studentIds ?? []
            if (studentIds.length > 0) {
              // Get current SPP rate
              const now = new Date()
              const sppRate = await tx.sppRate.findFirst({
                where: {
                  subjectId: subject.subjectId,
                  type: subject.type as any,
                  effectiveFrom: { lte: now },
                  OR: [{ effectiveUntil: null }, { effectiveUntil: { gte: now } }],
                },
                orderBy: { effectiveFrom: 'desc' },
              })

              if (!sppRate) {
                throw new BadRequestException(`No active SPP rate for subject ${idx + 1} (${subject.type})`)
              }

              // Check which students already have StudentSubject enrollment
              const existingEnrollments = await tx.studentSubject.findMany({
                where: {
                  studentId: { in: studentIds },
                  subjectId: subject.subjectId,
                },
              })
              const existingStudentIds = new Set(existingEnrollments.map(e => e.studentId))
              const newStudentIds = studentIds.filter((id: string) => !existingStudentIds.has(id))

              // Create StudentSubject entries only for new students
              for (const studentId of newStudentIds) {
                await tx.studentSubject.create({
                  data: {
                    studentId,
                    subjectId: subject.subjectId,
                    type: subject.type as any,
                    sppRateId: sppRate.id,
                    enrolledAt: new Date(),
                    isActive: true,
                  },
                })
              }

              // Create SessionStudent entries for all students
              for (const studentId of studentIds) {
                await tx.sessionStudent.create({
                  data: {
                    sessionId: newSession.id,
                    studentId,
                    joinedAt: new Date(),
                    isActive: true,
                  },
                })
              }

              // Update currentEnrolled
              await tx.session.update({
                where: { id: newSession.id },
                data: { currentEnrolled: studentIds.length },
              })
            }

            sessions.push(newSession)
          }

          // Create audit log
          if (sessions.length > 0) {
            await tx.sessionAuditLog.create({
              data: {
                sessionId: sessions[0].id,
                action: 'CREATE_COMBINED',
                performedBy: userId,
                reason: 'Efficiency: Combine multiple subjects',
                details: {
                  sessionGroupId,
                  subjectsCount: createCombinedDto.subjects.length,
                  minCapacity,
                  totalCapacity: minCapacity,
                  subjects: createCombinedDto.subjects.map((s: any, i: number) => ({
                    name: s.subjectId,
                    type: s.type,
                    enrolled: s.studentIds?.length || 0,
                  })),
                },
              },
            })
          }

          return sessions
        },
        { timeout: 30000 },
      )
    } catch (error: any) {
      if (error.code === 'P2002' && error.meta?.target?.includes('startTime')) {
        throw new BadRequestException(
          'Guru sudah memiliki sesi pada hari dan jam yang sama',
        )
      }
      throw error
    }

    return {
      success: true,
      data: {
        sessionGroupId,
        subjects: createdSessions.map((s) => ({
          id: s.id,
          subject: s.subject.name,
          type: s.type,
          subjectCapacity: capacities.find((c: any) => c.subject === s.subject.name)?.capacity || minCapacity,
        })),
        minCapacity,
        totalEnrolled: totalEnrolledRequested,
        message: `Sesi gabungan berhasil dibuat. Kapasitas: ${minCapacity} siswa`,
      },
    }
  }

  private async validateTeacherTimeSlot(
    teacherId: string,
    dayOfWeek: string,
    startTime: string,
    durationMinutes: number,
  ): Promise<void> {
    const existingSessions = await this.prisma.session.findMany({
      where: {
        teacherId,
        dayOfWeek: dayOfWeek as any,
        isActive: true,
        status: 'ACTIVE', // Only count ACTIVE sessions, not CANCELLED/ARCHIVED
      },
    })

    const newStart = this.timeToMinutes(startTime)
    const newEnd = newStart + durationMinutes

    for (const existing of existingSessions) {
      const existingStart = this.timeToMinutes(existing.startTime)
      const existingEnd = existingStart + existing.durationMinutes

      if (newStart < existingEnd && newEnd > existingStart) {
        throw new BadRequestException(
          `Guru sudah memiliki sesi pada ${dayOfWeek} ${existing.startTime}-${this.minutesToTime(this.timeToMinutes(existing.startTime) + existing.durationMinutes)}`,
        )
      }
    }
  }

  private async validateBulkSessions(createBulkDto: CreateBulkSessionsDto): Promise<void> {
    // Check for duplicates within the request
    for (let i = 0; i < createBulkDto.sessions.length; i++) {
      for (let j = i + 1; j < createBulkDto.sessions.length; j++) {
        const session1 = createBulkDto.sessions[i]
        const session2 = createBulkDto.sessions[j]

        if (
          session1.dayOfWeek === session2.dayOfWeek &&
          this.timeRangesOverlap(
            session1.startTime,
            session2.startTime,
            createBulkDto.durationMinutes,
          )
        ) {
          throw new BadRequestException(
            `Sesi ${i + 1} dan ${j + 1} bentrok waktu (${session1.dayOfWeek} ${session1.startTime})`,
          )
        }
      }
    }

    // Check for conflicts with existing sessions and duplicates
    const existingSessions = await this.prisma.session.findMany({
      where: {
        teacherId: createBulkDto.teacherId,
        isActive: true,
        status: 'ACTIVE', // Only count ACTIVE sessions, not CANCELLED/ARCHIVED
      },
    })

    for (let i = 0; i < createBulkDto.sessions.length; i++) {
      const newSession = createBulkDto.sessions[i]

      for (const existing of existingSessions) {
        if (existing.dayOfWeek !== newSession.dayOfWeek) {
          continue
        }

        // Check for exact duplicate (same branch, subject, teacher, day, time)
        if (
          existing.branchId === createBulkDto.branchId &&
          existing.subjectId === createBulkDto.subjectId &&
          existing.startTime === newSession.startTime
        ) {
          throw new BadRequestException(
            `Sesi ${i + 1}: Jadwal sesi dengan kombinasi cabang, mata pelajaran, guru, hari, dan jam yang sama sudah ada (${newSession.dayOfWeek} ${newSession.startTime})`,
          )
        }

        if (
          this.timeRangesOverlap(
            existing.startTime,
            newSession.startTime,
            createBulkDto.durationMinutes,
            existing.durationMinutes,
          )
        ) {
          throw new BadRequestException(
            `Guru sudah memiliki sesi pada ${existing.dayOfWeek} ${existing.startTime}-${this.minutesToTime(this.timeToMinutes(existing.startTime) + existing.durationMinutes)}`,
          )
        }
      }
    }
  }

  private timeRangesOverlap(
    start1: string,
    start2: string,
    duration1: number,
    duration2?: number,
  ): boolean {
    const time1 = this.timeToMinutes(start1)
    const time2 = this.timeToMinutes(start2)
    const end1 = time1 + duration1
    const end2 = time2 + (duration2 ?? duration1)

    return time1 < end2 && time2 < end1
  }

  private minutesToTime(minutes: number): string {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
  }

  async update(id: string, updateSessionDto: UpdateSessionDto) {
    const session = await this.prisma.session.findUnique({
      where: { id },
    })
    if (!session) throw new NotFoundException('Session not found')

    // If teacher/day/time changes, check conflicts
    if (
      updateSessionDto.teacherId ||
      updateSessionDto.dayOfWeek ||
      updateSessionDto.startTime ||
      updateSessionDto.durationMinutes
    ) {
      const teacherId = updateSessionDto.teacherId ?? session.teacherId
      const dayOfWeek = (updateSessionDto.dayOfWeek ?? session.dayOfWeek) as any
      const startTime = updateSessionDto.startTime ?? session.startTime
      const durationMinutes = updateSessionDto.durationMinutes ?? session.durationMinutes

      const existingSessions = await this.prisma.session.findMany({
        where: {
          teacherId,
          dayOfWeek,
          isActive: true,
          status: 'ACTIVE', // Only count ACTIVE sessions, not CANCELLED/ARCHIVED
          NOT: { id },
        },
      })

      const newStart = this.timeToMinutes(startTime)
      const newEnd = newStart + durationMinutes

      for (const existing of existingSessions) {
        const existingStart = this.timeToMinutes(existing.startTime)
        const existingEnd = existingStart + existing.durationMinutes

        if (newStart < existingEnd && newEnd > existingStart) {
          throw new BadRequestException(
            `Teacher already has a session at this time (${existing.startTime})`,
          )
        }
      }
    }

    const updated = await this.prisma.session.update({
      relationLoadStrategy: 'join',
      where: { id },
      data: {
        branchId: updateSessionDto.branchId ?? session.branchId,
        subjectId: updateSessionDto.subjectId ?? session.subjectId,
        teacherId: updateSessionDto.teacherId ?? session.teacherId,
        type: (updateSessionDto.type ?? session.type) as any,
        dayOfWeek: (updateSessionDto.dayOfWeek ?? session.dayOfWeek) as any,
        startTime: updateSessionDto.startTime ?? session.startTime,
        durationMinutes: updateSessionDto.durationMinutes ?? session.durationMinutes,
        isActive: updateSessionDto.isActive ?? session.isActive,
      },
      include: {
        branch: true,
        subject: true,
        teacher: true,
        studentSessions: {
          where: { isActive: true },
          include: { student: true },
        },
      },
    })

    return {
      success: true,
      data: this.formatSession(updated),
      message: 'Session updated successfully',
    }
  }

  async remove(id: string) {
    const session = await this.prisma.session.findUnique({
      relationLoadStrategy: 'join',
      where: { id },
      include: {
        studentSessions: { where: { isActive: true } },
      },
    })

    if (!session) throw new NotFoundException('Session not found')

    if (session.studentSessions.length > 0) {
      throw new BadRequestException(
        `Cannot soft-delete session. ${session.studentSessions.length} student(s) still enrolled. Remove students first.`,
      )
    }

    // Soft delete: set isActive = false (preserves all history)
    await this.prisma.session.update({
      where: { id },
      data: { isActive: false },
    })

    return {
      success: true,
      data: null,
      message: 'Session archived successfully. Schedule history preserved.',
    }
  }

  async hardDelete(id: string) {
    const session = await this.prisma.session.findUnique({
      relationLoadStrategy: 'join',
      where: { id },
      include: {
        studentSessions: { where: { isActive: true } },
        sessionLogs: true, // Check if any session logs exist (past attendance records)
      },
    })

    if (!session) throw new NotFoundException('Session not found')

    if (session.studentSessions.length > 0) {
      throw new BadRequestException(
        `Cannot hard-delete session. ${session.studentSessions.length} student(s) still enrolled. Remove students first.`,
      )
    }

    // Prevent hard delete if session has any session logs (attendance records)
    if (session.sessionLogs && session.sessionLogs.length > 0) {
      throw new BadRequestException(
        `Cannot hard-delete session. This session has ${session.sessionLogs.length} attendance record(s). Sessions with attendance history cannot be permanently deleted.`,
      )
    }

    // Only hard delete if session has no students and no attendance records
    await this.prisma.session.delete({
      where: { id },
    })

    return {
      success: true,
      data: null,
      message: 'Session permanently deleted (no recovery possible).',
    }
  }

  async updateSessionWithStudents(id: string, updateDto: UpdateSessionWithStudentsDto) {
    // Verify session exists
    const session = await this.prisma.session.findUnique({
      relationLoadStrategy: 'join',
      where: { id },
      include: {
        branch: true,
        subject: true,
        teacher: true,
        studentSessions: {
          where: { isActive: true },
          include: { student: true },
        },
      },
    })

    if (!session) throw new NotFoundException('Session not found')

    // Get the new subject info if subject is changing
    let newSubject = session.subject
    if (updateDto.subjectId && updateDto.subjectId !== session.subjectId) {
      const foundSubject = await this.prisma.subject.findUnique({
        where: { id: updateDto.subjectId },
      })
      if (!foundSubject) throw new BadRequestException('Subject not found')
      newSubject = foundSubject
    }

    // Get the new type if changing
    const sessionType = updateDto.type ?? session.type

    // Calculate max capacity with new subject/type
    const maxCapacity =
      sessionType === 'REGULAR'
        ? newSubject.maxCapacityRegular || 3
        : newSubject.maxCapacityPrivate || 1

    // Get current students
    const currentStudentIds = session.studentSessions.map(ss => ss.studentId)
    const newStudentIds = updateDto.studentIds ?? []

    // Determine students to add and remove early
    const currentSet = new Set(currentStudentIds)
    const newSet = new Set(newStudentIds)
    const studentsToAdd = newStudentIds.filter(id => !currentSet.has(id))
    const studentsToRemove = currentStudentIds.filter(id => !newSet.has(id))

    // If we're changing subject and have current students, check if they fit in new capacity
    if (updateDto.subjectId && updateDto.subjectId !== session.subjectId && currentStudentIds.length > 0) {
      if (currentStudentIds.length > maxCapacity) {
        throw new BadRequestException(
          `Current students (${currentStudentIds.length}) exceed new subject capacity (${maxCapacity}). Please remove ${currentStudentIds.length - maxCapacity} student(s) first.`,
        )
      }
    }

    // Validate new students count doesn't exceed capacity
    if (newStudentIds.length > maxCapacity) {
      throw new BadRequestException(
        `Number of students (${newStudentIds.length}) exceeds capacity (${maxCapacity})`,
      )
    }

    // Validate newly added students
    if (studentsToAdd.length > 0) {
      const students = await this.prisma.student.findMany({
        where: { id: { in: studentsToAdd } },
      })

      if (students.length !== studentsToAdd.length) {
        throw new BadRequestException('One or more students not found')
      }

      // Check all students are from same branch
      const allSameBranch = students.every(s => s.branchId === session.branchId)
      if (!allSameBranch) {
        throw new BadRequestException('All students must be from the same branch as the session')
      }

      // Check no duplicates in studentsToAdd
      if (new Set(studentsToAdd).size !== studentsToAdd.length) {
        throw new BadRequestException('Duplicate student IDs in request')
      }

      // Check newly added students are not already enrolled in the target subject
      const targetSubjectId = updateDto.subjectId ?? session.subjectId

      // Note: We don't check if student is already in another session of this subject
      // because students can attend multiple sessions of the same subject.
      // Uniqueness per session is handled by studentSessions table.
    }

    // Start transaction: update session + manage students
    const updated = await this.prisma.$transaction(async (tx) => {
      // Update session details
      const updatedSession = await tx.session.update({
        relationLoadStrategy: 'join',
        where: { id },
        data: {
          branchId: updateDto.branchId ?? session.branchId,
          subjectId: updateDto.subjectId ?? session.subjectId,
          teacherId: updateDto.teacherId ?? session.teacherId,
          type: (updateDto.type ?? session.type) as any,
          dayOfWeek: (updateDto.dayOfWeek ?? session.dayOfWeek) as any,
          startTime: updateDto.startTime ?? session.startTime,
          durationMinutes: updateDto.durationMinutes ?? session.durationMinutes,
          isActive: updateDto.isActive ?? session.isActive,
        },
        include: {
          branch: true,
          subject: true,
          teacher: true,
          studentSessions: {
            where: { isActive: true },
            include: { student: true },
          },
        },
      })

      const targetSubjectId = updateDto.subjectId ?? session.subjectId
      const targetType = updateDto.type ?? session.type

      // Add new students
      if (studentsToAdd.length > 0) {
        // Get SPP rate for the target subject and type
        const now = new Date()
        const sppRate = await tx.sppRate.findFirst({
          where: {
            subjectId: targetSubjectId,
            type: targetType as any,
            effectiveFrom: { lte: now },
            OR: [{ effectiveUntil: null }, { effectiveUntil: { gte: now } }],
          },
          orderBy: { effectiveFrom: 'desc' },
        })

        if (!sppRate) {
          throw new BadRequestException(
            `No active SPP rate for target subject (${targetType})`,
          )
        }

        // Check which students already have StudentSubject enrollment
        const existingEnrollments = await tx.studentSubject.findMany({
          where: {
            studentId: { in: studentsToAdd },
            subjectId: targetSubjectId,
          },
        })
        const existingStudentIds = new Set(existingEnrollments.map(e => e.studentId))
        const newStudentIds = studentsToAdd.filter(id => !existingStudentIds.has(id))

        // Create StudentSubject entries only for new students
        if (newStudentIds.length > 0) {
          await Promise.all(
            newStudentIds.map(studentId =>
              tx.studentSubject.create({
                data: {
                  studentId,
                  subjectId: targetSubjectId,
                  type: targetType as any,
                  sppRateId: sppRate.id,
                  enrolledAt: new Date(),
                  isActive: true,
                },
              }),
            ),
          )
        }

        // Create SessionStudent entries for all students being added
        // (both newly enrolled and already enrolled)
        await Promise.all(
          studentsToAdd.map(studentId =>
            tx.sessionStudent.create({
              data: {
                sessionId: id,
                studentId,
                joinedAt: new Date(),
                isActive: true,
              },
            }),
          ),
        )
      }

      // Remove students
      if (studentsToRemove.length > 0) {
        const targetSubjectId = updateDto.subjectId ?? session.subjectId

        // Delete StudentSubject entries
        await tx.studentSubject.deleteMany({
          where: {
            studentId: { in: studentsToRemove },
            subjectId: targetSubjectId,
          },
        })

        // Delete SessionStudent entries
        await tx.sessionStudent.deleteMany({
          where: {
            sessionId: id,
            studentId: { in: studentsToRemove },
          },
        })
      }

      // Return updated session with students
      return updatedSession
    })

    return {
      success: true,
      data: this.formatSession(updated),
      message: 'Session updated with students successfully',
    }
  }

  async generateRecommendation(dto: GenerateRecommendationDto) {
    const branch = await this.prisma.branch.findFirst({
      where: { id: dto.branchId, isActive: true },
    })
    if (!branch) {
      throw new NotFoundException('Cabang tidak ditemukan')
    }

    // Teachers: all active GURU assigned to this branch
    const teacherUsers = await this.prisma.user.findMany({
      where: {
        role: 'GURU',
        isActive: true,
        branches: { some: { branchId: dto.branchId } },
      },
      select: { id: true, name: true },
    })
    const teachers = teacherUsers.map((t) => ({ teacherId: t.id, name: t.name }))

    // Active enrollments for active students in this branch
    const enrollments = await this.prisma.studentSubject.findMany({
      where: {
        status: 'ACTIVE',
        isActive: true,
        student: { branchId: dto.branchId, isActive: true },
      },
      include: {
        student: { select: { id: true, name: true, classLevel: true } },
        subject: {
          select: { id: true, name: true, maxCapacityRegular: true, maxCapacityPrivate: true },
        },
      },
    })

    // For FILL mode, exclude enrollments already scheduled (active SessionStudent for same subject)
    let scheduledPairs = new Set<string>()
    if (dto.mode === 'FILL_UNSCHEDULED') {
      const scheduled = await this.prisma.sessionStudent.findMany({
        where: {
          isActive: true,
          session: { isActive: true, branchId: dto.branchId },
        },
        select: { studentId: true, session: { select: { subjectId: true } } },
      })
      scheduledPairs = new Set(scheduled.map((s) => `${s.studentId}__${s.session.subjectId}`))
    }

    const demand: DemandItem[] = enrollments
      .filter((e) =>
        dto.mode === 'FULL_REGENERATE'
          ? true
          : !scheduledPairs.has(`${e.studentId}__${e.subjectId}`),
      )
      .map((e) => ({
        studentId: e.student.id,
        studentName: e.student.name,
        classLevel: e.student.classLevel ?? null,
        subjectId: e.subject.id,
        subjectName: e.subject.name,
        type: e.type as EngineSessionType,
        maxCapacityRegular: e.subject.maxCapacityRegular,
        maxCapacityPrivate: e.subject.maxCapacityPrivate,
      }))

    // Busy slots: existing active sessions occupy teachers AND their students (FILL mode only)
    const busySlots: BusySlot[] = []
    const studentBusySlots: StudentBusySlot[] = []
    if (dto.mode === 'FILL_UNSCHEDULED') {
      const existing = await this.prisma.session.findMany({
        where: { isActive: true, branchId: dto.branchId },
        select: {
          teacherId: true,
          dayOfWeek: true,
          startTime: true,
          durationMinutes: true,
          studentSessions: { where: { isActive: true }, select: { studentId: true } },
        },
      })
      for (const s of existing) {
        const start = engineTimeToMinutes(s.startTime)
        const end = start + s.durationMinutes
        const dayOfWeek = s.dayOfWeek as EngineDayOfWeek
        busySlots.push({ teacherId: s.teacherId, dayOfWeek, startMinutes: start, endMinutes: end })
        for (const ss of s.studentSessions) {
          studentBusySlots.push({ studentId: ss.studentId, dayOfWeek, startMinutes: start, endMinutes: end })
        }
      }
    }

    const result = buildRecommendation({
      durationMinutes: dto.durationMinutes,
      activeDays: dto.activeDays as EngineDayOfWeek[],
      timeWindow: dto.timeWindow,
      breakWindow: dto.breakWindow ?? null,
      demand,
      teachers,
      busySlots,
      sessionsPerWeek: dto.sessionsPerWeek ?? 1,
      studentBusySlots,
    })

    return {
      success: true,
      data: {
        mode: dto.mode,
        generatedAt: new Date().toISOString(),
        summary: {
          proposedSessions: result.proposals.length,
          studentsPlaced: result.proposals.reduce((n, p) => n + p.studentIds.length, 0),
          teachersUsed: result.teacherLoad.filter((t) => t.sessionCount > 0).length,
          unassigned: result.unassigned.length,
        },
        teacherLoad: result.teacherLoad,
        proposals: result.proposals,
        unassigned: result.unassigned,
      },
    }
  }

  async applyRecommendation(dto: ApplyRecommendationDto) {
    const branch = await this.prisma.branch.findFirst({
      where: { id: dto.branchId, isActive: true },
    })
    if (!branch) {
      throw new NotFoundException('Cabang tidak ditemukan')
    }

    return this.prisma.$transaction(async (tx) => {
      // Snapshot of valid teachers/students for re-validation
      const teachers = await tx.user.findMany({
        where: {
          role: 'GURU',
          isActive: true,
          branches: { some: { branchId: dto.branchId } },
        },
        select: { id: true },
      })
      const students = await tx.student.findMany({
        where: { branchId: dto.branchId, isActive: true },
        select: { id: true },
      })
      const subjects = await tx.subject.findMany({
        select: { id: true, maxCapacityRegular: true, maxCapacityPrivate: true },
      })
      const subjectCapacity: Record<string, { maxCapacityRegular: number; maxCapacityPrivate: number }> = {}
      for (const s of subjects) {
        subjectCapacity[s.id] = {
          maxCapacityRegular: s.maxCapacityRegular,
          maxCapacityPrivate: s.maxCapacityPrivate,
        }
      }

      // FULL_REGENERATE: archive existing active sessions that have NO session logs.
      let archivedSessions = 0
      const preservedSessions: { id: string; reason: string }[] = []
      const remainingBusy: BusySlot[] = []
      const remainingStudentBusy: StudentBusySlot[] = []

      const existing = await tx.session.findMany({
        where: { isActive: true, branchId: dto.branchId },
        select: {
          id: true, teacherId: true, dayOfWeek: true, startTime: true, durationMinutes: true,
          _count: { select: { sessionLogs: true } },
          studentSessions: { where: { isActive: true }, select: { studentId: true } },
        },
      })

      const keepAsBusy = (s: (typeof existing)[number]) => {
        const start = engineTimeToMinutes(s.startTime)
        const end = start + s.durationMinutes
        const dayOfWeek = s.dayOfWeek as EngineDayOfWeek
        remainingBusy.push({ teacherId: s.teacherId, dayOfWeek, startMinutes: start, endMinutes: end })
        for (const ss of s.studentSessions) {
          remainingStudentBusy.push({ studentId: ss.studentId, dayOfWeek, startMinutes: start, endMinutes: end })
        }
      }

      if (dto.mode === 'FULL_REGENERATE') {
        for (const s of existing) {
          if (s._count.sessionLogs > 0) {
            preservedSessions.push({ id: s.id, reason: 'Punya riwayat presensi' })
            keepAsBusy(s)
          } else {
            await tx.session.update({
              where: { id: s.id },
              data: { isActive: false, status: 'ARCHIVED' },
            })
            archivedSessions += 1
          }
        }
      } else {
        // FILL: all existing active sessions remain and occupy teacher + student slots
        for (const s of existing) keepAsBusy(s)
      }

      // Decide which proposals are valid (pure)
      const plan = planApply({
        proposals: dto.proposals.map((p) => ({
          tempId: p.tempId,
          subjectId: p.subjectId,
          type: p.type as EngineSessionType,
          teacherId: p.teacherId,
          dayOfWeek: p.dayOfWeek as EngineDayOfWeek,
          startTime: p.startTime,
          durationMinutes: p.durationMinutes,
          studentIds: p.studentIds,
        })),
        activeTeacherIds: teachers.map((t) => t.id),
        activeStudentIds: students.map((s) => s.id),
        subjectCapacity,
        busySlots: remainingBusy,
        studentBusySlots: remainingStudentBusy,
      })

      // Write accepted proposals
      let applied = 0
      for (const p of plan.toCreate) {
        const capacity =
          p.type === 'REGULAR'
            ? subjectCapacity[p.subjectId].maxCapacityRegular
            : subjectCapacity[p.subjectId].maxCapacityPrivate
        const session = await tx.session.create({
          data: {
            branchId: dto.branchId,
            subjectId: p.subjectId,
            teacherId: p.teacherId,
            type: p.type as any,
            dayOfWeek: p.dayOfWeek as any,
            startTime: p.startTime,
            durationMinutes: p.durationMinutes,
            maxCapacity: capacity,
            currentEnrolled: p.studentIds.length,
            isActive: true,
          },
        })
        await Promise.all(
          p.studentIds.map((studentId) =>
            tx.sessionStudent.create({
              data: { sessionId: session.id, studentId, joinedAt: new Date(), isActive: true },
            }),
          ),
        )
        applied += 1
      }

      return {
        success: true,
        data: {
          applied,
          skipped: plan.skipped,
          archivedSessions,
          preservedSessions,
        },
      }
    })
  }

  // Helper: convert HH:mm to minutes
  private timeToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number)
    return h * 60 + m
  }

  // Helper: format session for response
  private formatSession(session: any) {
    const maxCapacity =
      session.type === 'REGULAR'
        ? session.subject?.maxCapacityRegular || 3
        : session.subject?.maxCapacityPrivate || 1
    const currentCount = session.studentSessions?.length || 0

    return {
      id: session.id,
      branchId: session.branchId,
      branchName: session.branch?.name,
      branchCode: session.branch?.code,
      subjectId: session.subjectId,
      subjectName: session.subject?.name,
      subjectCode: session.subject?.code,
      subjectTrackingType: session.subject?.trackingType,
      teacherId: session.teacherId,
      teacherName: session.teacher?.name,
      type: session.type,
      dayOfWeek: session.dayOfWeek,
      startTime: session.startTime,
      durationMinutes: session.durationMinutes,
      isActive: session.isActive,
      createdAt: session.createdAt?.toISOString(),
      capacity: {
        current: currentCount,
        max: maxCapacity,
        available: maxCapacity - currentCount,
        isFull: currentCount >= maxCapacity,
      },
      students: session.studentSessions?.map((ss: any) => ({
        id: ss.id,
        studentId: ss.studentId,
        studentName: ss.student?.sureName?.trim() || ss.student?.name,
        fullName: ss.student?.name,
        joinedAt: ss.joinedAt?.toISOString(),
        isActive: ss.isActive,
      })),
    }
  }
}
