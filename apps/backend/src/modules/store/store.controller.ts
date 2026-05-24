import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger'
import { StoreService } from './store.service'
import { CreateProductDto, UpdateProductDto } from './dto/product.dto'
import { CreateSaleDto, RestockDto } from './dto/sale.dto'
import { TransferStockDto } from './dto/transfer.dto'
import { JwtAuthGuard } from '@/common/guards/jwt.guard'
import { RolesGuard } from '@/common/guards/roles.guard'
import { Roles } from '@/common/decorators/roles.decorator'
import { CurrentUser } from '@/common/decorators/current-user.decorator'

@ApiTags('Store')
@Controller('store')
export class StoreController {
  constructor(private storeService: StoreService) {}

  // ===== PRODUCTS =====
  @Get('products')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List products' })
  @ApiQuery({ name: 'branchId', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'lowStock', required: false, type: Boolean })
  async findAllProducts(
    @Query('branchId') branchId?: string,
    @Query('category') category?: string,
    @Query('lowStock') lowStock?: string,
  ): Promise<any> {
    return this.storeService.findAllProducts({
      branchId,
      category,
      lowStock: lowStock === 'true',
    })
  }

  @Get('products/metrics')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get product/store metrics' })
  async getMetrics(@Query('branchId') branchId?: string): Promise<any> {
    return this.storeService.getProductMetrics(branchId)
  }

  @Get('products/low-stock')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get products that need restocking' })
  async getLowStock(@Query('branchId') branchId?: string): Promise<any> {
    return this.storeService.getLowStockProducts(branchId)
  }

  @Get('products/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get product detail' })
  async findOneProduct(@Param('id') id: string): Promise<any> {
    return this.storeService.findOneProduct(id)
  }

  @Post('products')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN_GLOBAL', 'ADMIN_CABANG')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new product' })
  async createProduct(@Body() dto: CreateProductDto): Promise<any> {
    return this.storeService.createProduct(dto)
  }

  @Put('products/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN_GLOBAL', 'ADMIN_CABANG')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update product' })
  async updateProduct(@Param('id') id: string, @Body() dto: UpdateProductDto): Promise<any> {
    return this.storeService.updateProduct(id, dto)
  }

  @Get('products/:id/mutations')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get stock mutation history for a product' })
  async getMutations(@Param('id') id: string): Promise<any> {
    return this.storeService.getStockMutations(id)
  }

  // ===== SALES (POS) =====
  @Post('sales')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN_GLOBAL', 'ADMIN_CABANG')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Record a sale (POS)',
    description:
      'Record sale transaction. Auto-decrements stock and creates OUT mutation.',
  })
  async createSale(@Body() dto: CreateSaleDto, @CurrentUser() user: any): Promise<any> {
    return this.storeService.createSale(dto, user.id)
  }

  @Get('sales')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get recent sales' })
  async findAllSales(
    @Query('branchId') branchId?: string,
    @Query('limit') limit?: string,
  ): Promise<any> {
    return this.storeService.findAllSales({
      branchId,
      limit: limit ? parseInt(limit, 10) : undefined,
    })
  }

  // ===== RESTOCK =====
  @Post('restock')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN_GLOBAL', 'ADMIN_CABANG')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Restock a product',
    description: 'Add stock + create IN mutation.',
  })
  async restock(@Body() dto: RestockDto, @CurrentUser() user: any): Promise<any> {
    return this.storeService.restock(dto, user.id)
  }

  // ===== STOCK TRANSFER =====
  @Post('transfer')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN_GLOBAL')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Transfer stock between branches',
    description:
      'Transfer stock from source branch to destination. Creates TRANSFER_OUT + TRANSFER_IN mutations. Auto-creates destination product if not exists. Only OWNER & ADMIN_GLOBAL can transfer.',
  })
  async transferStock(@Body() dto: TransferStockDto, @CurrentUser() user: any): Promise<any> {
    return this.storeService.transferStock(dto, user.id)
  }

  @Get('transfer/history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get stock transfer history' })
  @ApiQuery({ name: 'branchId', required: false })
  async getTransferHistory(@Query('branchId') branchId?: string): Promise<any> {
    return this.storeService.getTransferHistory(branchId)
  }
}
