'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { progressReportApi, studentApi } from '@/lib/api/endpoints'
import { Search, X, BookOpen, Link2, User } from 'lucide-react'
import { LoadingState } from '@/components/ui/States'
import { useApiBranchId } from '@/lib/branch-context'
import SubjectReportCards from './SubjectReportCards'
import type { LinkPrefill } from './ManageLinksTab'

export default function ViewProgressTab({
  onCreateLink,
}: {
  onCreateLink?: (prefill: LinkPrefill) => void
}) {
  const branchId = useApiBranchId()

  const [studentId, setStudentId] = useState('')
  const [studentName, setStudentName] = useState('')
  const [studentSubjects, setStudentSubjects] = useState<any[]>([])
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([])

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [search])

  const { data: studentsData, isFetching: studentsLoading } = useQuery({
    queryKey: ['students-search', branchId, debouncedSearch],
    queryFn: () => studentApi.getAll(1, 20, branchId, debouncedSearch || undefined),
    enabled: dropdownOpen,
  })
  const students: any[] = studentsData?.data?.data || []

  const {
    data: reportData,
    isLoading: reportLoading,
    isError: reportError,
  } = useQuery({
    queryKey: ['student-progress-report', studentId, selectedSubjectIds],
    queryFn: () => progressReportApi.getStudentReport(studentId, selectedSubjectIds),
    enabled: !!studentId && selectedSubjectIds.length > 0,
  })
  const report = reportData?.data?.data

  const selectStudent = (s: any) => {
    const subs = s.subjects || []
    setStudentId(s.id)
    setStudentName(s.name)
    setStudentSubjects(subs)
    setSelectedSubjectIds(subs.map((x: any) => x.subjectId))
    setSearch('')
    setDropdownOpen(false)
  }

  const clearStudent = () => {
    setStudentId('')
    setStudentName('')
    setStudentSubjects([])
    setSelectedSubjectIds([])
  }

  const toggleSubject = (id: string) => {
    setSelectedSubjectIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
      {/* Left: search + selected student */}
      <div className="space-y-4">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <label className="block text-xs font-medium text-gray-700 mb-2">Pilih Siswa</label>
          {studentId ? (
            <div className="flex items-center gap-2 px-3 py-2 border border-blue-300 bg-blue-50 rounded-lg">
              <User className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900 flex-1">{studentName}</span>
              <button onClick={clearStudent} className="text-blue-400 hover:text-blue-700">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Cari nama siswa..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setDropdownOpen(true)
                }}
                onFocus={() => setDropdownOpen(true)}
                onBlur={() => setTimeout(() => setDropdownOpen(false), 150)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {dropdownOpen && (
                <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                  {studentsLoading ? (
                    <p className="text-xs text-gray-400 px-3 py-2 italic">Mencari...</p>
                  ) : students.length === 0 ? (
                    <p className="text-xs text-gray-500 px-3 py-2 italic">
                      {debouncedSearch ? 'Siswa tidak ditemukan' : 'Ketik untuk mencari siswa'}
                    </p>
                  ) : (
                    students.map((s: any) => (
                      <button
                        key={s.id}
                        type="button"
                        onMouseDown={() => selectStudent(s)}
                        className="w-full text-left px-3 py-2 text-sm text-gray-800 hover:bg-blue-50 transition"
                      >
                        {s.name}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* Subject filter */}
          {studentId && (
            <div className="mt-4">
              <label className="block text-xs font-medium text-gray-700 mb-2">
                Mata Pelajaran
              </label>
              {studentSubjects.length === 0 ? (
                <p className="text-xs text-gray-500 italic p-2 bg-gray-50 rounded">
                  Siswa belum terdaftar di mapel manapun
                </p>
              ) : (
                <div className="space-y-1.5">
                  {studentSubjects.map((s: any) => {
                    const checked = selectedSubjectIds.includes(s.subjectId)
                    return (
                      <label
                        key={s.subjectId}
                        className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer border transition ${
                          checked
                            ? 'bg-blue-50 border-blue-300'
                            : 'bg-white border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleSubject(s.subjectId)}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <span className="text-sm font-medium text-gray-900 flex-1">
                          {s.subjectName}
                        </span>
                      </label>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Create link shortcut */}
          {studentId && selectedSubjectIds.length > 0 && onCreateLink && (
            <button
              onClick={() =>
                onCreateLink({
                  studentId,
                  studentName,
                  studentSubjects,
                  subjectIds: selectedSubjectIds,
                })
              }
              className="mt-4 w-full flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 rounded-lg text-sm transition"
            >
              <Link2 className="w-4 h-4" />
              Buat Link Laporan untuk siswa ini
            </button>
          )}
        </div>
      </div>

      {/* Right: report */}
      <div className="lg:col-span-2">
        {!studentId ? (
          <div className="bg-white rounded-lg border border-dashed border-gray-300 p-10 text-center">
            <User className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">
              Pilih siswa di panel kiri untuk melihat data progress
            </p>
          </div>
        ) : selectedSubjectIds.length === 0 ? (
          <div className="bg-white rounded-lg border border-dashed border-gray-300 p-10 text-center">
            <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">
              Pilih minimal satu mata pelajaran untuk menampilkan progress
            </p>
          </div>
        ) : reportLoading ? (
          <LoadingState />
        ) : reportError ? (
          <div className="bg-white rounded-lg border border-red-200 p-8 text-center">
            <p className="text-sm text-red-600">Gagal memuat data progress siswa</p>
          </div>
        ) : (
          <div>
            {report && (
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm px-4 py-3 mb-4">
                <h2 className="text-lg font-bold text-gray-900">{report.studentName}</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {report.studentClassLevel ? `${report.studentClassLevel} · ` : ''}
                  Cabang {report.branchName}
                </p>
              </div>
            )}
            <SubjectReportCards subjectReports={report?.subjectReports || []} />
          </div>
        )}
      </div>
    </div>
  )
}
