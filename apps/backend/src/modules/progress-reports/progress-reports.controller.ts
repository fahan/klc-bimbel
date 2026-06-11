import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery } from '@nestjs/swagger'
import { ProgressReportsService } from './progress-reports.service'
import { CreateReportLinkDto } from './dto/create-report-link.dto'
import { JwtAuthGuard } from '@/common/guards/jwt.guard'
import { RolesGuard } from '@/common/guards/roles.guard'
import { Roles } from '@/common/decorators/roles.decorator'
import { CurrentUser } from '@/common/decorators/current-user.decorator'

@ApiTags('Progress Reports')
@Controller('progress-reports')
export class ProgressReportsController {
  constructor(private service: ProgressReportsService) {}

  // ===== PUBLIC ENDPOINT (no auth) =====
  @Get('public/:token')
  @ApiOperation({
    summary: 'Get progress report by token (PUBLIC)',
    description: 'Public endpoint for parents to view student progress via shared link.',
  })
  @ApiResponse({ status: 200, description: 'Report retrieved' })
  @ApiResponse({ status: 404, description: 'Report not found' })
  async findByToken(@Param('token') token: string): Promise<any> {
    return this.service.findByToken(token)
  }

  // ===== ADMIN ENDPOINTS =====
  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List progress report links' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['ACTIVE', 'EXPIRING_SOON', 'EXPIRED', 'PERMANENT'],
  })
  @ApiQuery({ name: 'branchId', required: false })
  @ApiQuery({ name: 'studentId', required: false })
  async findAll(
    @Query('branchId') branchId?: string,
    @Query('status') status?: string,
    @Query('studentId') studentId?: string,
  ): Promise<any> {
    return this.service.findAll({ branchId, status, studentId })
  }

  @Get('metrics')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get progress report metrics' })
  async getMetrics(@Query('branchId') branchId?: string): Promise<any> {
    return this.service.getMetrics(branchId)
  }

  @Get('student/:studentId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN_GLOBAL', 'ADMIN_CABANG')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'View student progress in-app (admin)',
    description:
      'Returns the same per-subject progress payload as the public report, but authenticated and without generating a share link. Defaults to all active enrollments.',
  })
  @ApiQuery({ name: 'subjectIds', required: false, description: 'Comma-separated subject ids' })
  @ApiResponse({ status: 200, description: 'Progress retrieved' })
  @ApiResponse({ status: 404, description: 'Student not found' })
  async getStudentReport(
    @Param('studentId') studentId: string,
    @CurrentUser() user: any,
    @Query('subjectIds') subjectIds?: string,
  ): Promise<any> {
    return this.service.getStudentReportForAdmin(studentId, subjectIds, user)
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN_GLOBAL', 'ADMIN_CABANG')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Generate new progress report link',
    description: 'Creates a public-shareable link for parent to view student progress.',
  })
  @ApiResponse({ status: 201, description: 'Link generated' })
  async create(@Body() dto: CreateReportLinkDto, @CurrentUser() user: any): Promise<any> {
    return this.service.create(dto, user.id)
  }

  @Post(':id/revoke')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN_GLOBAL', 'ADMIN_CABANG')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke an active link' })
  async revoke(@Param('id') id: string): Promise<any> {
    return this.service.revoke(id)
  }

  @Post(':id/renew')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN_GLOBAL', 'ADMIN_CABANG')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Renew/extend an expired or expiring link' })
  async renew(
    @Param('id') id: string,
    @Body() body: { durationDays: number },
  ): Promise<any> {
    return this.service.renew(id, body.durationDays)
  }
}
