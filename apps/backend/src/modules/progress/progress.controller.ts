import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery } from '@nestjs/swagger'
import { ProgressService } from './progress.service'
import { SubmitProgressDto } from './dto/submit-progress.dto'
import { JwtAuthGuard } from '@/common/guards/jwt.guard'
import { RolesGuard } from '@/common/guards/roles.guard'
import { Roles } from '@/common/decorators/roles.decorator'
import { CurrentUser } from '@/common/decorators/current-user.decorator'

@ApiTags('Progress')
@Controller('progress')
export class ProgressController {
  constructor(private progressService: ProgressService) {}

  @Post('submit')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN_GLOBAL', 'ADMIN_CABANG', 'GURU')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Submit progress for a session',
    description:
      'Records learning progress for students. Two modes: MODULE_BASED (track chapter progress per student) or FREE_MATERIAL (one topic for all + per-student predicate).',
  })
  @ApiResponse({ status: 201, description: 'Progress recorded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 404, description: 'Session log not found' })
  async submitProgress(@Body() submitDto: SubmitProgressDto, @CurrentUser() user: any): Promise<any> {
    return this.progressService.submitProgress(submitDto, user.id)
  }

  @Get('student/:studentId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get progress history for a student',
    description: 'Returns all progress logs and module summary for a student. Optionally filter by subjectId.',
  })
  @ApiQuery({ name: 'subjectId', required: false })
  @ApiResponse({ status: 200, description: 'Progress retrieved' })
  async getStudentProgress(
    @Param('studentId') studentId: string,
    @Query('subjectId') subjectId?: string,
  ): Promise<any> {
    return this.progressService.getStudentProgress(studentId, subjectId)
  }

  @Get('student/:studentId/last-module/:subjectId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Get student's current/next module for a subject",
    description: 'Returns the currently in-progress module or the next module to start. Used by guru mobile during progress input.',
  })
  @ApiResponse({ status: 200, description: 'Last module retrieved' })
  async getStudentLastModule(
    @Param('studentId') studentId: string,
    @Param('subjectId') subjectId: string,
  ): Promise<any> {
    return this.progressService.getStudentLastModule(studentId, subjectId)
  }
}
