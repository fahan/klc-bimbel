import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ApiBody, ApiConsumes, ApiOperation, ApiQuery, ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { LandingService } from './landing.service'
import { CreateRegistrationDto } from './dto/create-registration.dto'
import { UpdateRegistrationDto } from './dto/update-registration.dto'
import { JwtAuthGuard } from '../../common/guards/jwt.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'

@ApiTags('landing')
@Controller('landing')
export class LandingController {
  constructor(private readonly landingService: LandingService) {}

  // ─── Free Trial Registration ───────────────────────────────────────────────

  @Post('register')
  @ApiOperation({ summary: 'Submit free trial registration (public)' })
  async submitRegistration(@Body() dto: CreateRegistrationDto) {
    return this.landingService.submitRegistration(dto)
  }

  @Get('registrations')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN_GLOBAL', 'ADMIN_CABANG')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all free trial registrations (admin only)' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'branchCode', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getRegistrations(
    @Query('status') status?: string,
    @Query('branchCode') branchCode?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.landingService.getRegistrations(
      status,
      branchCode,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    )
  }

  @Patch('registrations/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN_GLOBAL', 'ADMIN_CABANG')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update registration status (admin only)' })
  async updateRegistration(@Param('id') id: string, @Body() dto: UpdateRegistrationDto) {
    return this.landingService.updateRegistration(id, dto)
  }

  // ─── Public SPP Rates ────────────────────────────────────────────────────

  @Get('spp-rates')
  @ApiOperation({ summary: 'Get current active REGULAR SPP rates per subject (public)' })
  async getPublicSppRates() {
    return this.landingService.getPublicSppRates()
  }

  // ─── Public Branch List ───────────────────────────────────────────────────

  @Get('branches')
  @ApiOperation({ summary: 'Get all active branches with student count (public)' })
  async getPublicBranches() {
    return this.landingService.getPublicBranches()
  }

  // ─── Landing Content CMS ──────────────────────────────────────────────────

  @Get('content')
  @ApiOperation({ summary: 'Get all landing page content sections (public)' })
  async getAllContent() {
    return this.landingService.getAllContent()
  }

  @Get('content/:section')
  @ApiOperation({ summary: 'Get a specific content section (public)' })
  async getContentSection(@Param('section') section: string) {
    return this.landingService.getContentSection(section)
  }

  @Put('content/:section')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN_GLOBAL')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upsert a content section (OWNER/ADMIN_GLOBAL only)' })
  async upsertContentSection(
    @Param('section') section: string,
    @Body() body: { content: any },
    @CurrentUser() user: any,
  ) {
    return this.landingService.upsertContentSection(section, body.content, user?.id)
  }

  // ─── Image Upload ─────────────────────────────────────────────────────────

  @Post('upload')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN_GLOBAL')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload image to Supabase Storage (OWNER/ADMIN_GLOBAL only)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  }))
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    return this.landingService.uploadImage(file)
  }

  @Delete('upload')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN_GLOBAL')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete image from Supabase Storage (OWNER/ADMIN_GLOBAL only)' })
  async deleteImage(@Body() body: { path: string }) {
    return this.landingService.deleteImage(body.path)
  }
}
