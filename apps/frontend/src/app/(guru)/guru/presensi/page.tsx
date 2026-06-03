'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { sessionApi, branchApi, usersApi } from '@/lib/api/endpoints'
import { useBranch } from '@/lib/branch-context'
import { Clock, Users, CheckCircle, AlertCircle, Check, Search, MapPin, Plus, History } from 'lucide-react'

export default function PresensiListPage() {
  const router = useRouter()
  const { branches, selectedBranch } = useBranch()

  // Fetch current user to get primary branch
  const { data: userMeData } = useQuery({
    queryKey: ['user-me'],
    queryFn: () => usersApi.getMe(),
  })

  // Fetch all branches in system for substitution search
  const { data: allBranchesData, isLoading: loadingBranches } = useQuery({
    queryKey: ['all-branches'],
    queryFn: () => branchApi.getAllSystem(),
  })

  // My sessions query
  const { data: todaySessionsData, isLoading } = useQuery({
    queryKey: ['guru-today-sessions'],
    queryFn: () => sessionApi.getTodayForMe(),
  })

  // Substitution search state - default to user's primary branch
  const [selectedBranch_Sub, setSelectedBranch_Sub] = useState('')

  // Set default branch to user's primary branch
  useEffect(() => {
    const userPrimaryBranchId = userMeData?.data?.data?.primaryBranchId
    if (userPrimaryBranchId) {
      setSelectedBranch_Sub(userPrimaryBranchId)
    }
  }, [userMeData?.data?.data?.primaryBranchId])
  const [searchType, setSearchType] = useState<'guru' | 'siswa'>('guru')
  const [searchQuery, setSearchQuery] = useState('')

  // Substitution search query
  const { data: availableSessionsData, isLoading: isSearchLoading } = useQuery({
    queryKey: ['substitution-search', selectedBranch_Sub, searchType, searchQuery],
    queryFn: () =>
      sessionApi.getAvailableForSubstitution({
        branchId: selectedBranch_Sub || undefined,
        searchType,
        searchQuery,
      }),
    enabled: searchQuery.length >= 2,
  })

  const todaySessions = todaySessionsData?.data?.data || []
  const availableSessions = availableSessionsData?.data?.data || []
  // Get all branches in system for substitution search
  const allBranches = allBranchesData?.data?.data || []
  const primaryBranch = allBranches.find((b: any) => b.isPrimary) || allBranches[0]

  const today = new Date()
  const dateStr = today.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const getSessionStatus = (session: any) => {
    if (session.sessionLog?.status === 'COMPLETED') return 'selesai'

    const now = new Date()
    const [h, m] = session.startTime.split(':').map(Number)
    const sessionStart = new Date()
    sessionStart.setHours(h, m, 0, 0)
    const sessionEnd = new Date(sessionStart.getTime() + session.durationMinutes * 60 * 1000)

    if (now >= sessionStart && now <= sessionEnd) return 'aktif'
    if (now < sessionStart) return 'mendatang'
    return 'lewat'
  }

  const SessionCard = ({ session, isSubstitution = false }: { session: any; isSubstitution?: boolean }) => {
    const status = getSessionStatus(session)
    const hasAttendanceSubmitted = !!session.sessionLog

    let displayBadge = 'bg-green-100 text-green-700'
    let displayDot = 'bg-green-500'
    let displayLabel = 'Presensi Selesai'
    let displayCardClass = 'border-green-200'

    if (!hasAttendanceSubmitted) {
      const statusConfig = {
        selesai: { badge: 'bg-green-100 text-green-700', dot: 'bg-green-500', label: 'Selesai', cardClass: 'border-green-200' },
        aktif: { badge: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500', label: 'Aktif', cardClass: 'border-blue-300 bg-blue-50' },
        mendatang: { badge: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500', label: 'Mendatang', cardClass: 'border-gray-200' },
        lewat: { badge: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400', label: 'Lewat', cardClass: 'border-gray-200' },
      }[status]
      displayBadge = statusConfig.badge
      displayDot = statusConfig.dot
      displayLabel = statusConfig.label
      displayCardClass = statusConfig.cardClass
    }

    const href = isSubstitution
      ? `/guru/presensi/${session.id}?substituteFor=${session.scheduledTeacherId}`
      : `/guru/presensi/${session.id}`

    return (
      <Link
        href={href}
        className={`block bg-white rounded-lg border-2 ${displayCardClass} p-4 shadow-sm hover:shadow-md transition`}
      >
        <div className="flex items-start gap-3">
          <div className={`w-3 h-3 rounded-full mt-1.5 ${displayDot}`}></div>
          <div className="flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <p className="font-semibold text-gray-900">
                  {session.subject}
                  <span className="text-xs font-normal text-gray-500 ml-2">· {session.type === 'REGULAR' ? 'Reguler' : 'Privat'}</span>
                </p>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-600">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {session.startTime?.substring(0, 5)} ({session.durationMinutes}m)
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {isSubstitution ? session.studentCount : session.capacity?.current} siswa
                  </span>
                </div>
                {isSubstitution && (
                  <p className="text-xs text-gray-600 mt-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {session.branchName} · Guru: {session.scheduledTeacherName}
                  </p>
                )}
                {!isSubstitution && <p className="text-xs text-gray-500 mt-1">{session.branchName}</p>}
                {/* Nama siswa — reguler */}
                {!isSubstitution && session.students && session.students.length > 0 && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    {session.students.map((s: any) => s.studentName).join(', ')}
                  </p>
                )}
                {/* Nama siswa — substitusi */}
                {isSubstitution && session.studentList && (
                  <p className="text-xs text-gray-500 mt-1">Siswa: {session.studentList.join(', ')}</p>
                )}
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className={`text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap ${displayBadge}`}>
                  {displayLabel}
                </span>
              </div>
            </div>
            {!hasAttendanceSubmitted && status === 'aktif' && !isSubstitution && (
              <div className="mt-2 flex items-center gap-1 text-xs text-blue-700 font-medium">
                <AlertCircle className="w-3 h-3" />
                Sesi sedang berlangsung — tap untuk presensi
              </div>
            )}
          </div>
        </div>
      </Link>
    )
  }

  return (
    <div className="px-4 py-4 space-y-6 mb-20">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Presensi Siswa</h1>
          <p className="text-sm text-gray-600 mt-0.5">{dateStr}</p>
        </div>
        <div className="flex flex-col gap-2 items-end">
          <Link
            href="/guru/presensi/darurat"
            className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold px-3 py-2 rounded-lg shadow-sm transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Sesi Darurat
          </Link>
          <Link
            href="/guru/presensi/darurat/riwayat"
            className="flex items-center gap-1.5 bg-gray-100 text-gray-600 text-xs font-medium px-3 py-1.5 rounded-lg transition"
          >
            <History className="w-3 h-3" />
            Riwayat Darurat
          </Link>
        </div>
      </div>

      {/* My Sessions */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-3">📌 Sesi Saya</h2>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-lg p-4 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-100 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : todaySessions.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <CheckCircle className="w-6 h-6 text-gray-400" />
            </div>
            <p className="font-medium text-gray-900 text-sm">Tidak ada sesi hari ini</p>
          </div>
        ) : (
          <div className="space-y-3">
            {todaySessions.map((session: any) => (
              <SessionCard key={session.id} session={session} />
            ))}
          </div>
        )}
      </div>

      {/* Substitution Search */}
      <div className="border-t pt-6">
        <h2 className="text-lg font-bold text-gray-900 mb-3">🔍 Gantikan Sesi Guru Lain</h2>

        {/* Branch Filter */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Pilih Cabang</label>
          <select
            value={selectedBranch_Sub}
            onChange={(e) => setSelectedBranch_Sub(e.target.value)}
            className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-white"
            disabled={loadingBranches}
          >
            <option value="">Semua Cabang</option>
            {allBranches.map((branch: any) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">Default: cabang Anda. Bisa gantikan sesi di cabang lain.</p>
        </div>

        {/* Search Type Toggle */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setSearchType('guru')}
            className={`flex-1 py-2 rounded-lg font-semibold text-sm transition ${
              searchType === 'guru' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            👨‍🏫 Cari Guru
          </button>
          <button
            onClick={() => setSearchType('siswa')}
            className={`flex-1 py-2 rounded-lg font-semibold text-sm transition ${
              searchType === 'siswa' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            👨‍🎓 Cari Siswa
          </button>
        </div>

        {/* Search Input */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={searchType === 'guru' ? 'Ketik nama guru...' : 'Ketik nama/nomor siswa...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2.5 text-sm placeholder-gray-500"
              minLength={2}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">Minimal 2 karakter untuk pencarian</p>
        </div>

        {/* Search Results */}
        {searchQuery ? (
          <>
            {isSearchLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="bg-white rounded-lg p-4 animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-100 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : availableSessions.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
                <p className="text-sm text-gray-600">
                  Tidak ada sesi untuk {searchType === 'guru' ? 'guru' : 'siswa'} ini hari ini
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {availableSessions.map((session: any) => (
                  <SessionCard key={session.id} session={session} isSubstitution={true} />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
            💡 Mulai ketik nama guru atau siswa untuk mencari sesi yang perlu digantikan
          </div>
        )}
      </div>
    </div>
  )
}
