import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery } from '@nestjs/swagger'
import { SubjectsService } from './subjects.service'
import { CreateSubjectDto } from './dto/create-subject.dto'
import { UpdateSubjectDto } from './dto/update-subject.dto'
import { SubjectResponseDto } from './dto/subject-response.dto'
import { JwtAuthGuard } from '@/common/guards/jwt.guard'
import { RolesGuard } from '@/common/guards/roles.guard'
import { Roles } from '@/common/decorators/roles.decorator'

@ApiTags('Master Data - Subjects')
@Controller('subjects')
export class SubjectsController {
  constructor(private subjectsService: SubjectsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'trackingType', required: false, type: String })
  @ApiOperation({ summary: 'List all subjects (paginated)' })
  @ApiResponse({
    status: 200,
    description: 'Subjects retrieved',
    type: SubjectResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('trackingType') trackingType?: string,
  ): Promise<any> {
    return this.subjectsService.findAll(page || 1, limit || 10, { trackingType })
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get subject by ID with related data' })
  @ApiResponse({
    status: 200,
    description: 'Subject retrieved',
    type: SubjectResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Subject not found',
  })
  async findOne(@Param('id') id: string): Promise<any> {
    return this.subjectsService.findOne(id)
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN_GLOBAL')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new subject' })
  @ApiResponse({
    status: 201,
    description: 'Subject created',
    type: SubjectResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or duplicate code',
  })
  async create(@Body() createSubjectDto: CreateSubjectDto): Promise<any> {
    return this.subjectsService.create(createSubjectDto)
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN_GLOBAL')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update subject' })
  @ApiResponse({
    status: 200,
    description: 'Subject updated',
    type: SubjectResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input',
  })
  @ApiResponse({
    status: 404,
    description: 'Subject not found',
  })
  async update(@Param('id') id: string, @Body() updateSubjectDto: UpdateSubjectDto): Promise<any> {
    return this.subjectsService.update(id, updateSubjectDto)
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete subject (OWNER only, soft delete)' })
  @ApiResponse({
    status: 200,
    description: 'Subject deleted',
    type: SubjectResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Subject not found',
  })
  async remove(@Param('id') id: string): Promise<any> {
    return this.subjectsService.remove(id)
  }
}
