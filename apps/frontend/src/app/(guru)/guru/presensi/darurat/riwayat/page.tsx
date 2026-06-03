'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { attendanceApi } from '@/lib/api/endpoints'
import { ArrowLeft, Clock, Users, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

const StatusBadge = ({ status }: { status: string }) => {
  const configs: Record<string, { label: string; className: string }> = {
    PENDING_APPROVAL: {
      label: 'Menunggu Persetujuan',
      className: 'bg-amber-100 text-amber-700 border border-amber-200',
    },
    COMPLETED: {
      label: 'Disetujui',
      className: 'bg-green-100 text-green-700 border border-green-200',
    },
    REJECTED: {
      label: 'Ditolak',
      className: 'bg-red-100 text-red-700 border border-red-200',
    },
  }
  const config = configs[status] ?? { label: status, className: 'bg-gray-100 text-gray-600' }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${config.className}`}>
      {config.label}
    </span>
  )
}

export default function RiwayatDaruratPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['my-adhoc-history'],
    queryFn: () => attendanceApi.getMyAdHocHistory(),
  })

  const logs = data?.data?.data || []

  return (
    <div className="px-4 py-4 space-y-4 mb-20">
      <Link href="/guru/presensi" className="flex items-center gap-2 text-blue-600 text-sm font-medium">
        <ArrowLeft className="w-4 h-4" />
        Kembali
      </Link>

      <div>
        <h1 className="text-xl font-bold text-gray-900">Riwayat Sesi Darurat</h1>
        <p className="text-sm text-gray-500 mt-0.5">Sesi yang Anda ajukan di luar jadwal reguler</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-lg p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-100 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <AlertCircle className="w-6 h-6 text-gray-400" />
          </div>
          <p className="font-medium text-gray-900 text-sm">Belum ada sesi darurat</p>
          <p className="text-xs text-gray-500 mt-1">Sesi darurat yang Anda ajukan akan muncul di sini</p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log: any) => (
            <div key={log.id} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm space-y-2">
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{log.subjectName}</p>
                  <p className="text-xs text-gray-500">{log.branchName}</p>
                </div>
                <StatusBadge status={log.status} />
              </div>

              {/* Details */}
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {log.sessionDate} · {log.startTime} ({log.durationMinutes}m)
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {log.hadirCount}/{log.studentCount} hadir
                </span>
              </div>

              {/* Notes */}
              {log.notes && (
                <p className="text-xs text-gray-500 italic">"{log.notes}"</p>
              )}

              {/* Approval info */}
              {log.status === 'COMPLETED' && (
                <div className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 rounded px-2 py-1">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Disetujui oleh {log.reviewedByName} · {log.reviewedAt ? new Date(log.reviewedAt).toLocaleDateString('id-ID') : ''}
                </div>
              )}
              {log.status === 'REJECTED' && (
                <div className="flex items-start gap-1.5 text-xs text-red-700 bg-red-50 rounded px-2 py-1">
                  <XCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span>Ditolak oleh {log.reviewedByName}: <em>{log.rejectionReason}</em></span>
                </div>
              )}

              {/* Student list */}
              {log.attendances && log.attendances.length > 0 && (
                <details className="text-xs">
                  <summary className="text-gray-500 cursor-pointer hover:text-gray-700">
                    Lihat detail presensi ({log.attendances.length} siswa)
                  </summary>
                  <div className="mt-1.5 space-y-1 pl-2">
                    {log.attendances.map((att: any) => (
                      <div key={att.studentId} className="flex justify-between text-gray-600">
                        <span>{att.studentName}</span>
                        <span className={
                          att.status === 'HADIR' ? 'text-green-600 font-medium' :
                          att.status === 'ABSEN' ? 'text-red-500' :
                          att.status === 'IZIN' ? 'text-amber-600' : 'text-purple-600'
                        }>{att.status}</span>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          ))}
        </div>
      )}

      {/* CTA */}
      <Link
        href="/guru/presensi/darurat"
        className="block w-full text-center bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-lg transition text-sm"
      >
        + Tambah Sesi Darurat Baru
      </Link>
    </div>
  )
}
