import React from 'react'
import { Badge } from '@/components/ui/Badge'

type AttendanceStatus = 'HADIR' | 'ABSEN' | 'IZIN' | 'SAKIT'
type SessionStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED'

interface AttendanceStatusBadgeProps {
  status: AttendanceStatus
  size?: 'sm' | 'md'
  label?: string
}

interface SessionStatusBadgeProps {
  status: SessionStatus
  size?: 'sm' | 'md'
  label?: string
}

const attendanceStatusConfig = {
  HADIR: { variant: 'success' as const, label: 'Hadir' },
  ABSEN: { variant: 'error' as const, label: 'Absen' },
  IZIN: { variant: 'warning' as const, label: 'Izin' },
  SAKIT: { variant: 'info' as const, label: 'Sakit' },
}

const sessionStatusConfig = {
  SCHEDULED: { variant: 'neutral' as const, label: 'Belum Dikonfirmasi' },
  COMPLETED: { variant: 'success' as const, label: 'Dikonfirmasi' },
  CANCELLED: { variant: 'error' as const, label: 'Dibatalkan' },
}

/**
 * Attendance Status Badge Component
 * Displays color-coded badges for student attendance status
 * @param status - HADIR, ABSEN, IZIN, or SAKIT
 * @param size - Badge size (sm or md)
 * @param label - Custom label (defaults to Indonesian status text)
 */
export function AttendanceStatusBadge({
  status,
  size = 'md',
  label,
}: AttendanceStatusBadgeProps) {
  const config = attendanceStatusConfig[status]
  const displayLabel = label || config.label

  return (
    <Badge variant={config.variant} size={size}>
      {displayLabel}
    </Badge>
  )
}

/**
 * Session Status Badge Component
 * Displays color-coded badges for session attendance submission status
 * @param status - SCHEDULED, COMPLETED, or CANCELLED
 * @param size - Badge size (sm or md)
 * @param label - Custom label (defaults to Indonesian status text)
 */
export function SessionAttendanceStatusBadge({
  status,
  size = 'md',
  label,
}: SessionStatusBadgeProps) {
  const config = sessionStatusConfig[status]
  const displayLabel = label || config.label

  return (
    <Badge variant={config.variant} size={size}>
      {displayLabel}
    </Badge>
  )
}
