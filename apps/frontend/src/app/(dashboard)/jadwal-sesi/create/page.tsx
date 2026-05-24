'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { sessionApi, branchApi, subjectApi, teacherApi } from '@/lib/api/endpoints'
import { ArrowLeft, Calendar, Clock, MapPin, BookOpen, GraduationCap, Copy, AlertCircle, Layers } from 'lucide-react'
import { StudentAssignmentSection } from '@/components/sessions/StudentAssignmentSection'

const baseSchema = z.object({
  branchId: z.string().min(1, 'Cabang harus dipilih'),
  subjectId: z.string().min(1, 'Mata pelajaran harus dipilih'),
  teacherId: z.string().min(1, 'Guru harus dipilih'),
  type: z.enum(['REGULAR', 'PRIVATE']),
  durationMinutes: z.coerce.number().int().min(30, 'Min 30 menit').max(240, 'Max 240 menit'),
  studentIds: z.array(z.string()).optional().default([]),
})

const singleSessionSchema = baseSchema.extend({
  dayOfWeek: z.enum(['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU', 'MINGGU'], {
    errorMap: () => ({ message: 'Hari harus dipilih' }),
  }),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Format jam: HH:mm'),
})

const multiSessionSchema = baseSchema.extend({
  dayOfWeek: z.string().optional(),
  startTime: z.string().optional(),
})

type SessionFormData = z.infer<typeof singleSessionSchema>

const DAY_OPTIONS = [
  { value: 'SENIN', label: 'Senin' },
  { value: 'SELASA', label: 'Selasa' },
  { value: 'RABU', label: 'Rabu' },
  { value: 'KAMIS', label: 'Kamis' },
  { value: 'JUMAT', label: 'Jumat' },
  { value: 'SABTU', label: 'Sabtu' },
  { value: 'MINGGU', label: 'Minggu' },
]

const DURATION_OPTIONS = [
  { value: 30, label: '30 menit' },
  { value: 45, label: '45 menit' },
  { value: 60, label: '60 menit (1 jam)' },
  { value: 90, label: '90 menit (1.5 jam)' },
  { value: 120, label: '120 menit (2 jam)' },
  { value: 150, label: '150 menit (2.5 jam)' },
  { value: 180, label: '180 menit (3 jam)' },
]

interface SessionSlot {
  dayOfWeek: string
  startTime: string
}

export default function CreateSessionPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])

  // Session mode: SINGLE (regular), MULTI (multiple same subject), or COMBINED (2 subjects)
  const [sessionMode, setSessionMode] = useState<'SINGLE' | 'MULTI' | 'COMBINED'>('SINGLE')

  // Combined session specific state
  const [combinedSubject2Id, setCombinedSubject2Id] = useState<string>('')
  const [combinedType2, setCombinedType2] = useState<'REGULAR' | 'PRIVATE'>('REGULAR')
  const [combinedSubject1Students, setCombinedSubject1Students] = useState<string[]>([])
  const [combinedSubject2Students, setCombinedSubject2Students] = useState<string[]>([])

  // Multi-session specific state
  const [sessionCount, setSessionCount] = useState(3)
  const [sessions, setSessions] = useState<SessionSlot[]>([
    { dayOfWeek: 'SENIN', startTime: '08:00' },
    { dayOfWeek: 'RABU', startTime: '08:00' },
    { dayOfWeek: 'JUMAT', startTime: '08:00' },
  ])
  const [sameStudentForAll, setSameStudentForAll] = useState(true)
  const [commonStudentIds, setCommonStudentIds] = useState<string[]>([])
  const [sessionStudents, setSessionStudents] = useState<{ [key: number]: string[] }>({
    0: [],
    1: [],
    2: [],
  })

  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchApi.getAll(),
  })

  const { data: subjectsData } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => subjectApi.getAll(),
  })

  const { data: teachersData } = useQuery({
    queryKey: ['teachers'],
    queryFn: () => teacherApi.getAll(),
  })

  const branches = branchesData?.data?.data || []
  const subjects = subjectsData?.data?.data || []
  const teachers = teachersData?.data?.data || []

  const selectedSessionCount = sessionCount
  const currentSchema = selectedSessionCount === 1 ? singleSessionSchema : multiSessionSchema

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SessionFormData>({
    resolver: zodResolver(currentSchema),
    defaultValues: {
      type: 'REGULAR',
      durationMinutes: 30,
      dayOfWeek: 'SENIN',
      startTime: '08:00',
    },
  })

  const selectedSubjectId = watch('subjectId')
  const selectedBranchId = watch('branchId')
  const selectedType = watch('type')
  const selectedDuration = watch('durationMinutes')
  const selectedSubject = subjects.find((s: any) => s.id === selectedSubjectId)
  const selectedSubject2 = subjects.find((s: any) => s.id === combinedSubject2Id)

  // Calculate MIN capacity for combined sessions
  const getCapacityForType = (subject: any, type: string) => {
    return type === 'REGULAR' ? subject?.maxCapacityRegular || 3 : subject?.maxCapacityPrivate || 1
  }

  const combinedMinCapacity = selectedSubject && selectedSubject2
    ? Math.min(
        getCapacityForType(selectedSubject, selectedType),
        getCapacityForType(selectedSubject2, combinedType2)
      )
    : 0

  // Initialize sessions when sessionCount changes
  const handleSessionCountChange = (count: number) => {
    const newCount = Math.max(1, Math.min(count, 10))
    setSessionCount(newCount)

    const newSessions = Array.from({ length: newCount }, (_, i) => ({
      dayOfWeek: sessions[i]?.dayOfWeek || 'SENIN',
      startTime: sessions[i]?.startTime || '08:00',
    }))
    setSessions(newSessions)

    const newSessionStudents: { [key: number]: string[] } = {}
    for (let i = 0; i < newCount; i++) {
      newSessionStudents[i] = sessionStudents[i] || []
    }
    setSessionStudents(newSessionStudents)
  }

  const updateSessionSlot = (index: number, field: keyof SessionSlot, value: string) => {
    const newSessions = [...sessions]
    newSessions[index] = { ...newSessions[index], [field]: value }
    setSessions(newSessions)
  }

  const handleSessionStudentsChange = (index: number, newIds: string[]) => {
    setSessionStudents({
      ...sessionStudents,
      [index]: newIds,
    })
  }

  const copyFromPrevious = (toIndex: number) => {
    if (toIndex === 0) return
    const fromIndex = toIndex - 1
    const fromStudents = sessionStudents[fromIndex] || []
    handleSessionStudentsChange(toIndex, [...fromStudents])
  }

  // Check for duplicate days/times in form
  const sessionConflicts = useMemo(() => {
    const conflicts = new Set<number>()
    for (let i = 0; i < sessions.length; i++) {
      for (let j = i + 1; j < sessions.length; j++) {
        if (
          sessions[i].dayOfWeek === sessions[j].dayOfWeek &&
          sessions[i].startTime === sessions[j].startTime
        ) {
          conflicts.add(i)
          conflicts.add(j)
        }
      }
    }
    return conflicts
  }, [sessions])

  const onSubmit = async (data: SessionFormData) => {
    try {
      setIsLoading(true)
      setError('')

      // Combined session mode
      if (sessionMode === 'COMBINED') {
        // Validate 2 different subjects selected
        if (!combinedSubject2Id) {
          setError('Pilih 2 mata pelajaran berbeda untuk sesi gabungan')
          setIsLoading(false)
          return
        }

        if (data.subjectId === combinedSubject2Id) {
          setError('Mata pelajaran 1 dan 2 harus berbeda')
          setIsLoading(false)
          return
        }

        // Validate capacity not exceeded
        if (combinedSubject1Students.length > combinedMinCapacity) {
          setError(`Siswa untuk mata pelajaran 1 melebihi kapasitas MIN (${combinedMinCapacity})`)
          setIsLoading(false)
          return
        }

        if (combinedSubject2Students.length > combinedMinCapacity) {
          setError(`Siswa untuk mata pelajaran 2 melebihi kapasitas MIN (${combinedMinCapacity})`)
          setIsLoading(false)
          return
        }

        await sessionApi.createCombined({
          branchId: data.branchId,
          teacherId: data.teacherId,
          dayOfWeek: sessions[0].dayOfWeek,
          startTime: sessions[0].startTime,
          durationMinutes: data.durationMinutes,
          subjects: [
            {
              subjectId: data.subjectId,
              type: data.type,
              studentIds: combinedSubject1Students,
            },
            {
              subjectId: combinedSubject2Id,
              type: combinedType2,
              studentIds: combinedSubject2Students,
            },
          ],
        })
        router.push('/jadwal-sesi?success=created&count=1&type=combined')
      }
      // Multi-session mode
      else if (sessionCount > 1) {
        // Validate that at least one session slot has students
        const hasStudents = sameStudentForAll
          ? commonStudentIds.length > 0
          : sessions.some((_, idx) => (sessionStudents[idx] || []).length > 0)

        if (!hasStudents) {
          setError('Pilih minimal satu siswa untuk sesi')
          setIsLoading(false)
          return
        }

        // Validate all sessions have day and time
        for (let i = 0; i < sessions.length; i++) {
          if (!sessions[i].dayOfWeek || !sessions[i].startTime) {
            setError(`Sesi ${i + 1}: hari dan jam harus diisi`)
            setIsLoading(false)
            return
          }
        }

        await sessionApi.createBulk({
          branchId: data.branchId,
          subjectId: data.subjectId,
          teacherId: data.teacherId,
          type: data.type,
          durationMinutes: data.durationMinutes,
          sessions: sessions.map((session, idx) => ({
            dayOfWeek: session.dayOfWeek,
            startTime: session.startTime,
            studentIds: sameStudentForAll ? commonStudentIds : (sessionStudents[idx] || []),
          })),
        })
        router.push(`/jadwal-sesi?success=created&count=${sessionCount}`)
      }
      // Single session mode
      else {
        await sessionApi.create({
          branchId: data.branchId,
          subjectId: data.subjectId,
          teacherId: data.teacherId,
          type: data.type,
          dayOfWeek: sessions[0].dayOfWeek,
          startTime: sessions[0].startTime,
          durationMinutes: data.durationMinutes,
          studentIds: sameStudentForAll ? commonStudentIds : (sessionStudents[0] || []),
        })
        router.push('/jadwal-sesi?success=created&count=1')
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal membuat sesi')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link
        href="/jadwal-sesi"
        className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium w-fit"
      >
        <ArrowLeft className="w-5 h-5" />
        Kembali
      </Link>

      <div>
        <h1 className="text-3xl font-bold text-gray-900">Tambah Sesi Baru</h1>
        <p className="text-gray-600 mt-1">Buat jadwal sesi mingguan untuk mata pelajaran</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Mode Selector */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Jenis Sesi</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="cursor-pointer">
            <input
              type="radio"
              value="SINGLE"
              checked={sessionMode === 'SINGLE'}
              onChange={(e) => setSessionMode(e.target.value as any)}
              className="peer sr-only"
              disabled={isLoading}
            />
            <div className="p-4 border-2 border-gray-200 rounded-lg peer-checked:border-blue-500 peer-checked:bg-blue-50 transition">
              <div className="font-medium text-gray-900">Sesi Tunggal</div>
              <p className="text-xs text-gray-600 mt-1">1 mata pelajaran, 1 jam</p>
            </div>
          </label>
          <label className="cursor-pointer">
            <input
              type="radio"
              value="MULTI"
              checked={sessionMode === 'MULTI'}
              onChange={(e) => setSessionMode(e.target.value as any)}
              className="peer sr-only"
              disabled={isLoading}
            />
            <div className="p-4 border-2 border-gray-200 rounded-lg peer-checked:border-blue-500 peer-checked:bg-blue-50 transition">
              <div className="font-medium text-gray-900">Multi Sesi</div>
              <p className="text-xs text-gray-600 mt-1">Berulang per minggu</p>
            </div>
          </label>
          <label className="cursor-pointer">
            <input
              type="radio"
              value="COMBINED"
              checked={sessionMode === 'COMBINED'}
              onChange={(e) => setSessionMode(e.target.value as any)}
              className="peer sr-only"
              disabled={isLoading}
            />
            <div className="p-4 border-2 border-gray-200 rounded-lg peer-checked:border-blue-500 peer-checked:bg-blue-50 transition">
              <div className="font-medium text-gray-900 flex items-center gap-2">
                <Layers className="w-4 h-4" />
                Sesi Gabungan
              </div>
              <p className="text-xs text-gray-600 mt-1">2 mata pelajaran, 1 jam</p>
            </div>
          </label>
        </div>
      </div>

      <form
        onSubmit={(e) => {
          console.log('Create form onSubmit event triggered', e)
          handleSubmit(onSubmit)(e)
        }}
        className="space-y-6"
      >
        {/* Lokasi & Mata Pelajaran */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            Lokasi & Mata Pelajaran
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cabang <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
                <select
                  {...register('branchId')}
                  className={`w-full pl-9 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.branchId ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={isLoading}
                >
                  <option value="">-- Pilih cabang --</option>
                  {branches.map((b: any) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </div>
              {errors.branchId && <p className="text-red-500 text-xs mt-1">{errors.branchId.message}</p>}
            </div>

            {sessionMode !== 'COMBINED' ? (
              // Single subject selector for SINGLE and MULTI modes
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mata Pelajaran <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <BookOpen className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
                  <select
                    {...register('subjectId')}
                    className={`w-full pl-9 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.subjectId ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={isLoading}
                  >
                    <option value="">-- Pilih mapel --</option>
                    {subjects.map((s: any) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>
                {errors.subjectId && <p className="text-red-500 text-xs mt-1">{errors.subjectId.message}</p>}
                {selectedSubject && (
                  <p className="text-xs text-gray-600 mt-1">
                    Tipe tracking:{' '}
                    <span className="font-medium">
                      {selectedSubject.trackingType === 'MODULE_BASED' ? 'Modul Berjenjang' : 'Materi Bebas'}
                    </span>
                  </p>
                )}
              </div>
            ) : (
              // Two subject selectors for COMBINED mode
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mata Pelajaran 1 <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <BookOpen className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
                    <select
                      {...register('subjectId')}
                      className={`w-full pl-9 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.subjectId ? 'border-red-500' : 'border-gray-300'
                      }`}
                      disabled={isLoading}
                    >
                      <option value="">-- Pilih mapel --</option>
                      {subjects.map((s: any) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.code})
                        </option>
                      ))}
                    </select>
                  </div>
                  {errors.subjectId && <p className="text-red-500 text-xs mt-1">{errors.subjectId.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mata Pelajaran 2 <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <BookOpen className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
                    <select
                      value={combinedSubject2Id}
                      onChange={(e) => setCombinedSubject2Id(e.target.value)}
                      className={`w-full pl-9 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300`}
                      disabled={isLoading}
                    >
                      <option value="">-- Pilih mapel --</option>
                      {subjects
                        .filter((s: any) => s.id !== selectedSubjectId)
                        .map((s: any) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.code})
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tipe Sesi & Guru */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-blue-600" />
            {sessionMode === 'COMBINED' ? 'Tipe Sesi (Per Mata Pelajaran) & Guru' : 'Tipe Sesi & Guru'}
          </h2>

          <div className="space-y-4">
            {sessionMode !== 'COMBINED' ? (
              // Standard type selector for SINGLE and MULTI
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipe Sesi <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="cursor-pointer">
                    <input type="radio" value="REGULAR" {...register('type')} className="peer sr-only" />
                    <div className="p-4 border-2 border-gray-200 rounded-lg peer-checked:border-blue-500 peer-checked:bg-blue-50 transition">
                      <div className="font-medium text-gray-900">Reguler</div>
                      <p className="text-xs text-gray-600 mt-1">
                        Kapasitas {selectedSubject?.maxCapacityRegular || 3} siswa per sesi
                      </p>
                    </div>
                  </label>
                  <label className="cursor-pointer">
                    <input type="radio" value="PRIVATE" {...register('type')} className="peer sr-only" />
                    <div className="p-4 border-2 border-gray-200 rounded-lg peer-checked:border-blue-500 peer-checked:bg-blue-50 transition">
                      <div className="font-medium text-gray-900">Privat</div>
                      <p className="text-xs text-gray-600 mt-1">
                        Kapasitas {selectedSubject?.maxCapacityPrivate || 1} siswa per sesi (tarif lebih tinggi)
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            ) : (
              // Combined type selectors
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipe Mata Pelajaran 1 <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="cursor-pointer">
                      <input type="radio" value="REGULAR" {...register('type')} className="peer sr-only" />
                      <div className="p-3 border-2 border-gray-200 rounded-lg peer-checked:border-blue-500 peer-checked:bg-blue-50 transition text-center">
                        <div className="font-medium text-gray-900 text-sm">Reguler</div>
                        <p className="text-xs text-gray-600 mt-1">
                          Kap. {selectedSubject?.maxCapacityRegular || 3}
                        </p>
                      </div>
                    </label>
                    <label className="cursor-pointer">
                      <input type="radio" value="PRIVATE" {...register('type')} className="peer sr-only" />
                      <div className="p-3 border-2 border-gray-200 rounded-lg peer-checked:border-blue-500 peer-checked:bg-blue-50 transition text-center">
                        <div className="font-medium text-gray-900 text-sm">Privat</div>
                        <p className="text-xs text-gray-600 mt-1">
                          Kap. {selectedSubject?.maxCapacityPrivate || 1}
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipe Mata Pelajaran 2 <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="cursor-pointer">
                      <input
                        type="radio"
                        value="REGULAR"
                        checked={combinedType2 === 'REGULAR'}
                        onChange={() => setCombinedType2('REGULAR')}
                        className="peer sr-only"
                        disabled={isLoading}
                      />
                      <div className="p-3 border-2 border-gray-200 rounded-lg peer-checked:border-blue-500 peer-checked:bg-blue-50 transition text-center">
                        <div className="font-medium text-gray-900 text-sm">Reguler</div>
                        <p className="text-xs text-gray-600 mt-1">
                          Kap. {selectedSubject2?.maxCapacityRegular || 3}
                        </p>
                      </div>
                    </label>
                    <label className="cursor-pointer">
                      <input
                        type="radio"
                        value="PRIVATE"
                        checked={combinedType2 === 'PRIVATE'}
                        onChange={() => setCombinedType2('PRIVATE')}
                        className="peer sr-only"
                        disabled={isLoading}
                      />
                      <div className="p-3 border-2 border-gray-200 rounded-lg peer-checked:border-blue-500 peer-checked:bg-blue-50 transition text-center">
                        <div className="font-medium text-gray-900 text-sm">Privat</div>
                        <p className="text-xs text-gray-600 mt-1">
                          Kap. {selectedSubject2?.maxCapacityPrivate || 1}
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Capacity info for combined sessions */}
            {sessionMode === 'COMBINED' && selectedSubject && selectedSubject2 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <strong>Kapasitas Gabungan (MIN):</strong>{' '}
                  {combinedMinCapacity} siswa
                  <br />
                  <span className="text-xs text-blue-700">
                    ({selectedSubject.name}: {getCapacityForType(selectedSubject, selectedType)}, {selectedSubject2.name}: {getCapacityForType(selectedSubject2, combinedType2)})
                  </span>
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Guru <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <GraduationCap className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
                <select
                  {...register('teacherId')}
                  className={`w-full pl-9 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.teacherId ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={isLoading}
                >
                  <option value="">-- Pilih guru --</option>
                  {teachers.map((t: any) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              {errors.teacherId && <p className="text-red-500 text-xs mt-1">{errors.teacherId.message}</p>}
            </div>
          </div>
        </div>

        {/* Jadwal */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              Jadwal Sesi
            </h2>

            {/* Session Count & Duration (inline) */}
            <div className={`grid ${sessionMode === 'COMBINED' ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'} gap-4 mb-6`}>
              {sessionMode === 'MULTI' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Berapa kali per minggu? <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={sessionCount}
                      onChange={(e) => handleSessionCountChange(parseInt(e.target.value) || 1)}
                      className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={isLoading}
                    />
                    <span className="text-sm text-gray-600">sesi</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">1-10 sesi</p>
                </div>
              )}

              <div className={sessionMode === 'COMBINED' ? '' : ''}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Durasi {sessionMode === 'COMBINED' ? 'Sesi' : 'Semua Sesi'} <span className="text-red-500">*</span>
                </label>
                <select
                  {...register('durationMinutes')}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.durationMinutes ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={isLoading}
                >
                  {DURATION_OPTIONS.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
                {errors.durationMinutes && (
                  <p className="text-red-500 text-xs mt-1">{errors.durationMinutes.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Dynamic Session Slots - Show based on mode */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900">Detail Jadwal</h3>
            {(sessionMode === 'COMBINED' ? sessions.slice(0, 1) : sessions).map((session, idx) => (
              <div
                key={`session-${idx}`}
                className={`border rounded-lg p-4 ${
                  sessionConflicts.has(idx) ? 'border-red-300 bg-red-50' : 'border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-900">
                    {sessionMode === 'COMBINED' ? 'Jadwal Sesi Gabungan' : sessionMode === 'SINGLE' ? 'Jadwal Sesi' : `Sesi ${idx + 1}`}
                  </h4>
                  {sessionConflicts.has(idx) && (
                    <div className="flex items-center gap-1 text-red-600 text-xs font-medium">
                      <AlertCircle className="w-4 h-4" />
                      Duplikat
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Hari</label>
                    <select
                      value={session.dayOfWeek}
                      onChange={(e) => updateSessionSlot(idx, 'dayOfWeek', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      disabled={isLoading}
                    >
                      {DAY_OPTIONS.map((d) => (
                        <option key={d.value} value={d.value}>
                          {d.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Jam Mulai</label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
                      <input
                        type="time"
                        value={session.startTime}
                        onChange={(e) => updateSessionSlot(idx, 'startTime', e.target.value)}
                        className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Note */}
          <div className="bg-blue-50 border-l-4 border-blue-500 rounded p-3 text-sm text-blue-800">
            {sessionMode === 'COMBINED'
              ? '💡 Sesi gabungan: 1 guru mengajar 2 mata pelajaran dalam waktu yang sama.'
              : sessionMode === 'MULTI'
              ? '💡 Durasi sama untuk semua sesi. Setiap sesi berbeda hari dan/atau jam.'
              : '💡 Sesi tunggal: 1 guru, 1 mata pelajaran, 1 waktu slot.'}
          </div>
        </div>

        {/* Student Assignment */}
        {sessionMode === 'COMBINED' && selectedSubjectId && selectedBranchId && combinedSubject2Id ? (
          // Combined session: 2 subject assignment sections
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 space-y-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-blue-600" />
              Pilih Siswa Per Mata Pelajaran
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border rounded-lg p-4 space-y-3">
                <h4 className="font-medium text-gray-900">{selectedSubject?.name}</h4>
                <StudentAssignmentSection
                  sessionId="combined-subject-1"
                  branchId={selectedBranchId}
                  subjectId={selectedSubjectId}
                  sessionType={selectedType || 'REGULAR'}
                  currentStudents={[]}
                  onStudentsChange={setCombinedSubject1Students}
                  isEditing={true}
                  isLoading={isLoading}
                />
                <p className="text-xs text-gray-600">
                  Dipilih: {combinedSubject1Students.length} siswa (maks. {combinedMinCapacity})
                </p>
              </div>

              <div className="border rounded-lg p-4 space-y-3">
                <h4 className="font-medium text-gray-900">{selectedSubject2?.name}</h4>
                <StudentAssignmentSection
                  sessionId="combined-subject-2"
                  branchId={selectedBranchId}
                  subjectId={combinedSubject2Id}
                  sessionType={combinedType2 || 'REGULAR'}
                  currentStudents={[]}
                  onStudentsChange={setCombinedSubject2Students}
                  isEditing={true}
                  isLoading={isLoading}
                />
                <p className="text-xs text-gray-600">
                  Dipilih: {combinedSubject2Students.length} siswa (maks. {combinedMinCapacity})
                </p>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-sm text-amber-800">
                <strong>💡 Catatan:</strong> Kapasitas gabungan adalah MIN dari kedua mata pelajaran.
                Setiap siswa akan didaftar ke mata pelajaran mereka masing-masing.
              </p>
            </div>
          </div>
        ) : sessionMode !== 'COMBINED' && selectedSubjectId && selectedBranchId ? (
          // Single/Multi session: standard assignment with mode toggle
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-blue-600" />
                Pilih Siswa
              </h2>

              {sessionMode === 'MULTI' && (
                <div className="space-y-3 mb-6">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      checked={sameStudentForAll}
                      onChange={() => setSameStudentForAll(true)}
                      disabled={isLoading}
                      className="w-4 h-4"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Siswa yang sama untuk semua sesi
                    </span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      checked={!sameStudentForAll}
                      onChange={() => setSameStudentForAll(false)}
                      disabled={isLoading}
                      className="w-4 h-4"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Berbeda per sesi
                    </span>
                  </label>
                </div>
              )}

              {/* Single Student Assignment (same for all) */}
              {sameStudentForAll || sessionMode === 'SINGLE' ? (
                <StudentAssignmentSection
                  sessionId="common-all"
                  branchId={selectedBranchId}
                  subjectId={selectedSubjectId}
                  sessionType={selectedType || 'REGULAR'}
                  currentStudents={[]}
                  onStudentsChange={setCommonStudentIds}
                  isEditing={true}
                  isLoading={isLoading}
                />
              ) : (
                /* Per-session Student Assignment */
                <div className="space-y-6">
                  {sessions.map((session, idx) => (
                    <div key={`student-section-${idx}`} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-medium text-gray-900">
                          Sesi {idx + 1}: {DAY_OPTIONS.find((d) => d.value === session.dayOfWeek)?.label}{' '}
                          {session.startTime}
                        </h4>
                        {idx > 0 && (
                          <button
                            type="button"
                            onClick={() => copyFromPrevious(idx)}
                            disabled={isLoading}
                            className="flex items-center gap-1 px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition disabled:opacity-50"
                          >
                            <Copy className="w-4 h-4" />
                            Salin dari sesi {idx}
                          </button>
                        )}
                      </div>
                      <StudentAssignmentSection
                        sessionId={`temp-slot-${idx}`}
                        branchId={selectedBranchId}
                        subjectId={selectedSubjectId}
                        sessionType={selectedType || 'REGULAR'}
                        currentStudents={[]}
                        onStudentsChange={(newIds) => handleSessionStudentsChange(idx, newIds)}
                        isEditing={true}
                        isLoading={isLoading}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Menyimpan...' : sessionMode === 'COMBINED' ? 'Simpan Sesi Gabungan' : `Simpan ${sessionCount > 1 ? `${sessionCount} Sesi` : 'Sesi'}`}
          </button>
          <Link
            href="/jadwal-sesi"
            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 rounded-lg transition text-center"
          >
            Batal
          </Link>
        </div>
      </form>

      <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>💡 Catatan:</strong> Sesi adalah jadwal mingguan yang berulang.
          {sessionMode === 'COMBINED'
            ? ' Sesi gabungan memungkinkan 1 guru mengajar 2 mata pelajaran sekaligus dengan kapasitas menggunakan nilai minimum.'
            : ' Sistem akan mengecek apakah guru sudah memiliki sesi lain di waktu yang sama untuk menghindari konflik jadwal.'}
        </p>
      </div>
    </div>
  )
}
