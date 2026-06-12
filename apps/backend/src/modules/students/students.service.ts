import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common'
import { PrismaService } from '@/prisma/prisma.service'
import { CreateStudentDto } from './dto/create-student.dto'
import { UpdateStudentDto } from './dto/update-student.dto'
import { EnrollmentRequestDto } from './dto/enrollment.dto'
import { PaginationMeta } from '@/common/dto/pagination.dto'

@Injectable()
export class StudentsService {
  constructor(private prisma: PrismaService) {}

  async findAll(page: number = 1, limit: number = 10, branchId?: string, search?: string, isActive?: string) {
    const skip = (page - 1) * limit

    let activeFilter: boolean | undefined = true
    if (isActive === 'all') activeFilter = undefined
    else if (isActive === 'false') activeFilter = false

    const where: any = {
      ...(activeFilter !== undefined && { isActive: activeFilter }),
      ...(branchId && { branchId }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { sureName: { contains: search, mode: 'insensitive' } },
        ],
      }),
    }

    const [students, total] = await Promise.all([
      this.prisma.student.findMany({
        relationLoadStrategy: 'join',
        where,
        include: {
          studentSubjects: {
            where: { isActive: true },
            include: {
              subject: true,
              sppRate: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.student.count({ where }),
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
      data: students.map(s => this.formatStudent(s)),
      pagination,
    }
  }

  async findOne(id: string) {
    const student = await this.prisma.student.findUnique({
      relationLoadStrategy: 'join',
      where: { id },
      include: {
        studentSubjects: {
          where: { isActive: true },
          include: {
            subject: true,
            sppRate: true,
          },
        },
        branch: true,
      },
    })

    if (!student) {
      throw new NotFoundException('Student not found')
    }

    return {
      success: true,
      data: this.formatStudent(student),
    }
  }

  async create(createStudentDto: CreateStudentDto) {
    // Verify branch exists
    const branch = await this.prisma.branch.findUnique({
      where: { id: createStudentDto.branchId },
    })
    if (!branch) {
      throw new BadRequestException('Branch not found')
    }

    const student = await this.prisma.student.create({
      relationLoadStrategy: 'join',
      data: {
        name: createStudentDto.name,
        sureName: createStudentDto.sureName || null,
        classLevel: createStudentDto.classLevel || null,
        birthDate: createStudentDto.birthDate ? new Date(createStudentDto.birthDate) : null,
        birthPlace: createStudentDto.birthPlace || null,
        parentName: createStudentDto.parentName || null,
        parentPhone: createStudentDto.parentPhone || null,
        address: createStudentDto.address || null,
        branchId: createStudentDto.branchId,
        registeredAt: new Date(),
        isActive: true,
      },
      include: {
        studentSubjects: {
          include: {
            subject: true,
            sppRate: true,
          },
        },
      },
    })

    return {
      success: true,
      data: this.formatStudent(student),
      message: 'Student created successfully',
    }
  }

  async update(id: string, updateStudentDto: UpdateStudentDto) {
    const student = await this.prisma.student.findUnique({
      where: { id },
    })

    if (!student) {
      throw new NotFoundException('Student not found')
    }

    const updated = await this.prisma.student.update({
      relationLoadStrategy: 'join',
      where: { id },
      data: {
        ...(updateStudentDto.name && { name: updateStudentDto.name }),
        ...(updateStudentDto.sureName !== undefined && { sureName: updateStudentDto.sureName }),
        ...(updateStudentDto.classLevel !== undefined && { classLevel: updateStudentDto.classLevel }),
        ...(updateStudentDto.birthDate !== undefined && { birthDate: updateStudentDto.birthDate ? new Date(updateStudentDto.birthDate) : null }),
        ...(updateStudentDto.birthPlace !== undefined && { birthPlace: updateStudentDto.birthPlace }),
        ...(updateStudentDto.parentName !== undefined && { parentName: updateStudentDto.parentName }),
        ...(updateStudentDto.parentPhone !== undefined && { parentPhone: updateStudentDto.parentPhone }),
        ...(updateStudentDto.address !== undefined && { address: updateStudentDto.address }),
        ...(updateStudentDto.endDate !== undefined && { endDate: updateStudentDto.endDate ? new Date(updateStudentDto.endDate) : null }),
        ...(updateStudentDto.isActive !== undefined && { isActive: updateStudentDto.isActive }),
      },
      include: {
        studentSubjects: {
          where: { isActive: true },
          include: {
            subject: true,
            sppRate: true,
          },
        },
      },
    })

    return {
      success: true,
      data: this.formatStudent(updated),
      message: 'Student updated successfully',
    }
  }

  async remove(id: string) {
    const student = await this.prisma.student.findUnique({
      where: { id },
    })

    if (!student) {
      throw new NotFoundException('Student not found')
    }

    // Soft delete
    await this.prisma.student.update({
      where: { id },
      data: { isActive: false },
    })

    return {
      success: true,
      data: null,
      message: 'Student deleted successfully',
    }
  }

  // Enrollment service
  async enrollStudent(studentId: string, enrollmentRequestDto: EnrollmentRequestDto) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
    })

    if (!student) {
      throw new NotFoundException('Student not found')
    }

    // Validate all subjects and sessions exist
    const enrollmentData: any[] = []
    let totalSpp = 0

    for (const subjectEnroll of enrollmentRequestDto.subjects) {
      // Get subject
      const subject = await this.prisma.subject.findUnique({
        where: { id: subjectEnroll.subjectId },
      })
      if (!subject) {
        throw new BadRequestException(`Subject ${subjectEnroll.subjectId} not found`)
      }

      // Get session
      const session = await this.prisma.session.findUnique({
        relationLoadStrategy: 'join',
        where: { id: subjectEnroll.sessionId },
        include: { teacher: true },
      })
      if (!session) {
        throw new BadRequestException(`Session ${subjectEnroll.sessionId} not found`)
      }

      // Verify session belongs to correct subject and branch
      if (session.subjectId !== subjectEnroll.subjectId || session.branchId !== student.branchId) {
        throw new BadRequestException('Session does not match subject or branch')
      }

      // Get SPP rate at enrollment date (supports historical data entry)
      const enrollmentDate = enrollmentRequestDto.enrolledAt
        ? new Date(enrollmentRequestDto.enrolledAt)
        : new Date()
      const billingType = subjectEnroll.billingType ?? 'FLAT_MONTHLY'
      const sppRate = await this.prisma.sppRate.findFirst({
        where: {
          subjectId: subjectEnroll.subjectId,
          type: subjectEnroll.type as any,
          billingType: billingType as any,
          effectiveFrom: { lte: enrollmentDate },
          OR: [{ effectiveUntil: null }, { effectiveUntil: { gte: enrollmentDate } }],
        },
        orderBy: { effectiveFrom: 'desc' },
      })

      if (!sppRate) {
        throw new BadRequestException(`No active SPP rate for subject ${subject.name} (${subjectEnroll.type})`)
      }

      totalSpp += parseFloat(sppRate.amount.toString())

      enrollmentData.push({
        subjectId: subjectEnroll.subjectId,
        type: subjectEnroll.type,
        sppRateId: sppRate.id,
        sessionId: subjectEnroll.sessionId,
        subject,
        sppRate,
        session,
      })
    }

    // Create student_subjects entries
    const enrollmentDate = enrollmentRequestDto.enrolledAt
      ? new Date(enrollmentRequestDto.enrolledAt)
      : new Date()
    const enrolledSubjects = await Promise.all(
      enrollmentData.map(data =>
        this.prisma.studentSubject.create({
          data: {
            studentId,
            subjectId: data.subjectId,
            type: data.type as any,
            sppRateId: data.sppRateId,
            enrolledAt: enrollmentDate,
            isActive: true,
          },
        }),
      ),
    )

    // Create session_students entries
    await Promise.all(
      enrollmentData.map(data =>
        this.prisma.sessionStudent.create({
          data: {
            sessionId: data.sessionId,
            studentId,
            joinedAt: new Date(),
            isActive: true,
          },
        } as any),
      ),
    )

    // Calculate fees
    const registrationFee = 200000 // Fixed registration fee (could be from config)
    const totalFirstBill = registrationFee + totalSpp

    // Format response
    const enrollmentSummary = enrollmentData.map(data => ({
      subjectId: data.subject.id,
      subjectName: data.subject.name,
      type: data.type,
      sppAmount: data.sppRate.amount.toString(),
      sessionDay: data.session.dayOfWeek,
      sessionTime: `${data.session.startTime.toString().substring(0, 5)} (${data.session.durationMinutes} min)`,
      teacherName: data.session.teacher.name,
    }))

    return {
      success: true,
      data: {
        studentId,
        studentName: student.name,
        enrolledSubjects: enrollmentSummary,
        registrationFee,
        totalSppFirstMonth: totalSpp,
        totalFirstBill,
        sppLockDate: new Date().toISOString(),
      },
      message: 'Student enrolled successfully',
    }
  }

  // Get available sessions for a subject with capacity info
  async getAvailableSessions(subjectId: string, branchId: string, type: 'REGULAR' | 'PRIVATE') {
    const subject = await this.prisma.subject.findUnique({
      where: { id: subjectId },
    })
    if (!subject) {
      throw new NotFoundException('Subject not found')
    }

    const sessions = await this.prisma.session.findMany({
      relationLoadStrategy: 'join',
      where: {
        subjectId,
        branchId,
        type: type as any,
        isActive: true,
      },
      include: {
        teacher: true,
        studentSessions: true,
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    })

    const maxCapacity = type === 'REGULAR' ? subject.maxCapacityRegular : subject.maxCapacityPrivate
    const formattedSessions = (sessions as any).map((session: any) => ({
      id: session.id,
      day: session.dayOfWeek,
      time: session.startTime.toString().substring(0, 5),
      duration: session.durationMinutes,
      teacher: session.teacher.name,
      capacity: {
        current: session.studentSessions.length,
        max: maxCapacity,
        available: maxCapacity - session.studentSessions.length,
        isFull: session.studentSessions.length >= maxCapacity,
      },
    }))

    return {
      success: true,
      data: formattedSessions,
    }
  }

  // Import students from CSV
  async importStudents(file: any) {
    // Import CSV parser
    const { CsvParser } = await import('./utils/csv-parser')

    // Parse CSV file
    const { rows: parsedRows, errors: parseErrors } = CsvParser.parseCSV(file.buffer)

    // If there are parse errors, reject entire import
    if (parseErrors.length > 0) {
      throw new BadRequestException({
        success: false,
        message: 'CSV file has validation errors',
        errors: parseErrors,
      })
    }

    if (parsedRows.length === 0) {
      throw new BadRequestException('No valid data rows found in CSV')
    }

    // Validate all branches exist
    const branchIds = [...new Set(parsedRows.map(r => r.branchId))]
    const branches = await this.prisma.branch.findMany({
      where: { id: { in: branchIds } },
    })

    const validBranchIds = branches.map(b => b.id)
    const invalidBranches = branchIds.filter(id => !validBranchIds.includes(id))

    if (invalidBranches.length > 0) {
      throw new BadRequestException({
        success: false,
        message: `Invalid branch IDs: ${invalidBranches.join(', ')}`,
      })
    }

    // Process import: validate and upsert students
    const importErrors: Array<{ row: number; data: any; error: string }> = []
    let successCount = 0

    try {
      for (let i = 0; i < parsedRows.length; i++) {
        try {
          const row = parsedRows[i]
          const rowNumber = i + 2 // +2 because of 0-index and header row

          // Check if student with same name and branchId exists
          const existingStudent = await this.prisma.student.findFirst({
            where: {
              name: row.name,
              branchId: row.branchId,
            },
          })

          if (existingStudent) {
            // Update existing student
            await this.prisma.student.update({
              where: { id: existingStudent.id },
              data: {
                classLevel: row.classLevel || existingStudent.classLevel,
                parentName: row.parentName || existingStudent.parentName,
                parentPhone: row.parentPhone || existingStudent.parentPhone,
              },
            })
          } else {
            // Create new student
            await this.prisma.student.create({
              data: {
                name: row.name,
                classLevel: row.classLevel || null,
                parentName: row.parentName || null,
                parentPhone: row.parentPhone || null,
                branchId: row.branchId,
                registeredAt: new Date(),
                isActive: true,
              },
            })
          }

          successCount++
        } catch (error) {
          importErrors.push({
            row: i + 2,
            data: parsedRows[i],
            error: error instanceof Error ? error.message : 'Unknown error',
          })
        }
      }
    } catch (error) {
      throw new BadRequestException({
        success: false,
        message: 'Import process failed',
        errors: importErrors.length > 0 ? importErrors : [{ row: 0, data: null, error: error instanceof Error ? error.message : 'Unknown error' }],
      })
    }

    // If there are any errors, rollback (transaction) - but since we're already updating, we'll return error
    if (importErrors.length > 0) {
      throw new BadRequestException({
        success: false,
        message: `Import failed with ${importErrors.length} error(s). Please fix the errors and try again.`,
        errors: importErrors,
      })
    }

    return {
      success: true,
      total: parsedRows.length,
      imported: successCount,
      failed: importErrors.length,
      message: `Successfully imported ${successCount} students`,
    }
  }

  // Add subject to existing student enrollment
  async addSubjectEnrollment(studentId: string, subjectId: string, type: 'REGULAR' | 'PRIVATE', enrolledAt?: string, billingType?: string) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
    })
    if (!student) {
      throw new NotFoundException('Student not found')
    }

    // Check if subject already enrolled
    const existingEnrollment = await this.prisma.studentSubject.findFirst({
      where: {
        studentId,
        subjectId,
        isActive: true,
      },
    })
    if (existingEnrollment) {
      throw new BadRequestException('Subject already enrolled for this student')
    }

    // Get subject
    const subject = await this.prisma.subject.findUnique({
      where: { id: subjectId },
    })
    if (!subject) {
      throw new BadRequestException(`Subject not found`)
    }

    // Get SPP rate at enrollment date (supports historical data entry)
    const enrollmentDate = enrolledAt ? new Date(enrolledAt) : new Date()
    const resolvedBillingType = billingType ?? 'FLAT_MONTHLY'
    const sppRate = await this.prisma.sppRate.findFirst({
      where: {
        subjectId,
        type: type as any,
        billingType: resolvedBillingType as any,
        effectiveFrom: { lte: enrollmentDate },
        OR: [{ effectiveUntil: null }, { effectiveUntil: { gte: enrollmentDate } }],
      },
      orderBy: { effectiveFrom: 'desc' },
    })

    if (!sppRate) {
      throw new BadRequestException(`No active SPP rate for subject ${subject.name} (${type}) on ${enrollmentDate.toLocaleDateString('id-ID')}`)
    }

    // Create enrollment
    const studentSubject = await this.prisma.studentSubject.create({
      relationLoadStrategy: 'join',
      data: {
        studentId,
        subjectId,
        type: type as any,
        sppRateId: sppRate.id,
        enrolledAt: enrollmentDate,
        isActive: true,
      },
      include: {
        subject: true,
        sppRate: true,
      },
    })

    const registrationFee = 200000
    const sppAmount = parseFloat(sppRate.amount.toString())
    const totalFirstBill = registrationFee + sppAmount

    return {
      success: true,
      data: {
        studentId,
        addedSubject: {
          subjectId: studentSubject.subject.id,
          subjectName: studentSubject.subject.name,
          type: studentSubject.type,
          sppAmount: sppAmount.toString(),
          sppLockDate: new Date().toISOString(),
        },
        registrationFee,
        totalFirstBill,
      },
      message: 'Subject added successfully',
    }
  }

  // Update subject enrollment (type and/or session)
  async updateSubjectEnrollment(studentId: string, subjectId: string, updateData: { type?: string; sessionId?: string }) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
    })
    if (!student) {
      throw new NotFoundException('Student not found')
    }

    const studentSubject = await this.prisma.studentSubject.findFirst({
      relationLoadStrategy: 'join',
      where: {
        studentId,
        subjectId,
        isActive: true,
      },
      include: {
        subject: true,
        sppRate: true,
      },
    })
    if (!studentSubject) {
      throw new NotFoundException('Subject enrollment not found')
    }

    let newSppRate = studentSubject.sppRate
    let newType = studentSubject.type
    let messages: string[] = []

    // If type changed, fetch new SPP rate
    if (updateData.type && updateData.type !== studentSubject.type) {
      const now = new Date()
      const fetchedRate = await this.prisma.sppRate.findFirst({
        where: {
          subjectId,
          type: updateData.type as any,
          effectiveFrom: { lte: now },
          OR: [{ effectiveUntil: null }, { effectiveUntil: { gte: now } }],
        },
        orderBy: { effectiveFrom: 'desc' },
      })

      if (!fetchedRate) {
        throw new BadRequestException(`No active SPP rate for type ${updateData.type}`)
      }

      newSppRate = fetchedRate
      newType = updateData.type as any
      messages.push('Tipe berhasil diubah')
    }

    // Update student subject
    const updated = await this.prisma.studentSubject.update({
      relationLoadStrategy: 'join',
      where: { id: studentSubject.id },
      data: {
        type: newType as any,
        sppRateId: newSppRate.id,
      },
      include: {
        subject: true,
        sppRate: true,
      },
    })

    // Update session if provided
    let sessionInfo: any = {}
    if (updateData.sessionId) {
      const session = await this.prisma.session.findUnique({
        relationLoadStrategy: 'join',
        where: { id: updateData.sessionId },
        include: { teacher: true },
      })
      if (!session) {
        throw new BadRequestException('Session not found')
      }

      if (session.subjectId !== subjectId || session.branchId !== student.branchId) {
        throw new BadRequestException('Session does not match subject or branch')
      }

      // Update or create session student relationship
      await this.prisma.sessionStudent.upsert({
        where: {
          sessionId_studentId: {
            sessionId: updateData.sessionId,
            studentId,
          },
        },
        update: { isActive: true },
        create: {
          sessionId: updateData.sessionId,
          studentId,
          isActive: true,
          joinedAt: new Date(),
        },
      })

      sessionInfo = {
        sessionId: session.id,
        sessionDay: session.dayOfWeek,
        sessionTime: `${session.startTime.toString().substring(0, 5)} (${session.durationMinutes} min)`,
      }
    }

    return {
      success: true,
      data: {
        studentSubjectId: updated.id,
        subjectName: updated.subject.name,
        type: updated.type,
        sppAmount: updated.sppRate.amount.toString(),
        sppLockDate: new Date().toISOString(),
        ...sessionInfo,
      },
      message: messages.length > 0 ? messages.join('. ') : 'Subject updated successfully',
    }
  }

  // Update discount / custom SPP on a subject enrollment
  async updateSubjectDiscount(
    studentId: string,
    subjectId: string,
    discountAmount: number | null,
    discountNote: string | null,
    customSppAmount?: number | null,
    customSppNote?: string | null,
    discountAffectsCommission?: boolean,
  ) {
    const studentSubject = await this.prisma.studentSubject.findFirst({
      relationLoadStrategy: 'join',
      where: { studentId, subjectId, isActive: true },
      include: { subject: true },
    })
    if (!studentSubject) {
      throw new NotFoundException('Subject enrollment not found')
    }

    const updated = await this.prisma.studentSubject.update({
      relationLoadStrategy: 'join',
      where: { id: studentSubject.id },
      data: {
        discountAmount: discountAmount !== null ? discountAmount : null,
        discountNote: discountNote || null,
        ...(customSppAmount !== undefined && { customSppAmount: customSppAmount !== null ? customSppAmount : null }),
        ...(customSppNote !== undefined && { customSppNote: customSppNote || null }),
        ...(discountAffectsCommission !== undefined && { discountAffectsCommission }),
      },
      include: { subject: true, sppRate: true },
    })

    return {
      success: true,
      data: {
        studentSubjectId: updated.id,
        subjectName: updated.subject.name,
        sppAmount: updated.sppRate.amount.toString(),
        discountAmount: updated.discountAmount?.toString() || null,
        discountNote: updated.discountNote || null,
        customSppAmount: updated.customSppAmount?.toString() || null,
        customSppNote: updated.customSppNote || null,
        discountAffectsCommission: updated.discountAffectsCommission,
      },
      message: 'Tarif enrollment berhasil diperbarui',
    }
  }

  // Remove subject enrollment (soft delete)
  async removeSubjectEnrollment(studentId: string, subjectId: string) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
    })
    if (!student) {
      throw new NotFoundException('Student not found')
    }

    const studentSubject = await this.prisma.studentSubject.findFirst({
      where: {
        studentId,
        subjectId,
        isActive: true,
      },
    })
    if (!studentSubject) {
      throw new NotFoundException('Subject enrollment not found')
    }

    await this.prisma.studentSubject.update({
      where: { id: studentSubject.id },
      data: {
        isActive: false,
        status: 'DROPPED_OUT',
        endDate: new Date(),
      },
    })

    await this.prisma.sessionStudent.updateMany({
      where: { studentId, session: { subjectId } },
      data: { isActive: false },
    })

    return {
      success: true,
      data: { studentSubjectId: studentSubject.id },
      message: 'Mata pelajaran berhasil dihapus. Data presensi tetap disimpan.',
    }
  }

  // End subject enrollment with explicit status (COMPLETED or DROPPED_OUT)
  async endSubjectEnrollment(studentId: string, subjectId: string, status: 'COMPLETED' | 'DROPPED_OUT', endDate?: string) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
    })
    if (!student) {
      throw new NotFoundException('Student not found')
    }

    const studentSubject = await this.prisma.studentSubject.findFirst({
      relationLoadStrategy: 'join',
      where: { studentId, subjectId, isActive: true },
      include: { subject: true },
    })
    if (!studentSubject) {
      throw new NotFoundException('Subject enrollment not found or already ended')
    }

    const resolvedEndDate = endDate ? new Date(endDate) : new Date()

    await this.prisma.$transaction(async tx => {
      await tx.studentSubject.update({
        where: { id: studentSubject.id },
        data: {
          isActive: false,
          status,
          endDate: resolvedEndDate,
        },
      })

      await tx.sessionStudent.updateMany({
        where: { studentId, session: { subjectId } },
        data: { isActive: false },
      })
    })

    return {
      success: true,
      data: {
        studentSubjectId: studentSubject.id,
        subjectName: (studentSubject as any).subject.name,
        status,
        endDate: resolvedEndDate.toISOString().split('T')[0],
      },
      message: status === 'COMPLETED'
        ? 'Enrollment berhasil ditandai selesai.'
        : 'Siswa berhasil ditandai keluar dari mata pelajaran.',
    }
  }

  // Helper: format student for response
  async updateSubjectSppRate(studentId: string, subjectId: string, sppRateId: string) {
    const studentSubject = await this.prisma.studentSubject.findFirst({
      relationLoadStrategy: 'join',
      where: { studentId, subjectId, isActive: true },
      include: { subject: true },
    })
    if (!studentSubject) {
      throw new NotFoundException('Subject enrollment not found')
    }

    const sppRate = await this.prisma.sppRate.findUnique({ where: { id: sppRateId } })
    if (!sppRate) {
      throw new NotFoundException('SPP rate not found')
    }

    if (sppRate.subjectId !== subjectId) {
      throw new BadRequestException('SPP rate does not belong to this subject')
    }

    if (sppRate.type !== studentSubject.type) {
      throw new BadRequestException(`SPP rate type (${sppRate.type}) tidak sesuai dengan tipe enrollment (${studentSubject.type})`)
    }

    await this.prisma.studentSubject.update({
      where: { id: studentSubject.id },
      data: { sppRateId },
    })

    return {
      success: true,
      data: {
        subjectName: studentSubject.subject.name,
        sppRateId,
        newAmount: sppRate.amount.toString(),
      },
      message: 'Tarif SPP berhasil diperbarui',
    }
  }

  private formatStudent(student: any) {
    return {
      id: student.id,
      branchId: student.branchId,
      name: student.name,
      sureName: student.sureName,
      classLevel: student.classLevel,
      birthDate: student.birthDate ? student.birthDate.toISOString().split('T')[0] : null,
      birthPlace: student.birthPlace,
      parentName: student.parentName,
      parentPhone: student.parentPhone,
      address: student.address,
      registeredAt: student.registeredAt.toISOString(),
      endDate: student.endDate ? student.endDate.toISOString() : null,
      isActive: student.isActive,
      createdAt: student.createdAt.toISOString(),
      subjects: student.studentSubjects?.map((ss: any) => ({
        id: ss.id,
        subjectId: ss.subject.id,
        subjectName: ss.subject.name,
        type: ss.type,
        sppRateId: ss.sppRateId,
        billingType: ss.sppRate?.billingType ?? 'FLAT_MONTHLY',
        sppAmount: ss.sppRate?.amount.toString(),
        effectiveSppAmount: ss.customSppAmount?.toString() ?? ss.sppRate?.amount.toString(),
        customSppAmount: ss.customSppAmount?.toString() || null,
        customSppNote: ss.customSppNote || null,
        discountAffectsCommission: ss.discountAffectsCommission,
        discountAmount: ss.discountAmount?.toString() || null,
        discountNote: ss.discountNote || null,
        enrolledAt: ss.enrolledAt.toISOString(),
        endDate: ss.endDate ? ss.endDate.toISOString().split('T')[0] : null,
        status: ss.status,
        isActive: ss.isActive,
      })),
    }
  }
}
