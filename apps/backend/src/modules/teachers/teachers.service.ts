import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common'
import * as bcrypt from 'bcryptjs'
import { PrismaService } from '@/prisma/prisma.service'
import { CreateTeacherDto } from './dto/create-teacher.dto'
import { UpdateTeacherDto } from './dto/update-teacher.dto'
import { PaginationMeta } from '@/common/dto/pagination.dto'

@Injectable()
export class TeachersService {
  constructor(private prisma: PrismaService) {}

  async findAll(page: number = 1, limit: number = 10, branchId?: string) {
    const skip = (page - 1) * limit

    const [teachers, total] = await Promise.all([
      this.prisma.user.findMany({
        where: {
          role: 'GURU',
          isActive: true,
          ...(branchId && {
            branches: {
              some: { branchId },
            },
          }),
        },
        include: {
          branches: {
            include: {
              branch: true,
            },
          },
          sessionsAsTeacher: {
            where: { isActive: true },
            select: { id: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.user.count({
        where: {
          role: 'GURU',
          isActive: true,
          ...(branchId && {
            branches: {
              some: { branchId },
            },
          }),
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
      data: teachers.map(t => this.formatTeacher(t)),
      pagination,
    }
  }

  async findOne(id: string) {
    const teacher = await this.prisma.user.findUnique({
      where: { id },
      include: {
        branches: {
          include: {
            branch: true,
          },
        },
        sessionsAsTeacher: {
          where: { isActive: true },
          include: {
            subject: true,
            branch: true,
          },
        },
      },
    })

    if (!teacher) {
      throw new NotFoundException('Teacher not found')
    }

    if (teacher.role !== 'GURU') {
      throw new BadRequestException('User is not a teacher')
    }

    return {
      success: true,
      data: this.formatTeacher(teacher),
    }
  }

  async create(createTeacherDto: CreateTeacherDto) {
    // Check email uniqueness
    const existing = await this.prisma.user.findUnique({
      where: { email: createTeacherDto.email },
    })
    if (existing) {
      throw new ConflictException('Email already registered')
    }

    // Verify all branches exist
    const branches = await this.prisma.branch.findMany({
      where: { id: { in: createTeacherDto.branchIds } },
    })
    if (branches.length !== createTeacherDto.branchIds.length) {
      throw new BadRequestException('One or more branches not found')
    }

    const hashedPassword = await bcrypt.hash(createTeacherDto.password, 12)

    // Create teacher with branch assignments in transaction
    const teacher = await this.prisma.user.create({
      data: {
        name: createTeacherDto.name,
        email: createTeacherDto.email,
        password: hashedPassword,
        phone: createTeacherDto.phone || null,
        role: 'GURU',
        isActive: true,
        branches: {
          create: createTeacherDto.branchIds.map((branchId, index) => ({
            branchId,
            isPrimary: index === 0, // First branch is primary
          })),
        },
      },
      include: {
        branches: {
          include: {
            branch: true,
          },
        },
        sessionsAsTeacher: {
          where: { isActive: true },
          select: { id: true },
        },
      },
    })

    return {
      success: true,
      data: this.formatTeacher(teacher),
      message: 'Teacher created successfully',
    }
  }

  async update(id: string, updateTeacherDto: UpdateTeacherDto) {
    const teacher = await this.prisma.user.findUnique({
      where: { id },
    })

    if (!teacher) {
      throw new NotFoundException('Teacher not found')
    }

    if (teacher.role !== 'GURU') {
      throw new BadRequestException('User is not a teacher')
    }

    // Check email uniqueness if being changed
    if (updateTeacherDto.email && updateTeacherDto.email !== teacher.email) {
      const existing = await this.prisma.user.findUnique({
        where: { email: updateTeacherDto.email },
      })
      if (existing) {
        throw new ConflictException('Email already registered')
      }
    }

    // Update teacher basic info
    const updateData: any = {
      name: updateTeacherDto.name ?? teacher.name,
      email: updateTeacherDto.email ?? teacher.email,
      phone: updateTeacherDto.phone !== undefined ? updateTeacherDto.phone : teacher.phone,
      isActive: updateTeacherDto.isActive ?? teacher.isActive,
    }

    // Handle branch reassignment if provided
    if (updateTeacherDto.branchIds && updateTeacherDto.branchIds.length > 0) {
      // Verify branches exist
      const branches = await this.prisma.branch.findMany({
        where: { id: { in: updateTeacherDto.branchIds } },
      })
      if (branches.length !== updateTeacherDto.branchIds.length) {
        throw new BadRequestException('One or more branches not found')
      }

      // Delete existing UserBranch entries and create new ones
      await this.prisma.userBranch.deleteMany({
        where: { userId: id },
      })

      updateData.branches = {
        create: updateTeacherDto.branchIds.map((branchId, index) => ({
          branchId,
          isPrimary: index === 0,
        })),
      }
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: updateData,
      include: {
        branches: {
          include: {
            branch: true,
          },
        },
        sessionsAsTeacher: {
          where: { isActive: true },
          select: { id: true },
        },
      },
    })

    return {
      success: true,
      data: this.formatTeacher(updated),
      message: 'Teacher updated successfully',
    }
  }

  async remove(id: string) {
    const teacher = await this.prisma.user.findUnique({
      where: { id },
      include: {
        sessionsAsTeacher: {
          where: { isActive: true },
        },
      },
    })

    if (!teacher) {
      throw new NotFoundException('Teacher not found')
    }

    if (teacher.role !== 'GURU') {
      throw new BadRequestException('User is not a teacher')
    }

    // Check if teacher has active sessions
    if (teacher.sessionsAsTeacher.length > 0) {
      throw new BadRequestException(
        `Cannot delete teacher. Teacher has ${teacher.sessionsAsTeacher.length} active session(s). Reassign sessions first.`,
      )
    }

    // Soft delete
    await this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    })

    return {
      success: true,
      data: null,
      message: 'Teacher deleted successfully',
    }
  }

  // Helper: format teacher for response
  private formatTeacher(teacher: any) {
    return {
      id: teacher.id,
      name: teacher.name,
      email: teacher.email,
      phone: teacher.phone,
      role: teacher.role,
      isActive: teacher.isActive,
      createdAt: teacher.createdAt.toISOString(),
      updatedAt: teacher.updatedAt.toISOString(),
      branches: teacher.branches?.map((ub: any) => ({
        id: ub.id,
        branchId: ub.branch.id,
        branchName: ub.branch.name,
        branchCode: ub.branch.code,
        isPrimary: ub.isPrimary,
      })),
      totalSessions: teacher.sessionsAsTeacher?.length || 0,
    }
  }
}
