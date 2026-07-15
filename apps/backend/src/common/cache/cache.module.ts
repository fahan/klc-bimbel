import { Global, Module } from '@nestjs/common'
import { TtlCacheService } from './ttl-cache.service'

/**
 * Global so any feature module can inject TtlCacheService (to cache reads or
 * invalidate on writes) without importing this module explicitly.
 */
@Global()
@Module({
  providers: [TtlCacheService],
  exports: [TtlCacheService],
})
export class CacheModule {}
