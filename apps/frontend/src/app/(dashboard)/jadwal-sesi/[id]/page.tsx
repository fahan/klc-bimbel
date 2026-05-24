'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { sessionApi, branchApi, subjectApi, teacherApi } from '@/lib/api/endpoints'
import { ArrowLeft, Calendar, Clock, MapPin, BookOpen, GraduationCap, Trash2, Users } from 'lucide-react'
import { LoadingState } from '@/components/ui/States'
import { StudentAssignmentSection } from '@/components/sessions/StudentAssignmentSection'

const sessionSchema = z.object({
  branchId: z.string().min(1),
  subjectId: z.string().min(1),
  teacherId: z.string().min(1),
  type: z.enum(['REGULAR', 'PRIVATE']),
  dayOfWeek: z.enum(['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU', 'MINGGU']),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  durationMinutes: z.coerce.number().int().min(30).max(240),
  studentIds: z.array(z.string()).optional().default([]),
})

type SessionFormData = z.infer<typeof sessionSchema>

const DAY_OPTIONS = [
  { value: 'SENIN', label: 'Senin' },
  { value: 'SELASA', label: 'Selasa' },
  { value: 'RABU', label: 'Rabu' },
  { value: 'KAMIS', label: 'Kamis' },
  { value: 'JUMAT', label: 'Jumat' },
  { value: 'SABTU', label: 'Sabtu' },
  { value: 'MINGGU', label: 'Minggu' },
]

export default function SessionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params?.id as string
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteMode, setDeleteMode] = useState<'soft' | 'hard' | null>(null)

  const { data: sessionData, isLoading: loadingSession, refetch } = useQuery({
    queryKey: ['session', sessionId],
    queryFn: () => sessionApi.getOne(sessionId),
    enabled: !!sessionId,
  })

  const { data: branchesData } = useQuery({ queryKey: ['branches'], queryFn: () => branchApi.getAll() })
  const { data: subjectsData } = useQuery({ queryKey: ['subjects'], queryFn: () => subjectApi.getAll() })
  const { data: teachersData } = useQuery({ queryKey: ['teachers'], queryFn: () => teacherApi.getAll() })

  const session = sessionData?.data?.data
  const branches = branchesData?.data?.data || []
  const subjects = subjectsData?.data?.data || []
  const teachers = teachersData?.data?.data || []

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<SessionFormData>({
    resolver: zodResolver(sessionSchema),
  })

  const selectedSubjectId = watch('subjectId')
  const selectedType = watch('type')

  useEffect(() => {
    if (session) {
      const startTimeValue = session.startTime ? session.startTime.substring(0, 5) : '08:00'
      reset({
        branchId: session.branchId || '',
        subjectId: session.subjectId || '',
        teacherId: session.teacherId || '',
        type: session.type || 'REGULAR',
        dayOfWeek: session.dayOfWeek || 'SENIN',
        startTime: startTimeValue,
        durationMinutes: session.durationMinutes || 30,
        studentIds: [],
      })
      setSelectedStudentIds(session.students?.map((s: any) => s.studentId) || [])
    }
  }, [session, reset])

  // Update page title when session data loads
  useEffect(() => {
    if (session && subjects.length > 0) {
      const subject = subjects.find(s => s.id === session.subjectId)
      const title = subject ? `${subject.name}` : 'Jadwal Sesi'
      document.title = `${title} - Detail Jadwal Sesi`
    }
  }, [session, subjects])

  const onSubmit = async (data: SessionFormData) => {
    try {
      setIsLoading(true)
      setError('')

      // Validate required fields
      if (!data.branchId || !data.subjectId || !data.teacherId || !data.dayOfWeek || !data.startTime) {
        setError('Semua field harus diisi')
        setIsLoading(false)
        return
      }

      // Use updateWithStudents endpoint to handle both session details and student assignment
      const submitData = {
        branchId: data.branchId,
        subjectId: data.subjectId,
        teacherId: data.teacherId,
        type: data.type,
        dayOfWeek: data.dayOfWeek,
        startTime: data.startTime,
        durationMinutes: Number(data.durationMinutes),
        studentIds: selectedStudentIds, // Include selected students
      }

      await sessionApi.updateWithStudents(sessionId, submitData)
      setSuccess('Sesi berhasil diperbarui')
      setIsEditing(false)

      // Redirect to list with refresh parameter after 1.5 seconds
      setTimeout(() => {
        router.push('/jadwal-sesi?updated=true')
      }, 1500)
    } catch (err: any) {
      console.error('Submit error:', err)
      setError(err.response?.data?.message || 'Gagal memperbarui sesi')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (mode: 'soft' | 'hard') => {
    if (!session) return

    setIsLoading(true)
    try {
      if (mode === 'soft') {
        // Soft delete (archive): move to inactive sessions
        await sessionApi.delete(sessionId)
        setSuccess('Sesi berhasil diarsipkan. Data riwayat kehadiran tetap terjaga.')
      } else {
        // Hard delete (permanent): only for sessions without attendance
        await sessionApi.hardDelete(sessionId)
        setSuccess('Sesi berhasil dihapus sepenuhnya dari sistem.')
      }

      setTimeout(() => {
        router.push('/jadwal-sesi')
      }, 1500)
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || `Gagal ${mode === 'soft' ? 'arsipkan' : 'hapus'} sesi`
      setError(errorMsg)
      setShowDeleteModal(false)
      setDeleteMode(null)
    } finally {
      setIsLoading(false)
    }
  }

  if (loadingSession) return <LoadingState />

  if (!session) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Sesi tidak ditemukan</p>
        <Link href="/jadwal-sesi" className="text-blue-600 hover:underline mt-2 inline-block">
          ← Kembali
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/jadwal-sesi"
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
        >
          <ArrowLeft className="w-5 h-5" />
          Kembali
        </Link>
        <div className="flex gap-2">
          {!isEditing ? (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium"
              >
                Ubah Jadwal
              </button>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg transition font-medium flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Hapus
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                setIsEditing(false)
                setError('')
              }}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition font-medium"
            >
              Batal
            </button>
          )}
        </div>
      </div>

      <div>
        <h1 className="text-3xl font-bold text-gray-900">{session.subjectName}</h1>
        <p className="text-gray-600 mt-1">
          {session.dayOfWeek} · {session.startTime?.substring(0, 5)} · {session.teacherName}
        </p>
      </div>

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">{success}</div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Siswa Terdaftar</p>
              <p className="text-2xl font-bold text-gray-900">
                {session.capacity?.current}/{session.capacity?.max}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <Clock className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Durasi</p>
              <p className="text-2xl font-bold text-gray-900">{session.durationMinutes} mnt</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-lg">
              <BookOpen className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Tipe</p>
              <p className="text-2xl font-bold text-gray-900">
                {session.type === 'REGULAR' ? 'Reguler' : 'Privat'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <form
        onSubmit={(e) => {
          console.log('Form onSubmit event triggered')
          handleSubmit(onSubmit)(e)
        }}
        className="space-y-6"
      >
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Detail Sesi</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cabang</label>
              <select
                {...register('branchId')}
                disabled={!isEditing || isLoading}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  !isEditing ? 'bg-gray-50 cursor-not-allowed' : errors.branchId ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                {branches.map((b: any) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              {errors.branchId?.message && <p className="text-red-500 text-xs mt-1">{errors.branchId.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mata Pelajaran</label>
              <select
                {...register('subjectId')}
                disabled={!isEditing || isLoading}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  !isEditing ? 'bg-gray-50 cursor-not-allowed' : errors.subjectId ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                {subjects.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              {errors.subjectId?.message && <p className="text-red-500 text-xs mt-1">{errors.subjectId.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Guru</label>
              <select
                {...register('teacherId')}
                disabled={!isEditing || isLoading}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  !isEditing ? 'bg-gray-50 cursor-not-allowed' : errors.teacherId ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                {teachers.map((t: any) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              {errors.teacherId?.message && <p className="text-red-500 text-xs mt-1">{errors.teacherId.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipe</label>
              <select
                {...register('type')}
                disabled={!isEditing || isLoading}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  !isEditing ? 'bg-gray-50 cursor-not-allowed' : 'border-gray-300'
                }`}
              >
                <option value="REGULAR">Reguler</option>
                <option value="PRIVATE">Privat</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hari</label>
              <select
                {...register('dayOfWeek')}
                disabled={!isEditing || isLoading}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  !isEditing ? 'bg-gray-50 cursor-not-allowed' : errors.dayOfWeek ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                {DAY_OPTIONS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
              {errors.dayOfWeek?.message && <p className="text-red-500 text-xs mt-1">{errors.dayOfWeek.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Jam Mulai</label>
                <input
                  type="time"
                  {...register('startTime')}
                  disabled={!isEditing || isLoading}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    !isEditing ? 'bg-gray-50 cursor-not-allowed' : errors.startTime ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.startTime?.message && <p className="text-red-500 text-xs mt-1">{errors.startTime.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Durasi (mnt)</label>
                <input
                  type="number"
                  {...register('durationMinutes')}
                  disabled={!isEditing || isLoading}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    !isEditing ? 'bg-gray-50 cursor-not-allowed' : errors.durationMinutes ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.durationMinutes?.message && <p className="text-red-500 text-xs mt-1">{errors.durationMinutes.message}</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Student Assignment Section */}
        <StudentAssignmentSection
          sessionId={sessionId}
          branchId={session.branchId}
          subjectId={selectedSubjectId || session.subjectId}
          sessionType={selectedType || session.type}
          currentStudents={session.students || []}
          onStudentsChange={setSelectedStudentIds}
          isEditing={isEditing}
          isLoading={isLoading}
        />

        {isEditing && (
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={isLoading}
              onClick={() => {
                console.log('Button clicked - isLoading:', isLoading)
              }}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50"
            >
              {isLoading ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        )}
        {!isEditing && (
          <div className="text-xs text-gray-500 p-2 bg-gray-50 rounded">
            Debug: isEditing = {isEditing.toString()}, isLoading = {isLoading.toString()}
          </div>
        )}
      </form>

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Hapus Jadwal Sesi</h2>
              <p className="text-sm text-gray-600 mt-1">
                {session.subjectName} oleh {session.teacherName} - {session.dayOfWeek} {session.startTime}
              </p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
              <p className="text-sm text-yellow-800 font-medium mb-3">Pilih opsi penghapusan:</p>

              <div className="space-y-3">
                {/* Soft Delete Option */}
                <button
                  onClick={() => {
                    setDeleteMode('soft')
                    handleDelete('soft')
                  }}
                  disabled={isLoading}
                  className="w-full text-left p-3 border-2 border-orange-300 hover:border-orange-500 hover:bg-orange-50 rounded transition disabled:opacity-50"
                >
                  <div className="font-semibold text-gray-900">📦 Arsipkan Sesi</div>
                  <p className="text-xs text-gray-600 mt-1">
                    Sesi dipindahkan ke arsip. Semua riwayat kehadiran dan komisi guru tetap tersimpan.
                    Bisa dibuat ulang dengan jadwal yang sama.
                  </p>
                </button>

                {/* Hard Delete Option */}
                <button
                  onClick={() => {
                    setDeleteMode('hard')
                    handleDelete('hard')
                  }}
                  disabled={isLoading}
                  className="w-full text-left p-3 border-2 border-red-300 hover:border-red-500 hover:bg-red-50 rounded transition disabled:opacity-50"
                >
                  <div className="font-semibold text-red-900">🗑️ Hapus Selamanya</div>
                  <p className="text-xs text-red-700 mt-1">
                    Sesi dihapus permanent dari sistem. TIDAK bisa dipulihkan. Hanya untuk sesi tanpa
                    riwayat kehadiran.
                  </p>
                </button>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded p-3">
              <p className="text-xs text-blue-800">
                💡 <strong>Rekomendasi:</strong> Gunakan "Arsipkan Sesi" jika sudah ada riwayat kehadiran.
                Gunakan "Hapus Selamanya" hanya untuk sesi yang belum digunakan.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setDeleteMode(null)
                  setError('')
                }}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition font-medium disabled:opacity-50"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
