'use client'

import React, { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { attendanceApi, branchApi, teacherApi } from '@/lib/api/endpoints'
import {
  Download,
  Filter,
  Calendar,
  Users,
  CheckCircle,
  Clock,
  XCircle,
  TrendingUp,
  ChevronRight,
} from 'lucide-react'
import { LoadingState, EmptyState } from '@/components/ui/States'
import { Pagination } from '@/components/ui/Pagination'

interface ReportData {
  id: string
  sessionId: string
  date: string
  sessionTime: string
  duration: number
  subjectName: string
  teacherName: string
  branchName: string
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED'
  studentCount: number
  completedCount: number
  haidirCount: number
  absenCount: number
  izinCount: number
  sakitCount: number
  attendanceRate: string
}

interface Summary {
  totalSessions: number
  completedSessions: number
  pendingSessions: number
  cancelledSessions: number
  averageAttendanceRate: number
}

export default function LaporanPresensiPage() {
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [showFilters, setShowFilters] = useState(false)
  const [selectedDetail, setSelectedDetail] = useState<ReportData | null>(null)

  // Filters
  const [dateFrom, setDateFrom] = useState(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  )
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0])
  const [branchId, setBranchId] = useState('')
  const [teacherId, setTeacherId] = useState('')

  // Load report data
  const { data: reportData, isLoading, refetch } = useQuery({
    queryKey: ['attendance-report', dateFrom, dateTo, branchId, teacherId, page, limit],
    queryFn: () =>
      attendanceApi.getReport({
        dateFrom,
        dateTo,
        branchId: branchId || undefined,
        teacherId: teacherId || undefined,
        page,
        limit,
      }),
  })

  // Load branches
  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchApi.getAll(),
  })

  // Load teachers
  const { data: teachersData } = useQuery({
    queryKey: ['teachers'],
    queryFn: () => teacherApi.getAll(),
  })

  const branches = branchesData?.data?.data || []
  const teachers = teachersData?.data?.data || []
  const reportItems: ReportData[] = reportData?.data?.data || []
  const summary: Summary = reportData?.data?.summary || {
    totalSessions: 0,
    completedSessions: 0,
    pendingSessions: 0,
    cancelledSessions: 0,
    averageAttendanceRate: 0,
  }
  const pagination = reportData?.data?.pagination

  const handleResetFilters = () => {
    setDateFrom(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
    setDateTo(new Date().toISOString().split('T')[0])
    setBranchId('')
    setTeacherId('')
    setPage(1)
  }

  const handleExportCSV = () => {
    if (reportItems.length === 0) {
      alert('Tidak ada data untuk diexport')
      return
    }

    const headers = ['Tanggal', 'Jam', 'Sesi', 'Guru', 'Cabang', 'Status', 'Jumlah Siswa', 'Hadir', 'Absen', 'Izin', 'Sakit', 'Tingkat Kehadiran']
    const rows = reportItems.map(item => [
      item.date,
      item.sessionTime,
      item.subjectName,
      item.teacherName,
      item.branchName,
      item.status,
      item.studentCount,
      item.haidirCount,
      item.absenCount,
      item.izinCount,
      item.sakitCount,
      `${item.attendanceRate}%`,
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `laporan-presensi-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800'
      case 'CANCELLED':
        return 'bg-red-100 text-red-800'
      case 'SCHEDULED':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'Dikonfirmasi'
      case 'CANCELLED':
        return 'Dibatalkan'
      case 'SCHEDULED':
        return 'Menunggu'
      default:
        return status
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Laporan Presensi</h1>
          <p className="text-gray-600 mt-1">Analisis presensi sesi berdasarkan tanggal, cabang, dan guru</p>
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
        >
          <Download className="w-5 h-5" />
          Export CSV
        </button>
      </div>

      {/* Filter Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
        <div className="flex gap-3 mb-4">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
          >
            <Filter className="w-5 h-5" />
            {showFilters ? 'Sembunyikan Filter' : 'Tampilkan Filter'}
          </button>
          {(dateFrom !== new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] ||
            dateTo !== new Date().toISOString().split('T')[0] ||
            branchId ||
            teacherId) && (
            <button
              onClick={handleResetFilters}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium text-gray-700"
            >
              Reset Filter
            </button>
          )}
        </div>

        {showFilters && (
          <div className="space-y-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Dari Tanggal</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value)
                    setPage(1)
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sampai Tanggal</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value)
                    setPage(1)
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Cabang</label>
                <select
                  value={branchId}
                  onChange={(e) => {
                    setBranchId(e.target.value)
                    setPage(1)
                  }}
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Guru</label>
                <select
                  value={teacherId}
                  onChange={(e) => {
                    setTeacherId(e.target.value)
                    setPage(1)
                  }}
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
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Sesi</p>
              <p className="text-2xl font-bold text-gray-900">{summary.totalSessions}</p>
            </div>
            <Users className="w-6 h-6 text-gray-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-green-200 p-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-green-600 font-medium mb-1">Dikonfirmasi</p>
              <p className="text-2xl font-bold text-green-700">{summary.completedSessions}</p>
              <p className="text-xs text-green-600 mt-1">
                {summary.totalSessions > 0
                  ? ((summary.completedSessions / summary.totalSessions) * 100).toFixed(0)
                  : '0'}
                %
              </p>
            </div>
            <CheckCircle className="w-6 h-6 text-green-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-yellow-200 p-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-yellow-600 font-medium mb-1">Menunggu</p>
              <p className="text-2xl font-bold text-yellow-700">{summary.pendingSessions}</p>
            </div>
            <Clock className="w-6 h-6 text-yellow-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-blue-200 p-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-blue-600 font-medium mb-1">Tingkat Kehadiran</p>
              <p className="text-2xl font-bold text-blue-700">{summary.averageAttendanceRate.toFixed(1)}%</p>
            </div>
            <TrendingUp className="w-6 h-6 text-blue-400" />
          </div>
        </div>
      </div>

      {/* Data Table */}
      {isLoading ? (
        <LoadingState />
      ) : reportItems.length === 0 ? (
        <EmptyState
          title="Tidak ada data presensi"
          description="Ubah filter atau tanggal untuk melihat data presensi"
        />
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Tanggal & Sesi</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Guru & Cabang</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Kehadiran</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Tingkat</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {reportItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{item.subjectName}</p>
                        <p className="text-sm text-gray-500">
                          {item.date} • {item.sessionTime} ({item.duration} menit)
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm text-gray-900">{item.teacherName}</p>
                        <p className="text-xs text-gray-500">{item.branchName}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(item.status)}`}>
                        {getStatusLabel(item.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-3 text-sm">
                        <span className="text-green-600 font-medium">H: {item.haidirCount}</span>
                        <span className="text-red-600 font-medium">A: {item.absenCount}</span>
                        <span className="text-yellow-600 font-medium">I: {item.izinCount}</span>
                        <span className="text-blue-600 font-medium">S: {item.sakitCount}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-gray-900">{item.attendanceRate}%</div>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => setSelectedDetail(item)}
                        className="text-blue-600 hover:text-blue-700 p-2 hover:bg-blue-50 rounded transition"
                        title="Lihat detail"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && (
            <Pagination
              currentPage={page}
              totalPages={pagination.totalPages}
              limit={limit}
              onPageChange={setPage}
              onLimitChange={setLimit}
              isLoading={isLoading}
            />
          )}
        </div>
      )}

      {/* Detail Modal */}
      {selectedDetail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-blue-600 text-white px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">{selectedDetail.subjectName}</h2>
              <button
                onClick={() => setSelectedDetail(null)}
                className="text-white hover:bg-blue-700 p-2 rounded"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-600 uppercase font-semibold">Tanggal & Waktu</p>
                  <p className="text-sm font-medium text-gray-900">
                    {selectedDetail.date} • {selectedDetail.sessionTime}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 uppercase font-semibold">Guru</p>
                  <p className="text-sm font-medium text-gray-900">{selectedDetail.teacherName}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 uppercase font-semibold">Cabang</p>
                  <p className="text-sm font-medium text-gray-900">{selectedDetail.branchName}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 uppercase font-semibold">Status</p>
                  <span className={`px-2 py-1 rounded text-xs font-medium inline-block ${getStatusBadge(selectedDetail.status)}`}>
                    {getStatusLabel(selectedDetail.status)}
                  </span>
                </div>
              </div>

              <div className="border-t pt-4">
                <p className="text-sm font-semibold text-gray-900 mb-3">Ringkasan Kehadiran</p>
                <div className="grid grid-cols-4 gap-3">
                  <div className="bg-green-50 rounded p-3 text-center">
                    <p className="text-2xl font-bold text-green-700">{selectedDetail.haidirCount}</p>
                    <p className="text-xs text-green-600">Hadir</p>
                  </div>
                  <div className="bg-red-50 rounded p-3 text-center">
                    <p className="text-2xl font-bold text-red-700">{selectedDetail.absenCount}</p>
                    <p className="text-xs text-red-600">Absen</p>
                  </div>
                  <div className="bg-yellow-50 rounded p-3 text-center">
                    <p className="text-2xl font-bold text-yellow-700">{selectedDetail.izinCount}</p>
                    <p className="text-xs text-yellow-600">Izin</p>
                  </div>
                  <div className="bg-blue-50 rounded p-3 text-center">
                    <p className="text-2xl font-bold text-blue-700">{selectedDetail.sakitCount}</p>
                    <p className="text-xs text-blue-600">Sakit</p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <p className="text-sm font-semibold text-gray-900">
                  Total Siswa: {selectedDetail.studentCount} | Tingkat Kehadiran: {selectedDetail.attendanceRate}%
                </p>
              </div>

              <div className="border-t pt-4 flex justify-end gap-2">
                <button
                  onClick={() => setSelectedDetail(null)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium text-gray-700"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
