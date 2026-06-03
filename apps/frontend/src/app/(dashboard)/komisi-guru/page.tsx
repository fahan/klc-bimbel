'use client'

import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { commissionApi } from '@/lib/api/endpoints'
import { useBranch } from '@/lib/branch-context'
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Calculator,
  Check,
  CheckCircle,
  Clock,
  TrendingUp,
  X,
} from 'lucide-react'
import { LoadingState, EmptyState } from '@/components/ui/States'

const MONTHS = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
]

function formatRupiah(amount: number | string) {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return 'Rp ' + num.toLocaleString('id-ID', { maximumFractionDigits: 0 })
}

export default function KomisiGuruPage() {
  const today = new Date()
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [year, setYear] = useState(today.getFullYear())
  const { selectedBranchId, selectedBranch, branches, canViewAllBranches, setSelectedBranchId } =
    useBranch()
  const branchId = selectedBranchId
  const [selectedCommissionId, setSelectedCommissionId] = useState<string | null>(null)
  const [calculating, setCalculating] = useState(false)
  const [approvingAll, setApprovingAll] = useState(false)

  const { data: commissionsData, isLoading, refetch } = useQuery({
    queryKey: ['commissions', branchId, month, year],
    queryFn: () => commissionApi.getByMonth(branchId, month, year),
    enabled: !!branchId,
  })

  const { data: detailData } = useQuery({
    queryKey: ['commission-detail', selectedCommissionId],
    queryFn: () => commissionApi.getDetail(selectedCommissionId!),
    enabled: !!selectedCommissionId,
  })

  const commissions = commissionsData?.data?.data?.commissions || []
  const metrics = commissionsData?.data?.data?.metrics
  const detail = detailData?.data?.data

  const isCurrentMonth = month === today.getMonth() + 1 && year === today.getFullYear()
  const monthLabel = `${MONTHS[month - 1]} ${year}`

  const navigatePrev = () => {
    if (month === 1) {
      setMonth(12)
      setYear(year - 1)
    } else {
      setMonth(month - 1)
    }
  }

  const navigateNext = () => {
    if (isCurrentMonth) return
    if (month === 12) {
      setMonth(1)
      setYear(year + 1)
    } else {
      setMonth(month + 1)
    }
  }

  const handleCalculate = async () => {
    try {
      setCalculating(true)
      await commissionApi.calculate({ branchId, month, year })
      refetch()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal kalkulasi komisi')
    } finally {
      setCalculating(false)
    }
  }

  const handleApprove = async (id: string) => {
    if (!confirm('Setujui komisi ini?')) return
    try {
      await commissionApi.approve(id)
      refetch()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal setujui komisi')
    }
  }

  const handleApproveAll = async () => {
    if (!confirm(`Setujui semua komisi untuk ${monthLabel}?`)) return
    try {
      setApprovingAll(true)
      await commissionApi.approveAll({ branchId, month, year })
      refetch()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal setujui semua')
    } finally {
      setApprovingAll(false)
    }
  }

  const PREDIKAT_LABEL: Record<string, string> = {
    REGULAR: 'Reguler',
    PRIVATE: 'Privat',
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Laporan Komisi Guru</h1>
          <p className="text-gray-600 mt-1">
            Kalkulasi otomatis · Review & setujui sebelum dibayarkan
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Month Navigator */}
          <div className="flex items-center gap-1 px-2 py-1 border border-gray-300 rounded-lg bg-white">
            <button
              onClick={navigatePrev}
              className="p-1 hover:bg-gray-100 rounded transition"
              title="Bulan sebelumnya"
            >
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            </button>
            <span className="text-sm font-medium text-gray-700 px-2 min-w-[120px] text-center">
              {monthLabel}
            </span>
            <button
              onClick={navigateNext}
              disabled={isCurrentMonth}
              className="p-1 hover:bg-gray-100 rounded transition disabled:opacity-30 disabled:cursor-not-allowed"
              title="Bulan berikutnya"
            >
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </button>
          </div>

          <button
            onClick={handleCalculate}
            disabled={calculating || !branchId}
            className="flex items-center gap-2 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm rounded-lg transition font-medium disabled:opacity-50"
          >
            <Calculator className="w-4 h-4" />
            {calculating ? 'Kalkulasi...' : 'Kalkulasi Ulang'}
          </button>

          <button className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium">
            <Download className="w-4 h-4" />
            Export
          </button>

          <button
            onClick={handleApproveAll}
            disabled={approvingAll || commissions.length === 0}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition font-medium disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            {approvingAll ? 'Memproses...' : 'Setujui Semua'}
          </button>
        </div>
      </div>

      {/* No Branch Selected Notice */}
      {!branchId && canViewAllBranches && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
          <Clock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-blue-900 text-sm">Pilih cabang dulu</p>
            <p className="text-xs text-blue-700 mt-1">
              Komisi guru dihitung per cabang. Pilih cabang dari dropdown di topbar atau klik tombol di
              bawah.
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              {branches.map(b => (
                <button
                  key={b.id}
                  onClick={() => setSelectedBranchId(b.id)}
                  className="px-3 py-1 text-xs bg-white hover:bg-blue-100 border border-blue-300 text-blue-700 rounded-full font-medium transition"
                >
                  📍 {b.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Status Banner */}
      {isCurrentMonth ? (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <p className="text-sm text-amber-800">
              <strong>Bulan berjalan</strong> — komisi final dihitung otomatis pada 1{' '}
              {MONTHS[month % 12]}. Data saat ini adalah estimasi berdasarkan presensi yang sudah tercatat.
            </p>
          </div>
          <span className="text-xs text-amber-700 font-medium px-3 py-1 bg-amber-100 rounded-full whitespace-nowrap">
            {today.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        </div>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
          <p className="text-sm text-green-800">
            <strong>Komisi final</strong> — siap untuk disetujui
          </p>
        </div>
      )}

      {/* Metrics */}
      {metrics && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
            <p className="text-xs text-gray-600 font-medium">Total Estimasi Komisi</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {formatRupiah(metrics.totalEstimated)}
            </p>
            <p className="text-xs text-gray-500 mt-1">{metrics.totalTeachers} guru</p>
          </div>
          <div className="bg-white rounded-lg border border-blue-200 p-4 shadow-sm">
            <p className="text-xs text-blue-600 font-medium">Sudah Disetujui</p>
            <p className="text-2xl font-bold text-blue-700 mt-1">
              {formatRupiah(metrics.totalApproved)}
            </p>
            <p className="text-xs text-blue-500 mt-1">{metrics.approvedTeachersCount} guru</p>
          </div>
          <div className="bg-white rounded-lg border border-green-200 p-4 shadow-sm">
            <p className="text-xs text-green-600 font-medium">Total Sesi Terlaksana</p>
            <p className="text-2xl font-bold text-green-700 mt-1">{metrics.totalSessions}</p>
            <p className="text-xs text-green-500 mt-1">sesi tercatat</p>
          </div>
          <div className="bg-white rounded-lg border border-amber-200 p-4 shadow-sm">
            <p className="text-xs text-amber-600 font-medium">Sesi Penggantian</p>
            <p className="text-2xl font-bold text-amber-700 mt-1">
              {metrics.totalReplacementSessions}
            </p>
            <p className="text-xs text-amber-500 mt-1">guru pengganti</p>
          </div>
        </div>
      )}

      {/* Commissions Table */}
      {isLoading ? (
        <LoadingState />
      ) : commissions.length === 0 ? (
        <EmptyState
          title="Belum ada komisi"
          description="Klik 'Kalkulasi Ulang' untuk menghitung komisi berdasarkan presensi"
          action={{
            label: 'Kalkulasi Sekarang',
            onClick: handleCalculate,
          }}
        />
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700">#</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Nama Guru</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">Sesi Hadir</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">Sesi Ganti</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">Total Sesi</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">Komisi</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {commissions.map((c: any, idx: number) => {
                  const isSelected = selectedCommissionId === c.id
                  return (
                    <tr
                      key={c.id}
                      onClick={() => setSelectedCommissionId(c.id)}
                      className={`cursor-pointer transition ${
                        isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <td className="px-3 py-3 text-sm text-gray-500">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-xs">
                            {c.teacherName
                              ?.split(' ')
                              .map((n: string) => n[0])
                              .join('')
                              .slice(0, 2)
                              .toUpperCase()}
                          </div>
                          <p className="text-sm font-medium text-gray-900">{c.teacherName}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-gray-700">
                        {c.regularSessions}
                      </td>
                      <td className="px-4 py-3 text-center text-sm">
                        {c.replacementSessions > 0 ? (
                          <span className="text-amber-700 font-medium">
                            +{c.replacementSessions}
                          </span>
                        ) : (
                          <span className="text-gray-400">0</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center text-sm font-semibold text-gray-900">
                        {c.totalSessions}
                      </td>
                      <td className="px-4 py-3">
                        {c.status === 'APPROVED' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                            Disetujui
                          </span>
                        ) : c.status === 'CALCULATED' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-700">
                            Final
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                            Berjalan
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-green-700">
                        {formatRupiah(c.totalAmount)}
                      </td>
                      <td className="px-4 py-3">
                        {c.status !== 'APPROVED' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleApprove(c.id)
                            }}
                            className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition font-medium"
                          >
                            Setujui
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail Panel */}
      {detail && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="bg-blue-50 border-b border-blue-200 px-6 py-4 flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-blue-900">
                {detail.teacherName} —{' '}
                {detail.bySubject.map((s: any) => s.subjectName).join(', ')}
              </h2>
              <p className="text-sm text-blue-700 mt-0.5">
                {detail.bySubject.reduce(
                  (sum: number, s: any) =>
                    sum + s.students.reduce((a: number, st: any) => a + st.sessionsAttended, 0),
                  0,
                )}{' '}
                sesi · {monthLabel}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {detail.status === 'APPROVED' ? (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-blue-600 text-white">
                  Disetujui
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                  {detail.status === 'CALCULATED' ? 'Final' : 'Berjalan'}
                </span>
              )}
              <button
                onClick={() => setSelectedCommissionId(null)}
                className="p-1 hover:bg-blue-100 rounded transition"
              >
                <X className="w-4 h-4 text-blue-700" />
              </button>
            </div>
          </div>

          {/* By Subject Grid */}
          <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
            {detail.bySubject.map((subject: any) => (
              <div key={subject.subjectId} className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm">{subject.subjectName}</h3>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      {subject.formulaType === 'MONTHLY_RATE'
                        ? `SPP ÷ 12 × ${((subject.commissionPercentage ?? 0.4) * 100).toFixed(0)}% × sesi`
                        : `SPP ÷ total sesi × ${((subject.commissionPercentage ?? 0.4) * 100).toFixed(0)}% × sesi`}
                    </p>
                  </div>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      subject.sessionType === 'REGULAR'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-purple-100 text-purple-700'
                    }`}
                  >
                    {PREDIKAT_LABEL[subject.sessionType] || subject.sessionType}
                  </span>
                </div>
                <div className="p-4 space-y-3">
                  {subject.students.map((st: any) => (
                    <div
                      key={st.studentId}
                      className={`p-2 rounded-lg ${
                        st.isReplacement ? 'bg-amber-50 border border-amber-200' : 'bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {st.studentName}
                            {st.isReplacement && (
                              <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-amber-200 text-amber-800 rounded font-medium">
                                Pengganti
                              </span>
                            )}
                          </p>
                          <p className="text-[11px] text-gray-500 mt-0.5 font-mono">
                            {subject.formulaType === 'MONTHLY_RATE'
                              ? `${formatRupiah(st.sppAmount)} ÷ 12 × ${((subject.commissionPercentage ?? 0.4) * 100).toFixed(0)}% × ${st.sessionsAttended}`
                              : `${formatRupiah(st.sppAmount)} ÷ ${st.totalSessionsInMonth} × ${((subject.commissionPercentage ?? 0.4) * 100).toFixed(0)}% × ${st.sessionsAttended}`}
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-green-700 whitespace-nowrap">
                          {formatRupiah(st.commissionAmount)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="bg-gray-50 px-4 py-2 border-t border-gray-200 flex items-center justify-between">
                  <p className="text-xs font-semibold text-gray-700">Subtotal</p>
                  <p className="text-sm font-bold text-gray-900">{formatRupiah(subject.subtotal)}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Total Komisi {monthLabel}</p>
              <p className="text-2xl font-bold text-green-700">
                {formatRupiah(detail.totalAmount)}
              </p>
            </div>
            <div className="flex gap-2">
              {detail.status !== 'APPROVED' && (
                <button
                  onClick={() => handleApprove(detail.id)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium text-sm flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Setujui Komisi Ini
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
