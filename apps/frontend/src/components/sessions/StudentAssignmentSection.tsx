'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { studentApi, subjectApi } from '@/lib/api/endpoints'
import { Search, X, AlertCircle, CheckCircle2 } from 'lucide-react'

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(func: T, delay: number): T {
  let timeoutId: NodeJS.Timeout
  return ((...args: any[]) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func(...args), delay)
  }) as T
}

interface StudentAssignmentSectionProps {
  sessionId: string
  branchId: string
  subjectId: string
  sessionType: 'REGULAR' | 'PRIVATE'
  currentStudents: Array<{ id: string; studentId: string; studentName: string }>
  onStudentsChange: (studentIds: string[]) => void
  isEditing: boolean
  isLoading: boolean
}

export function StudentAssignmentSection({
  sessionId,
  branchId,
  subjectId,
  sessionType,
  currentStudents,
  onStudentsChange,
  isEditing,
  isLoading,
}: StudentAssignmentSectionProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>(
    currentStudents.map(s => s.studentId)
  )
  const [selectedStudentCache, setSelectedStudentCache] = useState<Map<string, any>>(
    new Map(currentStudents.map(s => [s.studentId, { id: s.studentId, name: s.studentName }]))
  )
  const [showDropdown, setShowDropdown] = useState(false)

  // Debounce search term (300ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  // Get students from the same branch with search filtering
  const { data: studentsData } = useQuery({
    queryKey: ['students', branchId, debouncedSearch],
    queryFn: () => studentApi.getAll(1, 100, branchId, debouncedSearch || undefined),
    enabled: !!branchId && isEditing,
  })

  // Get subject info for capacity
  const { data: subjectData } = useQuery({
    queryKey: ['subject', subjectId],
    queryFn: () => subjectApi.getOne(subjectId),
    enabled: !!subjectId,
  })

  const students = studentsData?.data?.data || []
  const subject = subjectData?.data?.data

  // Calculate max capacity based on session type
  const maxCapacity = useMemo(() => {
    if (!subject) return 0
    return sessionType === 'REGULAR'
      ? subject.maxCapacityRegular || 3
      : subject.maxCapacityPrivate || 1
  }, [subject, sessionType])

  // Get currently enrolled students in this subject (to exclude from selection)
  const enrolledInSubject = useMemo(() => {
    return students
      .filter((s: any) => s.studentSubjects?.some((ss: any) => ss.subject?.id === subjectId))
      .map((s: any) => s.id)
  }, [students, subjectId])

  // Available students: not already selected, not already enrolled in subject
  // (Server-side search already filters by branch and search term)
  const availableStudents = useMemo(() => {
    return students.filter((s: any) => {
      const isSelected = selectedStudentIds.includes(s.id)
      const isEnrolled = enrolledInSubject.includes(s.id)
      return !isSelected && !isEnrolled
    })
  }, [students, selectedStudentIds, enrolledInSubject])

  // Get student details for selected ones (from cache to persist across search changes)
  const selectedStudents = useMemo(() => {
    return selectedStudentIds.map(id => selectedStudentCache.get(id)).filter(Boolean)
  }, [selectedStudentIds, selectedStudentCache])

  // Validation
  const isAtCapacity = selectedStudentIds.length >= maxCapacity
  const exceededCapacity = selectedStudentIds.length > maxCapacity
  const hasError = exceededCapacity

  // Notify parent of changes
  useEffect(() => {
    onStudentsChange(selectedStudentIds)
  }, [selectedStudentIds, onStudentsChange])

  const handleAddStudent = (studentId: string) => {
    if (!isAtCapacity) {
      const student = students.find(s => s.id === studentId)
      if (student) {
        setSelectedStudentIds([...selectedStudentIds, studentId])
        setSelectedStudentCache(new Map(selectedStudentCache).set(studentId, student))
        setSearchTerm('')
        setShowDropdown(false)
      }
    }
  }

  const handleRemoveStudent = (studentId: string) => {
    setSelectedStudentIds(selectedStudentIds.filter(id => id !== studentId))
    const newCache = new Map(selectedStudentCache)
    newCache.delete(studentId)
    setSelectedStudentCache(newCache)
  }

  if (!isEditing) {
    // Show read-only view
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Siswa Terdaftar</h2>

        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Kapasitas</span>
            <span className="text-sm font-semibold text-gray-900">
              {currentStudents.length}/{maxCapacity}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{
                width: maxCapacity > 0 ? `${(currentStudents.length / maxCapacity) * 100}%` : '0%',
              }}
            />
          </div>
        </div>

        {currentStudents.length > 0 ? (
          <div className="space-y-2">
            {currentStudents.map((s: any) => (
              <div key={s.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-xs">
                  {s.studentName
                    ?.split(' ')
                    .map((n: string) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <span className="text-sm font-medium text-gray-900">{s.studentName}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 italic">Belum ada siswa terdaftar di sesi ini</p>
        )}
      </div>
    )
  }

  // Edit mode view with assignment capability
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Assign Siswa (Opsional)</h2>

      {/* Capacity indicator */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Kapasitas</span>
          <span className={`text-sm font-semibold ${exceededCapacity ? 'text-red-600' : 'text-gray-900'}`}>
            {selectedStudentIds.length}/{maxCapacity}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className={`h-2.5 rounded-full transition-all ${
              exceededCapacity ? 'bg-red-600' : isAtCapacity ? 'bg-blue-600' : 'bg-blue-500'
            }`}
            style={{
              width: maxCapacity > 0 ? `${Math.min((selectedStudentIds.length / maxCapacity) * 100, 100)}%` : '0%',
            }}
          />
        </div>
      </div>

      {/* Error message */}
      {hasError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-900">
              Jumlah siswa melebihi kapasitas ({selectedStudentIds.length}/{maxCapacity})
            </p>
            <p className="text-xs text-red-700 mt-1">
              Kurangi {selectedStudentIds.length - maxCapacity} siswa untuk melanjutkan
            </p>
          </div>
        </div>
      )}

      {/* Search bar */}
      <div className="mb-4 relative">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Cari siswa..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setShowDropdown(true)
            }}
            onFocus={() => setShowDropdown(true)}
            disabled={isAtCapacity && selectedStudentIds.length > 0 && availableStudents.length === 0}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
          />
        </div>

        {/* Dropdown */}
        {showDropdown && searchTerm && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
            {availableStudents.length > 0 ? (
              availableStudents.map((student: any) => (
                <button
                  key={student.id}
                  type="button"
                  onClick={() => handleAddStudent(student.id)}
                  disabled={isLoading}
                  className="w-full text-left px-4 py-2 hover:bg-blue-50 border-b border-gray-100 last:border-b-0 disabled:opacity-50 transition"
                >
                  <p className="font-medium text-gray-900">{student.name}</p>
                  {student.classLevel && (
                    <p className="text-xs text-gray-500">{student.classLevel}</p>
                  )}
                </button>
              ))
            ) : searchTerm ? (
              <div className="px-4 py-3 text-sm text-gray-500 text-center">
                Tidak ada siswa yang cocok
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Selected students as chips */}
      {selectedStudentIds.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-medium text-gray-700 mb-2">Siswa yang dipilih ({selectedStudentIds.length}):</p>
          <div className="flex flex-wrap gap-2">
            {selectedStudents.map((student: any) => (
              <div
                key={student.id}
                className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium transition ${
                  exceededCapacity
                    ? 'bg-red-100 text-red-700 border border-red-200'
                    : 'bg-blue-100 text-blue-700 border border-blue-200'
                }`}
              >
                {student.name}
                <button
                  type="button"
                  onClick={() => handleRemoveStudent(student.id)}
                  disabled={isLoading}
                  className="ml-1 hover:opacity-70 transition disabled:opacity-50"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Success info */}
      {!hasError && selectedStudentIds.length > 0 && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-green-900">
              {selectedStudentIds.length} siswa siap diassign
            </p>
            <p className="text-xs text-green-700 mt-0.5">
              Siswa akan otomatis terdaftar ke mata pelajaran ini saat disimpan
            </p>
          </div>
        </div>
      )}

      {selectedStudentIds.length === 0 && (
        <p className="text-sm text-gray-500 italic">Belum ada siswa yang dipilih (opsional)</p>
      )}
    </div>
  )
}
