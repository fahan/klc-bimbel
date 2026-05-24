import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery } from '@nestjs/swagger'
import { SppRatesService } from './spp-rates.service'
import { CreateSppRateDto } from './dto/create-spp-rate.dto'
import { UpdateSppRateDto } from './dto/update-spp-rate.dto'
import { SppRateResponseDto } from './dto/spp-rate-response.dto'
import { JwtAuthGuard } from '@/common/guards/jwt.guard'
import { RolesGuard } from '@/common/guards/roles.guard'
import { Roles } from '@/common/decorators/roles.decorator'

@ApiTags('Master Data - SPP Rates')
@Controller('spp-rates')
export class SppRatesController {
  constructor(private sppRatesService: SppRatesService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'subjectId', required: false, type: String })
  @ApiOperation({ summary: 'List SPP rates (paginated, optionally filtered by subject)' })
  @ApiResponse({
    status: 200,
    description: 'SPP rates retrieved',
    type: SppRateResponseDto,
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
    return this.sppRatesService.findAll(page || 1, limit || 10, { subjectId })
  }

  @Get('by-subject/:subjectId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get SPP rates for a specific subject' })
  @ApiResponse({
    status: 200,
    description: 'SPP rates retrieved',
    type: SppRateResponseDto,
  })
  async findBySubject(@Param('subjectId') subjectId: string): Promise<any> {
    return this.sppRatesService.findBySubject(subjectId)
  }

  @Get('active/:subjectId/:type')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get currently active SPP rate for subject and type' })
  @ApiResponse({
    status: 200,
    description: 'Active SPP rate retrieved',
    type: SppRateResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'No active rate found',
  })
  async findActiveRate(@Param('subjectId') subjectId: string, @Param('type') type: string): Promise<any> {
    return this.sppRatesService.findActiveRate(subjectId, type)
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get SPP rate by ID' })
  @ApiResponse({
    status: 200,
    description: 'SPP rate retrieved',
    type: SppRateResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'SPP rate not found',
  })
  async findOne(@Param('id') id: string): Promise<any> {
    return this.sppRatesService.findOne(id)
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN_GLOBAL')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new SPP rate' })
  @ApiResponse({
    status: 201,
    description: 'SPP rate created',
    type: SppRateResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or subject not found',
  })
  async create(@Body() createSppRateDto: CreateSppRateDto): Promise<any> {
    return this.sppRatesService.create(createSppRateDto)
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN_GLOBAL')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update SPP rate' })
  @ApiResponse({
    status: 200,
    description: 'SPP rate updated',
    type: SppRateResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input',
  })
  @ApiResponse({
    status: 404,
    description: 'SPP rate not found',
  })
  async update(@Param('id') id: string, @Body() updateSppRateDto: UpdateSppRateDto): Promise<any> {
    return this.sppRatesService.update(id, updateSppRateDto)
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete SPP rate (OWNER only, soft delete)' })
  @ApiResponse({
    status: 200,
    description: 'SPP rate deleted',
    type: SppRateResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'SPP rate not found',
  })
  async remove(@Param('id') id: string): Promise<any> {
    return this.sppRatesService.remove(id)
  }
}
