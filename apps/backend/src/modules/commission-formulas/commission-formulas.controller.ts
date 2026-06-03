import { Controller, Get, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { CommissionFormulasService } from './commission-formulas.service'
import { UpsertCommissionFormulaDto } from './dto/upsert-commission-formula.dto'
import { JwtAuthGuard } from '@/common/guards/jwt.guard'
import { RolesGuard } from '@/common/guards/roles.guard'
import { Roles } from '@/common/decorators/roles.decorator'

@ApiTags('Commission Formulas')
@Controller('commission-formulas')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('OWNER', 'ADMIN_GLOBAL', 'ADMIN_CABANG')
@ApiBearerAuth()
export class CommissionFormulasController {
  constructor(private service: CommissionFormulasService) {}

  @Get()
  @ApiOperation({ summary: 'Get commission formula settings for all subjects' })
  async findAll(@Query('subjectId') subjectId?: string) {
    return this.service.findAll(subjectId)
  }

  @Put(':subjectId')
  @ApiOperation({ summary: 'Set commission formula for a subject + session type' })
  async upsert(
    @Param('subjectId') subjectId: string,
    @Body() dto: UpsertCommissionFormulaDto,
  ) {
    return this.service.upsert(subjectId, dto)
  }

  @Delete(':subjectId/:sessionType')
  @ApiOperation({ summary: 'Reset formula to default (remove custom formula)' })
  async remove(
    @Param('subjectId') subjectId: string,
    @Param('sessionType') sessionType: 'REGULAR' | 'PRIVATE',
  ) {
    return this.service.remove(subjectId, sessionType)
  }
}
