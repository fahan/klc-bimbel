/**
 * Shared TtlCacheService keys for public landing reads. Centralised so the read
 * paths (LandingService) and the write paths that must invalidate them
 * (master-data spp-rates / branches / subjects) never drift on a magic string.
 */
export const LANDING_CACHE_KEYS = {
  /** GET /landing/spp-rates — derived from subjects + active REGULAR spp_rates. */
  sppRates: 'landing:spp-rates',
  /** GET /landing/branches — active branches + active-student counts. */
  branches: 'landing:branches',
  /** GET /landing/content[/:section] — CMS sections (invalidate by prefix). */
  contentPrefix: 'landing:content:',
} as const

/**
 * Near-static admin master-data reads. Each namespace is invalidated by prefix
 * from the matching write path (so every paginated/filtered permutation is
 * dropped at once). Note: subject writes also invalidate spp-rates because the
 * spp-rates list embeds subject data.
 */
export const MASTER_CACHE_KEYS = {
  branchesPrefix: 'master:branches:',
  subjectsPrefix: 'master:subjects:',
  sppRatesPrefix: 'master:spp-rates:',
} as const
