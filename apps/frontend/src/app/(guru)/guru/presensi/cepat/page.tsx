'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { attendanceApi, branchApi, subjectApi, usersApi, studentApi } from '@/lib/api/endpoints'
import { ArrowLeft, Zap, Search, X } from 'lucide-react'

type AttendanceStatus = 'HADIR' | 'ABSEN' | 'IZIN' | 'SAKIT'

interface SelectedStudent {
  studentId: string
  studentName: string
  fullName?: string
  classLevel?: string
  activeSubjects: { subjectId: string; subjectName: string }[]
  subjectId: string   // '' = not chosen yet (required when activeSubjects.length !== 1)
  status: AttendanceStatus
}

const STATUS_STYLES: Record<AttendanceStatus, string> = {
  HADIR: 'bg-green-600 text-white',
  ABSEN: 'bg-red-600 text-white',
  IZIN: 'bg-amber-500 text-white',
  SAKIT: 'bg-purple-600 text-white',
}

export default function PresensiCepatPage() {
  const router = useRouter()

  const [branchId, setBranchId] = useState('')
  const [selected, setSelected] = useState<SelectedStudent[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const searchRef = useRef<HTMLDivElement>(null)

  const { data: userMeData } = useQuery({
    queryKey: ['user-me'],
    queryFn: () => usersApi.getMe(),
  })

  const { data: branchesData } = useQuery({
    queryKey: ['all-branches-system'],
    queryFn: () => branchApi.getAllSystem(),
  })

  // All branch subjects — only needed for walk-in students (no active enrollment)
  const { data: subjectsData } = useQuery({
    queryKey: ['subjects-all'],
    queryFn: () => subjectApi.getAll(),
  })

  const { data: searchData, isFetching: searching } = useQuery({
    queryKey: ['active-students-search', branchId, searchQuery],
    queryFn: () => studentApi.getActiveByBranch(branchId, searchQuery),
    enabled: !!branchId && searchQuery.length >= 2,
  })

  // Auto-select primary branch
  useEffect(() => {
    const primaryBranchId = userMeData?.data?.data?.primaryBranchId
    if (primaryBranchId && !branchId) setBranchId(primaryBranchId)
  }, [userMeData?.data?.data?.primaryBranchId, branchId])

  // Reset when branch changes
  useEffect(() => {
    setSelected([])
    setSearchQuery('')
  }, [branchId])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowDropdown(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const branches = branchesData?.data?.data || []
  const allSubjects = subjectsData?.data?.data || []
  const searchResults: any[] = (searchData?.data?.data || []).filter(
    (s: any) => !selected.some(sel => sel.studentId === s.studentId),
  )

  const addStudent = (s: any) => {
    setSelected(prev => [
      ...prev,
      {
        studentId: s.studentId,
        studentName: s.studentName,
        fullName: s.fullName,
        classLevel: s.classLevel,
        activeSubjects: s.activeSubjects || [],
        // Exactly 1 enrollment -> auto-set; otherwise teacher must tap a chip
        subjectId: s.activeSubjects?.length === 1 ? s.activeSubjects[0].subjectId : '',
        status: 'HADIR',
      },
    ])
    setSearchQuery('')
    setShowDropdown(false)
  }

  const removeStudent = (studentId: string) =>
    setSelected(prev => prev.filter(s => s.studentId !== studentId))

  const setSubject = (studentId: string, subjectId: string) =>
    setSelected(prev => prev.map(s => (s.studentId === studentId ? { ...s, subjectId } : s)))

  const setStatus = (studentId: string, status: AttendanceStatus) =>
    setSelected(prev => prev.map(s => (s.studentId === studentId ? { ...s, status } : s)))

  const missingSubject = selected.filter(s => s.activeSubjects.length !== 1 && !s.subjectId)
  const canSubmit = selected.length > 0 && missingSubject.length === 0 && !isSubmitting

  const handleSubmit = async () => {
    setError('')
    if (!branchId) return setError('Pilih cabang terlebih dahulu')
    if (selected.length === 0) return setError('Tambahkan minimal satu siswa')
    if (missingSubject.length > 0) {
      return setError(`Pilih mapel untuk: ${missingSubject.map(s => s.studentName).join(', ')}`)
    }

    try {
      setIsSubmitting(true)
      const result = await attendanceApi.submitQuick({
        branchId,
        students: selected.map(s => ({
          studentId: s.studentId,
          // Send explicit subjectId only when the student had a chip choice
          subjectId: s.activeSubjects.length === 1 ? undefined : s.subjectId,
          status: s.status,
        })),
      })

      const logs: any[] = result.data?.data?.sessionLogs || []
      // Sequential progress input: first log now, rest via queue param (logId:subjectId,...)
      const withPresent = logs
      if (withPresent.length === 0) {
        router.push('/guru/presensi/darurat/selesai')
        return
      }
      const [first, ...rest] = withPresent
      const queue = rest.map(l => `${l.id}:${l.subjectId}`).join(',')
      router.push(
        `/guru/presensi/darurat/progress?sessionLogId=${first.id}&subjectId=${first.subjectId}` +
          (queue ? `&queue=${queue}` : ''),
      )
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal submit presensi')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="px-4 py-4 space-y-5 pb-32">
      <Link href="/guru/presensi" className="flex items-center gap-2 text-blue-600 text-sm font-medium">
        <ArrowLeft className="w-4 h-4" />
        Kembali
      </Link>

      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Zap className="w-5 h-5 text-blue-500" />
          Presensi Cepat
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Cari siswa, tap kehadiran, submit. Mapel & waktu otomatis.
        </p>
      </div>

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

      {/* Student search */}
      {branchId && (
        <div ref={searchRef} className="relative">
          <div className="flex items-center gap-2 border border-gray-300 rounded-lg p-2.5 bg-white">
            <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="Cari nama siswa..."
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
          {showDropdown && searchQuery.length >= 2 && (
            <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-20 mt-1 max-h-56 overflow-y-auto">
              {searching ? (
                <p className="text-xs text-gray-400 text-center py-3">Mencari...</p>
              ) : searchResults.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-3">Tidak ada siswa ditemukan</p>
              ) : (
                searchResults.map((s: any) => (
                  <button
                    key={s.studentId}
                    onClick={() => addStudent(s)}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-blue-50 transition text-left"
                  >
                    <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-semibold text-xs flex-shrink-0">
                      {s.studentName?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-800">{s.studentName}</p>
                      {s.fullName && s.fullName !== s.studentName && (
                        <p className="text-xs text-gray-500 truncate">{s.fullName}</p>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-400">
                      {s.activeSubjects?.length
                        ? s.activeSubjects.map((sub: any) => sub.subjectName).join(', ')
                        : 'Belum terdaftar mapel'}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Selected students */}
      <div className="space-y-2">
        {selected.map(student => {
          const showSubjectChips = student.activeSubjects.length !== 1
          const chipSubjects = student.activeSubjects.length > 1
            ? student.activeSubjects
            : allSubjects.map((s: any) => ({ subjectId: s.id, subjectName: s.name }))
          return (
            <div key={student.studentId} className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm space-y-2">
              <div className="flex items-center gap-2">
                <p className="font-medium text-gray-900 text-sm flex-1">{student.studentName}</p>
                {student.activeSubjects.length === 0 && (
                  <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-medium">Walk-in</span>
                )}
                <button onClick={() => removeStudent(student.studentId)} className="text-gray-300 hover:text-red-400 p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {showSubjectChips && (
                <div>
                  <p className="text-[11px] text-gray-400 mb-1">
                    Mapel <span className="text-red-500">*</span>
                  </p>
                  <div className="flex gap-1.5 flex-wrap">
                    {chipSubjects.map(sub => (
                      <button
                        key={sub.subjectId}
                        onClick={() => setSubject(student.studentId, sub.subjectId)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                          student.subjectId === sub.subjectId
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-600 border border-gray-200'
                        }`}
                      >
                        {sub.subjectName}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {!showSubjectChips && (
                <p className="text-[11px] text-gray-400">{student.activeSubjects[0].subjectName}</p>
              )}

              <div className="flex gap-1.5 flex-wrap">
                {(['HADIR', 'ABSEN', 'IZIN', 'SAKIT'] as AttendanceStatus[]).map(st => (
                  <button
                    key={st}
                    onClick={() => setStatus(student.studentId, st)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                      student.status === st ? STATUS_STYLES[st] : 'bg-gray-100 text-gray-600 border border-gray-200'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          )
        })}

        {branchId && selected.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-4">
            Cari dan tambahkan siswa yang hadir sekarang.
          </p>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">{error}</div>
      )}

      {/* Fixed bottom submit */}
      <div className="fixed bottom-16 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-200 p-3 z-40">
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          {isSubmitting ? 'Menyimpan...' : `Submit Presensi (${selected.length})`}
        </button>
        <p className="text-xs text-gray-500 text-center mt-1">
          Waktu & durasi otomatis · Menunggu persetujuan admin sebelum masuk komisi
        </p>
      </div>
    </div>
  )
}
