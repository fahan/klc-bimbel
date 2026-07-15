import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import * as bcrypt from 'bcryptjs'
import { PrismaService } from '@/prisma/prisma.service'
import { TtlCacheService } from '@/common/cache/ttl-cache.service'
import { AUTH_CACHE_KEYS } from '@/common/cache/cache-keys'
import { LoginDto } from './dto/login.dto'
import { UpdateProfileDto } from './dto/update-profile.dto'
import { ChangePasswordDto } from './dto/change-password.dto'

// Short enough that a stale role/active change self-heals fast even if some
// write path forgets to invalidate; long enough to absorb bursts of requests.
const AUTH_USER_TTL_MS = 30_000

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private cache: TtlCacheService,
  ) {}

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto

    // Find user by email with roles and branches
    const user = await this.prisma.user.findUnique({
      relationLoadStrategy: 'join',
      where: { email },
      include: {
        roles: true,
        branches: { include: { branch: true } },
      },
    })

    if (!user) {
      throw new UnauthorizedException('Invalid credentials')
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User account is inactive')
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials')
    }

    // Get all roles - use UserRole table if available, otherwise fall back to user.role
    const roles = user.roles && user.roles.length > 0
      ? user.roles.map((ur: any) => ur.role)
      : [user.role]

    // Generate JWT token with all roles
    const token = this.jwtService.sign({
      id: user.id,
      email: user.email,
      role: user.role, // Keep for backward compatibility
      roles, // New: array of all roles
    })

    const primaryBranchId = (user as any).branches?.find((ub: any) => ub.isPrimary)?.branchId
      || (user as any).branches?.[0]?.branchId
      || null
    const userBranchIds = (user as any).branches?.map((ub: any) => ub.branchId) || []

    return {
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          roles,
          primaryBranchId,
          userBranchIds,
          isActive: user.isActive,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
        },
        token,
      },
    }
  }

  async validateUser(payload: any) {
    // Runs on EVERY authenticated request (JwtStrategy). Cache the resolved
    // payload per user id so we don't hit the DB each time. Invalidated on any
    // role/branch/active/email change; 30s TTL as a safety net. Note the guard
    // still verifies the JWT signature every request — only the DB lookup is
    // cached, and deactivation/role changes clear the entry immediately.
    return this.cache.wrap(AUTH_CACHE_KEYS.user(payload.id), AUTH_USER_TTL_MS, async () => {
      const user = await this.prisma.user.findUnique({
        relationLoadStrategy: 'join',
        where: { id: payload.id },
        include: {
          roles: true,
          branches: true,
        },
      })

      if (!user || !user.isActive) {
        throw new UnauthorizedException('User not found or inactive')
      }

      // Get all roles from payload or from database
      const roles = payload.roles || (user.roles && user.roles.length > 0
        ? user.roles.map((ur: any) => ur.role)
        : [user.role])

      // Primary branch (used for ADMIN_CABANG branch-scoped access)
      const branchId = (user as any).branches?.find((ub: any) => ub.isPrimary)?.branchId
        || (user as any).branches?.[0]?.branchId
        || null

      return {
        id: user.id,
        email: user.email,
        role: user.role, // Keep for backward compatibility
        roles, // New: array of all roles
        branchId,
      }
    })
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      relationLoadStrategy: 'join',
      where: { id: userId },
      include: {
        roles: true,
        branches: {
          include: { branch: true },
        },
      },
    })

    if (!user) {
      throw new UnauthorizedException('User not found')
    }

    // Get all roles
    const roles = user.roles && user.roles.length > 0
      ? user.roles.map((ur: any) => ur.role)
      : [user.role]

    // Get all assigned branches and primary
    const primaryBranch = user.branches?.find((ub: any) => ub.isPrimary)?.branch || user.branches?.[0]?.branch || null
    const userBranchIds = user.branches?.map((ub: any) => ub.branchId) || []

    return {
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        roles,
        isActive: user.isActive,
        primaryBranchId: primaryBranch?.id || null,
        userBranchIds,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
    }
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    // Check email uniqueness if changing email
    const existing = await this.prisma.user.findFirst({
      where: { email: dto.email, NOT: { id: userId } },
    })
    if (existing) {
      throw new ConflictException('Email sudah digunakan oleh akun lain')
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { name: dto.name, email: dto.email, phone: dto.phone ?? null },
    })

    // Email is part of the cached auth payload — drop it.
    this.cache.delete(AUTH_CACHE_KEYS.user(userId))

    return {
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        updatedAt: user.updatedAt.toISOString(),
      },
      message: 'Profil berhasil diperbarui',
    }
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new UnauthorizedException('User tidak ditemukan')

    const isValid = await bcrypt.compare(dto.currentPassword, user.password)
    if (!isValid) {
      throw new BadRequestException('Password saat ini tidak sesuai')
    }

    const hashed = await bcrypt.hash(dto.newPassword, 10)
    await this.prisma.user.update({ where: { id: userId }, data: { password: hashed } })

    return { success: true, message: 'Password berhasil diubah' }
  }
}
