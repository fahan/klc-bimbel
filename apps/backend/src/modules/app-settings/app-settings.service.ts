import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { UpdateAppSettingsDto } from './dto/update-app-settings.dto'

@Injectable()
export class AppSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSettings() {
    let settings = await this.prisma.appSettings.findUnique({ where: { id: 1 } })
    if (!settings) {
      settings = await this.prisma.appSettings.create({
        data: { id: 1, appName: 'BimbelApp', tagline: 'Manajemen Bimbel' },
      })
    }
    return { success: true, data: settings }
  }

  async updateSettings(dto: UpdateAppSettingsDto) {
    const settings = await this.prisma.appSettings.upsert({
      where: { id: 1 },
      update: { ...dto },
      create: { id: 1, appName: 'BimbelApp', tagline: 'Manajemen Bimbel', ...dto },
    })
    return { success: true, data: settings, message: 'Pengaturan berhasil disimpan' }
  }
}
