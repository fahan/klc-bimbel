'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { sessionApi, attendanceApi } from '@/lib/api/endpoints'
import { ArrowLeft, Clock, Users, AlertTriangle, Check, X } from 'lucide-react'
import { teacherApi } from '@/lib/api/endpoints'

type AttendanceStatus = 'HADIR' | 'ABSEN' | 'IZIN' | 'SAKIT'

export default function PresensiDetailPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const sessionId = params?.sessionId as string
  const substituteFor = searchParams?.get('substituteFor')

  const [attendances, setAttendances] = useState<{ [studentId: string]: AttendanceStatus }>({})
  const [notes, setNotes] = useState('')
  const [substitutionReason, setSubstitutionReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [currentUserId, setCurrentUserId] = useState('')

  const { data: sessionData, isLoading } = useQuery({
    queryKey: ['session', sessionId],
    queryFn: () => sessionApi.getOne(sessionId),
    enabled: !!sessionId,
  })

  const session = sessionData?.data?.data
  const today = new Date().toISOString().split('T')[0]

  // Get existing attendance if any
  const { data: existingLogData } = useQuery({
    queryKey: ['session-log', sessionId, today],
    queryFn: () => attendanceApi.getSessionLog(sessionId, today),
    enabled: !!sessionId,
  })

  const { data: scheduledTeacherData } = useQuery({
    queryKey: ['teacher', substituteFor],
    queryFn: () => teacherApi.getOne(substituteFor as string),
    enabled: !!substituteFor,
  })

  const existingLog = existingLogData?.data?.data
  const scheduledTeacher = scheduledTeacherData?.data?.data

  useEffect(() => {
    const userId = localStorage.getItem('userId') || ''
    setCurrentUserId(userId)
  }, [])

  // Pre-fill from existing if present
  useEffect(() => {
    if (existingLog?.attendances) {
      const map: { [k: string]: AttendanceStatus } = {}
      existingLog.attendances.forEach((a: any) => {
        map[a.studentId] = a.status
      })
      setAttendances(map)
    }
  }, [existingLog])

  if (isLoading) {
    return (
      <div className="px-4 py-4">
        <p className="text-center text-gray-500">Memuat sesi...</p>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="px-4 py-4 text-center">
        <p className="text-gray-500">Sesi tidak ditemukan</p>
        <Link href="/guru/presensi" className="text-blue-600 mt-2 inline-block">
          ← Kembali
        </Link>
      </div>
    )
  }

  const isReplacementTeacher = session.teacherId !== currentUserId

  const setStatus = (studentId: string, status: AttendanceStatus) => {
    setAttendances((prev) => ({ ...prev, [studentId]: status }))
  }

  const handleSubmit = async () => {
    // If attendance already recorded, skip submit and go directly to progress
    if (existingLog?.id) {
      router.push(`/guru/presensi/${sessionId}/progress?sessionLogId=${existingLog.id}`)
      return
    }

    if (Object.keys(attendances).length === 0) {
      setError('Pilih status presensi untuk minimal satu siswa')
      return
    }

    if (Object.keys(attendances).length < (session.students?.length || 0)) {
      if (!confirm('Belum semua siswa diberi status presensi. Lanjutkan?')) {
        return
      }
    }

    try {
      setIsSubmitting(true)
      setError('')

      const attendancePayload = Object.entries(attendances).map(([studentId, status]) => ({
        studentId,
        status,
      }))

      const result = await attendanceApi.submit({
        sessionId,
        sessionDate: today,
        attendances: attendancePayload,
        notes: notes || undefined,
        substitutionReason: substituteFor && substitutionReason ? substitutionReason : undefined,
      })

      const sessionLogId = result.data.data.id
      const sessionLogData = result.data.data

      // Cache the session log data for progress page (match axios response shape)
      queryClient.setQueryData(['session-log', sessionId, today], {
        data: { success: true, data: sessionLogData },
      })

      // Invalidate today sessions cache so list updates with new attendance status
      await queryClient.invalidateQueries({ queryKey: ['guru-today-sessions'] })

      // Continue to progress input
      router.push(`/guru/presensi/${sessionId}/progress?sessionLogId=${sessionLogId}`)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal submit presensi')
    } finally {
      setIsSubmitting(false)
    }
  }

  const allMarked =
    session.students?.length > 0 &&
    Object.keys(attendances).length === session.students.length

  return (
    <div className="px-4 py-4 space-y-4 pb-24">
      {/* Header */}
      <Link
        href="/guru/presensi"
        className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
      >
        <ArrowLeft className="w-4 h-4" />
        Kembali
      </Link>

      <div>
        <h1 className="text-xl font-bold text-gray-900">{session.subjectName}</h1>
        <p className="text-sm text-gray-600 mt-1">
          {session.dayOfWeek} · {session.startTime?.substring(0, 5)} ({session.durationMinutes}m)
        </p>
        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            {session.capacity?.current} siswa
          </span>
          <span>· {session.branchName}</span>
        </div>
      </div>

      {/* Progress Stepper */}
      <div className="flex items-center justify-center gap-2 py-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
            1
          </div>
          <span className="text-xs font-medium text-blue-600">Presensi</span>
        </div>
        <div className="w-8 h-px bg-gray-300"></div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center font-bold text-sm">
            2
          </div>
          <span className="text-xs text-gray-500">Progress</span>
        </div>
        <div className="w-8 h-px bg-gray-300"></div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center font-bold text-sm">
            3
          </div>
          <span className="text-xs text-gray-500">Selesai</span>
        </div>
      </div>

      {/* Substitution Banner */}
      {substituteFor && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 flex gap-2">
          <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0" />
          <div className="text-xs text-orange-800">
            <strong>⚠️ Anda menggantikan presensi guru lain.</strong> Guru terjadwal: <strong>{scheduledTeacher?.name || 'Memuat...'}</strong>. Komisi akan tercatat atas nama Anda.
          </div>
        </div>
      )}

      {/* Replacement Teacher Banner (non-manual substitution) */}
      {isReplacementTeacher && !substituteFor && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <div className="text-xs text-amber-800">
            <strong>Anda bukan guru tetap sesi ini.</strong> Komisi sesi ini akan tercatat atas nama Anda
            sebagai guru pengganti.
          </div>
        </div>
      )}

      {/* Existing Log Notice */}
      {existingLog && existingLog.status === 'COMPLETED' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs text-blue-800">
            <strong>ℹ️ Presensi untuk sesi ini sudah tercatat.</strong> Edit di bawah jika perlu.
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Students List */}
      <div className="space-y-2">
        <h2 className="font-semibold text-gray-900 text-sm">Daftar Siswa</h2>
        {session.students?.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-6 text-center">
            <p className="text-sm text-gray-500">Belum ada siswa di sesi ini</p>
          </div>
        ) : (
          session.students?.map((s: any) => {
            const status = attendances[s.studentId]
            return (
              <div
                key={s.id}
                className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                    {(s.studentName || s.fullName)
                      ?.split(' ')
                      .map((n: string) => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{s.studentName}</p>
                    {s.fullName && s.fullName !== s.studentName && (
                      <p className="text-xs text-gray-400 truncate">{s.fullName}</p>
                    )}
                  </div>
                </div>

                {/* Toggle Buttons */}
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <button
                    onClick={() => setStatus(s.studentId, 'HADIR')}
                    className={`py-2 rounded-lg text-sm font-medium transition flex items-center justify-center gap-1 ${
                      status === 'HADIR'
                        ? 'bg-green-600 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Check className="w-4 h-4" />
                    Hadir
                  </button>
                  <button
                    onClick={() => setStatus(s.studentId, 'ABSEN')}
                    className={`py-2 rounded-lg text-sm font-medium transition flex items-center justify-center gap-1 ${
                      status === 'ABSEN'
                        ? 'bg-red-600 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <X className="w-4 h-4" />
                    Absen
                  </button>
                </div>

                {/* Additional Status Options */}
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <button
                    onClick={() => setStatus(s.studentId, 'IZIN')}
                    className={`py-1.5 rounded-lg text-xs font-medium transition ${
                      status === 'IZIN'
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    Izin
                  </button>
                  <button
                    onClick={() => setStatus(s.studentId, 'SAKIT')}
                    className={`py-1.5 rounded-lg text-xs font-medium transition ${
                      status === 'SAKIT'
                        ? 'bg-purple-100 text-purple-800 border border-purple-300'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    Sakit
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Notes */}
      <div className="bg-white border border-gray-200 rounded-lg p-3">
        <label className="text-sm font-medium text-gray-700 mb-2 block">Catatan (opsional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Topik yang diajarkan hari ini..."
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
        />
      </div>

      {/* Substitution Reason */}
      {substituteFor && (
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <label className="text-sm font-medium text-gray-700 mb-2 block">Alasan Penggantian (opsional)</label>
          <textarea
            value={substitutionReason}
            onChange={(e) => setSubstitutionReason(e.target.value)}
            placeholder="Misal: Guru terjadwal sakit / acara mendadak..."
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
          />
        </div>
      )}

      {/* Submit Button - Fixed at bottom */}
      <div className="fixed bottom-16 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-200 p-3 z-40">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || (session.students?.length || 0) === 0}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          {isSubmitting ? 'Menyimpan...' : 'Submit Presensi & Lanjut'}
        </button>
        {!allMarked && (session.students?.length || 0) > 0 && (
          <p className="text-xs text-gray-500 text-center mt-1">
            {Object.keys(attendances).length}/{session.students.length} siswa sudah ditandai
          </p>
        )}
      </div>
    </div>
  )
}
