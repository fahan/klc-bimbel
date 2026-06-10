'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { LayoutDashboard, CheckSquare, Calendar, TrendingUp, LogOut, Monitor } from 'lucide-react'
import { usePermission } from '@/lib/use-permissions'

export default function GuruLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [userName, setUserName] = useState('')
  const { hasRole, hasAnyRole, isLoaded } = usePermission()

  useEffect(() => {
    const name = localStorage.getItem('userName') || 'Guru'
    const role = localStorage.getItem('userRole')

    // Only redirect if loaded and user doesn't have GURU role
    if (isLoaded && role && !hasRole('GURU')) {
      router.replace('/dashboard')
      return
    }

    setUserName(name)
  }, [router, isLoaded, hasRole])

  const hasAdminRole = isLoaded && hasAnyRole(['OWNER', 'ADMIN_GLOBAL', 'ADMIN_CABANG'])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('userRole')
    localStorage.removeItem('userRoles')
    localStorage.removeItem('userId')
    localStorage.removeItem('userName')
    localStorage.removeItem('userBranchIds')
    localStorage.removeItem('primaryBranchId')
    router.push('/login')
  }

  const handleSwitchToAdmin = () => {
    router.push('/dashboard')
  }

  const isActive = (path: string) => pathname === path || pathname.startsWith(path + '/')

  const navItems = [
    { label: 'Dashboard', path: '/guru', icon: LayoutDashboard },
    { label: 'Presensi', path: '/guru/presensi', icon: CheckSquare },
    { label: 'Jadwal', path: '/guru/jadwal', icon: Calendar },
    { label: 'Komisi', path: '/guru/komisi', icon: TrendingUp },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile container */}
      <div className="max-w-md mx-auto bg-white min-h-screen flex flex-col shadow-lg">
        {/* Top User Bar */}
        <div className="bg-blue-600 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center font-semibold text-sm">
              {userName
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-medium">{userName}</p>
              <p className="text-xs text-blue-100">Guru</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {hasAdminRole && (
              <button
                onClick={handleSwitchToAdmin}
                className="p-2 hover:bg-white/10 rounded-full transition"
                title="Beralih ke Tampilan Admin"
              >
                <Monitor className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-white/10 rounded-full transition"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 pb-20">{children}</main>

        {/* Bottom Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-200 z-50">
          <div className="grid grid-cols-4">
            {navItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.path)
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`flex flex-col items-center gap-1 py-3 transition ${
                    active ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${active ? 'fill-blue-100' : ''}`} />
                  <span className="text-xs font-medium">{item.label}</span>
                  {active && <span className="absolute bottom-0 w-12 h-0.5 bg-blue-600"></span>}
                </Link>
              )
            })}
          </div>
        </nav>
      </div>
    </div>
  )
}
