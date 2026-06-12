import { Controller, Get, Post, Body, Param, Query, UseGuards, HttpCode, BadRequestException } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger'
import { CommissionsService } from './commissions.service'
import { JwtAuthGuard } from '@/common/guards/jwt.guard'
import { RolesGuard } from '@/common/guards/roles.guard'
import { Roles } from '@/common/decorators/roles.decorator'
import { CurrentUser } from '@/common/decorators/current-user.decorator'

@ApiTags('Commissions')
@Controller('commissions')
export class CommissionsController {
  constructor(private commissionsService: CommissionsService) {}

  @Post('calculate')
  @HttpCode(202)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN_GLOBAL', 'ADMIN_CABANG')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Calculate commissions for given month (async)',
    description:
      'Starts commission calculation in the background and returns 202 immediately. ' +
      'Poll GET /commissions?branchId=&month=&year= to check updated results. ' +
      'Skips already-approved commissions.',
  })
  @ApiResponse({ status: 202, description: 'Calculation started in background' })
  async calculate(
    @Body() body: { branchId: string; month: number; year: number },
  ): Promise<any> {
    // Fire-and-forget: respond immediately, run heavy calculation in the background.
    // Node.js keeps the promise alive even after the HTTP response is sent.
    void this.commissionsService
      .calculateForMonth(body.branchId, body.month, body.year)
      .catch(err =>
        console.error(`[Commission] Background calculation error (${body.branchId} ${body.month}/${body.year}):`, err?.message ?? err),
      )

    return {
      success: true,
      data: null,
      message: 'Kalkulasi komisi dimulai. Data akan diperbarui dalam beberapa detik.',
    }
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN_GLOBAL', 'ADMIN_CABANG')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get commissions for branch + month + year',
    description: 'Returns all teacher commissions with metrics for the period.',
  })
  async getByMonth(
    @Query('branchId') branchId: string,
    @Query('month') month: string,
    @Query('year') year: string,
  ): Promise<any> {
    const monthNum = parseInt(month, 10)
    const yearNum = parseInt(year, 10)
    if (!branchId || Number.isNaN(monthNum) || Number.isNaN(yearNum)) {
      throw new BadRequestException('branchId, month, and year are required')
    }
    return this.commissionsService.getCommissionsByMonth(
      branchId,
      monthNum,
      yearNum,
    )
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Get current user's (teacher's) commissions",
    description: 'For GURU role - returns own commission history.',
  })
  async getMy(@CurrentUser() user: any, @Query('year') year?: string): Promise<any> {
    return this.commissionsService.getMyCommissions(user.id, year ? parseInt(year, 10) : undefined)
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get detailed breakdown of a commission',
    description: 'Per-subject and per-student breakdown with formula.',
  })
  async getDetail(@Param('id') id: string): Promise<any> {
    return this.commissionsService.getCommissionDetail(id)
  }

  @Post(':id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN_GLOBAL')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approve a single commission' })
  async approve(@Param('id') id: string, @CurrentUser() user: any): Promise<any> {
    return this.commissionsService.approve(id, user.id)
  }

  @Post('approve-all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN_GLOBAL')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Approve all commissions for branch + month + year',
    description: 'Bulk approve commissions in DRAFT or CALCULATED status.',
  })
  async approveAll(
    @Body() body: { branchId: string; month: number; year: number },
    @CurrentUser() user: any,
  ): Promise<any> {
    return this.commissionsService.approveAll(body.branchId, body.month, body.year, user.id)
  }
}
