import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common'
import { PrismaService } from '@/prisma/prisma.service'
import { CreateSubjectDto } from './dto/create-subject.dto'
import { UpdateSubjectDto } from './dto/update-subject.dto'
import { PaginationMeta } from '@/common/dto/pagination.dto'

@Injectable()
export class SubjectsService {
  constructor(private prisma: PrismaService) {}

  async findAll(page: number = 1, limit: number = 10, filters?: { trackingType?: string }) {
    const skip = (page - 1) * limit

    const [subjects, total] = await Promise.all([
      this.prisma.subject.findMany({
        where: {
          isActive: true,
          ...(filters?.trackingType && { trackingType: filters.trackingType as any }),
        },
        include: {
          sppRates: true,
          curriculumModules: { orderBy: { orderNumber: 'asc' } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.subject.count({
        where: {
          isActive: true,
          ...(filters?.trackingType && { trackingType: filters.trackingType as any }),
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
      data: subjects.map(s => this.formatSubject(s)),
      pagination,
    }
  }

  async findOne(id: string) {
    const subject = await this.prisma.subject.findUnique({
      where: { id },
      include: {
        sppRates: true,
        curriculumModules: { orderBy: { orderNumber: 'asc' } },
      },
    })

    if (!subject) {
      throw new NotFoundException('Subject not found')
    }

    return {
      success: true,
      data: this.formatSubject(subject),
    }
  }

  async create(createSubjectDto: CreateSubjectDto) {
    // Check for unique code
    const existingByCode = await this.prisma.subject.findUnique({
      where: { code: createSubjectDto.code },
    })
    if (existingByCode) {
      throw new BadRequestException('Subject code already exists')
    }

    const subject = await this.prisma.subject.create({
      data: {
        name: createSubjectDto.name,
        code: createSubjectDto.code,
        trackingType: createSubjectDto.trackingType,
        maxCapacityRegular: createSubjectDto.capacity || 3,
        maxCapacityPrivate: createSubjectDto.maxCapacity || 1,
      },
    })

    return {
      success: true,
      data: this.formatSubject(subject),
      message: 'Subject created successfully',
    }
  }

  async update(id: string, updateSubjectDto: UpdateSubjectDto) {
    const subject = await this.prisma.subject.findUnique({
      where: { id },
    })

    if (!subject) {
      throw new NotFoundException('Subject not found')
    }

    // Check unique code if being updated
    if (updateSubjectDto.code && updateSubjectDto.code !== subject.code) {
      const existingByCode = await this.prisma.subject.findUnique({
        where: { code: updateSubjectDto.code },
      })
      if (existingByCode) {
        throw new BadRequestException('Subject code already exists')
      }
    }

    const updated = await this.prisma.subject.update({
      where: { id },
      data: {
        name: updateSubjectDto.name || subject.name,
        code: updateSubjectDto.code || subject.code,
        trackingType: updateSubjectDto.trackingType || subject.trackingType,
        maxCapacityRegular: updateSubjectDto.capacity !== undefined ? updateSubjectDto.capacity : subject.maxCapacityRegular,
        maxCapacityPrivate: updateSubjectDto.maxCapacity !== undefined ? updateSubjectDto.maxCapacity : subject.maxCapacityPrivate,
      },
      include: {
        sppRates: true,
        curriculumModules: { orderBy: { orderNumber: 'asc' } },
      },
    })

    return {
      success: true,
      data: this.formatSubject(updated),
      message: 'Subject updated successfully',
    }
  }

  async remove(id: string) {
    const subject = await this.prisma.subject.findUnique({
      where: { id },
    })

    if (!subject) {
      throw new NotFoundException('Subject not found')
    }

    const updated = await this.prisma.subject.update({
      where: { id },
      data: { isActive: false },
    })

    return {
      success: true,
      data: this.formatSubject(updated),
      message: 'Subject deleted successfully',
    }
  }

  private formatSubject(subject: any) {
    return {
      id: subject.id,
      name: subject.name,
      code: subject.code,
      trackingType: subject.trackingType,
      maxCapacityRegular: subject.maxCapacityRegular,
      maxCapacityPrivate: subject.maxCapacityPrivate,
      isActive: subject.isActive,
      createdAt: subject.createdAt.toISOString(),
      ...(subject.sppRates && { sppRates: subject.sppRates }),
      ...(subject.curriculumModules && { curriculumModules: subject.curriculumModules }),
    }
  }
}
