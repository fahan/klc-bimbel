import { Controller, Get, Query, UseGuards, BadRequestException } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger'
import { FinanceService } from './finance.service'
import { JwtAuthGuard } from '@/common/guards/jwt.guard'
import { RolesGuard } from '@/common/guards/roles.guard'
import { Roles } from '@/common/decorators/roles.decorator'

@ApiTags('Finance')
@Controller('finance')
export class FinanceController {
  constructor(private financeService: FinanceService) {}

  @Get('overview')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN_GLOBAL', 'ADMIN_CABANG')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get financial overview',
    description: 'Returns metrics, breakdown, and 6-month trend data for the given period.',
  })
  @ApiQuery({ name: 'branchId', required: false })
  @ApiQuery({ name: 'month', required: true })
  @ApiQuery({ name: 'year', required: true })
  async getOverview(
    @Query('branchId') branchId: string | undefined,
    @Query('month') month: string,
    @Query('year') year: string,
  ): Promise<any> {
    const monthNum = parseInt(month, 10)
    const yearNum = parseInt(year, 10)
    if (Number.isNaN(monthNum) || Number.isNaN(yearNum)) {
      throw new BadRequestException('month and year are required')
    }
    return this.financeService.getOverview(branchId, monthNum, yearNum)
  }

  @Get('transactions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN_GLOBAL', 'ADMIN_CABANG')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get recent transactions',
    description: 'Combined list of payments, sales, and approved commissions, ordered by date.',
  })
  @ApiQuery({ name: 'branchId', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getRecentTransactions(
    @Query('branchId') branchId?: string,
    @Query('limit') limit?: string,
  ): Promise<any> {
    return this.financeService.getRecentTransactions(branchId, limit ? parseInt(limit, 10) : 20)
  }
}
