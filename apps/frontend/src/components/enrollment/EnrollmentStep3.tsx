'use client'

import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { studentApi } from '@/lib/api/endpoints'
import { AlertCircle } from 'lucide-react'

interface SelectedSubject {
  id: string
  name: string
  type: 'REGULAR' | 'PRIVATE'
  sppRateId: string
  sppAmount: number
}

interface SelectedSession {
  subjectId: string
  sessionId: string
}

interface EnrollmentStep3Props {
  studentData: any
  subjects: SelectedSubject[]
  selectedSessions: SelectedSession[]
  onComplete?: (sessions: SelectedSession[]) => void
}

interface Session {
  id: string
  day: string
  time: string
  duration: number
  teacher: string
  capacity: {
    current: number
    max: number
    available: number
    isFull: boolean
  }
}

export default function EnrollmentStep3({
  studentData,
  subjects,
  selectedSessions: initialSelectedSessions,
  onComplete,
}: EnrollmentStep3Props) {
  const [selectedSessions, setSelectedSessions] = useState<SelectedSession[]>(initialSelectedSessions)
  const [dayFilters, setDayFilters] = useState<{ [key: string]: string }>({})
  const [showAvailableOnly, setShowAvailableOnly] = useState<{ [key: string]: boolean }>({})

  const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu']

  // Fetch available sessions for each subject
  const sessionQueries = subjects.map(subject =>
    useQuery({
      queryKey: ['available-sessions', subject.id, studentData.branchId, subject.type],
      queryFn: () =>
        studentApi.getAvailableSessions(subject.id, studentData.branchId, subject.type),
      enabled: !!studentData.branchId,
    })
  )

  const handleSelectSession = (subjectId: string, sessionId: string) => {
    const existing = selectedSessions.find(s => s.subjectId === subjectId)
    if (existing && existing.sessionId === sessionId) {
      // Deselect
      setSelectedSessions(selectedSessions.filter(s => s.subjectId !== subjectId))
    } else {
      // Select or replace
      setSelectedSessions([
        ...selectedSessions.filter(s => s.subjectId !== subjectId),
        { subjectId, sessionId },
      ])
    }
  }

  const handleSubmit = () => {
    if (selectedSessions.length !== subjects.length) {
      alert('Pilih 1 slot jadwal untuk setiap mata pelajaran')
      return
    }
    if (onComplete) {
      onComplete(selectedSessions)
    }
  }

  return (
    <div className="space-y-6">
      {subjects.map((subject, index) => {
        const query = sessionQueries[index]
        const sessions = query.data?.data?.data || []
        const selectedSession = selectedSessions.find(s => s.subjectId === subject.id)
        const currentDayFilter = dayFilters[subject.id] || 'semua'
        const currentShowAvailable = showAvailableOnly[subject.id] || false

        let filteredSessions = sessions as Session[]
        if (currentDayFilter !== 'semua') {
          filteredSessions = filteredSessions.filter(s => s.day === currentDayFilter)
        }
        if (currentShowAvailable) {
          filteredSessions = filteredSessions.filter(s => !s.capacity.isFull)
        }

        return (
          <div key={subject.id} className="bg-white rounded-lg border border-gray-200 p-5">
            <h4 className="font-semibold text-gray-900 mb-2">{subject.name}</h4>
            <p className="text-xs text-gray-500 mb-4">
              Pilih 1 slot per mata pelajaran · 3 sesi/minggu
            </p>

            {/* Day Filter Pills */}
            <div className="mb-4 flex flex-wrap gap-2">
              {['semua', ...days].map(day => (
                <button
                  key={day}
                  onClick={() =>
                    setDayFilters({
                      ...dayFilters,
                      [subject.id]: day,
                    })
                  }
                  className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                    currentDayFilter === day
                      ? 'bg-blue-100 text-blue-700 border border-blue-300'
                      : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200'
                  }`}
                >
                  {day === 'semua' ? 'Semua hari' : day}
                </button>
              ))}
              <button
                onClick={() =>
                  setShowAvailableOnly({
                    ...showAvailableOnly,
                    [subject.id]: !currentShowAvailable,
                  })
                }
                className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                  currentShowAvailable
                    ? 'bg-green-100 text-green-700 border border-green-300'
                    : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200'
                }`}
              >
                Ada slot kosong
              </button>
            </div>

            {/* Sessions List */}
            <div className="space-y-2 mb-4">
              {query.isLoading ? (
                <p className="text-gray-500 text-sm">Memuat jadwal...</p>
              ) : filteredSessions.length === 0 ? (
                <p className="text-gray-500 text-sm">Tidak ada jadwal tersedia</p>
              ) : (
                filteredSessions.map(session => (
                  <button
                    key={session.id}
                    onClick={() => !session.capacity.isFull && handleSelectSession(subject.id, session.id)}
                    disabled={session.capacity.isFull}
                    className={`w-full p-3 rounded-lg border-2 transition text-left ${
                      selectedSession?.sessionId === session.id
                        ? 'border-blue-500 bg-blue-50'
                        : session.capacity.isFull
                          ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                          : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 text-sm">
                          {session.day} · {session.time} ({session.duration} min)
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          {session.teacher} · {session.capacity.current}/{session.capacity.max} siswa
                        </p>
                      </div>
                      <div className="ml-2">
                        <span
                          className={`text-xs font-medium px-2 py-1 rounded-full ${
                            session.capacity.isFull
                              ? 'bg-red-100 text-red-700'
                              : session.capacity.available > 0
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {session.capacity.isFull ? 'Penuh' : 'Ada slot'}
                        </span>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>

            {selectedSession && (
              <p className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
                ✓ Jadwal dipilih: {filteredSessions.find(s => s.id === selectedSession.sessionId)?.day}{' '}
                {filteredSessions.find(s => s.id === selectedSession.sessionId)?.time}
              </p>
            )}
          </div>
        )
      })}

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
      >
        Lanjut ke Konfirmasi →
      </button>
    </div>
  )
}
