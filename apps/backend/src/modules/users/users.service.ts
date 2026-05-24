import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from "@nestjs/common"
import { PrismaService } from "@/prisma/prisma.service"
import { UpdateRoleDto } from "./dto/update-role.dto"
import { AssignBranchDto } from "./dto/assign-branch.dto"
import { PaginationMeta } from "@/common/dto/pagination.dto"

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(
    page: number = 1,
    limit: number = 10,
    searchTerm?: string,
    role?: string,
    isActive: boolean = true,
  ) {
    const skip = (page - 1) * limit

    const where: any = { isActive }

    if (role) {
      where.role = role
    }

    if (searchTerm) {
      where.OR = [
        { name: { contains: searchTerm, mode: "insensitive" } },
        { email: { contains: searchTerm, mode: "insensitive" } },
      ]
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: {
          branches: {
            include: {
              branch: true,
            },
          },
          roles: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
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
      data: users.map((u) => this.formatUser(u)),
      pagination,
    }
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        branches: {
          include: {
            branch: true,
          },
        },
        roles: true,
      },
    })

    if (!user) {
      throw new NotFoundException("User not found")
    }

    return {
      success: true,
      data: this.formatUser(user),
    }
  }

  async updateRole(userId: string, updateRoleDto: UpdateRoleDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        branches: {
          include: {
            branch: true,
          },
        },
      },
    })

    if (!user) {
      throw new NotFoundException("User not found")
    }

    if (user.role === "OWNER" && updateRoleDto.role !== "OWNER") {
      throw new ForbiddenException("Cannot change OWNER role")
    }

    if (updateRoleDto.role === "OWNER" && user.role !== "OWNER") {
      const ownerCount = await this.prisma.user.count({
        where: { role: "OWNER" },
      })
      if (ownerCount > 0) {
        throw new BadRequestException("Cannot create another OWNER. Only one OWNER is allowed.")
      }
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { role: updateRoleDto.role as any },
      include: {
        branches: {
          include: {
            branch: true,
          },
        },
      },
    })

    return {
      success: true,
      data: this.formatUser(updated),
      message: "User role updated successfully",
    }
  }

  async assignBranch(userId: string, assignBranchDto: AssignBranchDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        branches: true,
      },
    })

    if (!user) {
      throw new NotFoundException("User not found")
    }

    const branch = await this.prisma.branch.findUnique({
      where: { id: assignBranchDto.branchId },
    })

    if (!branch) {
      throw new NotFoundException("Branch not found")
    }

    const existing = await this.prisma.userBranch.findUnique({
      where: {
        userId_branchId: {
          userId,
          branchId: assignBranchDto.branchId,
        },
      },
    })

    if (existing) {
      throw new BadRequestException("User is already assigned to this branch")
    }

    if (assignBranchDto.isPrimary) {
      await this.prisma.userBranch.updateMany({
        where: { userId },
        data: { isPrimary: false },
      })
    }

    await this.prisma.userBranch.create({
      data: {
        userId,
        branchId: assignBranchDto.branchId,
        isPrimary: assignBranchDto.isPrimary ?? false,
      },
    })

    const updated = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        branches: {
          include: {
            branch: true,
          },
        },
      },
    })

    return {
      success: true,
      data: this.formatUser(updated),
      message: "Branch assigned to user successfully",
    }
  }

  async removeBranch(userId: string, branchId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        branches: true,
      },
    })

    if (!user) {
      throw new NotFoundException("User not found")
    }

    if (user.branches.length <= 1) {
      throw new BadRequestException("User must have at least one branch")
    }

    const userBranch = await this.prisma.userBranch.findUnique({
      where: {
        userId_branchId: {
          userId,
          branchId,
        },
      },
    })

    if (!userBranch) {
      throw new NotFoundException("User is not assigned to this branch")
    }

    await this.prisma.userBranch.delete({
      where: {
        userId_branchId: {
          userId,
          branchId,
        },
      },
    })

    const updated = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        branches: {
          include: {
            branch: true,
          },
        },
      },
    })

    return {
      success: true,
      data: this.formatUser(updated),
      message: "Branch removed from user successfully",
    }
  }

  async deactivateUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      throw new NotFoundException("User not found")
    }

    if (!user.isActive) {
      throw new BadRequestException("User is already inactive")
    }

    if (user.role === "OWNER") {
      throw new ForbiddenException("Cannot deactivate OWNER user")
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
      include: {
        branches: {
          include: {
            branch: true,
          },
        },
      },
    })

    return {
      success: true,
      data: this.formatUser(updated),
      message: "User deactivated successfully",
    }
  }

  async activateUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      throw new NotFoundException("User not found")
    }

    if (user.isActive) {
      throw new BadRequestException("User is already active")
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: true },
      include: {
        branches: {
          include: {
            branch: true,
          },
        },
      },
    })

    return {
      success: true,
      data: this.formatUser(updated),
      message: "User activated successfully",
    }
  }

  async addRole(userId: string, role: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        branches: {
          include: {
            branch: true,
          },
        },
        roles: true,
      },
    })

    if (!user) {
      throw new NotFoundException("User not found")
    }

    // Check if role already exists
    const existingRole = user.roles?.some((ur: any) => ur.role === role)
    if (existingRole) {
      throw new BadRequestException(`User already has ${role} role`)
    }

    // Prevent multiple OWNER assignments
    if (role === "OWNER") {
      const ownerCount = await this.prisma.userRole.count({
        where: { role: "OWNER" },
      })
      if (ownerCount > 0) {
        throw new BadRequestException("Cannot assign OWNER role. Only one OWNER is allowed.")
      }
    }

    // Add the new role
    await this.prisma.userRole.create({
      data: {
        userId,
        role: role as any,
      },
    })

    const updated = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        branches: {
          include: {
            branch: true,
          },
        },
        roles: true,
      },
    })

    return {
      success: true,
      data: this.formatUser(updated),
      message: `Role ${role} added to user successfully`,
    }
  }

  async removeRole(userId: string, role: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        branches: {
          include: {
            branch: true,
          },
        },
        roles: true,
      },
    })

    if (!user) {
      throw new NotFoundException("User not found")
    }

    // Check if role exists
    const existingRole = user.roles?.find((ur: any) => ur.role === role)
    if (!existingRole) {
      throw new BadRequestException(`User does not have ${role} role`)
    }

    // Prevent removing the last role
    if (user.roles.length <= 1) {
      throw new BadRequestException("User must have at least one role")
    }

    // Prevent removing OWNER role if it's the only role
    if (role === "OWNER" && user.roles.length === 1) {
      throw new ForbiddenException("Cannot remove OWNER role")
    }

    // Remove the role
    await this.prisma.userRole.delete({
      where: {
        userId_role: {
          userId,
          role: role as any,
        },
      },
    })

    const updated = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        branches: {
          include: {
            branch: true,
          },
        },
        roles: true,
      },
    })

    return {
      success: true,
      data: this.formatUser(updated),
      message: `Role ${role} removed from user successfully`,
    }
  }

  private formatUser(user: any) {
    // Get all roles - from UserRole table if available, otherwise fall back to primary role
    const roles = user.roles && user.roles.length > 0
      ? user.roles.map((ur: any) => ur.role)
      : [user.role]

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      roles, // Include all roles
      isActive: user.isActive,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      branches: user.branches?.map((ub: any) => ({
        id: ub.branch.id,
        name: ub.branch.name,
        code: ub.branch.code,
        isPrimary: ub.isPrimary,
      })) || [],
    }
  }
}
