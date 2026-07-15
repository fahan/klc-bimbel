import { Injectable } from '@nestjs/common'

interface Entry {
  value: any
  expiresAt: number
}

/**
 * Minimal in-process TTL cache for near-static, read-heavy responses
 * (public landing content, app settings). Not a distributed cache — each
 * backend instance keeps its own copy, which is fine for these low-churn,
 * public reads. Bound staleness with a short TTL and/or explicit invalidation
 * from the corresponding write path.
 */
@Injectable()
export class TtlCacheService {
  private store = new Map<string, Entry>()

  /** Return a cached value for `key`, or compute it via `factory`, cache it, and return it. */
  async wrap<T>(key: string, ttlMs: number, factory: () => Promise<T>): Promise<T> {
    const hit = this.store.get(key)
    if (hit && hit.expiresAt > Date.now()) {
      return hit.value as T
    }
    const value = await factory()
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs })
    return value
  }

  /** Drop a single key. */
  delete(key: string): void {
    this.store.delete(key)
  }

  /** Drop every key beginning with `prefix` (e.g. invalidate a whole namespace). */
  deleteByPrefix(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) this.store.delete(key)
    }
  }

  /** Clear everything (mainly for tests). */
  clear(): void {
    this.store.clear()
  }
}
