import { Controller, Post, Get, Patch, Body, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { STRICT_THROTTLE } from '@/common/config/throttler.config'
import { AuthService } from './auth.service'
import { LoginDto } from './dto/login.dto'
import { UpdateProfileDto } from './dto/update-profile.dto'
import { ChangePasswordDto } from './dto/change-password.dto'
import { AuthResponseDto, GetMeResponseDto } from './dto/auth-response.dto'
import { JwtAuthGuard } from '@/common/guards/jwt.guard'
import { RolesGuard } from '@/common/guards/roles.guard'
import { CurrentUser } from '@/common/decorators/current-user.decorator'
import { Roles } from '@/common/decorators/roles.decorator'

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @Throttle(STRICT_THROTTLE)
  @ApiOperation({ summary: 'Login dengan email dan password' })
  @ApiResponse({
    status: 201,
    description: 'Login successful',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials',
  })
  async login(@Body() loginDto: LoginDto): Promise<any> {
    return this.authService.login(loginDto)
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user info' })
  @ApiResponse({
    status: 200,
    description: 'User info retrieved',
    type: GetMeResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async getMe(@CurrentUser() user: any): Promise<any> {
    return this.authService.getMe(user.id)
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update profil pengguna (nama, email, phone)' })
  @ApiResponse({ status: 200, description: 'Profil berhasil diperbarui' })
  @ApiResponse({ status: 409, description: 'Email sudah digunakan' })
  async updateProfile(@Body() dto: UpdateProfileDto, @CurrentUser() user: any): Promise<any> {
    return this.authService.updateProfile(user.id, dto)
  }

  @Patch('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Ubah password pengguna' })
  @ApiResponse({ status: 200, description: 'Password berhasil diubah' })
  @ApiResponse({ status: 400, description: 'Password saat ini salah' })
  async changePassword(@Body() dto: ChangePasswordDto, @CurrentUser() user: any): Promise<any> {
    return this.authService.changePassword(user.id, dto)
  }

  @Get('test-owner-only')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Test endpoint - OWNER only' })
  @ApiResponse({
    status: 200,
    description: 'Access granted for OWNER',
  })
  @ApiResponse({
    status: 403,
    description: 'Access denied - user is not OWNER',
  })
  testOwnerOnly(@CurrentUser() user: any) {
    return {
      success: true,
      message: 'You have OWNER access',
      user: user,
    }
  }

  @Get('test-admin-only')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN_GLOBAL', 'ADMIN_CABANG')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Test endpoint - ADMIN only (OWNER, ADMIN_GLOBAL, ADMIN_CABANG)' })
  @ApiResponse({
    status: 200,
    description: 'Access granted for ADMIN',
  })
  @ApiResponse({
    status: 403,
    description: 'Access denied - user is not ADMIN',
  })
  testAdminOnly(@CurrentUser() user: any) {
    return {
      success: true,
      message: 'You have ADMIN access',
      user: user,
    }
  }
}
