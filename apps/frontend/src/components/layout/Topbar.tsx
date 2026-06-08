'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Bell, ChevronDown, LogOut, Globe, Lock, User, AlertTriangle, FileText, Package, UserPlus } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { useBranch, useApiBranchId } from '@/lib/branch-context'
import { useNotifications } from '@/lib/hooks/useNotifications'

export default function Topbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { selectedBranchId, branches, canSwitchBranch, canViewAllBranches, isRestrictedToBranch, setSelectedBranchId } =
    useBranch()
  const branchId = useApiBranchId()
  const [showBranchDropdown, setShowBranchDropdown] = useState(false)
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [userName, setUserName] = useState('')
  const [userRole, setUserRole] = useState('')
  const { notifications, unreadCount } = useNotifications(branchId)

  useEffect(() => {
    if (typeof window === 'undefined') return
    setUserName(localStorage.getItem('userName') || 'Admin')
    setUserRole(localStorage.getItem('userRole') || 'ADMIN')
  }, [])

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token')
      localStorage.removeItem('userRole')
      localStorage.removeItem('userId')
      localStorage.removeItem('userName')
      localStorage.removeItem('selectedBranchId')
    }
    router.push('/login')
  }

  const getPageTitle = () => {
    if (pathname === '/dashboard' || pathname === '/master-data' || pathname.includes('dashboard')) {
      return 'Dashboard'
    }
    if (pathname === '/jadwal-sesi' || pathname.startsWith('/jadwal-sesi/')) {
      return 'Jadwal & Sesi'
    }
    if (pathname === '/invoice-tagihan' || pathname.startsWith('/invoice-tagihan/')) {
      return 'Invoice Tagihan'
    }
    if (pathname === '/pembayaran-spp' || pathname.startsWith('/pembayaran-spp/')) {
      return 'Pembayaran SPP'
    }
    if (pathname === '/komisi-guru' || pathname.startsWith('/komisi-guru/')) {
      return 'Laporan Komisi Guru'
    }
    if (pathname === '/formula-komisi') {
      return 'Formula Komisi Guru'
    }
    if (pathname === '/laporan-progress' || pathname.startsWith('/laporan-progress/')) {
      return 'Laporan Progress Siswa'
    }
    if (pathname === '/laporan-keuangan' || pathname.startsWith('/laporan-keuangan/')) {
      return 'Laporan Keuangan'
    }
    if (pathname === '/manajemen-user' || pathname.startsWith('/manajemen-user/')) {
      return 'Manajemen Pengguna'
    }
    if (pathname === '/toko-stok' || pathname.startsWith('/toko-stok/')) {
      return 'Toko & Stok'
    }
    if (pathname === '/transfer-stok' || pathname.startsWith('/transfer-stok/')) {
      return 'Transfer Stok'
    }
    if (pathname === '/pengeluaran' || pathname.startsWith('/pengeluaran/')) {
      return 'Pengeluaran'
    }
    if (pathname.startsWith('/master-data/')) {
      const segments = pathname.split('/').filter(Boolean)
      const lastSegment = segments[segments.length - 1]
      if (lastSegment === 'branches') return 'Branches'
      if (lastSegment === 'subjects') return 'Subjects'
      if (lastSegment === 'spp-rates') return 'SPP Rates'
      if (lastSegment === 'curriculum-modules') return 'Curriculum Modules'
      if (lastSegment === 'students') return 'Data Siswa'
      if (lastSegment === 'teachers') return 'Data Guru'
    }
    const segments = pathname.split('/').filter(Boolean)
    const lastSegment = segments[segments.length - 1] || 'Dashboard'
    return lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1)
  }

  const getFormattedDate = () => {
    const today = new Date()
    return today.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  // Determine display label for branch selector
  const selectedBranch = branches.find(b => b.id === selectedBranchId)
  const branchLabel = !selectedBranchId
    ? canViewAllBranches
      ? 'Semua Cabang'
      : '— Pilih cabang —'
    : selectedBranch?.name || 'Loading...'

  const userInitials = userName
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const roleLabel: Record<string, string> = {
    OWNER: 'Owner',
    ADMIN_GLOBAL: 'Admin Global',
    ADMIN_CABANG: 'Admin Cabang',
    GURU: 'Guru',
  }

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left Section - Branch & Title */}
        <div className="flex items-center gap-6 flex-1">
          {/* Branch Selector */}
          <div className="relative">
            <button
              onClick={() => canSwitchBranch && setShowBranchDropdown(!showBranchDropdown)}
              disabled={!canSwitchBranch}
              className={`flex items-center gap-2 px-3 py-2 border rounded-lg transition text-sm font-medium ${
                canSwitchBranch
                  ? 'border-gray-300 hover:bg-gray-50 text-gray-700 cursor-pointer'
                  : 'border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed'
              }`}
              title={isRestrictedToBranch ? 'Anda terbatas pada cabang ini' : ''}
            >
              {!selectedBranchId ? (
                <Globe className="w-4 h-4 text-blue-600" />
              ) : (
                <span>📍</span>
              )}
              <span className="truncate max-w-[180px]">{branchLabel}</span>
              {isRestrictedToBranch ? (
                <Lock className="w-3 h-3 text-gray-400 ml-1" />
              ) : (
                <ChevronDown
                  className={`w-4 h-4 text-gray-500 transition-transform ${
                    showBranchDropdown ? 'rotate-180' : ''
                  }`}
                />
              )}
            </button>
            {showBranchDropdown && canSwitchBranch && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowBranchDropdown(false)}
                />
                <div className="absolute left-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
                  {canViewAllBranches && (
                    <>
                      <button
                        onClick={() => {
                          setSelectedBranchId('')
                          setShowBranchDropdown(false)
                        }}
                        className={`w-full text-left px-4 py-2.5 hover:bg-blue-50 transition text-sm flex items-center gap-2 ${
                          !selectedBranchId ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                        }`}
                      >
                        <Globe className="w-4 h-4 text-blue-600" />
                        <div className="flex-1">
                          <p className="font-medium">Semua Cabang</p>
                          <p className="text-[10px] text-gray-500">Tampilan konsolidasi</p>
                        </div>
                      </button>
                      <div className="border-t border-gray-100"></div>
                    </>
                  )}
                  <div className="max-h-64 overflow-y-auto">
                    {branches.length === 0 ? (
                      <p className="px-4 py-3 text-xs text-gray-500 italic">Belum ada cabang</p>
                    ) : (
                      branches.map(branch => (
                        <button
                          key={branch.id}
                          onClick={() => {
                            setSelectedBranchId(branch.id)
                            setShowBranchDropdown(false)
                          }}
                          className={`w-full text-left px-4 py-2.5 hover:bg-blue-50 transition text-sm flex items-center gap-2 ${
                            selectedBranchId === branch.id
                              ? 'bg-blue-50 text-blue-700 font-medium'
                              : 'text-gray-700'
                          }`}
                        >
                          <span>📍</span>
                          <div className="flex-1">
                            <p>{branch.name}</p>
                            <p className="text-[10px] text-gray-500 font-mono">{branch.code}</p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Title & Date */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{getPageTitle()}</h1>
            <p className="text-sm text-gray-600 mt-1">{getFormattedDate()}</p>
          </div>
        </div>

        {/* Right Section - Notification & User */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-full transition"
            >
              <Bell className="w-6 h-6" />
              {unreadCount > 0 && (
                <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] bg-red-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold px-1">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            {showNotifications && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowNotifications(false)}
                />
                <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                  <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-900">Notifikasi</p>
                    {unreadCount > 0 && (
                      <span className="text-xs bg-red-100 text-red-700 font-semibold px-2 py-0.5 rounded-full">
                        {unreadCount} baru
                      </span>
                    )}
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-8 text-center">
                        <Bell className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                        <p className="text-sm text-gray-400">Tidak ada notifikasi</p>
                      </div>
                    ) : (
                      notifications.map((notif) => {
                        const iconMap = {
                          adhoc: <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />,
                          invoice: <FileText className="w-4 h-4 text-red-500 flex-shrink-0" />,
                          stock: <Package className="w-4 h-4 text-orange-500 flex-shrink-0" />,
                          registration: <UserPlus className="w-4 h-4 text-blue-500 flex-shrink-0" />,
                        }
                        const bgMap = {
                          danger: 'bg-red-50 border-l-4 border-red-400',
                          warning: 'bg-amber-50 border-l-4 border-amber-400',
                          info: 'bg-blue-50 border-l-4 border-blue-400',
                        }
                        return (
                          <Link
                            key={notif.id}
                            href={notif.href}
                            onClick={() => setShowNotifications(false)}
                            className={`flex items-start gap-3 px-4 py-3 border-b border-gray-100 hover:brightness-95 transition ${bgMap[notif.severity]}`}
                          >
                            <div className="mt-0.5">{iconMap[notif.type]}</div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900">{notif.title}</p>
                              <p className="text-xs text-gray-600 mt-0.5">{notif.description}</p>
                            </div>
                          </Link>
                        )
                      })
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="h-8 w-px bg-gray-200"></div>

          <div className="relative">
            <button
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 rounded-lg transition"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                {userInitials}
              </div>
              <div className="text-left hidden md:block">
                <p className="text-sm font-medium text-gray-700">{userName}</p>
                <p className="text-[10px] text-gray-500">{roleLabel[userRole] || userRole}</p>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-gray-500 transition-transform ${
                  showUserDropdown ? 'rotate-180' : ''
                }`}
              />
            </button>
            {showUserDropdown && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowUserDropdown(false)}
                />
                <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                  <div className="px-4 py-2 border-b border-gray-200">
                    <p className="text-sm font-medium text-gray-900">{userName}</p>
                    <p className="text-xs text-gray-500">{roleLabel[userRole] || userRole}</p>
                  </div>
                  <Link
                    href="/profil-saya"
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 transition text-sm text-gray-700 flex items-center gap-2 border-b border-gray-100"
                  >
                    <User className="w-4 h-4" />
                    <span>Profil Saya</span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 hover:bg-red-50 transition text-sm text-red-700 flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
