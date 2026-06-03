'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { attendanceApi, branchApi, subjectApi, usersApi, studentApi } from '@/lib/api/endpoints'
import { ArrowLeft, AlertTriangle, Users, BookOpen, Search, X, UserPlus } from 'lucide-react'

type AttendanceStatus = 'HADIR' | 'ABSEN' | 'IZIN' | 'SAKIT'

interface StudentEntry {
  studentId: string
  studentName: string
  classLevel?: string
  isManual?: boolean // tambahan manual (bukan dari enrollment)
}

export default function SesDaruratPage() {
  const router = useRouter()

  // Form state
  const [branchId, setBranchId] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [sessionDate, setSessionDate] = useState(() => new Date().toISOString().split('T')[0])
  const [startTime, setStartTime] = useState('08:00')
  const [durationMinutes, setDurationMinutes] = useState(30)
  const [notes, setNotes] = useState('')
  const [attendances, setAttendances] = useState<{ [studentId: string]: AttendanceStatus }>({})

  // Manual student addition
  const [manualStudents, setManualStudents] = useState<StudentEntry[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  // Filter for enrolled student list
  const [filterName, setFilterName] = useState('')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Load user info (for primary branch)
  const { data: userMeData } = useQuery({
    queryKey: ['user-me'],
    queryFn: () => usersApi.getMe(),
  })

  // Load all branches
  const { data: branchesData } = useQuery({
    queryKey: ['all-branches-system'],
    queryFn: () => branchApi.getAllSystem(),
  })

  // Load all subjects
  const { data: subjectsData } = useQuery({
    queryKey: ['subjects-all'],
    queryFn: () => subjectApi.getAll(),
  })

  // Load eligible students when branch + subject both selected
  const { data: studentsData, isLoading: loadingStudents } = useQuery({
    queryKey: ['eligible-students', branchId, subjectId],
    queryFn: () => attendanceApi.getEligibleStudents(branchId, subjectId),
    enabled: !!branchId && !!subjectId,
  })

  // Search students for manual addition
  const { data: searchData } = useQuery({
    queryKey: ['student-search-darurat', branchId, searchQuery],
    queryFn: () => studentApi.getAll(1, 10, branchId, searchQuery),
    enabled: !!branchId && searchQuery.length >= 2,
  })

  // Auto-set primary branch
  useEffect(() => {
    const primaryBranchId = userMeData?.data?.data?.primaryBranchId
    if (primaryBranchId && !branchId) {
      setBranchId(primaryBranchId)
    }
  }, [userMeData?.data?.data?.primaryBranchId, branchId])

  // Reset attendances + manual students when branch or subject changes
  useEffect(() => {
    setAttendances({})
    setManualStudents([])
    setSearchQuery('')
    setFilterName('')
  }, [branchId, subjectId])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Enrolled students from API
  const enrolledStudents: StudentEntry[] = (studentsData?.data?.data || []).map((s: any) => ({
    studentId: s.studentId,
    studentName: s.studentName,
    classLevel: s.classLevel,
    isManual: false,
  }))

  // Merged list: enrolled first, then manual additions (no duplicates)
  const enrolledIds = new Set(enrolledStudents.map(s => s.studentId))
  const allStudents: StudentEntry[] = [
    ...enrolledStudents,
    ...manualStudents.filter(s => !enrolledIds.has(s.studentId)),
  ]

  const branches = branchesData?.data?.data || []
  const subjects = subjectsData?.data?.data || []

  // Filter displayed students by name
  const filteredStudents = filterName.trim()
    ? allStudents.filter(s =>
        s.studentName.toLowerCase().includes(filterName.toLowerCase()) ||
        (s as any).fullName?.toLowerCase().includes(filterName.toLowerCase())
      )
    : allStudents

  // Search results for manual addition dropdown
  const searchResults: any[] = (searchData?.data?.data || []).filter(
    (s: any) => !allStudents.some(a => a.studentId === s.id)
  )

  const addManualStudent = (s: any) => {
    setManualStudents(prev => [...prev, {
      studentId: s.id,
      studentName: s.name,
      classLevel: s.classLevel,
      isManual: true,
    }])
    setSearchQuery('')
    setShowDropdown(false)
  }

  const removeManualStudent = (studentId: string) => {
    setManualStudents(prev => prev.filter(s => s.studentId !== studentId))
    setAttendances(prev => { const next = { ...prev }; delete next[studentId]; return next })
  }

  const setStatus = (studentId: string, status: AttendanceStatus) => {
    setAttendances(prev => ({ ...prev, [studentId]: status }))
  }

  const markAll = (status: AttendanceStatus) => {
    const all: { [k: string]: AttendanceStatus } = {}
    allStudents.forEach(s => { all[s.studentId] = status })
    setAttendances(all)
  }

  const handleSubmit = async () => {
    setError('')

    if (!branchId) return setError('Pilih cabang terlebih dahulu')
    if (!subjectId) return setError('Pilih mata pelajaran terlebih dahulu')
    if (!sessionDate) return setError('Pilih tanggal sesi')
    if (!startTime) return setError('Isi jam mulai sesi')

    const attendanceList = Object.entries(attendances).map(([studentId, status]) => ({
      studentId,
      status,
    }))

    if (attendanceList.length === 0) {
      return setError('Pilih status presensi untuk minimal satu siswa')
    }

    const unmarked = allStudents.filter(s => !attendances[s.studentId])
    if (unmarked.length > 0) {
      const ok = confirm(`${unmarked.length} siswa belum ditandai presensinya. Lanjutkan?`)
      if (!ok) return
    }

    try {
      setIsSubmitting(true)
      const result = await attendanceApi.submitAdHoc({
        branchId,
        subjectId,
        sessionDate,
        startTime,
        durationMinutes,
        notes: notes || undefined,
        attendances: attendanceList,
      })
      // Lanjut ke step 2: input progress siswa
      const sessionLogId = result.data.data.id
      router.push(`/guru/presensi/darurat/progress?sessionLogId=${sessionLogId}&subjectId=${subjectId}`)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal submit sesi darurat')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="px-4 py-4 space-y-5 pb-32">
      {/* Header */}
      <Link
        href="/guru/presensi"
        className="flex items-center gap-2 text-blue-600 text-sm font-medium"
      >
        <ArrowLeft className="w-4 h-4" />
        Kembali
      </Link>

      <div>
        <h1 className="text-xl font-bold text-gray-900">Sesi Darurat</h1>
        <p className="text-sm text-gray-500 mt-0.5">Input presensi untuk sesi di luar jadwal reguler</p>
      </div>

      {/* Info Banner */}
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 flex gap-2">
        <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-orange-800">
          <strong>Sesi Darurat</strong> digunakan untuk kelas yang tidak ada di jadwal reguler
          (perubahan jadwal mendadak, sesi tambahan, dll).<br />
          <span className="mt-1 block">Presensi akan <strong>menunggu persetujuan admin</strong> sebelum dihitung ke komisi.</span>
        </div>
      </div>

      {/* Form */}
      <div className="space-y-4">
        {/* Branch */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Cabang <span className="text-red-500">*</span>
          </label>
          <select
            value={branchId}
            onChange={e => setBranchId(e.target.value)}
            className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-white"
          >
            <option value="">-- Pilih Cabang --</option>
            {branches.map((b: any) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>

        {/* Subject */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Mata Pelajaran <span className="text-red-500">*</span>
          </label>
          <select
            value={subjectId}
            onChange={e => setSubjectId(e.target.value)}
            className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-white"
          >
            <option value="">-- Pilih Mata Pelajaran --</option>
            {subjects.map((s: any) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        {/* Date & Time */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Tanggal <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={sessionDate}
              max={new Date().toISOString().split('T')[0]}
              onChange={e => setSessionDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Jam Mulai <span className="text-red-500">*</span>
            </label>
            <input
              type="time"
              value={startTime}
              onChange={e => setStartTime(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2.5 text-sm"
            />
          </div>
        </div>

        {/* Duration */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Durasi (menit)
          </label>
          <select
            value={durationMinutes}
            onChange={e => setDurationMinutes(parseInt(e.target.value))}
            className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-white"
          >
            {[30, 45, 60, 75, 90, 120].map(d => (
              <option key={d} value={d}>{d} menit</option>
            ))}
          </select>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Alasan / Keterangan Sesi Darurat
          </label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Contoh: Jadwal diganti dari Senin ke Rabu karena libur nasional..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>
      </div>

      {/* Students Section */}
      {branchId && subjectId && (
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 text-sm flex items-center gap-1.5">
              <Users className="w-4 h-4 text-gray-500" />
              Daftar Siswa
              {allStudents.length > 0 && (
                <span className="text-xs text-gray-400 font-normal">({allStudents.length})</span>
              )}
            </h2>
            {allStudents.length > 0 && (
              <div className="flex gap-2">
                <button onClick={() => markAll('HADIR')} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-medium">
                  Semua Hadir
                </button>
                <button onClick={() => markAll('ABSEN')} className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded font-medium">
                  Semua Absen
                </button>
              </div>
            )}
          </div>

          {/* Filter input */}
          {!loadingStudents && allStudents.length > 3 && (
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Cari nama siswa..."
                value={filterName}
                onChange={e => setFilterName(e.target.value)}
                className="w-full pl-9 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
              {filterName && (
                <button onClick={() => setFilterName('')} className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {/* Enrolled students loading skeleton */}
          {loadingStudents ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-lg p-3 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
                  <div className="h-8 bg-gray-100 rounded"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {/* Empty enrolled state */}
              {enrolledStudents.length === 0 && manualStudents.length === 0 && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                  <BookOpen className="w-7 h-7 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Tidak ada siswa terdaftar di mapel ini.</p>
                  <p className="text-xs text-gray-400 mt-0.5">Tambah siswa secara manual di bawah.</p>
                </div>
              )}

              {/* Filter empty state */}
              {filterName && filteredStudents.length === 0 && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                  <p className="text-sm text-gray-500">Tidak ada siswa dengan nama "<strong>{filterName}</strong>"</p>
                  <button onClick={() => setFilterName('')} className="text-xs text-blue-500 mt-1">Hapus filter</button>
                </div>
              )}

              {/* Student cards */}
              {filteredStudents.map(student => {
                const status = attendances[student.studentId]
                return (
                  <div key={student.studentId} className={`bg-white border rounded-lg p-3 shadow-sm ${student.isManual ? 'border-blue-200 bg-blue-50/30' : 'border-gray-200'}`}>
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-xs bg-gradient-to-br ${student.isManual ? 'from-blue-400 to-blue-600' : 'from-orange-400 to-orange-600'}`}>
                        {student.studentName?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="font-medium text-gray-900 text-sm">{student.studentName}</p>
                          {student.isManual && (
                            <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">Manual</span>
                          )}
                        </div>
                        {student.classLevel && <p className="text-xs text-gray-400">{student.classLevel}</p>}
                      </div>
                      {student.isManual && (
                        <button onClick={() => removeManualStudent(student.studentId)} className="text-gray-300 hover:text-red-400 transition p-1">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(['HADIR', 'ABSEN', 'IZIN', 'SAKIT'] as AttendanceStatus[]).map(s => (
                        <button key={s} onClick={() => setStatus(student.studentId, s)}
                          className={`py-1.5 rounded-lg text-xs font-medium transition ${
                            status === s
                              ? s === 'HADIR' ? 'bg-green-600 text-white'
                                : s === 'ABSEN' ? 'bg-red-600 text-white'
                                : s === 'IZIN' ? 'bg-amber-500 text-white'
                                : 'bg-purple-600 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}

              {/* Search to add student manually */}
              <div ref={searchRef} className="relative">
                <div className="flex items-center gap-2 border-2 border-dashed border-gray-300 rounded-lg p-2.5 hover:border-blue-400 transition">
                  <UserPlus className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <input
                    type="text"
                    placeholder="Tambah siswa lain (cari nama...)"
                    value={searchQuery}
                    onChange={e => { setSearchQuery(e.target.value); setShowDropdown(true) }}
                    onFocus={() => setShowDropdown(true)}
                    className="flex-1 text-sm bg-transparent outline-none placeholder-gray-400"
                  />
                  {searchQuery && (
                    <button onClick={() => { setSearchQuery(''); setShowDropdown(false) }}>
                      <X className="w-3.5 h-3.5 text-gray-400" />
                    </button>
                  )}
                </div>
                {/* Dropdown */}
                {showDropdown && searchQuery.length >= 2 && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-20 mt-1 max-h-48 overflow-y-auto">
                    {searchResults.length === 0 ? (
                      <p className="text-xs text-gray-500 text-center py-3">
                        {searchQuery.length < 2 ? 'Ketik minimal 2 karakter' : 'Tidak ada siswa ditemukan'}
                      </p>
                    ) : (
                      searchResults.map((s: any) => (
                        <button key={s.id} onClick={() => addManualStudent(s)}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-blue-50 transition text-left">
                          <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-semibold text-xs flex-shrink-0">
                            {s.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-800">{s.name}</p>
                            {s.classLevel && <p className="text-xs text-gray-400">{s.classLevel}</p>}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {allStudents.length > 0 && (
                <p className="text-xs text-gray-500 text-center">
                  {Object.keys(attendances).length}/{allStudents.length} siswa sudah ditandai
                  {filterName && filteredStudents.length < allStudents.length && (
                    <span className="ml-1 text-orange-500">(tampil {filteredStudents.length} dari {allStudents.length})</span>
                  )}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Submit — Fixed bottom */}
      <div className="fixed bottom-16 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-200 p-3 z-40">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || !branchId || !subjectId}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          {isSubmitting ? 'Menyimpan...' : '📋 Submit Sesi Darurat'}
        </button>
        <p className="text-xs text-gray-500 text-center mt-1">
          Akan menunggu persetujuan admin sebelum masuk komisi
        </p>
      </div>
    </div>
  )
}
