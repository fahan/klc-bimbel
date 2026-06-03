'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { attendanceApi, progressApi, curriculumModuleApi } from '@/lib/api/endpoints'
import { ArrowLeft, Check, CheckCircle, BookOpen, AlertTriangle } from 'lucide-react'

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
  { value: 'CUKUP',           label: 'Cukup',           color: 'bg-amber-100 text-amber-700 border-amber-300' },
  { value: 'BAIK',            label: 'Baik',            color: 'bg-blue-100 text-blue-700 border-blue-300' },
  { value: 'BAIK_SEKALI',     label: 'Baik Sekali',     color: 'bg-green-100 text-green-700 border-green-300' },
  { value: 'MEMUASKAN',       label: 'Memuaskan',       color: 'bg-teal-100 text-teal-700 border-teal-300' },
]

export default function DaruratProgressPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionLogId = searchParams.get('sessionLogId')
  const subjectId    = searchParams.get('subjectId')

  const [topic, setTopic] = useState('')
  const [moduleProgress, setModuleProgress]           = useState<{ [k: string]: ModuleProgress }>({})
  const [freeMaterialProgress, setFreeMaterialProgress] = useState<{ [k: string]: FreeMaterialProgress }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError]               = useState('')

  // Fetch session log by ID (gets HADIR students + subject info)
  const { data: logData, isLoading: loadingLog } = useQuery({
    queryKey: ['session-log-id', sessionLogId],
    queryFn: () => attendanceApi.getLogById(sessionLogId!),
    enabled: !!sessionLogId,
  })

  // Fetch curriculum modules if MODULE_BASED
  const { data: modulesData } = useQuery({
    queryKey: ['curriculum-modules', subjectId],
    queryFn: () => curriculumModuleApi.getBySubject(subjectId!),
    enabled: !!subjectId,
  })

  const sessionLog      = logData?.data?.data
  const modules         = modulesData?.data?.data || []
  const isModuleBased   = sessionLog?.subjectTrackingType === 'MODULE_BASED'
  const presentStudents = sessionLog?.attendances?.filter((a: any) => a.status === 'HADIR') || []

  // Initialize per-student state when log loads
  useEffect(() => {
    if (presentStudents.length === 0) return
    if (isModuleBased) {
      const init: { [k: string]: ModuleProgress } = {}
      presentStudents.forEach((s: any) => {
        init[s.studentId] = { studentId: s.studentId, moduleId: '', chapterFrom: 1, chapterTo: 1, moduleCompleted: false, notes: '' }
      })
      setModuleProgress(init)
    } else {
      const init: { [k: string]: FreeMaterialProgress } = {}
      presentStudents.forEach((s: any) => {
        init[s.studentId] = { studentId: s.studentId, notes: '' }
      })
      setFreeMaterialProgress(init)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionLog?.id, isModuleBased])

  const updateModule = (studentId: string, updates: Partial<ModuleProgress>) =>
    setModuleProgress(prev => ({ ...prev, [studentId]: { ...prev[studentId], ...updates } as ModuleProgress }))

  const updateFree = (studentId: string, updates: Partial<FreeMaterialProgress>) =>
    setFreeMaterialProgress(prev => ({ ...prev, [studentId]: { ...prev[studentId], ...updates } as FreeMaterialProgress }))

  const handleSkip = () => {
    router.push('/guru/presensi/darurat/selesai')
  }

  const handleSubmit = async () => {
    setError('')
    try {
      setIsSubmitting(true)

      if (isModuleBased) {
        const items = Object.values(moduleProgress)
        for (const item of items) {
          if (!item.moduleId) { setError('Pilih modul untuk semua siswa'); setIsSubmitting(false); return }
          if (item.moduleCompleted && !item.predicate) { setError('Pilih predikat untuk modul yang selesai'); setIsSubmitting(false); return }
        }
        await progressApi.submit({ sessionLogId, trackingType: 'MODULE_BASED', moduleProgress: items })
      } else {
        if (!topic) { setError('Topik harus diisi'); setIsSubmitting(false); return }
        const items = Object.values(freeMaterialProgress)
        for (const item of items) {
          if (!item.predicate) { setError('Pilih predikat untuk setiap siswa'); setIsSubmitting(false); return }
        }
        await progressApi.submit({
          sessionLogId,
          trackingType: 'FREE_MATERIAL',
          topic,
          freeMaterialProgress: items.map(i => ({ studentId: i.studentId, predicate: i.predicate, notes: i.notes || undefined })),
        })
      }

      router.push('/guru/presensi/darurat/selesai')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal menyimpan progress')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!sessionLogId) {
    return (
      <div className="px-4 py-4 text-center">
        <p className="text-gray-500 text-sm">Session log ID tidak ditemukan.</p>
        <Link href="/guru/presensi" className="text-blue-600 mt-2 inline-block text-sm">← Kembali</Link>
      </div>
    )
  }

  if (loadingLog) {
    return (
      <div className="px-4 py-4 space-y-3">
        {[1,2,3].map(i => <div key={i} className="bg-white rounded-lg p-4 animate-pulse h-16" />)}
      </div>
    )
  }

  return (
    <div className="px-4 py-4 space-y-4 pb-32">
      <Link href="/guru/presensi/darurat" className="flex items-center gap-2 text-blue-600 text-sm font-medium">
        <ArrowLeft className="w-4 h-4" />
        Kembali
      </Link>

      <div>
        <h1 className="text-xl font-bold text-gray-900">{sessionLog?.subjectName}</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {sessionLog?.sessionDate} · {sessionLog?.adHocStartTime} · {sessionLog?.adHocBranchName}
        </p>
      </div>

      {/* Progress Stepper */}
      <div className="flex items-center justify-center gap-2 py-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center">
            <Check className="w-4 h-4" />
          </div>
          <span className="text-xs font-medium text-green-600">Presensi</span>
        </div>
        <div className="w-8 h-px bg-blue-300"></div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">2</div>
          <span className="text-xs font-medium text-blue-600">Progress</span>
        </div>
        <div className="w-8 h-px bg-gray-300"></div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center font-bold text-sm">3</div>
          <span className="text-xs text-gray-500">Selesai</span>
        </div>
      </div>

      {/* Status Banner */}
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 flex gap-2">
        <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-orange-800">
          Sesi darurat masih <strong>menunggu persetujuan admin</strong>. Progress tetap dapat diinput sekarang.
        </p>
      </div>

      {/* Attendance Summary */}
      {presentStudents.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <p className="text-sm font-semibold text-green-900">Presensi tercatat</p>
          </div>
          <p className="text-xs text-green-700">
            {presentStudents.map((s: any) => s.studentName).join(', ')} — {presentStudents.length} siswa hadir
          </p>
        </div>
      )}

      {/* No present students */}
      {presentStudents.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
          <p className="text-sm text-amber-800">Tidak ada siswa hadir di sesi ini.</p>
          <button onClick={handleSkip} className="text-blue-600 text-sm font-medium mt-2 inline-block">
            Lanjut ke selesai →
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">{error}</div>
      )}

      {/* MODULE_BASED Form */}
      {isModuleBased && presentStudents.length > 0 && (
        <div className="space-y-4">
          {presentStudents.map((s: any) => {
            const progress = moduleProgress[s.studentId]
            if (!progress) return null
            const selectedModule  = modules.find((m: any) => m.id === progress.moduleId)
            const totalChapters   = selectedModule?.totalChapters || 0
            const willComplete    = progress.chapterTo === totalChapters && totalChapters > 0

            return (
              <div key={s.studentId} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-semibold text-xs">
                    {s.studentName?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <p className="font-medium text-gray-900 text-sm">{s.studentName}</p>
                </div>

                {/* Module Selector */}
                <div>
                  <label className="text-xs font-medium text-gray-700 mb-1 block">Pilih Modul</label>
                  <select
                    value={progress.moduleId}
                    onChange={e => updateModule(s.studentId, { moduleId: e.target.value, chapterFrom: 1, chapterTo: 1, moduleCompleted: false, predicate: undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="">-- Pilih modul --</option>
                    {modules.map((m: any) => (
                      <option key={m.id} value={m.id}>Modul {m.orderNumber}: {m.name} ({m.totalChapters} bab)</option>
                    ))}
                  </select>
                </div>

                {progress.moduleId && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs font-medium text-gray-700 mb-1 block">Dari Bab</label>
                        <input type="number" min={1} max={totalChapters} value={progress.chapterFrom}
                          onChange={e => updateModule(s.studentId, { chapterFrom: Number(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-700 mb-1 block">Sampai Bab</label>
                        <input type="number" min={progress.chapterFrom} max={totalChapters} value={progress.chapterTo}
                          onChange={e => {
                            const v = Number(e.target.value)
                            updateModule(s.studentId, { chapterTo: v, moduleCompleted: v === totalChapters })
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                      </div>
                    </div>

                    <div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div className="bg-blue-500 rounded-full h-1.5 transition-all"
                          style={{ width: `${(progress.chapterTo / totalChapters) * 100}%` }} />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{progress.chapterTo}/{totalChapters} bab</p>
                    </div>

                    {willComplete && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-2 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <p className="text-xs text-green-800 font-medium">Modul selesai! Pilih predikat.</p>
                      </div>
                    )}

                    {willComplete && (
                      <div>
                        <label className="text-xs font-medium text-gray-700 mb-2 block">Predikat <span className="text-red-500">*</span></label>
                        <div className="grid grid-cols-2 gap-2">
                          {PREDICATE_OPTIONS.map(p => (
                            <button key={p.value} type="button"
                              onClick={() => updateModule(s.studentId, { predicate: p.value })}
                              className={`py-2 px-3 rounded-lg text-xs font-medium transition border-2 ${progress.predicate === p.value ? p.color + ' font-bold' : 'border-gray-200 bg-gray-50 text-gray-700'}`}>
                              {p.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="text-xs font-medium text-gray-700 mb-1 block">Catatan (opsional)</label>
                      <textarea value={progress.notes} onChange={e => updateModule(s.studentId, { notes: e.target.value })}
                        placeholder="Catatan observasi..." rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none" />
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
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-800">📝 Topik berlaku untuk semua siswa. Predikat & catatan diisi per siswa.</p>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-3">
            <label className="text-sm font-medium text-gray-700 mb-2 block">Topik Hari Ini <span className="text-red-500">*</span></label>
            <input type="text" value={topic} onChange={e => setTopic(e.target.value)}
              placeholder="Contoh: Persamaan kuadrat, Trigonometri..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>

          {presentStudents.map((s: any) => {
            const progress = freeMaterialProgress[s.studentId]
            if (!progress) return null
            return (
              <div key={s.studentId} className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                <div className="bg-gray-50 px-3 py-2 flex items-center gap-2 border-b border-gray-200">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-semibold text-xs">
                    {s.studentName?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <p className="font-medium text-gray-900 text-sm flex-1">{s.studentName}</p>
                  <span className="text-[10px] px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">Hadir</span>
                </div>

                <div className="p-3 space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-700 mb-2 block">Predikat Pemahaman <span className="text-red-500">*</span></label>
                    <div className="grid grid-cols-2 gap-2">
                      {PREDICATE_OPTIONS.map(p => (
                        <button key={p.value} type="button"
                          onClick={() => updateFree(s.studentId, { predicate: p.value })}
                          className={`py-2 px-3 rounded-lg text-xs font-medium transition border-2 ${progress.predicate === p.value ? p.color + ' font-bold' : 'border-gray-200 bg-gray-50 text-gray-700'}`}>
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-700 mb-1 block">Catatan untuk {s.studentName} (opsional)</label>
                    <textarea value={progress.notes} onChange={e => updateFree(s.studentId, { notes: e.target.value })}
                      placeholder="Observasi khusus..." rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none" />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Fixed Bottom Buttons */}
      {presentStudents.length > 0 && (
        <div className="fixed bottom-16 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-200 p-3 z-40 space-y-2">
          <button onClick={handleSubmit} disabled={isSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm">
            <Check className="w-5 h-5" />
            {isSubmitting ? 'Menyimpan...' : 'Simpan Progress'}
          </button>
          <button onClick={handleSkip}
            className="w-full text-gray-500 text-sm py-2 hover:text-gray-700 transition">
            Lewati (tidak ada progress khusus)
          </button>
        </div>
      )}
    </div>
  )
}
