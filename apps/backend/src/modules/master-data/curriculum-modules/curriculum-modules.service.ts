import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common'
import { PrismaService } from '@/prisma/prisma.service'
import { CreateCurriculumModuleDto } from './dto/create-curriculum-module.dto'
import { UpdateCurriculumModuleDto } from './dto/update-curriculum-module.dto'
import { PaginationMeta } from '@/common/dto/pagination.dto'

@Injectable()
export class CurriculumModulesService {
  constructor(private prisma: PrismaService) {}

  async findAll(page: number = 1, limit: number = 10, filters?: { subjectId?: string }) {
    const skip = (page - 1) * limit

    const [curriculumModules, total] = await Promise.all([
      this.prisma.curriculumModule.findMany({
        where: {
          ...(filters?.subjectId && { subjectId: filters.subjectId }),
        },
        orderBy: [{ subjectId: 'asc' }, { orderNumber: 'asc' }],
        skip,
        take: limit,
      }),
      this.prisma.curriculumModule.count({
        where: {
          ...(filters?.subjectId && { subjectId: filters.subjectId }),
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
      data: curriculumModules.map(m => this.formatModule(m)),
      pagination,
    }
  }

  async findOne(id: string) {
    const curriculumModule = await this.prisma.curriculumModule.findUnique({
      where: { id },
    })

    if (!curriculumModule) {
      throw new NotFoundException('Curriculum module not found')
    }

    return {
      success: true,
      data: this.formatModule(curriculumModule),
    }
  }

  async findBySubject(subjectId: string) {
    // Verify subject exists
    const subject = await this.prisma.subject.findUnique({
      where: { id: subjectId },
    })
    if (!subject) {
      throw new NotFoundException('Subject not found')
    }

    const modules = await this.prisma.curriculumModule.findMany({
      where: {
        subjectId,
      },
      orderBy: { orderNumber: 'asc' },
    })

    return {
      success: true,
      data: modules.map(m => this.formatModule(m)),
    }
  }

  async create(createModuleDto: CreateCurriculumModuleDto) {
    // Verify subject exists
    const subject = await this.prisma.subject.findUnique({
      where: { id: createModuleDto.subjectId },
    })
    if (!subject) {
      throw new BadRequestException('Subject not found')
    }

    // Check for unique constraint on (subjectId, orderNumber)
    const existing = await this.prisma.curriculumModule.findFirst({
      where: {
        subjectId: createModuleDto.subjectId,
        orderNumber: createModuleDto.orderNumber,
      },
    })
    if (existing) {
      throw new BadRequestException('A module with this order number already exists for this subject')
    }

    const module = await this.prisma.curriculumModule.create({
      data: {
        subjectId: createModuleDto.subjectId,
        orderNumber: createModuleDto.orderNumber,
        name: createModuleDto.name,
        totalChapters: createModuleDto.totalChapters,
      },
    })

    return {
      success: true,
      data: this.formatModule(module),
      message: 'Curriculum module created successfully',
    }
  }

  async update(id: string, updateModuleDto: UpdateCurriculumModuleDto) {
    const module = await this.prisma.curriculumModule.findUnique({
      where: { id },
    })

    if (!module) {
      throw new NotFoundException('Curriculum module not found')
    }

    // Verify subject if being updated
    if (updateModuleDto.subjectId) {
      const subject = await this.prisma.subject.findUnique({
        where: { id: updateModuleDto.subjectId },
      })
      if (!subject) {
        throw new BadRequestException('Subject not found')
      }
    }

    // Check unique constraint if subjectId or orderNumber is being updated
    if (updateModuleDto.subjectId || updateModuleDto.orderNumber) {
      const newSubjectId = updateModuleDto.subjectId || module.subjectId
      const newOrderNumber = updateModuleDto.orderNumber || module.orderNumber

      if (newSubjectId !== module.subjectId || newOrderNumber !== module.orderNumber) {
        const existing = await this.prisma.curriculumModule.findFirst({
          where: {
            subjectId: newSubjectId,
            orderNumber: newOrderNumber,
            id: { not: id },
          },
        })
        if (existing) {
          throw new BadRequestException('A module with this order number already exists for this subject')
        }
      }
    }

    const updated = await this.prisma.curriculumModule.update({
      where: { id },
      data: {
        subjectId: updateModuleDto.subjectId || module.subjectId,
        orderNumber: updateModuleDto.orderNumber || module.orderNumber,
        name: updateModuleDto.name || module.name,
        totalChapters: updateModuleDto.totalChapters !== undefined ? updateModuleDto.totalChapters : module.totalChapters,
      },
    })

    return {
      success: true,
      data: this.formatModule(updated),
      message: 'Curriculum module updated successfully',
    }
  }

  async remove(id: string) {
    const module = await this.prisma.curriculumModule.findUnique({
      where: { id },
    })

    if (!module) {
      throw new NotFoundException('Curriculum module not found')
    }

    await this.prisma.curriculumModule.delete({
      where: { id },
    })

    return {
      success: true,
      data: null,
      message: 'Curriculum module deleted successfully',
    }
  }

  async reorder(modules: Array<{ id: string; orderNumber: number }>) {
    const updated = await Promise.all(
      modules.map(m =>
        this.prisma.curriculumModule.update({
          where: { id: m.id },
          data: { orderNumber: m.orderNumber },
        }),
      ),
    )

    return {
      success: true,
      data: updated.map(m => this.formatModule(m)),
      message: 'Curriculum modules reordered successfully',
    }
  }

  private formatModule(module: any) {
    return {
      id: module.id,
      subjectId: module.subjectId,
      orderNumber: module.orderNumber,
      name: module.name,
      totalChapters: module.totalChapters,
      createdAt: module.createdAt.toISOString(),
    }
  }
}
