'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { LayoutDashboard, Users, Clock, CheckSquare, CreditCard, TrendingUp, Gift, BookOpen, LogOut, ChevronDown, BarChart3, Building, DollarSign, FileText, GraduationCap, Receipt, Mail, ShoppingBag, Truck, Globe, Settings2 } from 'lucide-react'
import { usePermission } from '@/lib/use-permissions'

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [userName, setUserName] = useState('')
  const [userRole, setUserRole] = useState('')
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['UTAMA']))
  const { userRoles, can, isLoaded } = usePermission()

  const toggleSection = (sectionTitle: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(sectionTitle)) {
      newExpanded.delete(sectionTitle)
    } else {
      newExpanded.add(sectionTitle)
    }
    setExpandedSections(newExpanded)
  }

  useEffect(() => {
    const name = localStorage.getItem('userName') || 'User'
    const role = localStorage.getItem('userRole') || 'ADMIN'
    setUserName(name)
    setUserRole(role)

    // Auto-expand MASTER DATA if on a master data page
    if (pathname.startsWith('/master-data')) {
      setExpandedSections(prev => new Set([...prev, 'MASTER DATA']))
    }
  }, [pathname])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('userRole')
    localStorage.removeItem('userId')
    localStorage.removeItem('userName')
    router.push('/login')
  }

  const isActive = (path: string) => pathname === path || pathname.startsWith(path + '/')

  // Define all menu items (filtering happens below)
  const allMasterDataItems = [
    { label: 'Cabang', path: '/master-data/branches', icon: Building },
    { label: 'Mata Pelajaran', path: '/master-data/subjects', icon: BookOpen },
    { label: 'Tarif SPP', path: '/master-data/spp-rates', icon: DollarSign },
    { label: 'Kurikulum', path: '/master-data/curriculum-modules', icon: FileText },
    { label: 'Data Siswa', path: '/master-data/students', icon: Users },
    { label: 'Data Guru', path: '/master-data/teachers', icon: GraduationCap },
  ]

  const allMenuSections = [
    {
      title: 'UTAMA',
      items: [
        { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      ]
    },
    {
      title: 'OPERASIONAL',
      items: [
        { label: 'Jadwal & Sesi', path: '/jadwal-sesi', icon: Clock },
        { label: 'Presensi', path: '/presensi', icon: CheckSquare },
        { label: 'Invoice Tagihan', path: '/invoice-tagihan', icon: Receipt },
        { label: 'Pembayaran SPP', path: '/pembayaran-spp', icon: CreditCard },
        { label: 'Laporan Progress', path: '/laporan-progress', icon: Mail },
        { label: 'Toko & Stok', path: '/toko-stok', icon: ShoppingBag },
        { label: 'Transfer Stok', path: '/transfer-stok', icon: Truck },
      ]
    },
    {
      title: 'ADMINISTRASI',
      items: [
        { label: 'Manajemen Pengguna', path: '/manajemen-user', icon: Users },
        { label: 'Konten Landing Page', path: '/landing-content', icon: Globe },
      ]
    },
    {
      title: 'LAPORAN',
      items: [
        { label: 'Presensi', path: '/laporan-presensi', icon: CheckSquare },
        { label: 'Keuangan', path: '/laporan-keuangan', icon: TrendingUp },
        { label: 'Komisi Guru', path: '/komisi-guru', icon: Gift },
        { label: 'Formula Komisi', path: '/formula-komisi', icon: Settings2 },
      ]
    }
  ]

  // Filter items based on permissions (only if loaded and have roles)
  const masterDataItems = isLoaded && userRoles.length > 0
    ? allMasterDataItems.filter(item => can(item.path))
    : allMasterDataItems

  const menuSections = isLoaded && userRoles.length > 0
    ? allMenuSections.map(section => ({
        ...section,
        items: section.items.filter(item => can(item.path))
      }))
    : allMenuSections

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
            A
          </div>
          <div>
            <h1 className="text-sm font-bold text-gray-900">BimbelApp</h1>
            <p className="text-xs text-gray-500">Manajemen Bimbel</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {/* Regular Menu Sections */}
        {menuSections.map((section) => (
          <div key={section.title}>
            <button
              onClick={() => toggleSection(section.title)}
              suppressHydrationWarning
              className="w-full text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2 py-2 flex items-center justify-between hover:text-gray-700 transition rounded"
            >
              <span>{section.title}</span>
              <ChevronDown
                className={`w-4 h-4 transition-transform ${expandedSections.has(section.title) ? 'rotate-180' : ''}`}
              />
            </button>

            {expandedSections.has(section.title) && (
              <div className="space-y-1 pl-2 mb-4">
                {section.items.map((item) => {
                  const Icon = item.icon
                  const active = isActive(item.path)
                  return (
                    <Link
                      key={item.path}
                      href={item.path}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition text-sm font-medium ${
                        active
                          ? 'bg-blue-50 text-blue-600'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        ))}

        {/* Master Data Section with Submenu */}
        <div>
          <button
            onClick={() => toggleSection('MASTER DATA')}
            suppressHydrationWarning
            className="w-full text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2 py-2 flex items-center justify-between hover:text-gray-700 transition rounded"
          >
            <span>Master Data</span>
            <ChevronDown
              className={`w-4 h-4 transition-transform ${expandedSections.has('MASTER DATA') ? 'rotate-180' : ''}`}
            />
          </button>

          {expandedSections.has('MASTER DATA') && (
            <div className="space-y-1 pl-2 mb-4">
              {masterDataItems.map((item) => {
                const Icon = item.icon
                const active = isActive(item.path)
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition text-sm font-medium ${
                      active
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </nav>

      {/* User Profile & Logout */}
      <div className="border-t border-gray-200 p-4 space-y-3">
        <div className="px-3 py-2 bg-gray-50 rounded-lg">
          <p className="text-sm font-medium text-gray-900">{userName}</p>
          <p className="text-xs text-gray-600 mt-0.5">{userRole}</p>
        </div>
        <button
          onClick={handleLogout}
          suppressHydrationWarning
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition font-medium"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </aside>
  )
}
