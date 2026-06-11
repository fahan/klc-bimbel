'use client'

import { BookOpen, Clock, Award } from 'lucide-react'

export const PREDICATE_LABEL: Record<string, string> = {
  PERLU_BIMBINGAN: 'Perlu Bimbingan',
  CUKUP: 'Cukup',
  BAIK: 'Baik',
  BAIK_SEKALI: 'Baik Sekali',
  MEMUASKAN: 'Memuaskan',
}

export const PREDICATE_COLOR: Record<string, string> = {
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

function formatDateShort(d?: string | null) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/**
 * Renders the per-subject progress cards. Shared between the public parent
 * report (/laporan/[token]) and the admin in-app progress view so both show
 * identical data. `subjectReports` is the payload returned by the backend
 * progress-report builder.
 */
export default function SubjectReportCards({
  subjectReports,
}: {
  subjectReports: any[]
}) {
  if (!subjectReports || subjectReports.length === 0) {
    return (
      <div className="text-center py-8">
        <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-500">Belum ada data progress</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {subjectReports.map((subject: any) => (
        <div
          key={subject.subjectId}
          className="bg-white border border-gray-200 rounded-xl overflow-hidden"
        >
          {/* Subject Header */}
          <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  subject.trackingType === 'MODULE_BASED' ? 'bg-purple-100' : 'bg-teal-100'
                }`}
              >
                <BookOpen
                  className={`w-4 h-4 ${
                    subject.trackingType === 'MODULE_BASED' ? 'text-purple-700' : 'text-teal-700'
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
              <div className="px-4 pt-3">
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span className="text-xs text-blue-800 font-medium">Progres keseluruhan</span>
                  </div>
                  <span className="text-xs text-blue-900 font-bold">
                    {subject.completedModules} dari {subject.totalModules} modul selesai
                  </span>
                </div>
              </div>

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

              {subject.recentSessions?.length > 0 && (
                <div className="border-t border-gray-200 px-4 py-3">
                  <p className="text-xs font-semibold text-gray-700 mb-2">Riwayat Sesi Terbaru</p>
                  <div className="space-y-2">
                    {subject.recentSessions.slice(0, 5).map((sess: any, i: number) => (
                      <div key={i} className="border-l-2 border-blue-200 pl-3">
                        <div className="flex items-center gap-2 flex-wrap">
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

              {subject.recentSessions?.length > 0 && (
                <div className="px-4 pt-3 pb-4">
                  <p className="text-xs font-semibold text-gray-700 mb-2 mt-2">Riwayat Materi</p>
                  <div className="space-y-2.5">
                    {subject.recentSessions.map((sess: any, i: number) => (
                      <div key={i} className="border-l-2 border-teal-200 pl-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] text-gray-500">
                            {formatDateShort(sess.date)}
                          </span>
                          <p className="text-xs font-medium text-gray-900">{sess.topic || '-'}</p>
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
      ))}
    </div>
  )
}
