import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common'
import { PrismaService } from '@/prisma/prisma.service'
import { CreateReportLinkDto } from './dto/create-report-link.dto'
import { randomBytes } from 'crypto'

@Injectable()
export class ProgressReportsService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters?: { branchId?: string; status?: string; studentId?: string }) {
    const links = await this.prisma.progressReportLink.findMany({
      where: {
        ...(filters?.branchId && { branchId: filters.branchId }),
        ...(filters?.studentId && { studentId: filters.studentId }),
      },
      include: {
        branch: true,
        student: true,
        generatedBy: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    const now = new Date()
    let formatted = links.map(l => this.formatLink(l, now))

    // Apply status filter on formatted (since it's computed)
    if (filters?.status) {
      formatted = formatted.filter(l => l.status === filters.status)
    }

    return {
      success: true,
      data: formatted,
    }
  }

  async getMetrics(branchId?: string) {
    const links = await this.prisma.progressReportLink.findMany({
      where: branchId ? { branchId } : undefined,
    })

    const now = new Date()
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    let active = 0
    let expiringSoon = 0
    let expired = 0

    for (const link of links) {
      if (!link.expiresAt) {
        active++
        continue
      }
      if (link.expiresAt < now) {
        expired++
      } else if (link.expiresAt < sevenDaysFromNow) {
        active++
        expiringSoon++
      } else {
        active++
      }
    }

    return {
      success: true,
      data: {
        total: links.length,
        active,
        expiringSoon,
        expired,
      },
    }
  }

  async findByToken(token: string) {
    const link = await this.prisma.progressReportLink.findUnique({
      where: { token },
      include: {
        branch: true,
        student: { include: { branch: true } },
      },
    })

    if (!link) throw new NotFoundException('Report link not found')

    // Check expiry
    const now = new Date()
    const isExpired = link.expiresAt && link.expiresAt < now

    if (isExpired) {
      return {
        success: true,
        data: {
          isExpired: true,
          studentName: link.student.name,
          branchName: link.branch.name,
          expiredAt: link.expiresAt?.toISOString(),
        },
      }
    }

    // Increment view count
    await this.prisma.progressReportLink.update({
      where: { id: link.id },
      data: { viewCount: link.viewCount + 1 },
    })

    // Get progress data per subject (shared with admin in-app view)
    const subjectReports = await this.buildSubjectReports(link.studentId, link.subjectIds)

    return {
      success: true,
      data: {
        isExpired: false,
        token: link.token,
        studentId: link.studentId,
        studentName: link.student.name,
        studentClassLevel: link.student.classLevel,
        branchId: link.branchId,
        branchName: link.branch.name,
        createdAt: link.createdAt.toISOString(),
        expiresAt: link.expiresAt?.toISOString() || null,
        isPermanent: !link.expiresAt,
        subjectReports,
      },
    }
  }

  /**
   * Builds the per-subject progress report payload (modules / free-material +
   * recent sessions). Shared by the public token view (findByToken) and the
   * authenticated admin in-app view (getStudentReportForAdmin) so both render
   * identical data.
   */
  private async buildSubjectReports(studentId: string, subjectIds: string[]) {
    const subjects = await this.prisma.subject.findMany({
      where: { id: { in: subjectIds } },
      include: {
        curriculumModules: {
          orderBy: { orderNumber: 'asc' },
        },
      },
    })

    // For each subject, get progress data
    return Promise.all(
      subjects.map(async subject => {
        if (subject.trackingType === 'MODULE_BASED') {
          // Module-based: get module progress
          const moduleProgress = await this.prisma.studentModuleProgress.findMany({
            where: {
              studentId,
              module: { subjectId: subject.id },
            },
            include: { module: true },
          })

          // Get recent session logs with progress
          const recentLogs = await this.prisma.progressLog.findMany({
            where: {
              studentId,
              subjectId: subject.id,
            },
            include: {
              module: true,
              sessionLog: true,
            },
            orderBy: { recordedAt: 'desc' },
            take: 5,
          })

          const totalModules = subject.curriculumModules.length
          const completedModules = moduleProgress.filter(m => m.status === 'COMPLETED').length

          // Build module list with progress
          const moduleList = subject.curriculumModules.map(mod => {
            const prog = moduleProgress.find(p => p.moduleId === mod.id)
            return {
              id: mod.id,
              orderNumber: mod.orderNumber,
              name: mod.name,
              totalChapters: mod.totalChapters,
              currentChapter: prog?.currentChapter || 0,
              status: prog?.status || 'NOT_STARTED',
              predicate: prog?.predicate || null,
              completedAt: prog?.completedAt?.toISOString() || null,
              progressPercentage: prog
                ? Math.round((prog.currentChapter / mod.totalChapters) * 100)
                : 0,
            }
          })

          return {
            subjectId: subject.id,
            subjectName: subject.name,
            subjectCode: subject.code,
            trackingType: subject.trackingType,
            totalModules,
            completedModules,
            modules: moduleList,
            recentSessions: recentLogs.map(log => ({
              date: log.recordedAt.toISOString(),
              moduleName: log.module?.name,
              chapterFrom: log.chapterFrom,
              chapterTo: log.chapterTo,
              moduleCompleted: log.moduleCompleted,
              predicate: log.predicate,
              notes: log.notes,
            })),
          }
        } else {
          // Free-material: get progress logs
          const recentLogs = await this.prisma.progressLog.findMany({
            where: {
              studentId,
              subjectId: subject.id,
            },
            include: { sessionLog: true },
            orderBy: { recordedAt: 'desc' },
            take: 8,
          })

          // Compute average predicate (simple count)
          const predicates = recentLogs.filter(l => l.predicate).map(l => l.predicate!)
          const predicateScore: Record<string, number> = {
            PERLU_BIMBINGAN: 1,
            CUKUP: 2,
            BAIK: 3,
            BAIK_SEKALI: 4,
            MEMUASKAN: 5,
          }
          const avgScore =
            predicates.length > 0
              ? predicates.reduce((sum, p) => sum + (predicateScore[p] || 0), 0) / predicates.length
              : 0
          const averagePredicate =
            avgScore >= 4.5
              ? 'MEMUASKAN'
              : avgScore >= 3.5
              ? 'BAIK_SEKALI'
              : avgScore >= 2.5
              ? 'BAIK'
              : avgScore >= 1.5
              ? 'CUKUP'
              : avgScore > 0
              ? 'PERLU_BIMBINGAN'
              : null

          return {
            subjectId: subject.id,
            subjectName: subject.name,
            subjectCode: subject.code,
            trackingType: subject.trackingType,
            averagePredicate,
            totalSessions: recentLogs.length,
            recentSessions: recentLogs.map(log => ({
              date: log.recordedAt.toISOString(),
              topic: log.topic,
              predicate: log.predicate,
              notes: log.notes,
            })),
          }
        }
      }),
    )
  }

  /**
   * Admin in-app view: returns the same per-subject progress payload as the
   * public token view, but authenticated and without creating a share link.
   * Defaults to all of the student's active subject enrollments.
   */
  async getStudentReportForAdmin(
    studentId: string,
    subjectIdsCsv: string | undefined,
    user: { id: string; role: string },
  ) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: {
        branch: true,
        studentSubjects: {
          where: { isActive: true },
          select: { subjectId: true },
        },
      },
    })

    if (!student) throw new NotFoundException('Siswa tidak ditemukan')

    // Server-side branch isolation for ADMIN_CABANG
    if (user.role === 'ADMIN_CABANG') {
      const allowed = await this.prisma.userBranch.findFirst({
        where: { userId: user.id, branchId: student.branchId },
      })
      if (!allowed) {
        throw new ForbiddenException('Siswa berada di luar cabang Anda')
      }
    }

    const enrolledIds = student.studentSubjects.map(ss => ss.subjectId)

    // Default to all active enrollments; otherwise intersect requested ids with
    // enrollments so callers can't probe arbitrary subjects.
    let subjectIds = enrolledIds
    if (subjectIdsCsv) {
      const requested = subjectIdsCsv.split(',').map(s => s.trim()).filter(Boolean)
      subjectIds = requested.filter(id => enrolledIds.includes(id))
    }

    const subjectReports = await this.buildSubjectReports(studentId, subjectIds)

    return {
      success: true,
      data: {
        studentId: student.id,
        studentName: student.name,
        studentClassLevel: student.classLevel,
        branchId: student.branchId,
        branchName: student.branch.name,
        subjectReports,
      },
    }
  }

  async create(dto: CreateReportLinkDto, currentUserId: string) {
    // Verify student exists
    const student = await this.prisma.student.findUnique({
      where: { id: dto.studentId },
      include: {
        studentSubjects: {
          where: { isActive: true },
          select: { subjectId: true },
        },
      },
    })

    if (!student) throw new NotFoundException('Student not found')

    // Verify all subjectIds belong to student's enrollments
    const enrolledIds = student.studentSubjects.map(ss => ss.subjectId)
    for (const sid of dto.subjectIds) {
      if (!enrolledIds.includes(sid)) {
        throw new BadRequestException(
          `Subject ${sid} is not in student's active enrollments`,
        )
      }
    }

    // Generate token
    const token = randomBytes(16).toString('hex')

    // Compute expiry
    let expiresAt: Date | null = null
    if (dto.durationDays && dto.durationDays > 0) {
      expiresAt = new Date(Date.now() + dto.durationDays * 24 * 60 * 60 * 1000)
    }

    const link = await this.prisma.progressReportLink.create({
      data: {
        studentId: dto.studentId,
        branchId: student.branchId,
        generatedById: currentUserId,
        token,
        subjectIds: dto.subjectIds,
        expiresAt,
      },
      include: {
        branch: true,
        student: true,
        generatedBy: true,
      },
    })

    return {
      success: true,
      data: this.formatLink(link, new Date()),
      message: 'Progress report link generated successfully',
    }
  }

  async revoke(id: string) {
    const link = await this.prisma.progressReportLink.findUnique({ where: { id } })
    if (!link) throw new NotFoundException('Link not found')

    // Set expiresAt to past to revoke
    const updated = await this.prisma.progressReportLink.update({
      where: { id },
      data: { expiresAt: new Date(Date.now() - 1000) },
      include: {
        branch: true,
        student: true,
        generatedBy: true,
      },
    })

    return {
      success: true,
      data: this.formatLink(updated, new Date()),
      message: 'Link revoked',
    }
  }

  async renew(id: string, durationDays: number) {
    const link = await this.prisma.progressReportLink.findUnique({ where: { id } })
    if (!link) throw new NotFoundException('Link not found')

    const expiresAt =
      durationDays > 0 ? new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000) : null

    const updated = await this.prisma.progressReportLink.update({
      where: { id },
      data: { expiresAt },
      include: {
        branch: true,
        student: true,
        generatedBy: true,
      },
    })

    return {
      success: true,
      data: this.formatLink(updated, new Date()),
      message: 'Link renewed',
    }
  }

  // Helper: format link with computed status
  private formatLink(link: any, now: Date) {
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    let status: 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'PERMANENT'
    let daysLeft: number | null = null

    if (!link.expiresAt) {
      status = 'PERMANENT'
    } else if (link.expiresAt < now) {
      status = 'EXPIRED'
    } else if (link.expiresAt < sevenDaysFromNow) {
      status = 'EXPIRING_SOON'
      daysLeft = Math.ceil((link.expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
    } else {
      status = 'ACTIVE'
      daysLeft = Math.ceil((link.expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
    }

    return {
      id: link.id,
      token: link.token,
      studentId: link.studentId,
      studentName: link.student?.name,
      branchId: link.branchId,
      branchName: link.branch?.name,
      generatedByName: link.generatedBy?.name,
      subjectIds: link.subjectIds,
      createdAt: link.createdAt.toISOString(),
      expiresAt: link.expiresAt?.toISOString() || null,
      isPermanent: !link.expiresAt,
      status,
      daysLeft,
      viewCount: link.viewCount,
    }
  }
}
