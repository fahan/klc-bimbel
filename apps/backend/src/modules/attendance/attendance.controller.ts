import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger'
import { AttendanceService } from './attendance.service'
import { SubmitAttendanceDto } from './dto/submit-attendance.dto'
import { SubmitAdHocAttendanceDto, RejectAdHocDto, ApproveAdHocDto } from './dto/submit-adhoc-attendance.dto'
import { SubmitQuickAttendanceDto } from './dto/submit-quick-attendance.dto'
import { AttendanceResponseDto } from './dto/attendance-response.dto'
import { JwtAuthGuard } from '@/common/guards/jwt.guard'
import { RolesGuard } from '@/common/guards/roles.guard'
import { Roles } from '@/common/decorators/roles.decorator'
import { CurrentUser } from '@/common/decorators/current-user.decorator'

@ApiTags('Attendance')
@Controller('attendance')
export class AttendanceController {
  constructor(private attendanceService: AttendanceService) {}

  @Post('submit')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN_GLOBAL', 'ADMIN_CABANG', 'GURU')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Submit attendance for a session',
    description:
      'Records attendance for all students in a session on a specific date. If submitted by non-regular teacher, marked as replacement and commission goes to recording teacher.',
  })
  @ApiResponse({ status: 201, description: 'Attendance submitted successfully', type: AttendanceResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid input or session already recorded' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async submitAttendance(
    @Body() submitDto: SubmitAttendanceDto,
    @CurrentUser() user: any,
  ): Promise<any> {
    return this.attendanceService.submitAttendance(submitDto, user.id, submitDto.substitutionReason)
  }

  @Get('session/:sessionId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get attendance for a session on specific date',
    description: 'Returns the session log and attendances for a session on a given date.',
  })
  @ApiResponse({ status: 200, description: 'Session log retrieved', type: AttendanceResponseDto })
  async getSessionLog(
    @Param('sessionId') sessionId: string,
    @Query('date') date: string,
  ): Promise<any> {
    return this.attendanceService.getSessionLog(sessionId, date)
  }

  @Get('history/:sessionId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get attendance history for a session',
    description: 'Returns all session logs and attendances for a session, ordered by date.',
  })
  @ApiResponse({ status: 200, description: 'History retrieved', type: AttendanceResponseDto })
  async getHistory(@Param('sessionId') sessionId: string): Promise<any> {
    return this.attendanceService.getAttendanceHistory(sessionId)
  }

  @Get('report')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN_GLOBAL', 'ADMIN_CABANG')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get attendance report with filters',
    description:
      'Returns paginated attendance report with optional filters by date range, branch, and teacher. Includes summary statistics.',
  })
  @ApiResponse({ status: 200, description: 'Report retrieved successfully' })
  async getAttendanceReport(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('branchId') branchId?: string,
    @Query('teacherId') teacherId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<any> {
    return this.attendanceService.getAttendanceReport({
      dateFrom,
      dateTo,
      branchId,
      teacherId,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
    })
  }

  // ========== AD-HOC ATTENDANCE ENDPOINTS ==========

  @Post('adhoc')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN_GLOBAL', 'ADMIN_CABANG', 'GURU')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Submit ad-hoc (darurat) attendance',
    description:
      'Guru submits attendance for a session that is not in the regular schedule. Creates a session log with PENDING_APPROVAL status awaiting admin review before being counted in commission.',
  })
  @ApiResponse({ status: 201, description: 'Ad-hoc attendance submitted, pending admin approval' })
  async submitAdHoc(
    @Body() dto: SubmitAdHocAttendanceDto,
    @CurrentUser() user: any,
  ): Promise<any> {
    return this.attendanceService.submitAdHocAttendance(dto, user.id)
  }

  @Post('quick')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN_GLOBAL', 'ADMIN_CABANG', 'GURU')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Submit Presensi Cepat (tap-tap attendance)',
    description:
      'Teacher submits students + statuses only. Subject resolved from enrollments, ' +
      'date/time from submission time, duration 30min. Students grouped per subject into ' +
      'separate PENDING_APPROVAL session logs. Duplicate same-day submissions are flagged, not blocked.',
  })
  @ApiResponse({ status: 201, description: 'Attendance recorded, pending admin approval' })
  async submitQuick(
    @Body() dto: SubmitQuickAttendanceDto,
    @CurrentUser() user: any,
  ): Promise<any> {
    return this.attendanceService.submitQuickAttendance(dto, user.id)
  }

  @Get('log/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get a session log by ID (supports both regular and ad-hoc)',
    description: 'Returns session log details including subject info and attendance list. Used by progress input pages.',
  })
  async getSessionLogById(@Param('id') id: string): Promise<any> {
    return this.attendanceService.getSessionLogById(id)
  }

  @Get('adhoc/pending')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN_GLOBAL', 'ADMIN_CABANG')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get pending ad-hoc sessions awaiting approval',
    description: 'Returns all ad-hoc session logs with status PENDING_APPROVAL. Filter by branchId for ADMIN_CABANG.',
  })
  async getAdHocPending(@Query('branchId') branchId?: string): Promise<any> {
    return this.attendanceService.getAdHocPending(branchId)
  }

  @Get('adhoc/my-history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current teacher\'s ad-hoc submission history' })
  async getMyAdHocHistory(@CurrentUser() user: any): Promise<any> {
    return this.attendanceService.getMyAdHocHistory(user.id)
  }

  @Get('adhoc/eligible-students')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get students eligible for ad-hoc session',
    description: 'Returns students enrolled in a given subject at a given branch.',
  })
  async getEligibleStudents(
    @Query('branchId') branchId: string,
    @Query('subjectId') subjectId: string,
  ): Promise<any> {
    return this.attendanceService.getEligibleStudents(branchId, subjectId)
  }

  @Patch('adhoc/:id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN_GLOBAL', 'ADMIN_CABANG')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Approve an ad-hoc session',
    description:
      'Admin approves a PENDING_APPROVAL ad-hoc session. Status changes to COMPLETED. ' +
      'Optionally pass generateSchedule:true to create a recurring session from this ad-hoc. ' +
      'Schedule conflicts return a warning but approval always succeeds.',
  })
  async approveAdHoc(
    @Param('id') id: string,
    @Body() dto: ApproveAdHocDto,
    @CurrentUser() user: any,
  ): Promise<any> {
    return this.attendanceService.approveAdHoc(id, user.id, {
      generateSchedule: dto.generateSchedule,
      sessionType: dto.sessionType,
    })
  }

  @Patch('adhoc/:id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN_GLOBAL', 'ADMIN_CABANG')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Reject an ad-hoc session',
    description: 'Admin rejects a PENDING_APPROVAL ad-hoc session with a reason. Status changes to REJECTED and will NOT be counted in commission.',
  })
  async rejectAdHoc(
    @Param('id') id: string,
    @Body() dto: RejectAdHocDto,
    @CurrentUser() user: any,
  ): Promise<any> {
    return this.attendanceService.rejectAdHoc(id, user.id, dto.reason)
  }
}
