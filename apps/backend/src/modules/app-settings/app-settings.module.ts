import { Module } from '@nestjs/common'
import { AppSettingsController } from './app-settings.controller'
import { AppSettingsService } from './app-settings.service'
import { PrismaModule } from '../../prisma/prisma.module'

@Module({
  imports: [PrismaModule],
  controllers: [AppSettingsController],
  providers: [AppSettingsService],
  exports: [AppSettingsService],
})
export class AppSettingsModule {}
