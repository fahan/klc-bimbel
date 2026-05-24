import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import * as bcrypt from 'bcryptjs'
import { PrismaService } from '@/prisma/prisma.service'
import { LoginDto } from './dto/login.dto'

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto

    // Find user by email with roles
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        roles: true,
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

    return {
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          roles, // Include all roles in response
          isActive: user.isActive,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
        },
        token,
      },
    }
  }

  async validateUser(payload: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.id },
      include: {
        roles: true,
      },
    })

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive')
    }

    // Get all roles from payload or from database
    const roles = payload.roles || (user.roles && user.roles.length > 0
      ? user.roles.map((ur: any) => ur.role)
      : [user.role])

    return {
      id: user.id,
      email: user.email,
      role: user.role, // Keep for backward compatibility
      roles, // New: array of all roles
    }
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: true,
        branches: {
          where: { isPrimary: true },
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

    // Get primary branch if exists
    const primaryBranch = user.branches?.[0]?.branch || null

    return {
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        roles, // Include all roles
        isActive: user.isActive,
        primaryBranchId: primaryBranch?.id || null,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
    }
  }
}
