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
import { TeachersService } from './teachers.service'
import { CreateTeacherDto } from './dto/create-teacher.dto'
import { UpdateTeacherDto } from './dto/update-teacher.dto'
import { TeacherResponseDto } from './dto/teacher-response.dto'
import { JwtAuthGuard } from '@/common/guards/jwt.guard'
import { RolesGuard } from '@/common/guards/roles.guard'
import { Roles } from '@/common/decorators/roles.decorator'

@ApiTags('Teachers')
@Controller('teachers')
export class TeachersController {
  constructor(private teachersService: TeachersService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'branchId', required: false, type: String })
  @ApiOperation({
    summary: 'List all teachers (paginated)',
    description: 'Get paginated list of all active teachers (users with role GURU). Optional filter by branchId.',
  })
  @ApiResponse({
    status: 200,
    description: 'Teachers retrieved successfully',
    type: TeacherResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('branchId') branchId?: string,
  ): Promise<any> {
    return this.teachersService.findAll(page || 1, limit || 10, branchId)
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get teacher details by ID',
    description: 'Retrieve complete teacher profile including assigned branches and active sessions.',
  })
  @ApiResponse({
    status: 200,
    description: 'Teacher details retrieved successfully',
    type: TeacherResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 404,
    description: 'Teacher not found',
  })
  async findOne(@Param('id') id: string): Promise<any> {
    return this.teachersService.findOne(id)
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN_GLOBAL', 'ADMIN_CABANG')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create new teacher',
    description: 'Register new teacher (User with role GURU). Teacher will be assigned to specified branches.',
  })
  @ApiResponse({
    status: 201,
    description: 'Teacher created successfully',
    type: TeacherResponseDto,
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
    description: 'Insufficient permissions',
  })
  @ApiResponse({
    status: 409,
    description: 'Email already registered',
  })
  async create(@Body() createTeacherDto: CreateTeacherDto): Promise<any> {
    return this.teachersService.create(createTeacherDto)
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN_GLOBAL', 'ADMIN_CABANG')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update teacher information',
    description: 'Update teacher profile data and branch assignments.',
  })
  @ApiResponse({
    status: 200,
    description: 'Teacher updated successfully',
    type: TeacherResponseDto,
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
    description: 'Teacher not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Email already registered',
  })
  async update(
    @Param('id') id: string,
    @Body() updateTeacherDto: UpdateTeacherDto,
  ): Promise<any> {
    return this.teachersService.update(id, updateTeacherDto)
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN_GLOBAL')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete teacher',
    description: 'Soft delete teacher (mark as inactive). Only OWNER and ADMIN_GLOBAL can delete.',
  })
  @ApiResponse({
    status: 200,
    description: 'Teacher deleted successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete teacher with active sessions',
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
    description: 'Teacher not found',
  })
  async remove(@Param('id') id: string): Promise<any> {
    return this.teachersService.remove(id)
  }
}
