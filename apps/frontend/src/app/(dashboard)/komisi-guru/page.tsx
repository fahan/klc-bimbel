'use client'

import React, { useState, useMemo, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { commissionApi, teacherBonusApi, teacherApi } from '@/lib/api/endpoints'
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
  Gift,
  Plus,
  Pencil,
  Trash2,
} from 'lucide-react'
import { LoadingState, EmptyState, ErrorState } from '@/components/ui/States'

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
  // Opsi B: track kalkulasi background + polling
  const [bgCalculating, setBgCalculating] = useState(false)
  const [calcDone, setCalcDone] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Bonus state
  const [showBonusModal, setShowBonusModal] = useState(false)
  const [editingBonus, setEditingBonus] = useState<any | null>(null)
  const [bonusForm, setBonusForm] = useState({ teacherId: '', amount: '', reason: '' })
  const qc = useQueryClient()

  const { data: commissionsData, isLoading, error, refetch } = useQuery({
    queryKey: ['commissions', branchId, month, year],
    queryFn: () => commissionApi.getByMonth(branchId, month, year),
    enabled: !!branchId,
    networkMode: 'always',
  })

  const { data: detailData } = useQuery({
    queryKey: ['commission-detail', selectedCommissionId],
    queryFn: () => commissionApi.getDetail(selectedCommissionId!),
    enabled: !!selectedCommissionId,
  })

  const { data: bonusData, refetch: refetchBonuses } = useQuery({
    queryKey: ['teacher-bonuses', branchId, month, year],
    queryFn: () => teacherBonusApi.getByMonth(branchId, month, year),
    enabled: !!branchId,
  })

  const { data: teachersData } = useQuery({
    queryKey: ['teachers', branchId],
    queryFn: () => teacherApi.getAll(undefined, undefined, branchId),
    enabled: !!branchId,
  })

  // Bersihkan interval polling saat component unmount atau bulan/cabang berubah
  useEffect(() => {
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
  }, [branchId, month, year])

  const commissions = commissionsData?.data?.data?.commissions || []
  const metrics = commissionsData?.data?.data?.metrics
  const detail = detailData?.data?.data
  const bonuses: any[] = bonusData?.data?.data?.bonuses || []
  const bonusMetrics = bonusData?.data?.data?.metrics
  const teachers: any[] = teachersData?.data?.data || []

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
    if (!branchId) return
    // Hentikan polling lama jika ada
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
    try {
      setCalculating(true)
      setCalcDone(false)
      // Backend langsung return 202 — tidak perlu nunggu lama
      await commissionApi.calculate({ branchId, month, year })
      // Mulai polling tiap 2 detik, maks 8 kali (~16 detik)
      setBgCalculating(true)
      let pollCount = 0
      pollRef.current = setInterval(async () => {
        pollCount++
        await refetch()
        if (pollCount >= 8) {
          clearInterval(pollRef.current!)
          pollRef.current = null
          setBgCalculating(false)
          setCalcDone(true)
          setTimeout(() => setCalcDone(false), 4000)
        }
      }, 2000)
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal memulai kalkulasi komisi')
      setBgCalculating(false)
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

  const createBonusMutation = useMutation({
    mutationFn: (data: any) => teacherBonusApi.create(data),
    onSuccess: () => { refetchBonuses(); setShowBonusModal(false); setBonusForm({ teacherId: '', amount: '', reason: '' }) },
    onError: (err: any) => alert(err.response?.data?.message || 'Gagal menyimpan bonus'),
  })

  const updateBonusMutation = useMutation({
    mutationFn: ({ id, data }: any) => teacherBonusApi.update(id, data),
    onSuccess: () => { refetchBonuses(); setEditingBonus(null) },
    onError: (err: any) => alert(err.response?.data?.message || 'Gagal mengupdate bonus'),
  })

  const deleteBonusMutation = useMutation({
    mutationFn: (id: string) => teacherBonusApi.remove(id),
    onSuccess: () => refetchBonuses(),
    onError: (err: any) => alert(err.response?.data?.message || 'Gagal menghapus bonus'),
  })

  const approveBonusMutation = useMutation({
    mutationFn: (id: string) => teacherBonusApi.approve(id),
    onSuccess: () => refetchBonuses(),
    onError: (err: any) => alert(err.response?.data?.message || 'Gagal menyetujui bonus'),
  })

  const handleSaveBonus = () => {
    if (!bonusForm.teacherId || !bonusForm.amount || !bonusForm.reason) {
      alert('Lengkapi semua field')
      return
    }
    createBonusMutation.mutate({
      branchId,
      teacherId: bonusForm.teacherId,
      month,
      year,
      amount: parseFloat(bonusForm.amount),
      reason: bonusForm.reason,
    })
  }

  const handleUpdateBonus = (bonus: any) => {
    if (!bonus.amount || !bonus.reason) return
    updateBonusMutation.mutate({
      id: bonus.id,
      data: { amount: parseFloat(bonus.amount), reason: bonus.reason },
    })
  }

  const PREDIKAT_LABEL: Record<string, string> = {
    REGULAR: 'Reguler',
    PRIVATE: 'Privat',
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold text-gray-900">Laporan Komisi Guru</h1>
          <p className="text-gray-600 mt-1 text-sm hidden sm:block">
            Kalkulasi otomatis · Review & setujui sebelum dibayarkan
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
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

      {/* Background Calculation Banner */}
      {bgCalculating && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-3">
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-900">
              Kalkulasi berjalan di background...
            </p>
            <p className="text-xs text-blue-700 mt-0.5">
              Tabel akan diperbarui otomatis. Tidak perlu menunggu atau refresh manual.
            </p>
          </div>
        </div>
      )}
      {calcDone && !bgCalculating && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-3">
          <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
          <p className="text-sm font-medium text-green-800">
            Kalkulasi selesai! Data komisi sudah diperbarui.
          </p>
        </div>
      )}

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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
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
      {error ? (
        <ErrorState
          title="Gagal memuat data"
          description="Terjadi kesalahan saat memuat data. Silakan coba lagi."
          action={{ label: 'Coba Lagi', onClick: refetch }}
        />
      ) : isLoading ? (
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
          <div className="bg-blue-50 border-b border-blue-200 px-4 py-3 sm:px-6 sm:py-4 flex items-start justify-between flex-wrap gap-2">
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
          <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
            {detail.bySubject.map((subject: any) => (
              <div key={subject.subjectId} className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm">{subject.subjectName}</h3>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      {subject.billingType === 'PER_SESSION'
                        ? `Tarif/sesi × ${((subject.commissionPercentage ?? 0.4) * 100).toFixed(0)}% × sesi hadir`
                        : subject.formulaType === 'MONTHLY_RATE'
                          ? `SPP ÷ 12 × ${((subject.commissionPercentage ?? 0.4) * 100).toFixed(0)}% × sesi`
                          : `SPP ÷ total sesi × ${((subject.commissionPercentage ?? 0.4) * 100).toFixed(0)}% × sesi`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {subject.billingType === 'PER_SESSION' && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700">
                        Per Sesi
                      </span>
                    )}
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
                </div>
                <div className="p-4 space-y-3">
                  {subject.students.map((st: any) => {
                    const pct = ((subject.commissionPercentage ?? 0.4) * 100).toFixed(0)
                    const billingType = st.billingType ?? subject.billingType ?? 'FLAT_MONTHLY'
                    const formulaText = billingType === 'PER_SESSION'
                      ? `${formatRupiah(st.sppAmount)}/sesi × ${pct}% × ${st.sessionsAttended} sesi`
                      : subject.formulaType === 'MONTHLY_RATE'
                        ? `${formatRupiah(st.sppAmount)} ÷ 12 × ${pct}% × ${st.sessionsAttended}`
                        : `${formatRupiah(st.sppAmount)} ÷ ${st.totalSessionsInMonth} × ${pct}% × ${st.sessionsAttended}`
                    return (
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
                            {formulaText}
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-green-700 whitespace-nowrap">
                          {formatRupiah(st.commissionAmount)}
                        </p>
                      </div>
                    </div>
                    )
                  })}
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

      {/* ===== BONUS SECTION ===== */}
      {branchId && (
        <div className="space-y-4">
          {/* Bonus Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-purple-600" />
              <h2 className="text-lg font-semibold text-gray-900">Bonus Guru</h2>
              <span className="text-sm text-gray-500">— {monthLabel}</span>
            </div>
            <button
              onClick={() => { setBonusForm({ teacherId: '', amount: '', reason: '' }); setShowBonusModal(true) }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition font-medium"
            >
              <Plus className="w-4 h-4" />
              Tambah Bonus
            </button>
          </div>

          {/* Bonus Metrics */}
          {bonusMetrics && parseInt(bonusMetrics.count) > 0 && (
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
                <p className="text-xs text-gray-500">Total Bonus</p>
                <p className="text-lg font-bold text-gray-900 mt-0.5">
                  {formatRupiah(parseFloat(bonusMetrics.totalDraft) + parseFloat(bonusMetrics.totalApproved))}
                </p>
              </div>
              <div className="bg-white rounded-lg border border-purple-200 p-3 shadow-sm">
                <p className="text-xs text-purple-600">Sudah Disetujui</p>
                <p className="text-lg font-bold text-purple-700 mt-0.5">{formatRupiah(bonusMetrics.totalApproved)}</p>
              </div>
              <div className="bg-white rounded-lg border border-amber-200 p-3 shadow-sm">
                <p className="text-xs text-amber-600">Menunggu Persetujuan</p>
                <p className="text-lg font-bold text-amber-700 mt-0.5">{formatRupiah(bonusMetrics.totalDraft)}</p>
              </div>
            </div>
          )}

          {/* Bonus Table */}
          {bonuses.length === 0 ? (
            <div className="bg-white rounded-lg border border-dashed border-gray-300 p-8 text-center">
              <Gift className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Belum ada bonus untuk {monthLabel}</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-700">Guru</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-700">Keterangan</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-700">Nominal</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-700">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-700">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {bonuses.map((b: any) => (
                    <tr key={b.id} className="hover:bg-gray-50/50">
                      {editingBonus?.id === b.id ? (
                        <>
                          <td className="px-4 py-2 text-sm font-medium text-gray-900">{b.teacherName}</td>
                          <td className="px-4 py-2">
                            <input
                              className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-purple-500"
                              value={editingBonus.reason}
                              onChange={e => setEditingBonus({ ...editingBonus, reason: e.target.value })}
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="number"
                              className="w-28 text-sm border border-gray-300 rounded px-2 py-1 text-right focus:outline-none focus:ring-1 focus:ring-purple-500"
                              value={editingBonus.amount}
                              onChange={e => setEditingBonus({ ...editingBonus, amount: e.target.value })}
                            />
                          </td>
                          <td className="px-4 py-2" />
                          <td className="px-4 py-2">
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => handleUpdateBonus(editingBonus)}
                                disabled={updateBonusMutation.isPending}
                                className="text-xs bg-purple-600 text-white px-2 py-1 rounded hover:bg-purple-700 disabled:opacity-50"
                              >
                                Simpan
                              </button>
                              <button
                                onClick={() => setEditingBonus(null)}
                                className="text-xs text-gray-500 px-2 py-1 rounded hover:bg-gray-100"
                              >
                                Batal
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{b.teacherName}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{b.reason}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-purple-700 text-right">
                            {formatRupiah(b.amount)}
                          </td>
                          <td className="px-4 py-3">
                            {b.status === 'APPROVED' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                                Disetujui
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                                Draft
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1.5">
                              {b.status === 'DRAFT' && (
                                <>
                                  <button
                                    onClick={() => approveBonusMutation.mutate(b.id)}
                                    disabled={approveBonusMutation.isPending}
                                    className="text-xs bg-purple-600 text-white px-2 py-1 rounded hover:bg-purple-700 disabled:opacity-50"
                                  >
                                    Setujui
                                  </button>
                                  <button
                                    onClick={() => setEditingBonus({ ...b, amount: parseFloat(b.amount).toString() })}
                                    className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => { if (confirm('Hapus bonus ini?')) deleteBonusMutation.mutate(b.id) }}
                                    disabled={deleteBonusMutation.isPending}
                                    className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add Bonus Modal */}
      {showBonusModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Gift className="w-5 h-5 text-purple-600" />
                Tambah Bonus Guru
              </h3>
              <button onClick={() => setShowBonusModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Guru</label>
                <select
                  value={bonusForm.teacherId}
                  onChange={e => setBonusForm({ ...bonusForm, teacherId: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Pilih guru...</option>
                  {teachers.map((t: any) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Keterangan Bonus</label>
                <input
                  type="text"
                  placeholder="Contoh: Bonus Lebaran, Bonus Kinerja Q2..."
                  value={bonusForm.reason}
                  onChange={e => setBonusForm({ ...bonusForm, reason: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nominal (Rp)</label>
                <input
                  type="number"
                  placeholder="500000"
                  min={1}
                  value={bonusForm.amount}
                  onChange={e => setBonusForm({ ...bonusForm, amount: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                {bonusForm.amount && (
                  <p className="text-xs text-gray-500 mt-1">{formatRupiah(bonusForm.amount)}</p>
                )}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2">
              <button
                onClick={() => setShowBonusModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Batal
              </button>
              <button
                onClick={handleSaveBonus}
                disabled={createBonusMutation.isPending}
                className="px-4 py-2 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium disabled:opacity-50"
              >
                {createBonusMutation.isPending ? 'Menyimpan...' : 'Simpan Bonus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
