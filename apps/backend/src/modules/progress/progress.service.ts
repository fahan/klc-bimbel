import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common'
import { PrismaService } from '@/prisma/prisma.service'
import { SubmitProgressDto } from './dto/submit-progress.dto'

@Injectable()
export class ProgressService {
  constructor(private prisma: PrismaService) {}

  async submitProgress(submitDto: SubmitProgressDto, currentUserId: string) {
    // Verify session log exists
    const sessionLog = await this.prisma.sessionLog.findUnique({
      where: { id: submitDto.sessionLogId },
      include: {
        session: {
          include: {
            subject: true,
          },
        },
      },
    })

    if (!sessionLog) {
      throw new NotFoundException('Session log not found')
    }

    // session is nullable for ad-hoc logs — resolve subjectId from either source
    const subjectId = sessionLog.isAdHoc
      ? sessionLog.adHocSubjectId
      : sessionLog.session?.subjectId

    if (!subjectId) {
      throw new BadRequestException('Tidak dapat menentukan mata pelajaran untuk sesi ini')
    }

    // For ad-hoc logs, fetch subject separately to get trackingType
    let subjectTrackingType = sessionLog.session?.subject?.trackingType
    if (sessionLog.isAdHoc || !subjectTrackingType) {
      const subject = await this.prisma.subject.findUnique({ where: { id: subjectId } })
      if (!subject) throw new NotFoundException('Mata pelajaran tidak ditemukan')
      subjectTrackingType = subject.trackingType
    }

    if (subjectTrackingType !== submitDto.trackingType) {
      throw new BadRequestException(
        `Tracking type mismatch. Subject is ${subjectTrackingType}, but received ${submitDto.trackingType}`,
      )
    }

    // Delete existing progress logs for this session log (re-submit case)
    await this.prisma.progressLog.deleteMany({
      where: { sessionLogId: submitDto.sessionLogId },
    })

    if (submitDto.trackingType === 'MODULE_BASED') {
      return this.submitModuleProgress(submitDto, sessionLog, currentUserId)
    } else {
      return this.submitFreeMaterialProgress(submitDto, sessionLog, currentUserId)
    }
  }

  private async submitModuleProgress(
    submitDto: SubmitProgressDto,
    sessionLog: any,
    currentUserId: string,
  ) {
    if (!submitDto.moduleProgress || submitDto.moduleProgress.length === 0) {
      throw new BadRequestException('moduleProgress required for MODULE_BASED tracking')
    }

    const subjectId = sessionLog.isAdHoc ? sessionLog.adHocSubjectId : sessionLog.session?.subjectId
    if (!subjectId) throw new BadRequestException('Tidak dapat menentukan mata pelajaran untuk sesi ini')
    const recordedAt = new Date()

    // Create progress logs and update student_module_progress
    for (const mp of submitDto.moduleProgress) {
      // Verify module exists and belongs to subject
      const module = await this.prisma.curriculumModule.findUnique({
        where: { id: mp.moduleId },
      })
      if (!module) {
        throw new BadRequestException(`Module ${mp.moduleId} not found`)
      }
      if (module.subjectId !== subjectId) {
        throw new BadRequestException(`Module does not belong to this subject`)
      }

      // Validate chapter range
      if (mp.chapterFrom > mp.chapterTo) {
        throw new BadRequestException('chapterFrom must be <= chapterTo')
      }
      if (mp.chapterTo > module.totalChapters) {
        throw new BadRequestException(
          `chapterTo (${mp.chapterTo}) exceeds module total chapters (${module.totalChapters})`,
        )
      }

      // Validate predicate if module completed
      if (mp.moduleCompleted && !mp.predicate) {
        throw new BadRequestException('Predicate is required when moduleCompleted is true')
      }

      // Create progress log
      await this.prisma.progressLog.create({
        data: {
          sessionLogId: submitDto.sessionLogId,
          studentId: mp.studentId,
          subjectId,
          trackingType: 'MODULE_BASED',
          moduleId: mp.moduleId,
          chapterFrom: mp.chapterFrom,
          chapterTo: mp.chapterTo,
          moduleCompleted: mp.moduleCompleted,
          predicate: mp.predicate ? (mp.predicate as any) : null,
          notes: mp.notes || null,
          recordedById: currentUserId,
          recordedAt,
        },
      })

      // Update student_module_progress
      const existing = await this.prisma.studentModuleProgress.findUnique({
        where: {
          studentId_moduleId: {
            studentId: mp.studentId,
            moduleId: mp.moduleId,
          },
        },
      })

      const newStatus = mp.moduleCompleted
        ? 'COMPLETED'
        : mp.chapterTo > 0
        ? 'IN_PROGRESS'
        : 'NOT_STARTED'

      if (existing) {
        await this.prisma.studentModuleProgress.update({
          where: { id: existing.id },
          data: {
            currentChapter: mp.chapterTo,
            status: newStatus as any,
            predicate: mp.predicate ? (mp.predicate as any) : existing.predicate,
            completedAt: mp.moduleCompleted ? new Date() : existing.completedAt,
          },
        })
      } else {
        await this.prisma.studentModuleProgress.create({
          data: {
            studentId: mp.studentId,
            moduleId: mp.moduleId,
            currentChapter: mp.chapterTo,
            status: newStatus as any,
            predicate: mp.predicate ? (mp.predicate as any) : null,
            completedAt: mp.moduleCompleted ? new Date() : null,
          },
        })
      }
    }

    // Get the result
    const progressLogs = await this.prisma.progressLog.findMany({
      where: { sessionLogId: submitDto.sessionLogId },
      include: {
        student: true,
        module: true,
        subject: true,
      },
    })

    return {
      success: true,
      data: progressLogs.map(p => this.formatProgressLog(p)),
      message: 'Module-based progress recorded successfully',
    }
  }

  private async submitFreeMaterialProgress(
    submitDto: SubmitProgressDto,
    sessionLog: any,
    currentUserId: string,
  ) {
    if (!submitDto.freeMaterialProgress || submitDto.freeMaterialProgress.length === 0) {
      throw new BadRequestException('freeMaterialProgress required for FREE_MATERIAL tracking')
    }
    if (!submitDto.topic) {
      throw new BadRequestException('topic required for FREE_MATERIAL tracking')
    }

    const subjectId = sessionLog.isAdHoc ? sessionLog.adHocSubjectId : sessionLog.session?.subjectId
    if (!subjectId) throw new BadRequestException('Tidak dapat menentukan mata pelajaran untuk sesi ini')
    const recordedAt = new Date()

    for (const fp of submitDto.freeMaterialProgress) {
      await this.prisma.progressLog.create({
        data: {
          sessionLogId: submitDto.sessionLogId,
          studentId: fp.studentId,
          subjectId,
          trackingType: 'FREE_MATERIAL',
          topic: submitDto.topic,
          predicate: fp.predicate as any,
          notes: fp.notes || null,
          recordedById: currentUserId,
          recordedAt,
        },
      })
    }

    const progressLogs = await this.prisma.progressLog.findMany({
      where: { sessionLogId: submitDto.sessionLogId },
      include: {
        student: true,
        subject: true,
      },
    })

    return {
      success: true,
      data: progressLogs.map(p => this.formatProgressLog(p)),
      message: 'Free-material progress recorded successfully',
    }
  }

  async getStudentProgress(studentId: string, subjectId?: string) {
    const where: any = { studentId }
    if (subjectId) where.subjectId = subjectId

    const progressLogs = await this.prisma.progressLog.findMany({
      where,
      include: {
        sessionLog: {
          include: {
            session: {
              include: {
                teacher: true,
                branch: true,
              },
            },
          },
        },
        module: true,
        subject: true,
      },
      orderBy: { recordedAt: 'desc' },
    })

    // Also get module progress summary
    const moduleProgress = await this.prisma.studentModuleProgress.findMany({
      where: { studentId },
      include: {
        module: {
          include: { subject: true },
        },
      },
    })

    return {
      success: true,
      data: {
        progressLogs: progressLogs.map(p => this.formatProgressLog(p)),
        moduleSummary: moduleProgress.map(mp => ({
          id: mp.id,
          moduleId: mp.moduleId,
          moduleName: mp.module.name,
          subjectId: mp.module.subjectId,
          subjectName: mp.module.subject.name,
          orderNumber: mp.module.orderNumber,
          totalChapters: mp.module.totalChapters,
          currentChapter: mp.currentChapter,
          status: mp.status,
          predicate: mp.predicate,
          completedAt: mp.completedAt?.toISOString(),
          progressPercentage: Math.round((mp.currentChapter / mp.module.totalChapters) * 100),
        })),
      },
    }
  }

  async getStudentLastModule(studentId: string, subjectId: string) {
    // Find current module being worked on
    const inProgress = await this.prisma.studentModuleProgress.findFirst({
      where: {
        studentId,
        status: 'IN_PROGRESS',
        module: { subjectId },
      },
      include: { module: true },
      orderBy: { module: { orderNumber: 'asc' } },
    })

    if (inProgress) {
      return {
        success: true,
        data: {
          moduleId: inProgress.moduleId,
          moduleName: inProgress.module.name,
          orderNumber: inProgress.module.orderNumber,
          totalChapters: inProgress.module.totalChapters,
          currentChapter: inProgress.currentChapter,
          status: 'IN_PROGRESS',
        },
      }
    }

    // No in-progress, get next module to start
    const completedModules = await this.prisma.studentModuleProgress.findMany({
      where: {
        studentId,
        status: 'COMPLETED',
        module: { subjectId },
      },
      include: { module: true },
    })

    const completedOrders = completedModules.map(m => m.module.orderNumber)
    const nextModule = await this.prisma.curriculumModule.findFirst({
      where: {
        subjectId,
        orderNumber: {
          notIn: completedOrders.length > 0 ? completedOrders : [-1],
        },
      },
      orderBy: { orderNumber: 'asc' },
    })

    if (nextModule) {
      return {
        success: true,
        data: {
          moduleId: nextModule.id,
          moduleName: nextModule.name,
          orderNumber: nextModule.orderNumber,
          totalChapters: nextModule.totalChapters,
          currentChapter: 0,
          status: 'NOT_STARTED',
        },
      }
    }

    return {
      success: true,
      data: null,
      message: 'All modules completed for this student',
    }
  }

  // Helper: format progress log
  private formatProgressLog(log: any) {
    return {
      id: log.id,
      sessionLogId: log.sessionLogId,
      studentId: log.studentId,
      studentName: log.student?.name,
      subjectId: log.subjectId,
      subjectName: log.subject?.name,
      trackingType: log.trackingType,
      topic: log.topic,
      moduleId: log.moduleId,
      moduleName: log.module?.name,
      chapterFrom: log.chapterFrom,
      chapterTo: log.chapterTo,
      moduleCompleted: log.moduleCompleted,
      predicate: log.predicate,
      notes: log.notes,
      recordedAt: log.recordedAt?.toISOString(),
    }
  }
}
