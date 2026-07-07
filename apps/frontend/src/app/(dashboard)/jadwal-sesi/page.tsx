'use client'

import React, { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { sessionApi, branchApi } from '@/lib/api/endpoints'
import { useApiBranchId, useBranch } from '@/lib/branch-context'
import { Plus, ChevronLeft, ChevronRight, Search, Calendar, Clock, MapPin, Users, X, Settings, Layers } from 'lucide-react'
import { LoadingState, EmptyState, ErrorState } from '@/components/ui/States'

const DAYS_OF_WEEK = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU', 'MINGGU']
const DAY_LABELS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']
const DAY_FULL = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu']

// Time slots from 07:00 to 21:00
const TIME_SLOTS = [
  '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00',
  '19:00', '20:00', '21:00',
]

// Teacher color palette
const TEACHER_COLORS = [
  { bg: 'bg-blue-100', border: 'border-blue-500', text: 'text-blue-900', dot: 'bg-blue-500' },
  { bg: 'bg-purple-100', border: 'border-purple-500', text: 'text-purple-900', dot: 'bg-purple-500' },
  { bg: 'bg-green-100', border: 'border-green-500', text: 'text-green-900', dot: 'bg-green-500' },
  { bg: 'bg-teal-100', border: 'border-teal-500', text: 'text-teal-900', dot: 'bg-teal-500' },
  { bg: 'bg-pink-100', border: 'border-pink-500', text: 'text-pink-900', dot: 'bg-pink-500' },
  { bg: 'bg-orange-100', border: 'border-orange-500', text: 'text-orange-900', dot: 'bg-orange-500' },
  { bg: 'bg-indigo-100', border: 'border-indigo-500', text: 'text-indigo-900', dot: 'bg-indigo-500' },
]

const DEFAULT_COLUMN_SETTINGS = {
  subjectName: true,
  teacherName: true,
  duration: true,
  capacity: true,
  studentNames: false,
  sessionType: false,
  branchName: false,
}

export default function JadwalSesiPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const successParam = searchParams.get('success')
  const updatedParam = searchParams.get('updated')
  const contextBranchId = useApiBranchId()
  const { canViewAllBranches } = useBranch()
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('all')
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSession, setSelectedSession] = useState<any>(null)
  const [filterBranchId, setFilterBranchId] = useState<string>('')

  // Sync page-level branch filter with global BranchContext.
  // ADMIN_CABANG: always locked to their branch from context.
  // OWNER/ADMIN_GLOBAL: use their own in-page filter.
  useEffect(() => {
    if (!canViewAllBranches) {
      setFilterBranchId(contextBranchId || '')
    }
  }, [contextBranchId, canViewAllBranches])
  const [columnSettings, setColumnSettings] = useState(DEFAULT_COLUMN_SETTINGS)
  const [showColumnModal, setShowColumnModal] = useState(false)
  const [selectedDayIdx, setSelectedDayIdx] = useState<number>(() => {
    const d = new Date().getDay()
    return d === 0 ? 6 : d - 1
  })

  // Load column settings from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('jadwal-column-settings')
    if (saved) {
      try {
        setColumnSettings(JSON.parse(saved))
      } catch (e) {
        setColumnSettings(DEFAULT_COLUMN_SETTINGS)
      }
    }
  }, [])

  // Save column settings to localStorage
  const handleColumnSettingChange = (key: keyof typeof DEFAULT_COLUMN_SETTINGS, value: boolean) => {
    const updated = { ...columnSettings, [key]: value }
    setColumnSettings(updated)
    localStorage.setItem('jadwal-column-settings', JSON.stringify(updated))
  }

  const resetColumnSettings = () => {
    setColumnSettings(DEFAULT_COLUMN_SETTINGS)
    localStorage.setItem('jadwal-column-settings', JSON.stringify(DEFAULT_COLUMN_SETTINGS))
  }

  const { data: sessionsData, isLoading, error, refetch } = useQuery({
    queryKey: ['sessions', filterBranchId],
    queryFn: () =>
      sessionApi.getAll(undefined, 1000, filterBranchId ? { branchId: filterBranchId } : undefined),
    networkMode: 'always',
  })

  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchApi.getAll(),
  })

  // Auto-refresh when session is created or updated successfully
  useEffect(() => {
    if (successParam || updatedParam) {
      // Refetch data to show newly created or updated session
      refetch()

      // Clean up URL parameter
      const timer = setTimeout(() => {
        router.replace('/jadwal-sesi')
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [successParam, updatedParam, refetch, router])

  const sessions = sessionsData?.data?.data || []
  const branches = branchesData?.data?.data || []

  // Build teacher list with consistent color assignments
  const teacherMap = useMemo(() => {
    const map = new Map<string, { id: string; name: string; colorIdx: number }>()
    let idx = 0
    sessions.forEach((s: any) => {
      if (!map.has(s.teacherId)) {
        map.set(s.teacherId, { id: s.teacherId, name: s.teacherName, colorIdx: idx % TEACHER_COLORS.length })
        idx++
      }
    })
    return map
  }, [sessions])

  // Build subject list
  const subjectList = useMemo(() => {
    const map = new Map<string, string>()
    sessions.forEach((s: any) => {
      if (!map.has(s.subjectId)) {
        map.set(s.subjectId, s.subjectName)
      }
    })
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [sessions])

  // Filter sessions
  const filteredSessions = useMemo(() => {
    return sessions.filter((s: any) => {
      if (selectedTeacherId !== 'all' && s.teacherId !== selectedTeacherId) return false
      if (selectedSubjectId !== 'all' && s.subjectId !== selectedSubjectId) return false
      if (
        searchTerm &&
        !s.subjectName.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !s.teacherName.toLowerCase().includes(searchTerm.toLowerCase())
      )
        return false
      return true
    })
  }, [sessions, selectedTeacherId, selectedSubjectId, searchTerm])

  // Group sessions by day and time slot
  const sessionGrid = useMemo(() => {
    const grid: { [day: string]: { [time: string]: any[] } } = {}
    DAYS_OF_WEEK.forEach(day => {
      grid[day] = {}
      TIME_SLOTS.forEach(time => {
        grid[day][time] = []
      })
    })

    filteredSessions.forEach((session: any) => {
      const day = session.dayOfWeek
      const sessionStart = session.startTime?.substring(0, 5)
      // Find nearest time slot (truncate to hour)
      const hour = sessionStart?.split(':')[0]
      const timeSlot = `${hour}:00`
      if (grid[day] && grid[day][timeSlot]) {
        grid[day][timeSlot].push(session)
      }
    })

    return grid
  }, [filteredSessions])

  // Sessions for the currently selected day on mobile (sorted by startTime)
  const daySessions = useMemo(() => {
    return filteredSessions
      .filter((s: any) => s.dayOfWeek === DAYS_OF_WEEK[selectedDayIdx])
      .sort((a: any, b: any) => (a.startTime || '').localeCompare(b.startTime || ''))
  }, [filteredSessions, selectedDayIdx])

  const prevDay = () => setSelectedDayIdx(i => (i + 6) % 7)
  const nextDay = () => setSelectedDayIdx(i => (i + 1) % 7)

  // Get current day for highlighting
  const today = new Date()
  const todayDayIdx = today.getDay() === 0 ? 6 : today.getDay() - 1 // Convert to SENIN-MINGGU

  if (error) {
    return (
      <ErrorState
        title="Gagal memuat data"
        description="Terjadi kesalahan saat memuat data. Silakan coba lagi."
        action={{ label: 'Coba Lagi', onClick: () => refetch() }}
      />
    )
  }

  if (isLoading) {
    return <LoadingState />
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold text-gray-900">Jadwal & Sesi</h1>
          <p className="text-gray-600 mt-1 text-sm hidden sm:block">Kelola jadwal mingguan dan sesi per guru</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Week Navigator — desktop only */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg bg-white">
            <button className="p-1 hover:bg-gray-100 rounded">
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            </button>
            <span className="text-sm font-medium text-gray-700 px-2">
              {today.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} -{' '}
              {new Date(today.getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </span>
            <button className="p-1 hover:bg-gray-100 rounded">
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </button>
          </div>
          <Link
            href="/jadwal-sesi/create"
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium shadow-sm text-sm"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">Tambah Sesi</span>
            <span className="sm:hidden">Tambah</span>
          </Link>
        </div>
      </div>

      {/* Filter Bar — Mobile (dropdowns) */}
      <div className="sm:hidden bg-white rounded-lg border border-gray-200 p-3 shadow-sm space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <select
            value={selectedTeacherId}
            onChange={(e) => setSelectedTeacherId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Semua Guru</option>
            {Array.from(teacherMap.values()).map(teacher => (
              <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
            ))}
          </select>
          <select
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Semua Mapel</option>
            {subjectList.map(subject => (
              <option key={subject.id} value={subject.id}>{subject.name}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Cari mapel atau guru..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {canViewAllBranches && (
            <select
              value={filterBranchId}
              onChange={(e) => setFilterBranchId(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Semua Cabang</option>
              {branches.map((branch: any) => (
                <option key={branch.id} value={branch.id}>{branch.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Filter Bar — Desktop (pills) */}
      <div className="hidden sm:block bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
        <div className="flex items-center gap-4 flex-wrap overflow-x-auto pb-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Filter guru:</span>
            <button
              onClick={() => setSelectedTeacherId('all')}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                selectedTeacherId === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Semua guru
            </button>
            {Array.from(teacherMap.values()).slice(0, 6).map(teacher => {
              const color = TEACHER_COLORS[teacher.colorIdx]
              return (
                <button
                  key={teacher.id}
                  onClick={() => setSelectedTeacherId(teacher.id)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition flex items-center gap-2 ${
                    selectedTeacherId === teacher.id
                      ? `${color.bg} ${color.text} border ${color.border}`
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${color.dot}`}></span>
                  {teacher.name}
                </button>
              )
            })}
            {teacherMap.size > 6 && (
              <span className="text-xs text-gray-500 px-2">+ {teacherMap.size - 6} lainnya</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Filter mapel:</span>
            <button
              onClick={() => setSelectedSubjectId('all')}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                selectedSubjectId === 'all'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Semua mapel
            </button>
            {subjectList.slice(0, 8).map(subject => (
              <button
                key={subject.id}
                onClick={() => setSelectedSubjectId(subject.id)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                  selectedSubjectId === subject.id
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {subject.name}
              </button>
            ))}
            {subjectList.length > 8 && (
              <span className="text-xs text-gray-500 px-2">+ {subjectList.length - 8} lainnya</span>
            )}
          </div>

          <div className="flex-1 flex items-center gap-2 ml-auto">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Cari mapel atau guru..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            {canViewAllBranches && (
              <select
                value={filterBranchId}
                onChange={(e) => setFilterBranchId(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium text-gray-700 bg-white"
              >
                <option value="">Semua Cabang</option>
                {branches.map((branch: any) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            )}
            <button
              onClick={() => setShowColumnModal(!showColumnModal)}
              className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
              title="Pengaturan kolom"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Column Settings Modal */}
        {showColumnModal && (
          <div className="fixed inset-0 bg-black/50 z-40 flex items-start justify-end pt-20 pr-4">
            <div
              className="bg-white rounded-lg shadow-lg border border-gray-200 w-64"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">Tampilkan Field</h3>
                  <button
                    onClick={() => setShowColumnModal(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-4 space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={columnSettings.subjectName}
                    onChange={(e) => handleColumnSettingChange('subjectName', e.target.checked)}
                    className="w-4 h-4 accent-blue-600"
                  />
                  <span className="text-sm text-gray-700">Mata pelajaran</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={columnSettings.teacherName}
                    onChange={(e) => handleColumnSettingChange('teacherName', e.target.checked)}
                    className="w-4 h-4 accent-blue-600"
                  />
                  <span className="text-sm text-gray-700">Nama guru</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={columnSettings.duration}
                    onChange={(e) => handleColumnSettingChange('duration', e.target.checked)}
                    className="w-4 h-4 accent-blue-600"
                  />
                  <span className="text-sm text-gray-700">Durasi sesi</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={columnSettings.capacity}
                    onChange={(e) => handleColumnSettingChange('capacity', e.target.checked)}
                    className="w-4 h-4 accent-blue-600"
                  />
                  <span className="text-sm text-gray-700">Kapasitas siswa</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={columnSettings.studentNames}
                    onChange={(e) => handleColumnSettingChange('studentNames', e.target.checked)}
                    className="w-4 h-4 accent-blue-600"
                  />
                  <span className="text-sm text-gray-700">Nama siswa</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={columnSettings.sessionType}
                    onChange={(e) => handleColumnSettingChange('sessionType', e.target.checked)}
                    className="w-4 h-4 accent-blue-600"
                  />
                  <span className="text-sm text-gray-700">Tipe sesi</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={columnSettings.branchName}
                    onChange={(e) => handleColumnSettingChange('branchName', e.target.checked)}
                    className="w-4 h-4 accent-blue-600"
                  />
                  <span className="text-sm text-gray-700">Nama cabang</span>
                </label>
              </div>

              <div className="p-4 border-t border-gray-200 flex gap-2">
                <button
                  onClick={resetColumnSettings}
                  className="flex-1 px-3 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition font-medium"
                >
                  Reset
                </button>
                <button
                  onClick={() => setShowColumnModal(false)}
                  className="flex-1 px-3 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition font-medium"
                >
                  Simpan
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Empty State */}
      {sessions.length === 0 ? (
        <EmptyState
          title="Belum ada sesi"
          description="Mulai dengan membuat jadwal sesi pertama"
          action={{
            label: 'Tambah Sesi Pertama',
            onClick: () => router.push('/jadwal-sesi/create'),
          }}
        />
      ) : (
        <>
          {/* ── MOBILE: Single-day view ── */}
          <div className="sm:hidden space-y-3">
            {/* Day Selector */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 flex items-center gap-2">
              <button
                onClick={prevDay}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition flex-shrink-0"
              >
                <ChevronLeft className="w-4 h-4 text-gray-600" />
              </button>
              <div className="flex flex-1 gap-1 overflow-x-auto scrollbar-hide">
                {DAYS_OF_WEEK.map((_, idx) => {
                  const isActive = selectedDayIdx === idx
                  const isToday = idx === todayDayIdx
                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedDayIdx(idx)}
                      className={`flex-shrink-0 flex flex-col items-center px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                        isActive
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {DAY_LABELS[idx]}
                      <span className={`w-1.5 h-1.5 rounded-full mt-0.5 ${isToday ? (isActive ? 'bg-white' : 'bg-blue-500') : 'bg-transparent'}`} />
                    </button>
                  )
                })}
              </div>
              <button
                onClick={nextDay}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition flex-shrink-0"
              >
                <ChevronRight className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            {/* Day Header */}
            <div className="flex items-center justify-between px-1">
              <div>
                <h2 className="text-base font-bold text-gray-900">{DAY_FULL[selectedDayIdx]}</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {daySessions.length} sesi terjadwal
                </p>
              </div>
              {selectedDayIdx === todayDayIdx && (
                <span className="text-xs font-semibold px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full">
                  Hari ini
                </span>
              )}
            </div>

            {/* Session Cards */}
            {daySessions.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                <Calendar className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-500">Tidak ada sesi</p>
                <p className="text-xs text-gray-400 mt-0.5">Tidak ada sesi terjadwal hari {DAY_FULL[selectedDayIdx]}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {daySessions.map((session: any) => {
                  const teacher = teacherMap.get(session.teacherId)
                  const color = teacher ? TEACHER_COLORS[teacher.colorIdx] : TEACHER_COLORS[0]
                  const nicknames = session.students
                    ?.map((s: any) => s.studentName?.split(' ')[0])
                    .filter(Boolean) as string[] | undefined
                  return (
                    <button
                      key={session.id}
                      onClick={() => setSelectedSession(session)}
                      className={`w-full text-left rounded-xl border-l-4 ${color.border} ${color.bg} shadow-sm p-3 hover:shadow-md transition`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        {/* Left: subject + teacher + students */}
                        <div className="flex-1 min-w-0">
                          <div className={`font-bold text-sm ${color.text} leading-tight flex items-center gap-1.5`}>
                            <span className="truncate">{session.subjectName}</span>
                            {session.type === 'REGULAR' ? (
                              <span className="flex-shrink-0 text-[10px] font-semibold px-1.5 py-0.5 bg-white/60 rounded text-gray-600">Reguler</span>
                            ) : (
                              <span className="flex-shrink-0 text-[10px] font-semibold px-1.5 py-0.5 bg-white/60 rounded text-purple-700">Privat</span>
                            )}
                          </div>
                          <div className="text-xs text-gray-700 mt-0.5 flex items-center gap-1">
                            <Users className="w-3 h-3 flex-shrink-0 text-gray-500" />
                            {session.teacherName}
                          </div>
                          {nicknames && nicknames.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {nicknames.map((nick, i) => (
                                <span
                                  key={i}
                                  className="inline-block text-[10px] font-medium px-1.5 py-0.5 bg-white/70 border border-white/80 rounded-full text-gray-700 leading-tight"
                                >
                                  {nick}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        {/* Right: time + capacity */}
                        <div className="flex-shrink-0 text-right">
                          <div className={`text-sm font-bold ${color.text}`}>
                            {session.startTime?.substring(0, 5)}
                          </div>
                          <div className="text-[10px] text-gray-500 mt-0.5">
                            {session.durationMinutes} menit
                          </div>
                          <div className={`text-[10px] font-medium mt-1 ${
                            session.capacity?.isFull ? 'text-green-700' : 'text-gray-500'
                          }`}>
                            {session.capacity?.current}/{session.capacity?.max} siswa
                          </div>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* ── DESKTOP: Weekly Grid ── */}
          <div className="hidden sm:block bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="w-20 px-3 py-3 text-xs font-semibold text-gray-600 text-left">Jam</th>
                    {DAYS_OF_WEEK.map((day, idx) => (
                      <th
                        key={day}
                        className={`px-3 py-3 text-sm font-semibold text-left min-w-[140px] ${
                          idx === todayDayIdx ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                        }`}
                      >
                        {DAY_LABELS[idx]}
                        {idx === todayDayIdx && <span className="ml-1 text-xs">(today)</span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {TIME_SLOTS.map(time => (
                    <tr key={time} className="border-b border-gray-100">
                      <td className="px-3 py-2 text-xs text-gray-500 align-top font-medium">
                        {time}
                      </td>
                      {DAYS_OF_WEEK.map((day, idx) => {
                        const sessionsInSlot = sessionGrid[day][time] || []
                        return (
                          <td
                            key={`${day}-${time}`}
                            className={`px-2 py-2 align-top ${
                              idx === todayDayIdx ? 'bg-blue-50/30' : ''
                            }`}
                          >
                            <div className="space-y-1 min-h-[40px]">
                              {sessionsInSlot.slice(0, 2).map((session: any) => {
                                const teacher = teacherMap.get(session.teacherId)
                                const color = teacher ? TEACHER_COLORS[teacher.colorIdx] : TEACHER_COLORS[0]
                                return (
                                  <button
                                    key={session.id}
                                    onClick={() => setSelectedSession(session)}
                                    className={`w-full text-left p-2 rounded border-l-4 ${color.bg} ${color.border} hover:shadow-md transition`}
                                  >
                                    {columnSettings.subjectName && (
                                      <div className={`text-xs font-bold ${color.text} truncate flex items-center gap-1.5`}>
                                        {session.subjectName}
                                        {session.createdReason === 'COMBINED_2SUBJECTS' && (
                                          <span className="ml-auto flex items-center gap-0.5 text-[10px] font-semibold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded whitespace-nowrap">
                                            <Layers className="w-3 h-3" />
                                            2 Mapel
                                          </span>
                                        )}
                                      </div>
                                    )}
                                    {columnSettings.teacherName && (
                                      <div className="text-xs text-gray-700 truncate">
                                        {session.teacherName}
                                        {columnSettings.sessionType && session.type && (
                                          <span className="ml-1 text-[10px] font-medium text-gray-500">
                                            ({session.type === 'REGULAR' ? 'Reguler' : 'Privat'})
                                          </span>
                                        )}
                                      </div>
                                    )}
                                    {columnSettings.branchName && (
                                      <div className="text-xs text-gray-500 truncate">{session.branchName}</div>
                                    )}
                                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-600 flex-wrap">
                                      <div className="flex items-center gap-1">
                                        <Clock className="w-2.5 h-2.5" />
                                        {session.startTime?.substring(0, 5)}
                                        {columnSettings.duration && <span>({session.durationMinutes}m)</span>}
                                      </div>
                                      {columnSettings.capacity && (
                                        <>
                                          <span className="text-gray-400">·</span>
                                          <span className="text-gray-500">
                                            {session.capacity?.current}/{session.capacity?.max} siswa
                                          </span>
                                        </>
                                      )}
                                      {idx === todayDayIdx && <span className="ml-auto text-blue-600 font-medium">Aktif</span>}
                                    </div>
                                    {columnSettings.studentNames && session.students && session.students.length > 0 && (
                                      <div className="mt-1 space-y-0.5 text-[9px] text-gray-600">
                                        {session.students.slice(0, 2).map((s: any) => (
                                          <div
                                            key={s.id}
                                            className="truncate px-1 py-0.5 bg-gray-200 text-gray-800 rounded font-medium"
                                            title={s.studentName}
                                          >
                                            {s.studentName}
                                          </div>
                                        ))}
                                        {session.students.length > 2 && (
                                          <div className="px-1 py-0.5 text-gray-600 font-medium">
                                            +{session.students.length - 2} siswa
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </button>
                                )
                              })}
                              {sessionsInSlot.length > 2 && (
                                <button
                                  onClick={() => setSelectedSession({ parallel: sessionsInSlot, day, time })}
                                  className="w-full p-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded font-medium transition"
                                >
                                  + {sessionsInSlot.length - 2} sesi lagi
                                </button>
                              )}
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Legend — desktop only */}
          <div className="hidden sm:block bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
            <p className="text-xs font-semibold text-gray-700 mb-2">Legenda Warna Guru:</p>
            <div className="flex flex-wrap gap-2">
              {Array.from(teacherMap.values()).map(teacher => {
                const color = TEACHER_COLORS[teacher.colorIdx]
                return (
                  <div
                    key={teacher.id}
                    className={`flex items-center gap-2 px-3 py-1 rounded ${color.bg} ${color.text} text-xs font-medium`}
                  >
                    <span className={`w-2 h-2 rounded-full ${color.dot}`}></span>
                    {teacher.name}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Detail Panel */}
          {selectedSession && !selectedSession.parallel && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-blue-50 border-b border-blue-200 px-6 py-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-blue-900">
                      {selectedSession.subjectName} ({selectedSession.type === 'REGULAR' ? 'Reguler' : 'Privat'})
                    </h3>
                    {selectedSession.createdReason === 'COMBINED_2SUBJECTS' && (
                      <span className="flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-1 rounded">
                        <Layers className="w-3 h-3" />
                        Sesi Gabungan
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-blue-700 mt-0.5">
                    {selectedSession.dayOfWeek} · {selectedSession.startTime?.substring(0, 5)} ·{' '}
                    {selectedSession.teacherName}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedSession(null)}
                  className="p-2 hover:bg-blue-100 rounded-lg transition"
                >
                  <X className="w-5 h-5 text-blue-700" />
                </button>
              </div>

              <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Teacher Info */}
                <div>
                  <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3">
                    Guru Tetap
                  </h4>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                      {selectedSession.teacherName
                        ?.split(' ')
                        .map((n: string) => n[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{selectedSession.teacherName}</p>
                      <p className="text-xs text-gray-500">Guru tetap</p>
                    </div>
                  </div>
                </div>

                {/* Students */}
                <div>
                  <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3">
                    Siswa Terdaftar ({selectedSession.capacity?.current}/{selectedSession.capacity?.max})
                  </h4>
                  <div className="space-y-1">
                    {selectedSession.students?.length > 0 ? (
                      selectedSession.students.map((s: any) => (
                        <div
                          key={s.id}
                          className="flex items-center gap-2 px-2 py-1 bg-gray-50 rounded text-sm"
                        >
                          <div className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-blue-800 font-medium text-xs">
                            {s.studentName
                              ?.split(' ')
                              .map((n: string) => n[0])
                              .join('')
                              .slice(0, 2)
                              .toUpperCase()}
                          </div>
                          <span className="text-gray-700">{s.studentName}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500 italic">Belum ada siswa</p>
                    )}
                  </div>
                  {selectedSession.capacity?.isFull && (
                    <p className="text-xs text-amber-700 mt-2 font-medium">
                      Kapasitas penuh — tidak bisa tambah siswa
                    </p>
                  )}
                </div>

                {/* Schedule */}
                <div>
                  <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3">
                    Jadwal Rutin
                  </h4>
                  <div className="space-y-2 text-sm text-gray-700">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      Setiap {selectedSession.dayOfWeek}
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      {selectedSession.startTime?.substring(0, 5)} ({selectedSession.durationMinutes} menit)
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      {selectedSession.branchName}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end gap-2">
                <Link
                  href={`/jadwal-sesi/${selectedSession.id}`}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"
                >
                  Ubah Jadwal
                </Link>
              </div>
            </div>
          )}

          {/* Parallel Sessions Detail */}
          {selectedSession?.parallel && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-blue-50 border-b border-blue-200 px-6 py-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-blue-900">
                    {selectedSession.day} · {selectedSession.time}
                  </h3>
                  <p className="text-sm text-blue-700 mt-0.5">
                    {selectedSession.parallel.length} sesi berjalan paralel
                  </p>
                </div>
                <button
                  onClick={() => setSelectedSession(null)}
                  className="p-2 hover:bg-blue-100 rounded-lg transition"
                >
                  <X className="w-5 h-5 text-blue-700" />
                </button>
              </div>

              <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {selectedSession.parallel.map((s: any) => {
                  const teacher = teacherMap.get(s.teacherId)
                  const color = teacher ? TEACHER_COLORS[teacher.colorIdx] : TEACHER_COLORS[0]
                  const capacityPercent = (s.capacity?.current / s.capacity?.max) * 100
                  return (
                    <button
                      key={s.id}
                      onClick={() => setSelectedSession(s)}
                      className={`text-left p-3 rounded-lg border-2 ${color.border} ${color.bg} hover:shadow-md transition`}
                    >
                      <p className={`font-bold ${color.text} text-sm`}>{s.subjectName}</p>
                      <p className="text-xs text-gray-700 mt-1">{s.teacherName}</p>
                      <div className="mt-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-gray-600">Kapasitas</span>
                          <span
                            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                              s.capacity?.isFull ? 'bg-green-200 text-green-800' : 'bg-amber-200 text-amber-800'
                            }`}
                          >
                            {s.capacity?.current}/{s.capacity?.max}
                          </span>
                        </div>
                        <div className="w-full bg-white rounded-full h-1">
                          <div
                            className={s.capacity?.isFull ? 'bg-green-500' : 'bg-amber-500'}
                            style={{ width: `${capacityPercent}%`, height: '100%', borderRadius: '9999px' }}
                          ></div>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
