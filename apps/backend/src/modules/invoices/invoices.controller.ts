import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery } from '@nestjs/swagger'
import { InvoicesService } from './invoices.service'
import { CreateInvoiceDto } from './dto/create-invoice.dto'
import { InvoiceResponseDto } from './dto/invoice-response.dto'
import { JwtAuthGuard } from '@/common/guards/jwt.guard'
import { RolesGuard } from '@/common/guards/roles.guard'
import { Roles } from '@/common/decorators/roles.decorator'
import { CurrentUser } from '@/common/decorators/current-user.decorator'

@ApiTags('Invoices')
@Controller('invoices')
export class InvoicesController {
  constructor(private invoicesService: InvoicesService) {}

  // ===== PUBLIC ENDPOINT (no auth) =====
  @Get('public/:token')
  @ApiOperation({
    summary: 'Get invoice by public token (PUBLIC, no auth)',
    description: 'Public endpoint to view invoice via shared link. Used by parents to view invoice from WhatsApp link.',
  })
  @ApiResponse({ status: 200, description: 'Invoice retrieved', type: InvoiceResponseDto })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async findByToken(@Param('token') token: string): Promise<any> {
    return this.invoicesService.findByToken(token)
  }

  // ===== ADMIN ENDPOINTS =====
  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List invoices' })
  @ApiQuery({ name: 'branchId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: ['UNPAID', 'PARTIAL', 'PAID'] })
  @ApiQuery({ name: 'type', required: false, enum: ['SPP', 'REGISTRATION'] })
  @ApiQuery({ name: 'month', required: false })
  @ApiQuery({ name: 'year', required: false })
  @ApiQuery({ name: 'studentId', required: false })
  @ApiResponse({ status: 200, description: 'Invoices retrieved', type: InvoiceResponseDto })
  async findAll(
    @Query('branchId') branchId?: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('month') month?: string,
    @Query('year') year?: string,
    @Query('studentId') studentId?: string,
  ): Promise<any> {
    return this.invoicesService.findAll({
      branchId,
      status,
      type,
      month: month ? parseInt(month, 10) : undefined,
      year: year ? parseInt(year, 10) : undefined,
      studentId,
    })
  }

  @Get('metrics')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get invoice metrics',
    description: 'Dashboard metrics: total, unpaid, partial, paid for given month/year.',
  })
  @ApiQuery({ name: 'branchId', required: false })
  @ApiQuery({ name: 'month', required: false })
  @ApiQuery({ name: 'year', required: false })
  async getMetrics(
    @Query('branchId') branchId?: string,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ): Promise<any> {
    return this.invoicesService.getMetrics(
      branchId,
      month ? parseInt(month, 10) : undefined,
      year ? parseInt(year, 10) : undefined,
    )
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get invoice detail' })
  @ApiResponse({ status: 200, description: 'Invoice retrieved', type: InvoiceResponseDto })
  async findOne(@Param('id') id: string): Promise<any> {
    return this.invoicesService.findOne(id)
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN_GLOBAL', 'ADMIN_CABANG')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Generate new invoice',
    description: 'Generate invoice (SPP or REGISTRATION). Auto-calculates from student enrollment for SPP.',
  })
  @ApiResponse({ status: 201, description: 'Invoice created', type: InvoiceResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid input or no enrollment' })
  @ApiResponse({ status: 409, description: 'Invoice for this period already exists' })
  async create(@Body() createDto: CreateInvoiceDto, @CurrentUser() user: any): Promise<any> {
    return this.invoicesService.create(createDto, user.id)
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN_GLOBAL')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete invoice (only if no payments)',
    description: 'Hard delete an invoice. Only works if no payments are recorded.',
  })
  async remove(@Param('id') id: string): Promise<any> {
    return this.invoicesService.remove(id)
  }
}
