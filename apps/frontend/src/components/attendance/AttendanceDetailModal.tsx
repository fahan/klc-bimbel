'use client'

import React, { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { attendanceApi } from '@/lib/api/endpoints'
import {
  X,
  Check,
  AlertTriangle,
  Clock,
  MapPin,
  User,
  Loader,
} from 'lucide-react'
import {
  AttendanceStatusBadge,
  SessionAttendanceStatusBadge,
} from './AttendanceStatusBadge'

type AttendanceStatus = 'HADIR' | 'ABSEN' | 'IZIN' | 'SAKIT'
type SessionStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED'

interface AttendanceDetailModalProps {
  isOpen: boolean
  onClose: () => void
  sessionId: string
  sessionDate: string
  session?: {
    id: string
    subjectName: string
    teacherName: string
    branchName: string
    startTime: string
    dayOfWeek: string
    durationMinutes: number
    students: Array<{
      id: string
      studentId: string
      studentName: string
    }>
  }
  sessionLog?: {
    id: string
    status: SessionStatus
    actualTeacherName?: string
    isReplacement?: boolean
    attendances: Array<{
      studentId: string
      studentName: string
      status: AttendanceStatus
      recordedAt: string
    }>
  }
  onSubmitSuccess?: () => void
}

export function AttendanceDetailModal({
  isOpen,
  onClose,
  sessionId,
  sessionDate,
  session,
  sessionLog,
  onSubmitSuccess,
}: AttendanceDetailModalProps) {
  const [attendances, setAttendances] = useState<{
    [studentId: string]: AttendanceStatus
  }>({})
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [isEditing, setIsEditing] = useState(false)

  // Fetch session attendance data
  const { data: sessionLogData, isLoading } = useQuery({
    queryKey: ['attendance', sessionId, sessionDate],
    queryFn: () => attendanceApi.getSessionLog(sessionId, sessionDate),
    enabled: isOpen && !!sessionId && !!sessionDate,
  })

  const currentLog = sessionLogData?.data?.data || sessionLog
  const students = session?.students || []

  // Pre-fill attendance from existing log
  useEffect(() => {
    if (currentLog?.attendances) {
      const map: { [k: string]: AttendanceStatus } = {}
      currentLog.attendances.forEach((a: any) => {
        map[a.studentId] = a.status
      })
      setAttendances(map)
    }
  }, [currentLog])

  const handleSetStatus = (studentId: string, status: AttendanceStatus) => {
    setAttendances((prev) => ({ ...prev, [studentId]: status }))
  }

  const handleSubmit = async () => {
    if (Object.keys(attendances).length === 0) {
      setError('Pilih status presensi untuk minimal satu siswa')
      return
    }

    if (Object.keys(attendances).length < students.length) {
      if (
        !confirm('Belum semua siswa diberi status presensi. Lanjutkan?')
      ) {
        return
      }
    }

    try {
      setIsSubmitting(true)
      setError('')

      const attendancePayload = Object.entries(attendances).map(
        ([studentId, status]) => ({
          studentId,
          status,
        })
      )

      await attendanceApi.submit({
        sessionId,
        sessionDate,
        attendances: attendancePayload,
        notes: notes || undefined,
      })

      setIsEditing(false)
      setError('')
      onSubmitSuccess?.()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal submit presensi')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  const isReplacement = currentLog?.isReplacement

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-blue-600 text-white px-6 py-4 flex items-center justify-between border-b">
          <div className="flex-1">
            <h2 className="text-lg font-bold">{session?.subjectName}</h2>
            <div className="flex items-center gap-2 mt-1 text-sm text-blue-100">
              <Clock className="w-4 h-4" />
              <span>
                {session?.startTime?.substring(0, 5)} ({session?.durationMinutes}m)
              </span>
              <span>·</span>
              <MapPin className="w-4 h-4" />
              <span>{session?.branchName}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-blue-700 rounded-lg transition"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Session Info */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="text-xs text-gray-600 font-medium">Guru Tetap</p>
              <p className="text-sm font-semibold text-gray-900">
                {session?.teacherName}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 font-medium">Tanggal</p>
              <p className="text-sm font-semibold text-gray-900">
                {new Date(sessionDate).toLocaleDateString('id-ID')}
              </p>
            </div>
            {isReplacement && currentLog?.actualTeacherName && (
              <div className="col-span-2">
                <p className="text-xs text-gray-600 font-medium">Guru Mengajar</p>
                <p className="text-sm font-semibold text-amber-700">
                  {currentLog.actualTeacherName} (Pengganti)
                </p>
              </div>
            )}
            <div className="col-span-2">
              <p className="text-xs text-gray-600 font-medium">Status Presensi</p>
              <div className="mt-1">
                <SessionAttendanceStatusBadge
                  status={currentLog?.status || 'SCHEDULED'}
                />
              </div>
            </div>
          </div>

          {/* Replacement Teacher Warning */}
          {isReplacement && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <div className="text-xs text-amber-800">
                <strong>Guru Pengganti:</strong> Presensi ini dicatat atas nama
                guru pengganti.
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader className="w-6 h-6 text-gray-400 animate-spin" />
            </div>
          )}

          {!isLoading && (
            <>
              {/* Students List */}
              {students.length === 0 ? (
                <div className="bg-gray-50 rounded-lg p-8 text-center">
                  <User className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">
                    Belum ada siswa di sesi ini
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900">Daftar Siswa</h3>
                  {students.map((student: any) => {
                    const status = attendances[student.studentId]
                    return (
                      <div
                        key={student.id}
                        className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                            {student.studentName
                              ?.split(' ')
                              .map((n: string) => n[0])
                              .join('')
                              .slice(0, 2)
                              .toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">
                              {student.studentName}
                            </p>
                          </div>
                          {status && (
                            <AttendanceStatusBadge
                              status={status}
                              size="sm"
                            />
                          )}
                        </div>

                        {/* Status Buttons */}
                        {(isEditing ||
                          currentLog?.status !== 'COMPLETED') && (
                          <div className="grid grid-cols-4 gap-2">
                            {(
                              [
                                'HADIR',
                                'ABSEN',
                                'IZIN',
                                'SAKIT',
                              ] as AttendanceStatus[]
                            ).map((s) => (
                              <button
                                key={s}
                                onClick={() =>
                                  handleSetStatus(student.studentId, s)
                                }
                                className={`py-2 px-3 rounded-lg text-xs font-medium transition ${
                                  status === s
                                    ? s === 'HADIR'
                                      ? 'bg-green-100 text-green-700 border border-green-300'
                                      : s === 'ABSEN'
                                      ? 'bg-red-100 text-red-700 border border-red-300'
                                      : s === 'IZIN'
                                      ? 'bg-amber-100 text-amber-700 border border-amber-300'
                                      : 'bg-blue-100 text-blue-700 border border-blue-300'
                                    : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200'
                                }`}
                              >
                                {s === 'HADIR'
                                  ? 'Hadir'
                                  : s === 'ABSEN'
                                  ? 'Absen'
                                  : s === 'IZIN'
                                  ? 'Izin'
                                  : 'Sakit'}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Notes Field */}
              {(isEditing ||
                currentLog?.status !== 'COMPLETED') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Catatan (Opsional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Catatan tambahan tentang presensi..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!isLoading && (
          <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t flex gap-3 justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition"
              disabled={isSubmitting}
            >
              Tutup
            </button>
            {(isEditing || currentLog?.status !== 'COMPLETED') && (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Simpan Presensi
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
