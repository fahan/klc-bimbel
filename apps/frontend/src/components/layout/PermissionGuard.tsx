'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { usePermission } from '@/lib/use-permissions'
import { LoadingState } from '@/components/ui/States'

interface PermissionGuardProps {
  children: React.ReactNode
  requiredFeature?: string
}

/**
 * Component that guards routes based on user permissions
 * If user doesn't have permission, redirects to dashboard
 */
export function PermissionGuard({ children, requiredFeature }: PermissionGuardProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { can, isLoaded, userRoles } = usePermission()

  useEffect(() => {
    if (!isLoaded) return

    // Determine feature from requiredFeature or pathname
    const feature = requiredFeature || extractFeatureFromPath(pathname)

    // If user has no roles, redirect to login
    if (userRoles.length === 0) {
      router.push('/login')
      return
    }

    // Check permission
    if (feature && !can(feature)) {
      console.warn(`Access denied to ${feature} for user with roles:`, userRoles)
      router.push('/dashboard')
      return
    }
  }, [isLoaded, pathname, requiredFeature, can, userRoles, router])

  if (!isLoaded) {
    return <LoadingState />
  }

  // Check if user has permission to access this route
  const feature = requiredFeature || extractFeatureFromPath(pathname)
  if (feature && !can(feature)) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-6">Anda tidak memiliki akses ke halaman ini</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Kembali ke Dashboard
          </button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

/**
 * Extract feature name from pathname
 * e.g., /master-data/students -> master-data/students
 */
function extractFeatureFromPath(pathname: string): string {
  // Remove leading slash and any query params
  const path = pathname.replace(/^\//, '').split('?')[0]

  // Special cases
  if (path.startsWith('master-data')) {
    return path
  }
  if (path.startsWith('guru')) {
    return path
  }
  if (path.startsWith('jadwal-sesi')) {
    return 'jadwal-sesi'
  }
  if (path.startsWith('presensi')) {
    return 'presensi'
  }
  if (path.startsWith('invoice-tagihan')) {
    return 'invoice-tagihan'
  }
  if (path.startsWith('pembayaran-spp')) {
    return 'pembayaran-spp'
  }
  if (path.startsWith('laporan-progress')) {
    return 'laporan-progress'
  }
  if (path.startsWith('toko-stok')) {
    return 'toko-stok'
  }
  if (path.startsWith('transfer-stok')) {
    return 'transfer-stok'
  }
  if (path.startsWith('manajemen-user')) {
    return 'manajemen-user'
  }
  if (path.startsWith('laporan-presensi')) {
    return 'laporan-presensi'
  }
  if (path.startsWith('laporan-keuangan')) {
    return 'laporan-keuangan'
  }
  if (path.startsWith('komisi-guru')) {
    return 'komisi-guru'
  }

  return ''
}
