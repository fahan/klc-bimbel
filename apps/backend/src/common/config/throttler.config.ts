import { ThrottlerModuleOptions, ThrottlerOptions } from '@nestjs/throttler'

/** Global default: 100 requests/minute per IP, applied to every route via APP_GUARD in app.module.ts. */
export const THROTTLER_CONFIG: ThrottlerModuleOptions = [{ name: 'default', ttl: 60000, limit: 100 }]

/**
 * Stricter override for brute-forceable routes (login, public share-link tokens): 5 requests/minute per IP.
 * Pass to @Throttle() — reuses the 'default' throttler name so it REPLACES the global limit for that route
 * instead of stacking a second throttler on top of it.
 */
export const STRICT_THROTTLE: Record<string, ThrottlerOptions> = { default: { limit: 5, ttl: 60000 } }
