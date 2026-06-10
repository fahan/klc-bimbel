'use client'

import React, { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '@/lib/api/endpoints'
import { useApiBranchId, useBranch } from '@/lib/branch-context'
import { usePermission } from '@/lib/use-permissions'
import DashboardAdminCabang from './DashboardAdminCabang'
import { Card, SectionCard } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/Badge'
import { SkeletonCard } from '@/components/ui/States'
import {
  Users,
  BookOpen,
  DollarSign,
  TrendingUp,
  Calendar,
  AlertCircle,
  ArrowRight,
  Clock,
  MapPin,
  Building,
  FileText,
  GraduationCap,
} from 'lucide-react'
import Link from 'next/link'

function formatRupiah(amount: number | string) {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  if (!num || isNaN(num)) return 'Rp 0'
  if (num >= 1_000_000) return `Rp ${(num / 1_000_000).toFixed(1)}jt`
  if (num >= 1_000) return `Rp ${(num / 1_000).toFixed(0)}rb`
  return `Rp ${num.toLocaleString('id-ID')}`
}

function formatRupiahFull(amount: number | string) {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  if (!num || isNaN(num)) return 'Rp 0'
  return 'Rp ' + Math.round(num).toLocaleString('id-ID')
}

export default function DashboardPage() {
  const { hasRole, isLoaded } = usePermission()

  if (!isLoaded) return <SkeletonCard count={4} />

  if (hasRole('ADMIN_CABANG') && !hasRole('OWNER') && !hasRole('ADMIN_GLOBAL')) {
    return <DashboardAdminCabang />
  }

  return <DashboardOwnerGlobal />
}

function DashboardOwnerGlobal() {
  const branchId = useApiBranchId()
  const { selectedBranch, canViewAllBranches } = useBranch()
  const today = new Date()
  const month = today.getMonth() + 1
  const year = today.getFullYear()

  // Single API call — replaces 10 separate requests
  const { data: analyticsData, isLoading } = useQuery({
    queryKey: ['dashboard-analytics', branchId, month, year],
    queryFn: () => dashboardApi.getAnalytics({ branchId, month, year }),
    staleTime: 1000 * 60 * 2, // 2 minutes
  })

  const d = analyticsData?.data?.data

  // ===== Derived values from single response =====
  const metrics = d?.metrics
  const masterData = d?.masterData
  const invoiceMetrics = d?.invoiceMetrics
  const financeBreakdown = d?.financeBreakdown
  const todaySessions: any[] = d?.todaySessions ?? []
  const recentStudents: any[] = d?.recentStudents ?? []
  const topTeachers: any[] = d?.topTeachers ?? []
  const recentTransactions: any[] = d?.recentTransactions ?? []
  const branches: any[] = d?.branches ?? []

  // Payment status bars
  const paymentStatus = useMemo(() => {
    if (!invoiceMetrics) return []
    const total =
      (invoiceMetrics.paidCount || 0) +
      (invoiceMetrics.unpaidCount || 0) +
      (invoiceMetrics.partialCount || 0)
    if (total === 0) return []
    return [
      {
        id: 1,
        name: 'Lunas',
        total: invoiceMetrics.paidCount,
        percentage: ((invoiceMetrics.paidCount / total) * 100).toFixed(0),
        color: 'bg-green-500',
        textColor: 'text-green-700',
      },
      {
        id: 2,
        name: 'Belum Lunas',
        total: invoiceMetrics.unpaidCount,
        percentage: ((invoiceMetrics.unpaidCount / total) * 100).toFixed(0),
        color: 'bg-red-500',
        textColor: 'text-red-700',
      },
      {
        id: 3,
        name: 'Sebagian',
        total: invoiceMetrics.partialCount,
        percentage: ((invoiceMetrics.partialCount / total) * 100).toFixed(0),
        color: 'bg-amber-500',
        textColor: 'text-amber-700',
      },
    ]
  }, [invoiceMetrics])

  // Session status helper
  const getSessionStatus = (session: any) => {
    const now = new Date()
    const [h, m] = (session.startTime || '00:00').split(':').map(Number)
    const start = new Date(); start.setHours(h, m, 0, 0)
    const end = new Date(start.getTime() + (session.durationMinutes || 0) * 60_000)
    if (now > end) return 'selesai' as const
    if (now >= start && now <= end) return 'berlangsung' as const
    return 'mendatang' as const
  }

  // Master data cards config
  const masterDataCards = [
    { title: 'Branches', count: masterData?.branches ?? 0, href: '/master-data/branches', color: 'from-blue-500 to-blue-600', emoji: '🏢' },
    { title: 'Subjects', count: masterData?.subjects ?? 0, href: '/master-data/subjects', color: 'from-green-500 to-green-600', emoji: '📚' },
    { title: 'SPP Rates', count: masterData?.sppRates ?? 0, href: '/master-data/spp-rates', color: 'from-purple-500 to-purple-600', emoji: '💰' },
    { title: 'Curriculum Modules', count: masterData?.curriculumModules ?? 0, href: '/master-data/curriculum-modules', color: 'from-orange-500 to-orange-600', emoji: '📖' },
  ]

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header — hidden on mobile (topbar shows title) */}
      <div className="hidden sm:block">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">
          {selectedBranch
            ? `${selectedBranch.name} · `
            : canViewAllBranches
            ? 'Semua Cabang (Konsolidasi) · '
            : ''}
          Ringkasan operasional —{' '}
          {today.toLocaleDateString('id-ID', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </p>
      </div>

      {/* Operational Metrics */}
      {isLoading ? (
        <SkeletonCard count={4} />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-600 text-xs sm:text-sm font-medium">Total Siswa Aktif</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1 sm:mt-2">{metrics?.totalStudents ?? 0}</p>
              </div>
              <div className="p-2 sm:p-3 bg-blue-100 rounded-lg">
                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2 sm:mt-4">{metrics?.totalTeachers ?? 0} guru aktif</p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-600 text-xs sm:text-sm font-medium">Sesi Hari Ini</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1 sm:mt-2">{metrics?.totalSessionsToday ?? 0}</p>
              </div>
              <div className="p-2 sm:p-3 bg-green-100 rounded-lg">
                <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2 sm:mt-4">
              {today.toLocaleDateString('id-ID', { weekday: 'long' })}
            </p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-600 text-xs sm:text-sm font-medium">SPP Terkumpul</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900 mt-1 sm:mt-2">
                  {formatRupiah(metrics?.sppCollectedThisMonth ?? 0)}
                </p>
              </div>
              <div className="p-2 sm:p-3 bg-purple-100 rounded-lg">
                <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2 sm:mt-4">Bulan ini</p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-600 text-xs sm:text-sm font-medium">Total Komisi</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900 mt-1 sm:mt-2">
                  {formatRupiah(metrics?.totalCommissionThisMonth ?? 0)}
                </p>
              </div>
              <div className="p-2 sm:p-3 bg-orange-100 rounded-lg">
                <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2 sm:mt-4">Bulan ini (approved)</p>
          </div>
        </div>
      )}

      {/* Master Data Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">📋 Master Data Management</h2>
        <p className="text-gray-600 mb-4">
          Kelola cabang, mata pelajaran, tarif SPP, dan struktur kurikulum untuk sistem bimbel Anda.
        </p>
      </div>

      {/* Master Data Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {masterDataCards.map(card => (
          <Link key={card.href} href={card.href}>
            <div
              className={`bg-gradient-to-br ${card.color} rounded-lg shadow-md p-4 sm:p-6 text-white hover:shadow-lg hover:scale-105 transition-all cursor-pointer`}
            >
              <div className="flex items-center justify-between mb-2 sm:mb-4">
                <h3 className="text-sm sm:text-lg font-semibold leading-tight">{card.title}</h3>
                <span className="text-2xl sm:text-3xl">{card.emoji}</span>
              </div>
              <div className="text-2xl sm:text-3xl font-bold">{isLoading ? '…' : card.count}</div>
              <p className="text-xs sm:text-sm text-white/80 mt-1 sm:mt-2">Klik untuk kelola</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Operational Section */}
      <div className="border-t-2 border-gray-200 pt-4 sm:pt-6">
        <h2 className="text-lg sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">📊 Ringkasan Operasional</h2>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Today's Sessions */}
          <SectionCard
            title="Sesi Hari Ini"
            description={`${todaySessions.length} sesi terjadwal pada ${today.toLocaleDateString('id-ID', { weekday: 'long' })}`}
            action={
              <Link href="/jadwal-sesi" className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                Lihat semua <ArrowRight className="w-4 h-4" />
              </Link>
            }
          >
            {isLoading ? (
              <SkeletonCard count={3} />
            ) : todaySessions.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Tidak ada sesi terjadwal hari ini</p>
              </div>
            ) : (
              <div className="space-y-3">
                {todaySessions.slice(0, 5).map((session: any) => {
                  const status = getSessionStatus(session)
                  const statusConfig = {
                    selesai: { bg: 'bg-green-100', text: 'text-green-700', label: 'Selesai' },
                    berlangsung: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Berlangsung' },
                    mendatang: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Mendatang' },
                  }[status]
                  return (
                    <Link
                      key={session.id}
                      href={`/jadwal-sesi/${session.id}`}
                      className="block p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-200 hover:bg-blue-50 transition"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{session.subjectName}</h4>
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-600 flex-wrap">
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {session.startTime?.substring(0, 5)} ({session.durationMinutes}m)
                            </div>
                            <div className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              {session.branchName}
                            </div>
                            <span>Guru: <span className="font-medium">{session.teacherName}</span></span>
                          </div>
                          <div className="mt-2 text-sm text-gray-600">
                            <span className="font-medium">{session.capacity?.current || 0}</span>/{session.capacity?.max || 0} siswa
                          </div>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusConfig.bg} ${statusConfig.text}`}>
                          {statusConfig.label}
                        </span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </SectionCard>

          {/* Payment Status */}
          <SectionCard
            title="Status Pembayaran SPP"
            description={`Bulan ${today.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}`}
            action={
              <Link href="/invoice-tagihan" className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                Kelola invoice <ArrowRight className="w-4 h-4" />
              </Link>
            }
          >
            {isLoading ? (
              <SkeletonCard count={2} />
            ) : paymentStatus.length === 0 ? (
              <div className="text-center py-8">
                <DollarSign className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Belum ada invoice bulan ini</p>
                <Link href="/invoice-tagihan" className="text-blue-600 hover:text-blue-700 text-xs font-medium mt-2 inline-block">
                  Generate invoice pertama →
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {paymentStatus.map(s => (
                  <div key={s.id}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">{s.name}</span>
                      <span className={`text-sm font-semibold ${s.textColor}`}>
                        {s.total} invoice ({s.percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className={`h-2 rounded-full ${s.color}`} style={{ width: `${s.percentage}%` }} />
                    </div>
                  </div>
                ))}
                {invoiceMetrics && (
                  <div className="pt-3 mt-3 border-t border-gray-200 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-gray-500">Total terkumpul</p>
                      <p className="text-base font-bold text-green-700">
                        {formatRupiahFull(invoiceMetrics.paidAmount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Belum terbayar</p>
                      <p className="text-base font-bold text-red-700">
                        {formatRupiahFull(invoiceMetrics.unpaidAmount)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </SectionCard>

          {/* Recent Students */}
          <SectionCard
            title="Siswa Terbaru"
            description="4 siswa yang baru didaftarkan"
            action={
              <Link href="/master-data/students" className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                Lihat semua <ArrowRight className="w-4 h-4" />
              </Link>
            }
          >
            {isLoading ? (
              <SkeletonCard count={3} />
            ) : recentStudents.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Belum ada siswa terdaftar</p>
                <Link href="/master-data/students/create" className="text-blue-600 hover:text-blue-700 text-xs font-medium mt-2 inline-block">
                  Daftarkan siswa pertama →
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {recentStudents.map((student: any) => (
                  <Link
                    key={student.id}
                    href={`/master-data/students/${student.id}`}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-9 h-9 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-xs flex-shrink-0">
                        {student.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{student.name}</p>
                        <p className="text-xs text-gray-600 mt-0.5">
                          {student.classLevel || 'Tanpa kelas'} · {student.subjectCount || 0} mapel
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={student.isActive ? 'active' : 'inactive'} />
                  </Link>
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <SectionCard title="🚀 Aksi Cepat">
            <div className="space-y-2">
              <Link href="/master-data/students/create" className="flex items-center gap-3 w-full p-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition font-medium text-sm border border-blue-200">
                <Users className="w-5 h-5" /> Daftarkan Siswa
              </Link>
              <Link href="/invoice-tagihan" className="flex items-center gap-3 w-full p-3 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition font-medium text-sm border border-purple-200">
                <DollarSign className="w-5 h-5" /> Generate Invoice
              </Link>
              <Link href="/jadwal-sesi" className="flex items-center gap-3 w-full p-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition font-medium text-sm border border-green-200">
                <Calendar className="w-5 h-5" /> Lihat Jadwal
              </Link>
              <Link href="/komisi-guru" className="flex items-center gap-3 w-full p-3 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition font-medium text-sm border border-amber-200">
                <TrendingUp className="w-5 h-5" /> Laporan Komisi
              </Link>
            </div>
          </SectionCard>

          {/* Recent Transactions */}
          <SectionCard
            title="Transaksi Terbaru"
            description="Pembayaran & penjualan terkini"
            action={
              <Link href="/laporan-keuangan" className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                Lihat semua <ArrowRight className="w-4 h-4" />
              </Link>
            }
          >
            {isLoading ? (
              <SkeletonCard count={2} />
            ) : recentTransactions.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">Belum ada transaksi</p>
            ) : (
              <div className="space-y-2">
                {recentTransactions.map((tx: any) => (
                  <div key={tx.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">{tx.description}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        {new Date(tx.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} ·{' '}
                        {{ SPP: 'SPP', REGISTRATION: 'Registrasi', SALE: 'Penjualan', COMMISSION: 'Komisi' }[tx.type as string] ?? tx.type}
                      </p>
                    </div>
                    <p className={`font-semibold text-sm ml-2 ${tx.direction === 'IN' ? 'text-green-700' : 'text-red-700'}`}>
                      {tx.direction === 'IN' ? '+' : '−'}{formatRupiah(tx.amount)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* Teacher Activity */}
          <SectionCard
            title="Aktivitas Guru"
            description="Top guru berdasarkan jumlah sesi"
            action={
              <Link href="/master-data/teachers" className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                Lihat semua <ArrowRight className="w-4 h-4" />
              </Link>
            }
          >
            {isLoading ? (
              <SkeletonCard count={3} />
            ) : topTeachers.length === 0 ? (
              <div className="text-center py-4">
                <GraduationCap className="w-8 h-8 text-gray-300 mx-auto mb-1" />
                <p className="text-sm text-gray-500">Belum ada guru</p>
              </div>
            ) : (
              <div className="space-y-3">
                {topTeachers.map((teacher: any) => {
                  const maxSessions = Math.max(...topTeachers.map((t: any) => t.totalSessions), 1)
                  const pct = (teacher.totalSessions / maxSessions) * 100
                  return (
                    <Link
                      key={teacher.id}
                      href={`/master-data/teachers/${teacher.id}`}
                      className="block pb-3 border-b border-gray-200 last:border-b-0 hover:bg-gray-50 -mx-2 px-2 transition rounded"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 text-sm truncate">{teacher.name}</p>
                          <p className="text-xs text-gray-600">{teacher.branchCount} cabang</p>
                        </div>
                        <span className="font-bold text-base text-gray-900 ml-2">
                          {teacher.totalSessions}<span className="text-xs font-normal text-gray-500"> sesi</span>
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${pct}%` }} />
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </SectionCard>

          {/* Tips */}
          <Card>
            <div className="flex gap-3">
              <div className="p-2 bg-amber-100 rounded-lg h-fit flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900 text-sm mb-1">💡 Tips Penting</p>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Pastikan semua data master (cabang, mata pelajaran, tarif SPP) sudah terdaftar
                  sebelum mendaftarkan siswa baru.
                </p>
              </div>
            </div>
          </Card>

          {/* System Status */}
          <Card>
            <h4 className="font-semibold text-gray-900 mb-4 text-sm">📊 Status Sistem</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                <span className="text-gray-600 text-sm">Cabang Aktif</span>
                <span className="font-bold text-lg text-gray-900">{isLoading ? '…' : branches.length}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                <span className="text-gray-600 text-sm">Mata Pelajaran</span>
                <span className="font-bold text-lg text-gray-900">{isLoading ? '…' : masterData?.subjects ?? 0}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                <span className="text-gray-600 text-sm">Siswa Terdaftar</span>
                <span className="font-bold text-lg text-gray-900">{isLoading ? '…' : metrics?.totalStudents ?? 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 text-sm">Guru Aktif</span>
                <span className="font-bold text-lg text-gray-900">{isLoading ? '…' : metrics?.totalTeachers ?? 0}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
