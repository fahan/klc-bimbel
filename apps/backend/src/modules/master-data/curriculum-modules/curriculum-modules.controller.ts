import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery } from '@nestjs/swagger'
import { CurriculumModulesService } from './curriculum-modules.service'
import { CreateCurriculumModuleDto } from './dto/create-curriculum-module.dto'
import { UpdateCurriculumModuleDto } from './dto/update-curriculum-module.dto'
import { CurriculumModuleResponseDto } from './dto/curriculum-module-response.dto'
import { JwtAuthGuard } from '@/common/guards/jwt.guard'
import { RolesGuard } from '@/common/guards/roles.guard'
import { Roles } from '@/common/decorators/roles.decorator'

@ApiTags('Master Data - Curriculum Modules')
@Controller('curriculum-modules')
export class CurriculumModulesController {
  constructor(private curriculumModulesService: CurriculumModulesService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'subjectId', required: false, type: String })
  @ApiOperation({ summary: 'List curriculum modules (paginated, optionally filtered by subject)' })
  @ApiResponse({
    status: 200,
    description: 'Curriculum modules retrieved',
    type: CurriculumModuleResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('subjectId') subjectId?: string,
  ): Promise<any> {
    return this.curriculumModulesService.findAll(page || 1, limit || 10, { subjectId })
  }

  @Get('by-subject/:subjectId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get curriculum modules for a specific subject (ordered)' })
  @ApiResponse({
    status: 200,
    description: 'Curriculum modules retrieved',
    type: CurriculumModuleResponseDto,
  })
  async findBySubject(@Param('subjectId') subjectId: string): Promise<any> {
    return this.curriculumModulesService.findBySubject(subjectId)
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get curriculum module by ID' })
  @ApiResponse({
    status: 200,
    description: 'Curriculum module retrieved',
    type: CurriculumModuleResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Curriculum module not found',
  })
  async findOne(@Param('id') id: string): Promise<any> {
    return this.curriculumModulesService.findOne(id)
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN_GLOBAL')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new curriculum module' })
  @ApiResponse({
    status: 201,
    description: 'Curriculum module created',
    type: CurriculumModuleResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or subject not found',
  })
  async create(@Body() createModuleDto: CreateCurriculumModuleDto): Promise<any> {
    return this.curriculumModulesService.create(createModuleDto)
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN_GLOBAL')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update curriculum module' })
  @ApiResponse({
    status: 200,
    description: 'Curriculum module updated',
    type: CurriculumModuleResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input',
  })
  @ApiResponse({
    status: 404,
    description: 'Curriculum module not found',
  })
  async update(@Param('id') id: string, @Body() updateModuleDto: UpdateCurriculumModuleDto): Promise<any> {
    return this.curriculumModulesService.update(id, updateModuleDto)
  }

  @Post('reorder')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN_GLOBAL')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reorder curriculum modules' })
  @ApiResponse({
    status: 200,
    description: 'Curriculum modules reordered',
    type: CurriculumModuleResponseDto,
  })
  async reorder(@Body() modules: Array<{ id: string; orderNumber: number }>): Promise<any> {
    return this.curriculumModulesService.reorder(modules)
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete curriculum module (OWNER only, soft delete)' })
  @ApiResponse({
    status: 200,
    description: 'Curriculum module deleted',
    type: CurriculumModuleResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Curriculum module not found',
  })
  async remove(@Param('id') id: string): Promise<any> {
    return this.curriculumModulesService.remove(id)
  }
}
