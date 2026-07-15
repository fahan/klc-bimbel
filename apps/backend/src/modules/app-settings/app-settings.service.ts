import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { TtlCacheService } from '../../common/cache/ttl-cache.service'
import { UpdateAppSettingsDto } from './dto/update-app-settings.dto'

// Single-row global config, read on nearly every page load. Cache it; the TTL is
// just a safety net — updateSettings() invalidates the entry immediately.
const SETTINGS_CACHE_KEY = 'app-settings:v1'
const SETTINGS_TTL_MS = 300_000

@Injectable()
export class AppSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: TtlCacheService,
  ) {}

  async getSettings() {
    return this.cache.wrap(SETTINGS_CACHE_KEY, SETTINGS_TTL_MS, async () => {
      const settings = await this.prisma.appSettings.upsert({
        where: { id: 1 },
        create: { id: 1, appName: 'BimbelApp', tagline: 'Manajemen Bimbel' },
        update: {},
      })
      return { success: true, data: settings }
    })
  }

  async updateSettings(dto: UpdateAppSettingsDto) {
    const settings = await this.prisma.appSettings.upsert({
      where: { id: 1 },
      update: { ...dto },
      create: { id: 1, appName: 'BimbelApp', tagline: 'Manajemen Bimbel', ...dto },
    })
    this.cache.delete(SETTINGS_CACHE_KEY)
    return { success: true, data: settings, message: 'Pengaturan berhasil disimpan' }
  }
}
