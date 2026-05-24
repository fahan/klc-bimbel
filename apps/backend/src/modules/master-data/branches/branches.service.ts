import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common'
import { PrismaService } from '@/prisma/prisma.service'
import { CreateBranchDto } from './dto/create-branch.dto'
import { UpdateBranchDto } from './dto/update-branch.dto'
import { Role } from '@prisma/client'
import { PaginationMeta } from '@/common/dto/pagination.dto'

@Injectable()
export class BranchesService {
  constructor(private prisma: PrismaService) {}

  async getAllSystemBranches() {
    const branches = await this.prisma.branch.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
    })

    return {
      success: true,
      data: branches.map(b => this.formatBranch(b)),
    }
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    userId: string,
    userRole: Role,
    userBranchId?: string,
  ) {
    const skip = (page - 1) * limit

    // OWNER and ADMIN_GLOBAL can see all branches
    // ADMIN_CABANG can only see their own branch
    if (userRole === Role.OWNER || userRole === Role.ADMIN_GLOBAL) {
      const [branches, total] = await Promise.all([
        this.prisma.branch.findMany({
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        this.prisma.branch.count({
          where: { isActive: true },
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
        data: branches.map(b => this.formatBranch(b)),
        pagination,
      }
    } else if (userRole === Role.ADMIN_CABANG && userBranchId) {
      const branch = await this.prisma.branch.findUnique({
        where: { id: userBranchId },
      })
      if (!branch) {
        throw new NotFoundException('Branch not found')
      }

      const pagination: PaginationMeta = {
        page,
        limit,
        total: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      }

      return {
        success: true,
        data: [this.formatBranch(branch)],
        pagination,
      }
    }

    throw new ForbiddenException('You do not have access to view branches')
  }

  async findOne(id: string) {
    const branch = await this.prisma.branch.findUnique({
      where: { id },
    })

    if (!branch) {
      throw new NotFoundException('Branch not found')
    }

    return {
      success: true,
      data: this.formatBranch(branch),
    }
  }

  async create(createBranchDto: CreateBranchDto) {
    // Check for unique constraints
    const existingByName = await this.prisma.branch.findUnique({
      where: { name: createBranchDto.name },
    })
    if (existingByName) {
      throw new BadRequestException('Branch name already exists')
    }

    const existingByCode = await this.prisma.branch.findUnique({
      where: { code: createBranchDto.code },
    })
    if (existingByCode) {
      throw new BadRequestException('Branch code already exists')
    }

    const branch = await this.prisma.branch.create({
      data: {
        name: createBranchDto.name,
        code: createBranchDto.code,
        address: createBranchDto.address || null,
        phone: createBranchDto.phone || null,
        isActive: true,
      },
    })

    return {
      success: true,
      data: this.formatBranch(branch),
      message: 'Branch created successfully',
    }
  }

  async update(id: string, updateBranchDto: UpdateBranchDto) {
    const branch = await this.prisma.branch.findUnique({
      where: { id },
    })

    if (!branch) {
      throw new NotFoundException('Branch not found')
    }

    // Check unique constraints for name and code if they're being updated
    if (updateBranchDto.name && updateBranchDto.name !== branch.name) {
      const existingByName = await this.prisma.branch.findUnique({
        where: { name: updateBranchDto.name },
      })
      if (existingByName) {
        throw new BadRequestException('Branch name already exists')
      }
    }

    if (updateBranchDto.code && updateBranchDto.code !== branch.code) {
      const existingByCode = await this.prisma.branch.findUnique({
        where: { code: updateBranchDto.code },
      })
      if (existingByCode) {
        throw new BadRequestException('Branch code already exists')
      }
    }

    const updated = await this.prisma.branch.update({
      where: { id },
      data: {
        name: updateBranchDto.name || branch.name,
        code: updateBranchDto.code || branch.code,
        address: updateBranchDto.address !== undefined ? updateBranchDto.address : branch.address,
        phone: updateBranchDto.phone !== undefined ? updateBranchDto.phone : branch.phone,
      },
    })

    return {
      success: true,
      data: this.formatBranch(updated),
      message: 'Branch updated successfully',
    }
  }

  async remove(id: string) {
    const branch = await this.prisma.branch.findUnique({
      where: { id },
    })

    if (!branch) {
      throw new NotFoundException('Branch not found')
    }

    const updated = await this.prisma.branch.update({
      where: { id },
      data: { isActive: false },
    })

    return {
      success: true,
      data: this.formatBranch(updated),
      message: 'Branch deleted successfully',
    }
  }

  private formatBranch(branch: any) {
    return {
      id: branch.id,
      name: branch.name,
      code: branch.code,
      address: branch.address,
      phone: branch.phone,
      isActive: branch.isActive,
      createdAt: branch.createdAt.toISOString(),
      updatedAt: branch.updatedAt.toISOString(),
    }
  }
}
