import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger'
import { AttendanceService } from './attendance.service'
import { SubmitAttendanceDto } from './dto/submit-attendance.dto'
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
}
