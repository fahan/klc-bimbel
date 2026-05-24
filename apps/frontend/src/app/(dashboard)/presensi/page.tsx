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
