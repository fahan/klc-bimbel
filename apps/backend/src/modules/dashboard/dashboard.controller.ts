import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger'
import { JwtAuthGuard } from '@/common/guards/jwt.guard'
import { DashboardService } from './dashboard.service'

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('analytics')
  @ApiOperation({
    summary: 'Get all dashboard analytics in one request',
    description:
      'Returns metrics, master data counts, invoice status, finance breakdown, trend, sessions today, recent students/teachers/transactions — all in a single call.',
  })
  @ApiQuery({ name: 'branchId', required: false })
  @ApiQuery({ name: 'month', required: false, type: Number })
  @ApiQuery({ name: 'year', required: false, type: Number })
  async getAnalytics(
    @Query('branchId') branchId?: string,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    const today = new Date()
    const m = month ? parseInt(month) : today.getMonth() + 1
    const y = year ? parseInt(year) : today.getFullYear()
    return this.dashboardService.getAnalytics(branchId || undefined, m, y)
  }
}
