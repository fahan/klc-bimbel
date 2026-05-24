import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common"
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery } from "@nestjs/swagger"
import { UsersService } from "./users.service"
import { UpdateRoleDto } from "./dto/update-role.dto"
import { AssignBranchDto } from "./dto/assign-branch.dto"
import { JwtAuthGuard } from "@/common/guards/jwt.guard"
import { RolesGuard } from "@/common/guards/roles.guard"
import { Roles } from "@/common/decorators/roles.decorator"

@ApiTags("Users Management")
@Controller("users")
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("OWNER", "ADMIN_GLOBAL")
  @ApiBearerAuth()
  @ApiQuery({ name: "page", required: false, type: Number, example: 1 })
  @ApiQuery({ name: "limit", required: false, type: Number, example: 10 })
  @ApiQuery({ name: "search", required: false, type: String })
  @ApiQuery({ name: "role", required: false, type: String })
  @ApiOperation({
    summary: "List all users",
    description: "Get paginated list of all users (OWNER/ADMIN_GLOBAL only)",
  })
  async findAll(
    @Query("page") page?: number,
    @Query("limit") limit?: number,
    @Query("search") search?: string,
    @Query("role") role?: string,
  ): Promise<any> {
    return this.usersService.findAll(page || 1, limit || 10, search, role)
  }

  @Get(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("OWNER", "ADMIN_GLOBAL")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Get user by ID",
    description: "Retrieve a specific user with their branch assignments",
  })
  async findOne(@Param("id") id: string): Promise<any> {
    return this.usersService.findOne(id)
  }

  @Put(":id/role")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("OWNER", "ADMIN_GLOBAL")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Update user role",
    description: "Change a user role (OWNER/ADMIN_GLOBAL only)",
  })
  async updateRole(
    @Param("id") id: string,
    @Body() updateRoleDto: UpdateRoleDto,
  ): Promise<any> {
    return this.usersService.updateRole(id, updateRoleDto)
  }

  @Put(":id/branch")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("OWNER", "ADMIN_GLOBAL")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Assign branch to user",
    description: "Add a branch to a user (OWNER/ADMIN_GLOBAL only)",
  })
  async assignBranch(
    @Param("id") id: string,
    @Body() assignBranchDto: AssignBranchDto,
  ): Promise<any> {
    return this.usersService.assignBranch(id, assignBranchDto)
  }

  @Delete(":id/branch/:branchId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("OWNER", "ADMIN_GLOBAL")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Remove branch from user",
    description: "Remove a branch assignment from a user (OWNER/ADMIN_GLOBAL only)",
  })
  async removeBranch(
    @Param("id") id: string,
    @Param("branchId") branchId: string,
  ): Promise<any> {
    return this.usersService.removeBranch(id, branchId)
  }

  @Put(":id/deactivate")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("OWNER", "ADMIN_GLOBAL")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Deactivate user",
    description: "Deactivate a user account (OWNER/ADMIN_GLOBAL only)",
  })
  async deactivateUser(@Param("id") id: string): Promise<any> {
    return this.usersService.deactivateUser(id)
  }

  @Put(":id/activate")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("OWNER", "ADMIN_GLOBAL")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Activate user",
    description: "Activate a deactivated user account (OWNER/ADMIN_GLOBAL only)",
  })
  async activateUser(@Param("id") id: string): Promise<any> {
    return this.usersService.activateUser(id)
  }

  @Put(":id/roles/:role/add")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("OWNER", "ADMIN_GLOBAL")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Add role to user",
    description: "Add an additional role to a user (multi-role support)",
  })
  async addRole(
    @Param("id") id: string,
    @Param("role") role: string,
  ): Promise<any> {
    return this.usersService.addRole(id, role)
  }

  @Put(":id/roles/:role/remove")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("OWNER", "ADMIN_GLOBAL")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Remove role from user",
    description: "Remove a role from a user (multi-role support)",
  })
  async removeRole(
    @Param("id") id: string,
    @Param("role") role: string,
  ): Promise<any> {
    return this.usersService.removeRole(id, role)
  }
}
