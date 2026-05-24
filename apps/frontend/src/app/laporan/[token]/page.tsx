'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import {
  AlertCircle,
  Building,
  Clock,
  CheckCircle,
  BookOpen,
  StickyNote,
  Award,
} from 'lucide-react'

const PREDICATE_LABEL: Record<string, string> = {
  PERLU_BIMBINGAN: 'Perlu Bimbingan',
  CUKUP: 'Cukup',
  BAIK: 'Baik',
  BAIK_SEKALI: 'Baik Sekali',
  MEMUASKAN: 'Memuaskan',
}

const PREDICATE_COLOR: Record<string, string> = {
  PERLU_BIMBINGAN: 'bg-red-100 text-red-700 border-red-200',
  CUKUP: 'bg-amber-100 text-amber-700 border-amber-200',
  BAIK: 'bg-blue-100 text-blue-700 border-blue-200',
  BAIK_SEKALI: 'bg-green-100 text-green-700 border-green-200',
  MEMUASKAN: 'bg-teal-100 text-teal-700 border-teal-200',
}

const STATUS_COLOR: Record<string, string> = {
  COMPLETED: 'bg-green-500',
  IN_PROGRESS: 'bg-blue-500',
  NOT_STARTED: 'bg-gray-300',
}

const STATUS_LABEL: Record<string, string> = {
  COMPLETED: 'Selesai',
  IN_PROGRESS: 'Sedang berjalan',
  NOT_STARTED: 'Belum dimulai',
}

function formatDate(d?: string | null) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatDateShort(d?: string | null) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default function PublicProgressReportPage() {
  const params = useParams()
  const token = params?.token as string
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
        const res = await fetch(`${apiUrl}/progress-reports/public/${token}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        })
        if (!res.ok) {
          setError(res.status === 404 ? 'Laporan tidak ditemukan' : 'Gagal memuat laporan')
          return
        }
        const json = await res.json()
        setData(json.data)
      } catch (e: any) {
        setError('Gagal terhubung ke server')
      } finally {
        setLoading(false)
      }
    }
    if (token) fetchReport()
  }, [token])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm text-gray-600">Memuat laporan...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">{error || 'Laporan tidak ditemukan'}</h2>
          <p className="text-sm text-gray-600">Hubungi admin untuk link baru.</p>
        </div>
      </div>
    )
  }

  // Expired
  if (data.isExpired) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Link sudah tidak aktif</h2>
          <p className="text-sm text-gray-600">
            Laporan untuk <strong>{data.studentName}</strong> sudah kedaluwarsa pada{' '}
            {formatDate(data.expiredAt)}. Hubungi admin {data.branchName} untuk link baru.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="max-w-2xl mx-auto bg-white shadow-lg">
        {/* Header (Blue) */}
        <div className="bg-[#185FA5] text-white px-6 py-6">
          <div className="flex items-start gap-3 mb-5">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-base">KLC Bimbel</p>
              <p className="text-xs text-blue-100">Cabang {data.branchName}</p>
            </div>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-wider text-blue-100">
              Laporan Progress Belajar
            </p>
            <h1 className="text-2xl font-bold mt-1">{data.studentName}</h1>
            <p className="text-xs text-blue-100 mt-1">
              KLC Bimbel
              {data.studentClassLevel ? ` · ${data.studentClassLevel}` : ''}
            </p>

            <div className="flex items-center gap-2 mt-4 flex-wrap">
              <span className="px-2 py-1 bg-white/15 rounded-full text-[11px]">
                Digenerate {formatDateShort(data.createdAt)}
              </span>
              <span className="px-2 py-1 bg-white/15 rounded-full text-[11px]">
                {data.isPermanent ? 'Berlaku permanen' : `Berlaku hingga ${formatDateShort(data.expiresAt)}`}
              </span>
            </div>
          </div>
        </div>

        {/* Validity Banner */}
        {!data.isPermanent && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              <span className="text-xs text-amber-800 font-medium">Link aktif hingga</span>
            </div>
            <span className="text-xs text-amber-900 font-bold">{formatDate(data.expiresAt)}</span>
          </div>
        )}

        {/* Subject Reports */}
        <div className="p-4 space-y-4">
          {data.subjectReports?.length === 0 ? (
            <div className="text-center py-8">
              <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Belum ada data progress</p>
            </div>
          ) : (
            data.subjectReports?.map((subject: any) => (
              <div
                key={subject.subjectId}
                className="bg-white border border-gray-200 rounded-xl overflow-hidden"
              >
                {/* Subject Header */}
                <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        subject.trackingType === 'MODULE_BASED'
                          ? 'bg-purple-100'
                          : 'bg-teal-100'
                      }`}
                    >
                      <BookOpen
                        className={`w-4 h-4 ${
                          subject.trackingType === 'MODULE_BASED'
                            ? 'text-purple-700'
                            : 'text-teal-700'
                        }`}
                      />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{subject.subjectName}</p>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                          subject.trackingType === 'MODULE_BASED'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-teal-100 text-teal-700'
                        }`}
                      >
                        {subject.trackingType === 'MODULE_BASED' ? 'Modul berjenjang' : 'Materi bebas'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* MODULE_BASED Content */}
                {subject.trackingType === 'MODULE_BASED' && (
                  <>
                    {/* Overall progress chip */}
                    <div className="px-4 pt-3">
                      <div className="bg-blue-50 border border-blue-100 rounded-lg p-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-blue-600" />
                          <span className="text-xs text-blue-800 font-medium">
                            Progres keseluruhan
                          </span>
                        </div>
                        <span className="text-xs text-blue-900 font-bold">
                          {subject.completedModules} dari {subject.totalModules} modul selesai
                        </span>
                      </div>
                    </div>

                    {/* Modules list */}
                    <div className="p-4 space-y-3">
                      {subject.modules?.map((mod: any) => (
                        <div key={mod.id} className="flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-900 truncate">
                              Modul {mod.orderNumber}: {mod.name}
                            </p>
                            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                              <div
                                className={`${STATUS_COLOR[mod.status]} h-full rounded-full transition-all`}
                                style={{ width: `${mod.progressPercentage}%` }}
                              ></div>
                            </div>
                          </div>
                          <div className="flex-shrink-0 text-right">
                            {mod.status === 'COMPLETED' && mod.predicate ? (
                              <span
                                className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                  PREDICATE_COLOR[mod.predicate]
                                }`}
                              >
                                {PREDICATE_LABEL[mod.predicate]}
                              </span>
                            ) : mod.status === 'IN_PROGRESS' ? (
                              <span className="text-[10px] text-blue-700 font-bold">
                                {mod.currentChapter}/{mod.totalChapters} bab
                              </span>
                            ) : (
                              <span className="text-[10px] text-gray-400">Belum</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Recent sessions */}
                    {subject.recentSessions?.length > 0 && (
                      <div className="border-t border-gray-200 px-4 py-3">
                        <p className="text-xs font-semibold text-gray-700 mb-2">
                          Riwayat Sesi Terbaru
                        </p>
                        <div className="space-y-2">
                          {subject.recentSessions.slice(0, 5).map((sess: any, i: number) => (
                            <div key={i} className="border-l-2 border-blue-200 pl-3">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-gray-500">
                                  {formatDateShort(sess.date)}
                                </span>
                                <p className="text-xs font-medium text-gray-900">
                                  {sess.moduleName} · Bab {sess.chapterFrom}–{sess.chapterTo}
                                </p>
                                {sess.moduleCompleted && sess.predicate && (
                                  <span
                                    className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${PREDICATE_COLOR[sess.predicate]}`}
                                  >
                                    {PREDICATE_LABEL[sess.predicate]}
                                  </span>
                                )}
                              </div>
                              {sess.notes && (
                                <div className="mt-1 bg-gray-50 border-l-2 border-gray-300 px-2 py-1 rounded">
                                  <p className="text-[11px] text-gray-700 italic">"{sess.notes}"</p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* FREE_MATERIAL Content */}
                {subject.trackingType === 'FREE_MATERIAL' && (
                  <>
                    {/* Average predicate chip */}
                    <div className="px-4 pt-3">
                      <div
                        className={`border rounded-lg p-2.5 flex items-center justify-between ${
                          subject.averagePredicate
                            ? PREDICATE_COLOR[subject.averagePredicate]
                            : 'bg-gray-50 border-gray-200 text-gray-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Award className="w-4 h-4" />
                          <span className="text-xs font-medium">Predikat rata-rata</span>
                        </div>
                        <span className="text-xs font-bold">
                          {subject.averagePredicate
                            ? PREDICATE_LABEL[subject.averagePredicate]
                            : 'Belum ada data'}
                        </span>
                      </div>
                    </div>

                    {/* Recent topics */}
                    {subject.recentSessions?.length > 0 && (
                      <div className="px-4 pt-3 pb-4">
                        <p className="text-xs font-semibold text-gray-700 mb-2 mt-2">
                          Riwayat Materi
                        </p>
                        <div className="space-y-2.5">
                          {subject.recentSessions.map((sess: any, i: number) => (
                            <div key={i} className="border-l-2 border-teal-200 pl-3">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] text-gray-500">
                                  {formatDateShort(sess.date)}
                                </span>
                                <p className="text-xs font-medium text-gray-900">
                                  {sess.topic || '-'}
                                </p>
                                {sess.predicate && (
                                  <span
                                    className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${PREDICATE_COLOR[sess.predicate]}`}
                                  >
                                    {PREDICATE_LABEL[sess.predicate]}
                                  </span>
                                )}
                              </div>
                              {sess.notes && (
                                <div className="mt-1 bg-gray-50 border-l-2 border-gray-300 px-2 py-1 rounded">
                                  <p className="text-[11px] text-gray-700 italic">"{sess.notes}"</p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))
          )}
        </div>

        {/* Digital Cap */}
        <div className="mx-4 mb-4 bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-center gap-3">
          <div className="w-12 h-12 bg-gray-100 border-2 border-gray-300 border-dashed rounded-full flex items-center justify-center flex-shrink-0">
            <Building className="w-5 h-5 text-gray-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-900">KLC Bimbel</p>
            <p className="text-xs text-gray-600">Cabang {data.branchName}</p>
          </div>
          <p className="text-xs text-gray-500 italic text-right">
            Dokumen resmi
            <br />
            diterbitkan secara digital
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 text-center">
          <p className="text-xs text-gray-500 leading-relaxed">
            Laporan ini dibuat oleh KLC Bimbel dan hanya menampilkan data mata pelajaran yang dipilih
            admin.
            <br />
            {data.isPermanent
              ? 'Link ini berlaku permanen.'
              : `Link ini berlaku hingga ${formatDate(data.expiresAt)}.`}
          </p>
        </div>
      </div>
    </div>
  )
}
