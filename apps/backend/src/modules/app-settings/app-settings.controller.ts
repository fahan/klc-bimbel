import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { AppSettingsService } from './app-settings.service'
import { UpdateAppSettingsDto } from './dto/update-app-settings.dto'
import { JwtAuthGuard } from '../../common/guards/jwt.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'

@ApiTags('App Settings')
@Controller('app-settings')
export class AppSettingsController {
  constructor(private readonly service: AppSettingsService) {}

  @Get('public')
  @ApiOperation({ summary: 'Get app settings (public, no auth)' })
  getPublic() {
    return this.service.getSettings()
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get app settings' })
  getSettings() {
    return this.service.getSettings()
  }

  @Put()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN_GLOBAL')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update app settings (OWNER/ADMIN_GLOBAL)' })
  updateSettings(@Body() dto: UpdateAppSettingsDto) {
    return this.service.updateSettings(dto)
  }
}
