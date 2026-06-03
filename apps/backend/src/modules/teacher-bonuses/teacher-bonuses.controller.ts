import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { TeacherBonusesService } from './teacher-bonuses.service'
import { CreateTeacherBonusDto } from './dto/create-teacher-bonus.dto'
import { UpdateTeacherBonusDto } from './dto/update-teacher-bonus.dto'
import { JwtAuthGuard } from '@/common/guards/jwt.guard'
import { RolesGuard } from '@/common/guards/roles.guard'
import { Roles } from '@/common/decorators/roles.decorator'
import { CurrentUser } from '@/common/decorators/current-user.decorator'

@ApiTags('Teacher Bonuses')
@Controller('teacher-bonuses')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TeacherBonusesController {
  constructor(private service: TeacherBonusesService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN_GLOBAL', 'ADMIN_CABANG')
  @ApiOperation({ summary: 'Create a bonus for a teacher' })
  async create(@Body() dto: CreateTeacherBonusDto, @CurrentUser() user: any) {
    return this.service.create(dto, user.id)
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN_GLOBAL', 'ADMIN_CABANG')
  @ApiOperation({ summary: 'List bonuses for branch + month + year' })
  async findAll(
    @Query('branchId') branchId: string,
    @Query('month') month: string,
    @Query('year') year: string,
  ) {
    if (!branchId || !month || !year) {
      throw new Error('branchId, month, and year are required')
    }
    return this.service.findAll(branchId, parseInt(month), parseInt(year))
  }

  @Get('my')
  @ApiOperation({ summary: "Get current teacher's bonuses" })
  async findMy(@CurrentUser() user: any, @Query('year') year?: string) {
    return this.service.findByTeacher(user.id, year ? parseInt(year) : undefined)
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN_GLOBAL', 'ADMIN_CABANG')
  @ApiOperation({ summary: 'Update bonus amount or reason (DRAFT only)' })
  async update(@Param('id') id: string, @Body() dto: UpdateTeacherBonusDto) {
    return this.service.update(id, dto)
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN_GLOBAL', 'ADMIN_CABANG')
  @ApiOperation({ summary: 'Delete a bonus (DRAFT only)' })
  async remove(@Param('id') id: string) {
    return this.service.remove(id)
  }

  @Post(':id/approve')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN_GLOBAL')
  @ApiOperation({ summary: 'Approve a bonus' })
  async approve(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.approve(id, user.id)
  }
}
