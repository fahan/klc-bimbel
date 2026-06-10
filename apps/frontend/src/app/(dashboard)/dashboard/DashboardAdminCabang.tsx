'use client'

import React, { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { dashboardApi, invoiceApi } from '@/lib/api/endpoints'
import { useApiBranchId, useBranch } from '@/lib/branch-context'
import { SectionCard, Card } from '@/components/ui/Card'
import { SkeletonCard } from '@/components/ui/States'
import {
  Users, Calendar, DollarSign, AlertCircle, ArrowRight,
  Clock, MapPin, GraduationCap, FileText,
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

export default function DashboardAdminCabang() {
  const branchId = useApiBranchId()
  const { selectedBranch } = useBranch()
  const today = new Date()
  const month = today.getMonth() + 1
  const year = today.getFullYear()

  const { data: analyticsData, isLoading } = useQuery({
    queryKey: ['dashboard-analytics', branchId, month, year],
    queryFn: () => dashboardApi.getAnalytics({ branchId, month, year }),
    staleTime: 1000 * 60 * 2,
  })

  const { data: unpaidData, isLoading: unpaidLoading } = useQuery({
    queryKey: ['invoices-unpaid', branchId],
    queryFn: () => invoiceApi.getAll({ branchId, status: 'UNPAID', limit: 5 }),
    staleTime: 1000 * 60 * 2,
    enabled: !!branchId,
  })

  const d = analyticsData?.data?.data
  const metrics = d?.metrics
  const invoiceMetrics = d?.invoiceMetrics
  const todaySessions: any[] = d?.todaySessions ?? []
  const topTeachers: any[] = d?.topTeachers ?? []
  const unpaidInvoices: any[] = unpaidData?.data?.data ?? []

  const paymentStatus = useMemo(() => {
    if (!invoiceMetrics) return []
    const total =
      (invoiceMetrics.paidCount || 0) +
      (invoiceMetrics.unpaidCount || 0) +
      (invoiceMetrics.partialCount || 0)
    if (total === 0) return []
    return [
      {
        name: 'Lunas',
        total: invoiceMetrics.paidCount,
        pct: ((invoiceMetrics.paidCount / total) * 100).toFixed(0),
        barColor: 'bg-green-500',
        textColor: 'text-green-700',
      },
      {
        name: 'Belum Lunas',
        total: invoiceMetrics.unpaidCount,
        pct: ((invoiceMetrics.unpaidCount / total) * 100).toFixed(0),
        barColor: 'bg-red-500',
        textColor: 'text-red-700',
      },
      {
        name: 'Sebagian',
        total: invoiceMetrics.partialCount,
        pct: ((invoiceMetrics.partialCount / total) * 100).toFixed(0),
        barColor: 'bg-amber-500',
        textColor: 'text-amber-700',
      },
    ]
  }, [invoiceMetrics])

  const getSessionStatus = (session: any) => {
    const now = new Date()
    const [h, m] = (session.startTime || '00:00').split(':').map(Number)
    const start = new Date()
    start.setHours(h, m, 0, 0)
    const end = new Date(start.getTime() + (session.durationMinutes || 0) * 60_000)
    if (now > end) return 'selesai' as const
    if (now >= start && now <= end) return 'berlangsung' as const
    return 'mendatang' as const
  }

  const statusConfig = {
    selesai: { bg: 'bg-green-100', text: 'text-green-700', label: 'Selesai' },
    berlangsung: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Berlangsung' },
    mendatang: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Mendatang' },
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Welcome bar */}
      <div className="hidden sm:block bg-gradient-to-r from-blue-700 to-blue-500 rounded-xl p-5 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-blue-200 font-medium">Admin Cabang</p>
            <h1 className="text-2xl font-bold mt-0.5">
              {selectedBranch?.name ?? 'Dashboard Cabang'}
            </h1>
          </div>
          <div className="text-right">
            <p className="text-sm text-blue-200">
              {today.toLocaleDateString('id-ID', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
            <p className="text-xs text-blue-300 mt-0.5">Ringkasan operasional harian</p>
          </div>
        </div>
      </div>

      {/* Mobile: simple title */}
      <div className="sm:hidden">
        <p className="text-xs text-gray-500">
          {selectedBranch?.name ?? 'Cabang Anda'} &mdash;{' '}
          {today.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Metric cards */}
      {isLoading ? (
        <SkeletonCard count={4} />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-600 text-xs sm:text-sm font-medium">Siswa Aktif</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1 sm:mt-2">
                  {metrics?.totalStudents ?? 0}
                </p>
              </div>
              <div className="p-2 sm:p-3 bg-blue-100 rounded-lg">
                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2 sm:mt-4">
              {metrics?.totalTeachers ?? 0} guru aktif
            </p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-600 text-xs sm:text-sm font-medium">Sesi Hari Ini</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1 sm:mt-2">
                  {metrics?.totalSessionsToday ?? 0}
                </p>
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
            <p className="text-xs text-gray-500 mt-2 sm:mt-4">
              {today.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
            </p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-600 text-xs sm:text-sm font-medium">Tagihan Belum Lunas</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1 sm:mt-2">
                  {(invoiceMetrics?.unpaidCount ?? 0) + (invoiceMetrics?.partialCount ?? 0)}
                </p>
              </div>
              <div className="p-2 sm:p-3 bg-red-100 rounded-lg">
                <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
              </div>
            </div>
            <p className="text-xs text-red-500 font-medium mt-2 sm:mt-4">
              {formatRupiah(invoiceMetrics?.unpaidAmount ?? 0)} outstanding
            </p>
          </div>
        </div>
      )}

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Left column — 2/3 */}
        <div className="lg:col-span-2 space-y-6">
          {/* Sessions today */}
          <SectionCard
            title="Sesi Hari Ini"
            description={`${todaySessions.length} sesi terjadwal — ${today.toLocaleDateString('id-ID', { weekday: 'long' })}`}
            action={
              <Link
                href="/jadwal-sesi"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
              >
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
                <Link
                  href="/jadwal-sesi/create"
                  className="text-blue-600 hover:text-blue-700 text-xs font-medium mt-2 inline-block"
                >
                  Buat jadwal baru →
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {todaySessions.slice(0, 6).map((session: any) => {
                  const status = getSessionStatus(session)
                  const cfg = statusConfig[status]
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
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {session.startTime?.substring(0, 5)} ({session.durationMinutes}m)
                            </span>
                            <span className="flex items-center gap-1">
                              <GraduationCap className="w-4 h-4" />
                              {session.teacherName}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-gray-600">
                            <span className="font-medium">{session.capacity?.current || 0}</span>
                            /{session.capacity?.max || 0} siswa
                          </p>
                        </div>
                        <span
                          className={`text-xs px-2 py-1 rounded-full font-medium ${cfg.bg} ${cfg.text} flex-shrink-0 ml-3`}
                        >
                          {cfg.label}
                        </span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </SectionCard>

          {/* Payment status */}
          <SectionCard
            title="Status Pembayaran SPP"
            description={`${today.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })} · ${selectedBranch?.name ?? 'Cabang Anda'}`}
            action={
              <Link
                href="/invoice-tagihan"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
              >
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
                <Link
                  href="/invoice-tagihan"
                  className="text-blue-600 hover:text-blue-700 text-xs font-medium mt-2 inline-block"
                >
                  Generate invoice pertama →
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {paymentStatus.map((s) => (
                  <div key={s.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">{s.name}</span>
                      <span className={`text-sm font-semibold ${s.textColor}`}>
                        {s.total} invoice ({s.pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${s.barColor}`}
                        style={{ width: `${s.pct}%` }}
                      />
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

          {/* Teacher activity */}
          <SectionCard
            title="Aktivitas Guru"
            description="Guru berdasarkan jumlah sesi bulan ini"
            action={
              <Link
                href="/master-data/teachers"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
              >
                Lihat semua <ArrowRight className="w-4 h-4" />
              </Link>
            }
          >
            {isLoading ? (
              <SkeletonCard count={3} />
            ) : topTeachers.length === 0 ? (
              <div className="text-center py-4">
                <GraduationCap className="w-8 h-8 text-gray-300 mx-auto mb-1" />
                <p className="text-sm text-gray-500">Belum ada guru aktif</p>
              </div>
            ) : (
              <div className="space-y-3">
                {topTeachers.map((teacher: any) => {
                  const maxSessions = Math.max(
                    ...topTeachers.map((t: any) => t.totalSessions),
                    1,
                  )
                  const pct = (teacher.totalSessions / maxSessions) * 100
                  return (
                    <Link
                      key={teacher.id}
                      href={`/master-data/teachers/${teacher.id}`}
                      className="block pb-3 border-b border-gray-200 last:border-b-0 hover:bg-gray-50 -mx-2 px-2 transition rounded"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 text-sm truncate">
                            {teacher.name}
                          </p>
                        </div>
                        <span className="font-bold text-base text-gray-900 ml-2">
                          {teacher.totalSessions}
                          <span className="text-xs font-normal text-gray-500"> sesi</span>
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full bg-blue-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </SectionCard>
        </div>

        {/* Right column — 1/3 */}
        <div className="space-y-6">
          {/* Quick actions */}
          <SectionCard title="Aksi Cepat">
            <div className="space-y-2">
              <Link
                href="/master-data/students/create"
                className="flex items-center gap-3 w-full p-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition font-medium text-sm border border-blue-200"
              >
                <Users className="w-5 h-5 flex-shrink-0" /> Daftarkan Siswa
              </Link>
              <Link
                href="/invoice-tagihan"
                className="flex items-center gap-3 w-full p-3 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition font-medium text-sm border border-purple-200"
              >
                <DollarSign className="w-5 h-5 flex-shrink-0" /> Generate Invoice
              </Link>
              <Link
                href="/jadwal-sesi"
                className="flex items-center gap-3 w-full p-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition font-medium text-sm border border-green-200"
              >
                <Calendar className="w-5 h-5 flex-shrink-0" /> Lihat Jadwal
              </Link>
              <Link
                href="/komisi-guru"
                className="flex items-center gap-3 w-full p-3 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition font-medium text-sm border border-amber-200"
              >
                <GraduationCap className="w-5 h-5 flex-shrink-0" /> Hitung Komisi
              </Link>
            </div>
          </SectionCard>

          {/* Unpaid invoices */}
          <SectionCard
            title="Tagihan Belum Lunas"
            description="Perlu ditindaklanjuti"
            action={
              <Link
                href="/invoice-tagihan"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
              >
                Lihat semua <ArrowRight className="w-4 h-4" />
              </Link>
            }
          >
            {unpaidLoading ? (
              <SkeletonCard count={3} />
            ) : unpaidInvoices.length === 0 ? (
              <div className="text-center py-6">
                <FileText className="w-8 h-8 text-gray-300 mx-auto mb-1" />
                <p className="text-sm text-gray-500">Semua tagihan sudah lunas</p>
              </div>
            ) : (
              <div className="space-y-0 divide-y divide-gray-100">
                {unpaidInvoices.slice(0, 5).map((inv: any) => (
                  <Link
                    key={inv.id}
                    href={`/invoice-tagihan/${inv.id}`}
                    className="flex items-center justify-between py-3 hover:bg-gray-50 -mx-2 px-2 transition rounded"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {inv.studentName ?? inv.student?.name ?? '—'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {inv.invoiceNumber ?? inv.type} ·{' '}
                        {inv.month && inv.year
                          ? `${new Date(inv.year, inv.month - 1).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}`
                          : ''}
                      </p>
                    </div>
                    <p className="text-sm font-bold text-red-600 ml-2 flex-shrink-0">
                      {formatRupiah(inv.totalAmount ?? inv.amount ?? 0)}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </SectionCard>

          {/* Info card */}
          <Card>
            <div className="flex gap-3">
              <div className="p-2 bg-amber-100 rounded-lg h-fit flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900 text-sm mb-1">Tips Follow-up Tagihan</p>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Kirim link invoice ke orang tua via WhatsApp langsung dari halaman Invoice
                  Tagihan. Orang tua bisa lihat rincian tanpa perlu login.
                </p>
                <Link
                  href="/invoice-tagihan"
                  className="text-xs text-blue-600 font-medium mt-2 inline-block hover:underline"
                >
                  Buka Invoice Tagihan →
                </Link>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
