import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery } from '@nestjs/swagger'
import { SessionsService } from './sessions.service'
import { CreateSessionDto } from './dto/create-session.dto'
import { CreateBulkSessionsDto } from './dto/create-bulk-sessions.dto'
import { CreateCombinedSessionDto } from './dto/create-combined-session.dto'
import { UpdateSessionDto } from './dto/update-session.dto'
import { UpdateSessionWithStudentsDto } from './dto/update-session-with-students.dto'
import { SessionResponseDto } from './dto/session-response.dto'
import { GenerateRecommendationDto } from './dto/generate-recommendation.dto'
import { ApplyRecommendationDto } from './dto/apply-recommendation.dto'
import { JwtAuthGuard } from '@/common/guards/jwt.guard'
import { RolesGuard } from '@/common/guards/roles.guard'
import { Roles } from '@/common/decorators/roles.decorator'
import { CurrentUser } from '@/common/decorators/current-user.decorator'

@ApiTags('Sessions')
@Controller('sessions')
export class SessionsController {
  constructor(private sessionsService: SessionsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List sessions (paginated)',
    description: 'Get paginated list of all active sessions. Filter by branchId, teacherId, subjectId, or dayOfWeek.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'branchId', required: false })
  @ApiQuery({ name: 'teacherId', required: false })
  @ApiQuery({ name: 'subjectId', required: false })
  @ApiQuery({ name: 'dayOfWeek', required: false })
  @ApiResponse({ status: 200, description: 'Sessions retrieved successfully', type: SessionResponseDto })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('branchId') branchId?: string,
    @Query('teacherId') teacherId?: string,
    @Query('subjectId') subjectId?: string,
    @Query('dayOfWeek') dayOfWeek?: string,
  ): Promise<any> {
    return this.sessionsService.findAll(page || 1, limit || 10, {
      branchId,
      teacherId,
      subjectId,
      dayOfWeek,
    })
  }

  @Get('today/me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Get today's sessions for current teacher",
    description: 'Returns sessions scheduled for today for the logged-in teacher (GURU role).',
  })
  @ApiResponse({ status: 200, description: "Today's sessions retrieved successfully" })
  async findTodayForCurrentTeacher(@CurrentUser() user: any): Promise<any> {
    return this.sessionsService.findTodaySessionsForTeacher(user.id)
  }

  @Get('available-for-substitution')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get sessions available for teacher substitution',
    description:
      'Search for sessions that need coverage. Filter by branch, teacher name, or student name. Returns today\'s sessions only.',
  })
  @ApiQuery({ name: 'branchId', required: false })
  @ApiQuery({ name: 'searchType', required: false, enum: ['guru', 'siswa'] })
  @ApiQuery({ name: 'searchQuery', required: false })
  @ApiResponse({ status: 200, description: 'Available sessions retrieved successfully' })
  async getAvailableForSubstitution(
    @CurrentUser() user: any,
    @Query('branchId') branchId?: string,
    @Query('searchType') searchType?: 'guru' | 'siswa',
    @Query('searchQuery') searchQuery?: string,
  ): Promise<any> {
    return this.sessionsService.findAvailableForSubstitution(user.id, {
      branchId,
      searchType,
      searchQuery,
    })
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get session detail',
    description: 'Retrieve detail of a session including enrolled students and capacity info.',
  })
  @ApiResponse({ status: 200, description: 'Session retrieved successfully', type: SessionResponseDto })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async findOne(@Param('id') id: string): Promise<any> {
    return this.sessionsService.findOne(id)
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN_GLOBAL', 'ADMIN_CABANG')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create new session',
    description: 'Create a new weekly session schedule. Validates teacher availability for time conflicts.',
  })
  @ApiResponse({ status: 201, description: 'Session created successfully', type: SessionResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid input or time conflict' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async create(@Body() createSessionDto: CreateSessionDto): Promise<any> {
    return this.sessionsService.create(createSessionDto)
  }

  @Post('create-bulk')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN_GLOBAL', 'ADMIN_CABANG')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create multiple sessions at once',
    description: 'Create 1-10 sessions in a single atomic transaction. All sessions share the same subject, teacher, type, and duration. Validates for conflicts within the request and with existing sessions.',
  })
  @ApiResponse({ status: 201, description: 'Sessions created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input or conflicts detected' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async createBulk(@Body() createBulkDto: CreateBulkSessionsDto): Promise<any> {
    return this.sessionsService.bulkCreate(createBulkDto)
  }

  @Post('create-combined')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN_GLOBAL', 'ADMIN_CABANG')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create combined session (2 subjects)',
    description: 'Create a session combining exactly 2 different subjects for the same time slot. Capacity uses MIN of both subjects. Useful for efficiency when combining subjects like AHE + ASE at same time.',
  })
  @ApiResponse({ status: 201, description: 'Combined session created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input, capacity mismatch, or conflicts detected' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async createCombined(
    @Body() createCombinedDto: CreateCombinedSessionDto,
    @CurrentUser() user: any,
  ): Promise<any> {
    return this.sessionsService.createCombined(createCombinedDto, user.id)
  }

  @Post('recommendations/generate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN_GLOBAL', 'ADMIN_CABANG')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Generate schedule recommendation (preview, no writes)',
    description:
      'Auto-maps enrolled students to teachers across active hours/days (with optional break), balancing teacher load. Read-only: returns proposals to preview before applying.',
  })
  @ApiResponse({ status: 201, description: 'Recommendation generated' })
  @ApiResponse({ status: 404, description: 'Branch not found' })
  async generateRecommendation(@Body() dto: GenerateRecommendationDto): Promise<any> {
    return this.sessionsService.generateRecommendation(dto)
  }

  @Post('recommendations/apply')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN_GLOBAL', 'ADMIN_CABANG')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Apply selected schedule recommendations',
    description:
      'Creates sessions for the selected valid proposals in one transaction. Stale/conflicting proposals are skipped and reported. FULL_REGENERATE archives existing sessions without attendance history.',
  })
  @ApiResponse({ status: 201, description: 'Recommendations applied' })
  @ApiResponse({ status: 404, description: 'Branch not found' })
  async applyRecommendation(@Body() dto: ApplyRecommendationDto): Promise<any> {
    return this.sessionsService.applyRecommendation(dto)
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN_GLOBAL', 'ADMIN_CABANG')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update session',
    description: 'Update session details. Validates teacher availability when changing time.',
  })
  @ApiResponse({ status: 200, description: 'Session updated successfully', type: SessionResponseDto })
  @ApiResponse({ status: 400, description: 'Time conflict' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async update(@Param('id') id: string, @Body() updateSessionDto: UpdateSessionDto): Promise<any> {
    return this.sessionsService.update(id, updateSessionDto)
  }

  @Put(':id/with-students')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN_GLOBAL', 'ADMIN_CABANG')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update session with student assignment',
    description: 'Update session details and optionally assign/remove students. Student count must not exceed subject capacity. Students are auto-enrolled to the subject when assigned.',
  })
  @ApiResponse({ status: 200, description: 'Session updated with students successfully', type: SessionResponseDto })
  @ApiResponse({ status: 400, description: 'Capacity exceeded, invalid students, or subject not found' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async updateWithStudents(@Param('id') id: string, @Body() updateDto: UpdateSessionWithStudentsDto): Promise<any> {
    return this.sessionsService.updateSessionWithStudents(id, updateDto)
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN_GLOBAL', 'ADMIN_CABANG')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Soft-delete session (archive)',
    description: 'Soft delete a session (set isActive=false). Preserves all history. Cannot delete if students are enrolled.',
  })
  @ApiResponse({ status: 200, description: 'Session archived successfully' })
  @ApiResponse({ status: 400, description: 'Cannot delete session with active students' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async remove(@Param('id') id: string): Promise<any> {
    return this.sessionsService.remove(id)
  }

  @Delete(':id/hard-delete')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN_GLOBAL')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Hard-delete session (permanent)',
    description: 'Permanently delete a session from database. ONLY for sessions with NO attendance records. OWNER/ADMIN_GLOBAL only. This action cannot be undone!',
  })
  @ApiResponse({ status: 200, description: 'Session permanently deleted' })
  @ApiResponse({ status: 400, description: 'Cannot hard-delete session with attendance records or enrolled students' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async hardDelete(@Param('id') id: string): Promise<any> {
    return this.sessionsService.hardDelete(id)
  }
}
