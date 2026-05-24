'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { sessionApi } from '@/lib/api/endpoints'
import { Clock, MapPin, Users, Calendar } from 'lucide-react'

const DAYS = [
  { value: 'SENIN', label: 'Sen' },
  { value: 'SELASA', label: 'Sel' },
  { value: 'RABU', label: 'Rab' },
  { value: 'KAMIS', label: 'Kam' },
  { value: 'JUMAT', label: 'Jum' },
  { value: 'SABTU', label: 'Sab' },
  { value: 'MINGGU', label: 'Min' },
]

export default function JadwalGuruPage() {
  const [userId, setUserId] = useState('')
  const [selectedDay, setSelectedDay] = useState<string>('')

  useEffect(() => {
    const id = localStorage.getItem('userId') || ''
    setUserId(id)

    // Set today as default selected day
    const today = new Date()
    const dayIdx = today.getDay() === 0 ? 6 : today.getDay() - 1
    setSelectedDay(DAYS[dayIdx].value)
  }, [])

  const { data: sessionsData, isLoading } = useQuery({
    queryKey: ['guru-sessions', userId],
    queryFn: () => sessionApi.getAll(1, 100, { teacherId: userId }),
    enabled: !!userId,
  })

  const sessions = sessionsData?.data?.data || []

  // Group sessions by day
  const sessionsByDay = DAYS.reduce(
    (acc, day) => {
      acc[day.value] = sessions
        .filter((s: any) => s.dayOfWeek === day.value)
        .sort((a: any, b: any) => a.startTime.localeCompare(b.startTime))
      return acc
    },
    {} as { [k: string]: any[] },
  )

  const today = new Date()
  const todayIdx = today.getDay() === 0 ? 6 : today.getDay() - 1
  const todayValue = DAYS[todayIdx].value

  const filteredSessions = selectedDay ? sessionsByDay[selectedDay] : []

  return (
    <div className="px-4 py-4 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Jadwal Saya</h1>
        <p className="text-sm text-gray-600 mt-0.5">Jadwal sesi mingguan</p>
      </div>

      {/* Day Selector */}
      <div className="bg-white rounded-lg border border-gray-200 p-2 shadow-sm">
        <div className="grid grid-cols-7 gap-1">
          {DAYS.map((day) => {
            const isSelected = selectedDay === day.value
            const isToday = day.value === todayValue
            const count = sessionsByDay[day.value]?.length || 0
            return (
              <button
                key={day.value}
                onClick={() => setSelectedDay(day.value)}
                className={`flex flex-col items-center py-2 rounded-lg transition relative ${
                  isSelected
                    ? 'bg-blue-600 text-white'
                    : isToday
                    ? 'bg-blue-50 text-blue-700'
                    : 'hover:bg-gray-50 text-gray-700'
                }`}
              >
                <span className="text-xs font-medium">{day.label}</span>
                {count > 0 && (
                  <span
                    className={`mt-1 text-[9px] font-bold px-1.5 rounded-full ${
                      isSelected ? 'bg-white text-blue-600' : 'bg-blue-600 text-white'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Sessions for Selected Day */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white rounded-lg p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-100 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : filteredSessions.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">
            Tidak ada sesi pada hari {DAYS.find((d) => d.value === selectedDay)?.label}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredSessions.map((session: any) => {
            const isToday = selectedDay === todayValue
            return (
              <div
                key={session.id}
                className={`bg-white border rounded-lg p-4 shadow-sm ${
                  isToday ? 'border-blue-300' : 'border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{session.subjectName}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {session.type === 'REGULAR' ? 'Reguler' : 'Privat'}
                    </p>
                  </div>
                  {isToday && (
                    <span className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">
                      Hari ini
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div className="flex items-center gap-1.5 text-xs text-gray-700">
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                    <span>
                      {session.startTime?.substring(0, 5)} ({session.durationMinutes}m)
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-700">
                    <Users className="w-3.5 h-3.5 text-gray-400" />
                    <span>
                      {session.capacity?.current}/{session.capacity?.max} siswa
                    </span>
                  </div>
                  <div className="col-span-2 flex items-center gap-1.5 text-xs text-gray-700">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    <span>{session.branchName}</span>
                  </div>
                </div>

                {/* Students List */}
                {session.students?.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-[10px] font-semibold text-gray-500 uppercase mb-1.5">
                      Siswa Terdaftar
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {session.students.map((s: any) => (
                        <span
                          key={s.id}
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 rounded-full text-xs"
                        >
                          <span className="w-4 h-4 bg-blue-200 rounded-full flex items-center justify-center text-[8px] font-bold text-blue-800">
                            {s.studentName
                              ?.split(' ')
                              .map((n: string) => n[0])
                              .join('')
                              .slice(0, 1)
                              .toUpperCase()}
                          </span>
                          <span className="text-gray-700">{s.studentName}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action button if today */}
                {isToday && (
                  <Link
                    href={`/guru/presensi/${session.id}`}
                    className="block w-full mt-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 rounded-lg transition text-center"
                  >
                    Input Presensi
                  </Link>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
