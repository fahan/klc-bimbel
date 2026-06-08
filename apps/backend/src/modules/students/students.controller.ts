import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiConsumes, ApiQuery } from '@nestjs/swagger'
import { StudentsService } from './students.service'
import { CreateStudentDto } from './dto/create-student.dto'
import { UpdateStudentDto } from './dto/update-student.dto'
import { StudentResponseDto } from './dto/student-response.dto'
import { EnrollmentRequestDto, EnrollmentResponseDto, AddSubjectDto, AddSubjectResponseDto, UpdateSubjectDto, UpdateSubjectResponseDto, EndEnrollmentDto, UpdateSubjectDiscountDto } from './dto/enrollment.dto'
import { JwtAuthGuard } from '@/common/guards/jwt.guard'
import { RolesGuard } from '@/common/guards/roles.guard'
import { Roles } from '@/common/decorators/roles.decorator'
import { CurrentUser } from '@/common/decorators/current-user.decorator'

@ApiTags('Students')
@Controller('students')
export class StudentsController {
  constructor(private studentsService: StudentsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'branchId', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, enum: ['true', 'false', 'all'], description: 'Filter by active status. Default: true' })
  @ApiOperation({
    summary: 'List all students (paginated)',
    description: 'Get paginated list of students. Optional filter by branchId, search by name, and isActive status (true/false/all).',
  })
  @ApiResponse({
    status: 200,
    description: 'Students retrieved successfully',
    type: StudentResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('branchId') branchId?: string,
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
  ): Promise<any> {
    return this.studentsService.findAll(page || 1, limit || 10, branchId, search, isActive)
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get student details by ID',
    description: 'Retrieve complete student profile including all enrolled subjects, SPP rates, and enrollment dates',
  })
  @ApiResponse({
    status: 200,
    description: 'Student details retrieved successfully',
    type: StudentResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 404,
    description: 'Student not found',
  })
  async findOne(@Param('id') id: string): Promise<any> {
    return this.studentsService.findOne(id)
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN_GLOBAL', 'ADMIN_CABANG')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create new student',
    description: 'Register new student with basic information. Student will be assigned to specified branch.',
  })
  @ApiResponse({
    status: 201,
    description: 'Student created successfully',
    type: StudentResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or branch not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions (only OWNER, ADMIN_GLOBAL, ADMIN_CABANG)',
  })
  async create(@Body() createStudentDto: CreateStudentDto): Promise<any> {
    return this.studentsService.create(createStudentDto)
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN_GLOBAL', 'ADMIN_CABANG')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update student information',
    description: 'Update student profile data (name, class level, parent contact). Does not affect enrollment or SPP rates.',
  })
  @ApiResponse({
    status: 200,
    description: 'Student updated successfully',
    type: StudentResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions',
  })
  @ApiResponse({
    status: 404,
    description: 'Student not found',
  })
  async update(
    @Param('id') id: string,
    @Body() updateStudentDto: UpdateStudentDto,
  ): Promise<any> {
    return this.studentsService.update(id, updateStudentDto)
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN_GLOBAL', 'ADMIN_CABANG')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete student',
    description: 'Soft delete student (mark as inactive). Student data and enrollment history are preserved.',
  })
  @ApiResponse({
    status: 200,
    description: 'Student deleted successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions',
  })
  @ApiResponse({
    status: 404,
    description: 'Student not found',
  })
  async remove(@Param('id') id: string): Promise<any> {
    return this.studentsService.remove(id)
  }

  // Enrollment endpoints
  @Post(':id/enroll')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN_GLOBAL', 'ADMIN_CABANG')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Enroll student to subjects and sessions',
    description: 'Enroll student to one or more subjects with selected sessions. SPP rates are locked on enrollment date. Registration fee is applied.',
  })
  @ApiResponse({
    status: 200,
    description: 'Student enrolled successfully with cost summary',
    type: EnrollmentResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid subject, session, or SPP rate not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions',
  })
  async enrollStudent(
    @Param('id') id: string,
    @Body() enrollmentRequestDto: EnrollmentRequestDto,
  ): Promise<any> {
    return this.studentsService.enrollStudent(id, enrollmentRequestDto)
  }

  // Subject management endpoints
  @Post(':id/add-subject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN_GLOBAL', 'ADMIN_CABANG')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Add new subject to existing student',
    description: 'Add a single subject to a student who is already enrolled. Charges registration fee (200k) + SPP rate. SPP rate is locked on this date.',
  })
  @ApiResponse({
    status: 200,
    description: 'Subject added successfully with cost summary',
    type: AddSubjectResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Subject already enrolled, invalid subject, or no active SPP rate',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 404,
    description: 'Student not found',
  })
  async addSubject(
    @Param('id') studentId: string,
    @Body() addSubjectDto: AddSubjectDto,
  ): Promise<any> {
    return this.studentsService.addSubjectEnrollment(studentId, addSubjectDto.subjectId, addSubjectDto.type as 'REGULAR' | 'PRIVATE', addSubjectDto.enrolledAt)
  }

  @Put(':id/subjects/:subjectId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN_GLOBAL', 'ADMIN_CABANG')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update subject enrollment (type and/or session)',
    description: 'Change subject type (REGULAR to PRIVATE or vice versa) and/or assign/change session. If type changes, new SPP rate will be locked.',
  })
  @ApiResponse({
    status: 200,
    description: 'Subject updated successfully',
    type: UpdateSubjectResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid type, session, or no active SPP rate',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 404,
    description: 'Student or subject enrollment not found',
  })
  async updateSubject(
    @Param('id') studentId: string,
    @Param('subjectId') subjectId: string,
    @Body() updateSubjectDto: UpdateSubjectDto,
  ): Promise<any> {
    return this.studentsService.updateSubjectEnrollment(studentId, subjectId, updateSubjectDto)
  }

  @Patch(':id/subjects/:subjectId/discount')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN_GLOBAL', 'ADMIN_CABANG')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Set diskon enrollment per mata pelajaran',
    description: 'Set nominal diskon bulanan (Rp) untuk enrollment mata pelajaran tertentu. Diskon ini otomatis diterapkan saat generate invoice SPP. Kirim discountAmount: null untuk hapus diskon.',
  })
  @ApiResponse({ status: 200, description: 'Diskon berhasil diperbarui' })
  @ApiResponse({ status: 404, description: 'Enrollment tidak ditemukan' })
  async updateSubjectDiscount(
    @Param('id') studentId: string,
    @Param('subjectId') subjectId: string,
    @Body() dto: UpdateSubjectDiscountDto,
  ): Promise<any> {
    return this.studentsService.updateSubjectDiscount(
      studentId,
      subjectId,
      dto.discountAmount !== undefined ? (dto.discountAmount ?? null) : null,
      dto.discountNote !== undefined ? (dto.discountNote ?? null) : null,
    )
  }

  @Patch(':id/subjects/:subjectId/end')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN_GLOBAL', 'ADMIN_CABANG')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Tandai enrollment siswa selesai atau keluar',
    description: 'Set status enrollment menjadi COMPLETED (selesai/lulus) atau DROPPED_OUT (keluar di tengah jalan), beserta tanggal berakhir. Data presensi dan history tetap tersimpan.',
  })
  @ApiResponse({ status: 200, description: 'Enrollment berhasil diakhiri' })
  @ApiResponse({ status: 400, description: 'Status tidak valid' })
  @ApiResponse({ status: 404, description: 'Siswa atau enrollment tidak ditemukan' })
  async endSubjectEnrollment(
    @Param('id') studentId: string,
    @Param('subjectId') subjectId: string,
    @Body() dto: EndEnrollmentDto,
  ): Promise<any> {
    return this.studentsService.endSubjectEnrollment(studentId, subjectId, dto.status as 'COMPLETED' | 'DROPPED_OUT', dto.endDate)
  }

  @Delete(':id/subjects/:subjectId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN_GLOBAL', 'ADMIN_CABANG')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Remove subject enrollment from student',
    description: 'Deactivate subject enrollment (soft delete). Attendance and session history are preserved. Related session enrollments are also deactivated.',
  })
  @ApiResponse({
    status: 200,
    description: 'Subject removed successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 404,
    description: 'Student or subject enrollment not found',
  })
  async removeSubject(
    @Param('id') studentId: string,
    @Param('subjectId') subjectId: string,
  ): Promise<any> {
    return this.studentsService.removeSubjectEnrollment(studentId, subjectId)
  }

  @Get('enrollment/sessions/:subjectId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get available sessions for enrollment',
    description: 'List available sessions for a subject with current capacity and availability. Used during enrollment step 3 for session selection.',
  })
  @ApiResponse({
    status: 200,
    description: 'Available sessions with capacity details',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 404,
    description: 'Subject not found',
  })
  async getAvailableSessions(
    @Param('subjectId') subjectId: string,
    @Query('branchId') branchId: string,
    @Query('type') type: 'REGULAR' | 'PRIVATE',
  ): Promise<any> {
    return this.studentsService.getAvailableSessions(subjectId, branchId, type)
  }

  @Post('import')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN_GLOBAL')
  @UseInterceptors(FileInterceptor('file'))
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Import students from CSV file',
    description: 'Bulk import students from CSV file. CSV format: name, classLevel (optional), parentName (optional), parentPhone (optional), branchId. If student with same name and branchId exists, data will be updated.',
  })
  @ApiResponse({
    status: 201,
    description: 'Students imported successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid CSV format or data validation errors',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions (only OWNER, ADMIN_GLOBAL)',
  })
  async importStudents(@UploadedFile() file: any): Promise<any> {
    if (!file) {
      throw new Error('No file uploaded')
    }
    return this.studentsService.importStudents(file)
  }
}
