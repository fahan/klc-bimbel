/**
 * Permission matrix for role-based access control
 * Defines which features and routes each role can access
 */

export type UserRole = 'OWNER' | 'ADMIN_GLOBAL' | 'ADMIN_CABANG' | 'GURU'

export interface PermissionConfig {
  [key: string]: UserRole[]
}

/**
 * Features that each role can access
 * Add new features here as needed
 */
export const featurePermissions: PermissionConfig = {
  // Dashboard - accessible to all authenticated users
  'dashboard': ['OWNER', 'ADMIN_GLOBAL', 'ADMIN_CABANG', 'GURU'],

  // Master Data
  'master-data/branches': ['OWNER', 'ADMIN_GLOBAL'],
  'master-data/subjects': ['OWNER', 'ADMIN_GLOBAL'],
  'master-data/spp-rates': ['OWNER', 'ADMIN_GLOBAL'],
  'master-data/curriculum-modules': ['OWNER', 'ADMIN_GLOBAL'],
  'master-data/students': ['OWNER', 'ADMIN_GLOBAL', 'ADMIN_CABANG'],
  'master-data/teachers': ['OWNER', 'ADMIN_GLOBAL', 'ADMIN_CABANG'],

  // Operational
  'jadwal-sesi': ['OWNER', 'ADMIN_GLOBAL', 'ADMIN_CABANG'],
  'presensi': ['OWNER', 'ADMIN_GLOBAL', 'ADMIN_CABANG', 'GURU'],
  'invoice-tagihan': ['OWNER', 'ADMIN_GLOBAL', 'ADMIN_CABANG'],
  'pembayaran-spp': ['OWNER', 'ADMIN_GLOBAL', 'ADMIN_CABANG'],
  'laporan-progress': ['OWNER', 'ADMIN_GLOBAL', 'ADMIN_CABANG'],
  'toko-stok': ['OWNER', 'ADMIN_GLOBAL', 'ADMIN_CABANG'],
  'transfer-stok': ['OWNER', 'ADMIN_GLOBAL'],

  // Administration
  'manajemen-user': ['OWNER', 'ADMIN_GLOBAL'],

  // Reports
  'laporan-presensi': ['OWNER', 'ADMIN_GLOBAL', 'ADMIN_CABANG'],
  'laporan-keuangan': ['OWNER', 'ADMIN_GLOBAL', 'ADMIN_CABANG'],
  'komisi-guru': ['OWNER', 'ADMIN_GLOBAL', 'ADMIN_CABANG'],

  // Guru pages (mobile layout)
  'guru': ['GURU'],
  'guru/presensi': ['GURU'],
  'guru/jadwal': ['GURU'],
  'guru/komisi': ['GURU'],
}

/**
 * Normalize feature path (remove leading/trailing slashes)
 */
function normalizeFeaturePath(feature: string): string {
  return feature.replace(/^\/+|\/+$/g, '').trim()
}

/**
 * Check if a user role has permission to access a feature
 */
export function hasPermission(userRoles: string[], feature: string): boolean {
  // If no roles, deny access
  if (!userRoles || userRoles.length === 0) {
    return false
  }

  // Normalize the feature path (remove leading/trailing slashes)
  const normalizedFeature = normalizeFeaturePath(feature)

  // Get required roles for this feature
  let requiredRoles = featurePermissions[normalizedFeature]

  // If feature not found, try parent routes (for /create, /:id, /edit, etc.)
  if (!requiredRoles) {
    // Try removing the last segment for nested routes
    const segments = normalizedFeature.split('/')

    // Try progressively removing segments from the end
    for (let i = segments.length - 1; i > 0; i--) {
      const parentFeature = segments.slice(0, i).join('/')
      const parentRoles = featurePermissions[parentFeature]

      if (parentRoles) {
        requiredRoles = parentRoles
        break
      }
    }
  }

  // If still not found, deny access (fail-safe)
  if (!requiredRoles) {
    console.warn(`Feature "${normalizedFeature}" not found in permission matrix`)
    return false
  }

  // Check if user has ANY of the required roles
  return userRoles.some((role: string) => requiredRoles!.includes(role as UserRole))
}

/**
 * Filter menu items based on user roles
 */
export function filterMenuItemsByRole(
  items: Array<{ path: string; label: string; icon: any }>,
  userRoles: string[]
): Array<{ path: string; label: string; icon: any }> {
  return items.filter((item) => {
    // Use hasPermission which normalizes the path automatically
    return hasPermission(userRoles, item.path)
  })
}
