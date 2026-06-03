'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { sessionApi, attendanceApi, progressApi, curriculumModuleApi } from '@/lib/api/endpoints'
import { ArrowLeft, Check, BookOpen, Award, CheckCircle } from 'lucide-react'

type Predicate = 'PERLU_BIMBINGAN' | 'CUKUP' | 'BAIK' | 'BAIK_SEKALI' | 'MEMUASKAN'

interface ModuleProgress {
  studentId: string
  moduleId: string
  chapterFrom: number
  chapterTo: number
  moduleCompleted: boolean
  predicate?: Predicate
  notes: string
}

interface FreeMaterialProgress {
  studentId: string
  predicate?: Predicate
  notes: string
}

const PREDICATE_OPTIONS: { value: Predicate; label: string; color: string }[] = [
  { value: 'PERLU_BIMBINGAN', label: 'Perlu Bimbingan', color: 'bg-red-100 text-red-700 border-red-300' },
  { value: 'CUKUP', label: 'Cukup', color: 'bg-amber-100 text-amber-700 border-amber-300' },
  { value: 'BAIK', label: 'Baik', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  { value: 'BAIK_SEKALI', label: 'Baik Sekali', color: 'bg-green-100 text-green-700 border-green-300' },
  { value: 'MEMUASKAN', label: 'Memuaskan', color: 'bg-teal-100 text-teal-700 border-teal-300' },
]

export default function ProgressInputPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = params?.sessionId as string
  const sessionLogId = searchParams.get('sessionLogId')

  const [moduleProgress, setModuleProgress] = useState<{ [studentId: string]: ModuleProgress }>({})
  const [freeMaterialProgress, setFreeMaterialProgress] = useState<{
    [studentId: string]: FreeMaterialProgress
  }>({})
  const [topic, setTopic] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [currentUserId, setCurrentUserId] = useState('')

  useEffect(() => {
    const userId = localStorage.getItem('userId') || ''
    setCurrentUserId(userId)
  }, [])

  // Fetch session
  const { data: sessionData, isLoading: loadingSession } = useQuery({
    queryKey: ['session', sessionId],
    queryFn: () => sessionApi.getOne(sessionId),
    enabled: !!sessionId,
  })

  // Fetch attendance to get who is HADIR
  const today = new Date().toISOString().split('T')[0]
  const { data: sessionLogData } = useQuery({
    queryKey: ['session-log', sessionId, today],
    queryFn: () => attendanceApi.getSessionLog(sessionId, today),
    enabled: !!sessionId,
  })

  const session = sessionData?.data?.data
  const sessionLog = sessionLogData?.data?.data

  // Get curriculum modules for MODULE_BASED subjects
  const { data: modulesData } = useQuery({
    queryKey: ['curriculum-modules', session?.subjectId],
    queryFn: () => curriculumModuleApi.getBySubject(session?.subjectId),
    enabled: !!session?.subjectId && session?.subjectTrackingType === 'MODULE_BASED',
  })

  const modules = modulesData?.data?.data || []
  const isModuleBased = session?.subjectTrackingType === 'MODULE_BASED'

  // Get students who attended (HADIR only)
  const presentStudents =
    sessionLog?.attendances?.filter((a: any) => a.status === 'HADIR') || []

  // Initialize state when data is ready
  useEffect(() => {
    if (presentStudents.length > 0) {
      if (isModuleBased) {
        const init: { [k: string]: ModuleProgress } = {}
        presentStudents.forEach((s: any) => {
          init[s.studentId] = {
            studentId: s.studentId,
            moduleId: '',
            chapterFrom: 1,
            chapterTo: 1,
            moduleCompleted: false,
            notes: '',
          }
        })
        setModuleProgress(init)
      } else {
        const init: { [k: string]: FreeMaterialProgress } = {}
        presentStudents.forEach((s: any) => {
          init[s.studentId] = {
            studentId: s.studentId,
            notes: '',
          }
        })
        setFreeMaterialProgress(init)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionLog?.id, isModuleBased])

  if (loadingSession) {
    return (
      <div className="px-4 py-4">
        <p className="text-center text-gray-500">Memuat...</p>
      </div>
    )
  }

  if (!session || !sessionLog) {
    return (
      <div className="px-4 py-4 text-center">
        <p className="text-gray-500">Data tidak ditemukan. Submit presensi terlebih dulu.</p>
        <Link href={`/guru/presensi/${sessionId}`} className="text-blue-600 mt-2 inline-block">
          ← Ke Presensi
        </Link>
      </div>
    )
  }

  const updateModuleProgress = (studentId: string, updates: Partial<ModuleProgress>) => {
    setModuleProgress((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], ...updates } as ModuleProgress,
    }))
  }

  const updateFreeProgress = (studentId: string, updates: Partial<FreeMaterialProgress>) => {
    setFreeMaterialProgress((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], ...updates } as FreeMaterialProgress,
    }))
  }

  const isAuthorized = !sessionLog?.actualTeacherId || !currentUserId || sessionLog.actualTeacherId === currentUserId

  const handleSubmit = async () => {
    if (!isAuthorized) {
      setError('Anda tidak memiliki akses untuk input progress sesi ini')
      return
    }

    try {
      setIsSubmitting(true)
      setError('')

      if (isModuleBased) {
        // Validate module progress
        const items = Object.values(moduleProgress)
        for (const item of items) {
          if (!item.moduleId) {
            setError('Pilih modul untuk semua siswa')
            setIsSubmitting(false)
            return
          }
          if (item.moduleCompleted && !item.predicate) {
            setError('Pilih predikat untuk modul yang selesai')
            setIsSubmitting(false)
            return
          }
        }

        await progressApi.submit({
          sessionLogId,
          trackingType: 'MODULE_BASED',
          moduleProgress: items,
        })
      } else {
        // Validate FREE_MATERIAL
        if (!topic) {
          setError('Topik harus diisi')
          setIsSubmitting(false)
          return
        }
        const items = Object.values(freeMaterialProgress)
        for (const item of items) {
          if (!item.predicate) {
            setError('Pilih predikat untuk setiap siswa')
            setIsSubmitting(false)
            return
          }
        }

        await progressApi.submit({
          sessionLogId,
          trackingType: 'FREE_MATERIAL',
          topic,
          freeMaterialProgress: items.map((i) => ({
            studentId: i.studentId,
            predicate: i.predicate,
            notes: i.notes || undefined,
          })),
        })
      }

      // Redirect to success page (or back to list)
      router.push(`/guru/presensi/${sessionId}/done`)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal submit progress')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="px-4 py-4 space-y-4 pb-24">
      <Link
        href={`/guru/presensi/${sessionId}`}
        className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
      >
        <ArrowLeft className="w-4 h-4" />
        Kembali
      </Link>

      <div>
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-xl font-bold text-gray-900">{session.subjectName}</h1>
          <span
            className={`text-xs px-2 py-1 rounded-full font-medium ${
              isModuleBased ? 'bg-purple-100 text-purple-700' : 'bg-teal-100 text-teal-700'
            }`}
          >
            {isModuleBased ? '📚 Modul' : '📝 Materi bebas'}
          </span>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          {session.dayOfWeek} · {session.startTime?.substring(0, 5)} · {presentStudents.length} siswa hadir
        </p>
      </div>

      {/* Stepper */}
      <div className="flex items-center justify-center gap-2 py-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center font-bold text-sm">
            <Check className="w-4 h-4" />
          </div>
          <span className="text-xs font-medium text-green-600">Presensi</span>
        </div>
        <div className="w-8 h-px bg-blue-300"></div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
            2
          </div>
          <span className="text-xs font-medium text-blue-600">Progress</span>
        </div>
        <div className="w-8 h-px bg-gray-300"></div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center font-bold text-sm">
            3
          </div>
          <span className="text-xs text-gray-500">Selesai</span>
        </div>
      </div>

      {/* Attendance Summary */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
        <div className="flex items-center gap-2 mb-1">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <p className="text-sm font-semibold text-green-900">Presensi tercatat</p>
        </div>
        <p className="text-xs text-green-700">
          {presentStudents.map((s: any) => s.studentName || s.fullName).join(', ')}{' '}
          — {presentStudents.length} siswa hadir
        </p>
      </div>

      {/* Authorization Check: Only actual teacher can input progress */}
      {sessionLog?.actualTeacherId && currentUserId && sessionLog.actualTeacherId !== currentUserId && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-xs text-amber-800">
            <strong>ℹ️ Hanya guru yang menandai presensi yang bisa input progress.</strong> Hubungi guru terkait untuk melanjutkan.
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* No Present Students */}
      {presentStudents.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
          <p className="text-sm text-amber-800">Tidak ada siswa hadir, tidak perlu input progress.</p>
          <Link
            href="/guru/presensi"
            className="text-blue-600 hover:text-blue-700 text-sm font-medium mt-2 inline-block"
          >
            Kembali ke daftar sesi →
          </Link>
        </div>
      )}

      {/* MODULE_BASED Form */}
      {isModuleBased && presentStudents.length > 0 && (
        <div className="space-y-4">
          {presentStudents.map((s: any) => {
            const progress = moduleProgress[s.studentId]
            if (!progress) return null
            const selectedModule = modules.find((m: any) => m.id === progress.moduleId)
            const totalChapters = selectedModule?.totalChapters || 0
            const willComplete = progress.chapterTo === totalChapters && totalChapters > 0

            return (
              <div key={s.studentId} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-medium text-xs">
                    {(s.studentName || s.fullName)
                      ?.split(' ')
                      .map((n: string) => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <p className="font-medium text-gray-900 text-sm">{s.studentName || s.fullName}</p>
                </div>

                {/* Module Selector */}
                <div className="mb-3">
                  <label className="text-xs font-medium text-gray-700 mb-1 block">Pilih Modul</label>
                  <select
                    value={progress.moduleId}
                    onChange={(e) =>
                      updateModuleProgress(s.studentId, {
                        moduleId: e.target.value,
                        chapterFrom: 1,
                        chapterTo: 1,
                        moduleCompleted: false,
                        predicate: undefined,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Pilih modul --</option>
                    {modules.map((m: any) => (
                      <option key={m.id} value={m.id}>
                        Modul {m.orderNumber}: {m.name} ({m.totalChapters} bab)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Chapter Range */}
                {progress.moduleId && (
                  <>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div>
                        <label className="text-xs font-medium text-gray-700 mb-1 block">Dari Bab</label>
                        <input
                          type="number"
                          min={1}
                          max={totalChapters}
                          value={progress.chapterFrom}
                          onChange={(e) =>
                            updateModuleProgress(s.studentId, {
                              chapterFrom: Number(e.target.value),
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-700 mb-1 block">Sampai Bab</label>
                        <input
                          type="number"
                          min={progress.chapterFrom}
                          max={totalChapters}
                          value={progress.chapterTo}
                          onChange={(e) => {
                            const newTo = Number(e.target.value)
                            updateModuleProgress(s.studentId, {
                              chapterTo: newTo,
                              moduleCompleted: newTo === totalChapters,
                            })
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-3">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-500 rounded-full h-2 transition-all"
                          style={{ width: `${(progress.chapterTo / totalChapters) * 100}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">
                        {progress.chapterTo}/{totalChapters} bab
                      </p>
                    </div>

                    {/* Module Complete Banner */}
                    {willComplete && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3 flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                        <p className="text-xs text-green-800">
                          <strong>Modul selesai hari ini!</strong> Pilih predikat di bawah.
                        </p>
                      </div>
                    )}

                    {/* Predicate (only when complete) */}
                    {willComplete && (
                      <div className="mb-3">
                        <label className="text-xs font-medium text-gray-700 mb-2 block">
                          Predikat Penyelesaian <span className="text-red-500">*</span>
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          {PREDICATE_OPTIONS.slice(0, 4).map((p) => (
                            <button
                              key={p.value}
                              type="button"
                              onClick={() => updateModuleProgress(s.studentId, { predicate: p.value })}
                              className={`py-2 px-3 rounded-lg text-xs font-medium transition border-2 ${
                                progress.predicate === p.value
                                  ? p.color + ' font-bold'
                                  : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300'
                              }`}
                            >
                              {p.label}
                            </button>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => updateModuleProgress(s.studentId, { predicate: 'MEMUASKAN' })}
                          className={`w-full mt-2 py-2 rounded-lg text-xs font-medium transition border-2 ${
                            progress.predicate === 'MEMUASKAN'
                              ? PREDICATE_OPTIONS[4].color + ' font-bold'
                              : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300'
                          }`}
                        >
                          {PREDICATE_OPTIONS[4].label}
                        </button>
                      </div>
                    )}

                    {/* Notes */}
                    <div>
                      <label className="text-xs font-medium text-gray-700 mb-1 block">
                        Catatan (opsional)
                      </label>
                      <textarea
                        value={progress.notes}
                        onChange={(e) => updateModuleProgress(s.studentId, { notes: e.target.value })}
                        placeholder="Topik yang dibahas, catatan khusus..."
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      />
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* FREE_MATERIAL Form */}
      {!isModuleBased && presentStudents.length > 0 && (
        <div className="space-y-4">
          {/* Topic Banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-800">
              📝 Topik berlaku untuk semua siswa. Predikat & catatan diisi per siswa.
            </p>
          </div>

          {/* Topic Input */}
          <div className="bg-white border border-gray-200 rounded-lg p-3">
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Topik Hari Ini <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Contoh: Persamaan kuadrat, Trigonometri sudut istimewa..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">Satu topik untuk semua siswa di sesi ini</p>
          </div>

          {/* Per-student progress */}
          {presentStudents.map((s: any) => {
            const progress = freeMaterialProgress[s.studentId]
            if (!progress) return null

            return (
              <div key={s.studentId} className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                {/* Student Header */}
                <div className="bg-gray-50 px-3 py-2 flex items-center gap-2 border-b border-gray-200">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-medium text-xs">
                    {(s.studentName || s.fullName)
                      ?.split(' ')
                      .map((n: string) => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <p className="font-medium text-gray-900 text-sm flex-1">{s.studentName || s.fullName}</p>
                  <span className="text-[10px] px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">
                    Hadir
                  </span>
                </div>

                <div className="p-3 space-y-3">
                  {/* Predicate */}
                  <div>
                    <label className="text-xs font-medium text-gray-700 mb-2 block">
                      Predikat Pemahaman <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {PREDICATE_OPTIONS.slice(0, 4).map((p) => (
                        <button
                          key={p.value}
                          type="button"
                          onClick={() => updateFreeProgress(s.studentId, { predicate: p.value })}
                          className={`py-2 px-3 rounded-lg text-xs font-medium transition border-2 ${
                            progress.predicate === p.value
                              ? p.color + ' font-bold'
                              : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300'
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => updateFreeProgress(s.studentId, { predicate: 'MEMUASKAN' })}
                      className={`w-full mt-2 py-2 rounded-lg text-xs font-medium transition border-2 ${
                        progress.predicate === 'MEMUASKAN'
                          ? PREDICATE_OPTIONS[4].color + ' font-bold'
                          : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {PREDICATE_OPTIONS[4].label}
                    </button>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="text-xs font-medium text-gray-700 mb-1 block">
                      Catatan untuk {s.studentName || s.fullName} (opsional)
                    </label>
                    <textarea
                      value={progress.notes}
                      onChange={(e) => updateFreeProgress(s.studentId, { notes: e.target.value })}
                      placeholder="Observasi khusus untuk siswa ini..."
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Submit Button - Fixed at bottom */}
      {presentStudents.length > 0 && (
        <div className="fixed bottom-16 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-200 p-3 z-40">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !isAuthorized}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
          >
            <Check className="w-5 h-5" />
            {isSubmitting ? 'Menyimpan...' : 'Simpan Progress'}
          </button>
        </div>
      )}
    </div>
  )
}
