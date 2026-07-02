import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, ForbiddenException } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery } from '@nestjs/swagger'
import { BranchesService } from './branches.service'
import { CreateBranchDto } from './dto/create-branch.dto'
import { UpdateBranchDto } from './dto/update-branch.dto'
import { BranchResponseDto, BranchDto } from './dto/branch-response.dto'
import { JwtAuthGuard } from '@/common/guards/jwt.guard'
import { RolesGuard } from '@/common/guards/roles.guard'
import { Roles } from '@/common/decorators/roles.decorator'
import { CurrentUser } from '@/common/decorators/current-user.decorator'

@ApiTags('Master Data - Branches')
@Controller('branches')
export class BranchesController {
  constructor(private branchesService: BranchesService) {}

  @Get('all-system')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all branches in system (accessible to all authenticated users)' })
  @ApiResponse({
    status: 200,
    description: 'All branches retrieved',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async getAllSystemBranches(): Promise<any> {
    return this.branchesService.getAllSystemBranches()
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN_GLOBAL', 'ADMIN_CABANG')
  @ApiBearerAuth()
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiOperation({ summary: 'List all branches (paginated, filtered by role)' })
  @ApiResponse({
    status: 200,
    description: 'Branches retrieved',
    type: BranchResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @CurrentUser() user?: any,
  ): Promise<any> {
    // Dual-role users (e.g. GURU also assigned ADMIN_CABANG) have their extra
    // roles only in `user.roles`, not in the legacy singular `user.role` column —
    // resolve branch-scoping from the full roles array, same precedence RolesGuard uses.
    const userRoles: string[] = user.roles ?? [user.role]
    const effectiveRole = userRoles.includes('OWNER')
      ? 'OWNER'
      : userRoles.includes('ADMIN_GLOBAL')
        ? 'ADMIN_GLOBAL'
        : userRoles.includes('ADMIN_CABANG')
          ? 'ADMIN_CABANG'
          : user.role

    return this.branchesService.findAll(page || 1, limit || 10, user.id, effectiveRole, user.branchId)
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get branch by ID' })
  @ApiResponse({
    status: 200,
    description: 'Branch retrieved',
    type: BranchResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Branch not found',
  })
  async findOne(@Param('id') id: string): Promise<any> {
    return this.branchesService.findOne(id)
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new branch (OWNER only)' })
  @ApiResponse({
    status: 201,
    description: 'Branch created',
    type: BranchResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or duplicate unique fields',
  })
  async create(@Body() createBranchDto: CreateBranchDto): Promise<any> {
    return this.branchesService.create(createBranchDto)
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN_GLOBAL', 'ADMIN_CABANG')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update branch' })
  @ApiResponse({
    status: 200,
    description: 'Branch updated',
    type: BranchResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input',
  })
  @ApiResponse({
    status: 404,
    description: 'Branch not found',
  })
  async update(
    @Param('id') id: string,
    @Body() updateBranchDto: UpdateBranchDto,
    @CurrentUser() user: any,
  ): Promise<any> {
    // ADMIN_CABANG can only update their own branch
    if (user.role === 'ADMIN_CABANG' && user.branchId !== id) {
      throw new ForbiddenException('You can only update your own branch')
    }
    return this.branchesService.update(id, updateBranchDto)
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete branch (OWNER only, soft delete)' })
  @ApiResponse({
    status: 200,
    description: 'Branch deleted',
    type: BranchResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Branch not found',
  })
  async remove(@Param('id') id: string): Promise<any> {
    return this.branchesService.remove(id)
  }
}
