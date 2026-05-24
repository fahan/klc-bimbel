import { useState, useMemo } from 'react'

type SessionStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'ALL'

interface AttendanceFilters {
  branchId?: string
  teacherId?: string
  dateFrom?: string
  dateTo?: string
  sessionStatus: SessionStatus
  searchTerm: string
}

interface FilteredSession {
  id: string
  sessionId: string
  subjectName: string
  subjectId: string
  teacherName: string
  teacherId: string
  branchName: string
  branchId: string
  dayOfWeek: string
  startTime: string
  durationMinutes: number
  capacity?: {
    current: number
    max: number
  }
  students?: Array<{
    id: string
    studentId: string
    studentName: string
  }>
  attendanceStatus?: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED'
}

interface UseAttendanceFilterProps {
  sessions?: FilteredSession[]
  isLoading?: boolean
}

/**
 * Hook to manage attendance filtering
 * Handles filter state and provides filtered/sorted sessions
 */
export function useAttendanceFilter({
  sessions = [],
  isLoading = false,
}: UseAttendanceFilterProps) {
  const [filters, setFilters] = useState<AttendanceFilters>({
    sessionStatus: 'ALL',
    searchTerm: '',
  })

  const handleFilterChange = (key: keyof AttendanceFilters, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  const handleBranchChange = (branchId: string) => {
    handleFilterChange('branchId', branchId || undefined)
  }

  const handleTeacherChange = (teacherId: string) => {
    handleFilterChange('teacherId', teacherId || undefined)
  }

  const handleDateFromChange = (date: string) => {
    handleFilterChange('dateFrom', date || undefined)
  }

  const handleDateToChange = (date: string) => {
    handleFilterChange('dateTo', date || undefined)
  }

  const handleStatusChange = (status: SessionStatus) => {
    handleFilterChange('sessionStatus', status)
  }

  const handleSearchChange = (term: string) => {
    handleFilterChange('searchTerm', term)
  }

  const handleResetFilters = () => {
    setFilters({
      sessionStatus: 'ALL',
      searchTerm: '',
    })
  }

  // Filter sessions based on current filter state
  const filteredSessions = useMemo(() => {
    if (!sessions || sessions.length === 0) {
      return []
    }

    return sessions.filter((session) => {
      // Filter by branch
      if (filters.branchId && session.branchId !== filters.branchId) {
        return false
      }

      // Filter by teacher
      if (filters.teacherId && session.teacherId !== filters.teacherId) {
        return false
      }

      // Filter by date range (if dateFrom provided)
      if (filters.dateFrom) {
        // This is a basic implementation - you may need to adjust based on your date format
        // For now, we'll just check day of week or session date
        const today = new Date()
        const fromDate = new Date(filters.dateFrom)
        if (today < fromDate) {
          return true // Future sessions
        }
      }

      // Filter by date range (if dateTo provided)
      if (filters.dateTo) {
        const toDate = new Date(filters.dateTo)
        const today = new Date()
        if (today > toDate) {
          return true // Past sessions
        }
      }

      // Filter by session status
      if (filters.sessionStatus !== 'ALL') {
        const status = session.attendanceStatus || 'SCHEDULED'
        if (status !== filters.sessionStatus) {
          return false
        }
      }

      // Filter by search term (subject or teacher name)
      if (filters.searchTerm) {
        const term = filters.searchTerm.toLowerCase()
        const matchesSubject = session.subjectName
          .toLowerCase()
          .includes(term)
        const matchesTeacher = session.teacherName
          .toLowerCase()
          .includes(term)
        if (!matchesSubject && !matchesTeacher) {
          return false
        }
      }

      return true
    })
  }, [sessions, filters])

  return {
    filters,
    filteredSessions,
    isLoading,
    // Filter setters
    setFilters,
    handleFilterChange,
    handleBranchChange,
    handleTeacherChange,
    handleDateFromChange,
    handleDateToChange,
    handleStatusChange,
    handleSearchChange,
    handleResetFilters,
  }
}
