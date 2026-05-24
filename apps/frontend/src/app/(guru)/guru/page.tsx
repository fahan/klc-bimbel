'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { sessionApi } from '@/lib/api/endpoints'
import { CheckSquare, Calendar, TrendingUp, Clock, ArrowRight } from 'lucide-react'

export default function GuruDashboard() {
  const { data: todaySessionsData, isLoading } = useQuery({
    queryKey: ['guru-today-sessions'],
    queryFn: () => sessionApi.getTodayForMe(),
  })

  const todaySessions = todaySessionsData?.data?.data || []

  const today = new Date()
  const dateStr = today.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Greeting */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Selamat datang! 👋</h1>
        <p className="text-sm text-gray-600 mt-0.5">{dateStr}</p>
      </div>

      {/* Today's Sessions Card */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900">Sesi Hari Ini</h2>
          <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
            {todaySessions.length} sesi
          </span>
        </div>

        {isLoading ? (
          <p className="text-sm text-gray-500 py-4 text-center">Memuat...</p>
        ) : todaySessions.length === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center">Tidak ada sesi hari ini</p>
        ) : (
          <div className="space-y-2">
            {todaySessions.slice(0, 3).map((session: any) => {
              const isDone = session.sessionLog?.status === 'COMPLETED'
              return (
                <Link
                  key={session.id}
                  href={`/guru/presensi/${session.id}`}
                  className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm text-gray-900">{session.subjectName}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-600">
                        <Clock className="w-3 h-3" />
                        {session.startTime?.substring(0, 5)} ({session.durationMinutes}m) ·{' '}
                        {session.capacity?.current} siswa
                      </div>
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium ${
                        isDone
                          ? 'bg-green-100 text-green-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {isDone ? 'Selesai' : 'Mendatang'}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        <Link
          href="/guru/presensi"
          className="flex items-center justify-center gap-2 w-full mt-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition"
        >
          Lihat semua presensi <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-2">
        <Link
          href="/guru/presensi"
          className="bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg p-3 text-center transition"
        >
          <CheckSquare className="w-6 h-6 text-blue-600 mx-auto mb-1" />
          <p className="text-xs font-medium text-blue-900">Presensi</p>
        </Link>
        <Link
          href="/guru/jadwal"
          className="bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg p-3 text-center transition"
        >
          <Calendar className="w-6 h-6 text-purple-600 mx-auto mb-1" />
          <p className="text-xs font-medium text-purple-900">Jadwal</p>
        </Link>
        <Link
          href="/guru/komisi"
          className="bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg p-3 text-center transition"
        >
          <TrendingUp className="w-6 h-6 text-green-600 mx-auto mb-1" />
          <p className="text-xs font-medium text-green-900">Komisi</p>
        </Link>
      </div>

      {/* Info Tip */}
      <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-3">
        <p className="text-xs text-blue-800">
          💡 Tap sesi di atas untuk input presensi siswa dan progress belajar
        </p>
      </div>
    </div>
  )
}
