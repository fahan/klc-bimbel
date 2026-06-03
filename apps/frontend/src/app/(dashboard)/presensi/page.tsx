'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import {
  sessionApi,
  branchApi,
  teacherApi,
  attendanceApi,
} from '@/lib/api/endpoints'
import { usePermission } from '@/lib/use-permissions'
import { usePagination } from '@/hooks/usePagination'
import { useAttendanceFilter } from '@/hooks/useAttendanceFilter'
import { Pagination } from '@/components/ui/Pagination'
import { LoadingState, EmptyState } from '@/components/ui/States'
import { Badge } from '@/components/ui/Badge'
import { SessionAttendanceStatusBadge } from '@/components/attendance/AttendanceStatusBadge'
import { AttendanceDetailModal } from '@/components/attendance/AttendanceDetailModal'
import {
  Search,
  Filter,
  Calendar,
  Users,
  Eye,
  Clock,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Check,
} from 'lucide-react'

interface SessionWithAttendance {
  id: string
  subjectName: string
  subjectId: string
  teacherName: string
  teacherId: string
  branchName: string
  branchId: string
  dayOfWeek: string
  startTime: string
  durationMinutes: number
  capacity?: {
    current: number
    max: number
  }
  students?: Array<{
    id: string
    studentId: string
    studentName: string
  }>
  attendanceStatus?: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED'
}

type SessionStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'ALL'

export default function AttendancePage() {
  const router = useRouter()
  const { can, isLoaded } = usePermission()
  const [selectedSession, setSelectedSession] = useState<SessionWithAttendance | null>(null)
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  })
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  // Check authorization using permission system
  useEffect(() => {
    if (isLoaded && !can('presensi')) {
      router.push('/unauthorized')
    }
  }, [isLoaded, can, router])

  // Load sessions with pagination
  const {
    items: sessions,
    page,
    limit,
    setPage,
    setLimit,
    pagination,
    isLoading: sessionsLoading,
    refetch: refetchSessions,
  } = usePagination({
    queryKey: ['sessions-attendance', selectedDate],
    queryFn: async (page, limit) => {
      const response = await sessionApi.getAll(page, limit, {
        // Add filters here if backend supports them
      })

      // Load attendance status for each session
      const sessionsWithAttendance = await Promise.all(
        (response.data?.data || []).map(async (session: any) => {
          try {
            const attendanceLog = await attendanceApi.getSessionLog(session.id, selectedDate)
            return {
              ...session,
              attendanceStatus: attendanceLog.data?.data?.status || 'SCHEDULED',
            }
          } catch (error) {
            // If no attendance log, default to SCHEDULED
            return {
              ...session,
              attendanceStatus: 'SCHEDULED',
            }
          }
        })
      )

      return {
        ...response,
        data: {
          ...response.data,
          data: sessionsWithAttendance,
        },
      }
    },
    initialLimit: 10,
  })

  // Load branches for filter
  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchApi.getAll(),
  })

  // Load teachers for filter
  const { data: teachersData } = useQuery({
    queryKey: ['teachers'],
    queryFn: () => teacherApi.getAll(),
  })

  const branches = branchesData?.data?.data || []
  const teachers = teachersData?.data?.data || []

  // Setup attendance filtering
  const { filteredSessions, filters, handleFilterChange, handleResetFilters, handleSearchChange } =
    useAttendanceFilter({
      sessions: (sessions as any[]) || [],
      isLoading: sessionsLoading,
    })

  // --- Ad-hoc pending approvals ---
  const [adHocExpanded, setAdHocExpanded] = useState(true)
  const [rejectModalId, setRejectModalId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [adHocActionLoading, setAdHocActionLoading] = useState<string | null>(null)
  const [approveModalLog, setApproveModalLog] = useState<any | null>(null)
  const [generateSchedule, setGenerateSchedule] = useState(false)
  const [scheduleType, setScheduleType] = useState<'REGULAR' | 'PRIVATE'>('REGULAR')
  const [approveResult, setApproveResult] = useState<{ logId: string; scheduleResult: any } | null>(null)

  const {
    data: pendingAdHocData,
    isLoading: loadingPendingAdHoc,
    refetch: refetchPendingAdHoc,
  } = useQuery({
    queryKey: ['adhoc-pending', filters.branchId],
    queryFn: () => attendanceApi.getAdHocPending(filters.branchId || undefined),
  })

  const pendingAdHocLogs = pendingAdHocData?.data?.data || []

  const openApproveModal = (log: any) => {
    setApproveModalLog(log)
    setGenerateSchedule(false)
    setScheduleType('REGULAR')
    setApproveResult(null)
  }

  const handleApproveAdHoc = async () => {
    if (!approveModalLog) return
    try {
      setAdHocActionLoading(approveModalLog.id)
      const res = await attendanceApi.approveAdHoc(approveModalLog.id, {
        generateSchedule,
        sessionType: generateSchedule ? scheduleType : undefined,
      })
      const scheduleResult = res.data?.data?.scheduleResult ?? null
      setApproveResult({ logId: approveModalLog.id, scheduleResult })
      await refetchPendingAdHoc()
      if (!scheduleResult || scheduleResult.created) {
        // Auto-close if no warning to show
        setApproveModalLog(null)
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal menyetujui sesi darurat')
    } finally {
      setAdHocActionLoading(null)
    }
  }

  const handleRejectAdHoc = async () => {
    if (!rejectModalId || !rejectReason.trim()) return
    try {
      setAdHocActionLoading(rejectModalId)
      await attendanceApi.rejectAdHoc(rejectModalId, rejectReason)
      setRejectModalId(null)
      setRejectReason('')
      await refetchPendingAdHoc()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal menolak sesi darurat')
    } finally {
      setAdHocActionLoading(null)
    }
  }

  // Reset page to 1 when any filter changes
  useEffect(() => {
    setPage(1)
  }, [filters.branchId, filters.teacherId, filters.sessionStatus, filters.searchTerm, setPage])

  // Calculate pagination for filtered results
  const filteredPagination = (filters.branchId || filters.teacherId || filters.sessionStatus !== 'ALL' || filters.searchTerm) && pagination ? {
    ...pagination,
    total: filteredSessions.length,
    totalPages: Math.ceil(filteredSessions.length / limit),
  } : pagination

  // Handle session click to open modal
  const handleSessionClick = (session: SessionWithAttendance) => {
    setSelectedSession(session)
    setIsModalOpen(true)
  }

  // Handle modal close
  const handleModalClose = () => {
    setIsModalOpen(false)
    setSelectedSession(null)
  }

  // Handle attendance submission success
  const handleSubmitSuccess = () => {
    handleModalClose()
    // Refetch sessions to update attendance status
    refetchSessions()
  }

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-50 border-green-200'
      case 'CANCELLED':
        return 'bg-red-50 border-red-200'
      case 'SCHEDULED':
      default:
        return 'bg-gray-50 border-gray-200'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Presensi</h1>
          <p className="text-gray-600 mt-1">
            Kelola presensi siswa untuk semua sesi
          </p>
        </div>
      </div>

      {/* ===== AD-HOC PENDING APPROVALS ===== */}
      <div className="bg-white rounded-lg border-2 border-orange-200 shadow-sm overflow-hidden">
        {/* Collapsible Header */}
        <button
          onClick={() => setAdHocExpanded(!adHocExpanded)}
          className="w-full flex items-center justify-between px-5 py-3 bg-orange-50 hover:bg-orange-100 transition"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            <span className="font-semibold text-orange-900">Sesi Darurat — Menunggu Persetujuan</span>
            {pendingAdHocLogs.length > 0 && (
              <span className="bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {pendingAdHocLogs.length}
              </span>
            )}
          </div>
          {adHocExpanded ? <ChevronUp className="w-4 h-4 text-orange-600" /> : <ChevronDown className="w-4 h-4 text-orange-600" />}
        </button>

        {adHocExpanded && (
          <div className="p-4">
            {loadingPendingAdHoc ? (
              <div className="space-y-2">
                {[1, 2].map(i => <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />)}
              </div>
            ) : pendingAdHocLogs.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-600">Tidak ada sesi darurat yang menunggu persetujuan</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingAdHocLogs.map((log: any) => (
                  <div key={log.id} className="border border-orange-100 rounded-lg p-4 bg-orange-50/30 space-y-3">
                    {/* Log Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-gray-900">{log.subjectName}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {log.sessionDate}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {log.startTime} ({log.durationMinutes}m)
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {log.hadirCount}/{log.studentCount} hadir
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Guru: <strong>{log.teacherName}</strong> · Cabang: {log.branchName}
                        </p>
                        {log.notes && (
                          <p className="text-xs text-gray-500 mt-1 italic">"{log.notes}"</p>
                        )}
                      </div>
                    </div>

                    {/* Attendance summary */}
                    {log.attendances && log.attendances.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {log.attendances.map((att: any) => (
                          <span
                            key={att.studentId}
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              att.status === 'HADIR' ? 'bg-green-100 text-green-700' :
                              att.status === 'ABSEN' ? 'bg-red-100 text-red-600' :
                              att.status === 'IZIN' ? 'bg-amber-100 text-amber-700' :
                              'bg-purple-100 text-purple-700'
                            }`}
                          >
                            {att.studentName} — {att.status}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => openApproveModal(log)}
                        disabled={adHocActionLoading === log.id}
                        className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition disabled:opacity-50"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Setujui
                      </button>
                      <button
                        onClick={() => { setRejectModalId(log.id); setRejectReason('') }}
                        disabled={adHocActionLoading === log.id}
                        className="flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-sm font-medium px-4 py-2 rounded-lg transition disabled:opacity-50"
                      >
                        <XCircle className="w-4 h-4" />
                        Tolak
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Approve Modal */}
      {approveModalLog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md space-y-4">

            {/* Header */}
            <div>
              <h3 className="text-lg font-bold text-gray-900">Setujui Sesi Darurat</h3>
              <p className="text-sm text-gray-500 mt-0.5">
                {approveModalLog.subjectName} · {approveModalLog.sessionDate} · {approveModalLog.startTime}
              </p>
            </div>

            {/* Schedule conflict warning result */}
            {approveResult !== null && approveResult.logId === approveModalLog.id && approveResult.scheduleResult && !approveResult.scheduleResult.created && (
              <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 flex gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <p className="font-semibold">Sesi darurat disetujui ✓</p>
                  <p className="mt-0.5">Namun jadwal gagal dibuat: <em>{approveResult.scheduleResult.conflictReason}</em></p>
                </div>
              </div>
            )}

            {/* Generate schedule option */}
            {!approveResult && (
              <>
                <div
                  onClick={() => setGenerateSchedule(!generateSchedule)}
                  className={`flex items-start gap-3 border-2 rounded-lg p-3 cursor-pointer transition ${generateSchedule ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
                >
                  <div className={`mt-0.5 w-5 h-5 rounded flex-shrink-0 flex items-center justify-center border-2 transition ${generateSchedule ? 'bg-blue-600 border-blue-600' : 'border-gray-400'}`}>
                    {generateSchedule && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <div>
                    <p className="font-medium text-gray-800 text-sm">Generate sebagai jadwal reguler</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Buat sesi berulang setiap hari {approveModalLog.sessionDate
                        ? ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'][new Date(approveModalLog.sessionDate).getDay()]
                        : '—'} jam {approveModalLog.startTime} ({approveModalLog.durationMinutes}m).
                      Jika bentrok, approval tetap berhasil tapi jadwal tidak dibuat.
                    </p>
                  </div>
                </div>

                {generateSchedule && (
                  <div className="pl-1">
                    <label className="text-sm font-medium text-gray-700 mb-1.5 block">Tipe Sesi</label>
                    <div className="flex gap-2">
                      {(['REGULAR', 'PRIVATE'] as const).map(t => (
                        <button
                          key={t}
                          onClick={() => setScheduleType(t)}
                          className={`flex-1 py-2 rounded-lg text-sm font-medium transition border-2 ${scheduleType === t ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600'}`}
                        >
                          {t === 'REGULAR' ? 'Reguler' : 'Privat'}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Footer buttons */}
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setApproveModalLog(null); setApproveResult(null) }}
                className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
              >
                {approveResult ? 'Tutup' : 'Batal'}
              </button>
              {!approveResult && (
                <button
                  onClick={handleApproveAdHoc}
                  disabled={adHocActionLoading === approveModalLog.id}
                  className="px-4 py-2 text-sm font-medium bg-green-600 hover:bg-green-700 text-white rounded-lg transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4" />
                  {adHocActionLoading === approveModalLog.id ? 'Memproses...' : 'Setujui'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModalId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Tolak Sesi Darurat</h3>
            <p className="text-sm text-gray-600">Berikan alasan penolakan yang jelas agar guru dapat menindaklanjuti.</p>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Contoh: Tidak ada bukti sesi berlangsung / jadwal belum dikonfirmasi..."
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-400"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setRejectModalId(null); setRejectReason('') }}
                className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
              >
                Batal
              </button>
              <button
                onClick={handleRejectAdHoc}
                disabled={!rejectReason.trim() || adHocActionLoading === rejectModalId}
                className="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition disabled:opacity-50"
              >
                {adHocActionLoading === rejectModalId ? 'Memproses...' : 'Tolak Sesi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
        {/* Filter Toggle and Search */}
        <div className="flex gap-3 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Cari mata pelajaran atau guru..."
              value={filters.searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition flex items-center gap-2 text-gray-700 font-medium"
          >
            <Filter className="w-5 h-5" />
            Filter
          </button>
        </div>

        {/* Expandable Filters */}
        {showFilters && (
          <div className="space-y-4 pt-4 border-t border-gray-200">
            {/* Date Filter */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dari Tanggal
                </label>
                <input
                  type="date"
                  value={filters.dateFrom || ''}
                  onChange={(e) =>
                    handleFilterChange('dateFrom', e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sampai Tanggal
                </label>
                <input
                  type="date"
                  value={filters.dateTo || ''}
                  onChange={(e) =>
                    handleFilterChange('dateTo', e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Branch Filter */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cabang
                </label>
                <select
                  value={filters.branchId || ''}
                  onChange={(e) =>
                    handleFilterChange('branchId', e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Semua Cabang</option>
                  {branches.map((branch: any) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Teacher Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Guru
                </label>
                <select
                  value={filters.teacherId || ''}
                  onChange={(e) =>
                    handleFilterChange('teacherId', e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Semua Guru</option>
                  {teachers.map((teacher: any) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status Presensi
              </label>
              <div className="flex gap-2 flex-wrap">
                {(['ALL', 'SCHEDULED', 'COMPLETED', 'CANCELLED'] as SessionStatus[]).map(
                  (status) => (
                    <button
                      key={status}
                      onClick={() => handleFilterChange('sessionStatus', status)}
                      className={`px-4 py-2 rounded-lg transition font-medium text-sm ${
                        filters.sessionStatus === status
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {status === 'ALL'
                        ? 'Semua'
                        : status === 'SCHEDULED'
                        ? 'Belum Dikonfirmasi'
                        : status === 'COMPLETED'
                        ? 'Dikonfirmasi'
                        : 'Dibatalkan'}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Reset Button */}
            <div className="flex justify-end">
              <button
                onClick={handleResetFilters}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Reset Filter
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Sessions Table */}
      {sessionsLoading ? (
        <LoadingState />
      ) : filteredSessions.length === 0 ? (
        <EmptyState
          title="Belum ada data presensi"
          description="Tidak ada sesi yang sesuai dengan filter yang dipilih"
        />
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Mata Pelajaran
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Guru
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Cabang
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Jadwal
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Siswa
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Status
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredSessions.map((session: SessionWithAttendance) => (
                  <tr
                    key={session.id}
                    className={`hover:bg-gray-50 transition cursor-pointer ${getStatusColor(
                      session.attendanceStatus
                    )}`}
                  >
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">
                        {session.subjectName}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        ID: {session.id.slice(0, 8)}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {session.teacherName}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {session.branchName}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span>
                          {session.startTime?.substring(0, 5)} (
                          {session.durationMinutes}m)
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {session.dayOfWeek}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium">
                          {session.capacity?.current || 0} /
                          {session.capacity?.max || 0}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <SessionAttendanceStatusBadge
                        status={session.attendanceStatus || 'SCHEDULED'}
                      />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleSessionClick(session)}
                        className="text-blue-600 hover:text-blue-700 p-2 hover:bg-blue-50 rounded transition inline-flex items-center gap-1"
                        title="Lihat detail presensi"
                      >
                        <Eye className="w-4 h-4" />
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {filteredSessions.length > 0 && filteredPagination && (
            <Pagination
              currentPage={page}
              totalPages={filteredPagination.totalPages}
              limit={limit}
              onPageChange={setPage}
              onLimitChange={setLimit}
              isLoading={sessionsLoading}
            />
          )}
        </div>
      )}

      {/* Attendance Detail Modal */}
      {selectedSession && (
        <AttendanceDetailModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          sessionId={selectedSession.id}
          sessionDate={selectedDate}
          session={{
            id: selectedSession.id,
            subjectName: selectedSession.subjectName,
            teacherName: selectedSession.teacherName,
            branchName: selectedSession.branchName,
            startTime: selectedSession.startTime,
            dayOfWeek: selectedSession.dayOfWeek,
            durationMinutes: selectedSession.durationMinutes,
            students: selectedSession.students || [],
          }}
          onSubmitSuccess={handleSubmitSuccess}
        />
      )}
    </div>
  )
}
