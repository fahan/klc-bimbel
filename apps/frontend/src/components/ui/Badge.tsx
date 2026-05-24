import React from 'react'
import { COLORS } from '@/lib/design-tokens'

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'secondary' | 'default' | 'danger'
type BadgeSize = 'sm' | 'md'

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  size?: BadgeSize
  icon?: React.ReactNode
  className?: string
}

const variantStyles = {
  success: {
    bg: '#F0FDF4',
    text: '#15803D',
    border: '#BBEF63',
    dot: COLORS.success,
  },
  warning: {
    bg: '#FFFBEB',
    text: '#92400E',
    border: '#FCD34D',
    dot: COLORS.warning,
  },
  error: {
    bg: '#FEF2F2',
    text: '#991B1B',
    border: '#FECACA',
    dot: COLORS.error,
  },
  info: {
    bg: '#ECF9FF',
    text: '#0C4A6E',
    border: '#A5F3FC',
    dot: COLORS.info,
  },
  neutral: {
    bg: '#F3F4F6',
    text: '#374151',
    border: '#D1D5DB',
    dot: COLORS.gray[500],
  },
  secondary: {
    bg: '#F0F9FF',
    text: '#0369A1',
    border: '#BAE6FD',
    dot: '#0284C7',
  },
  default: {
    bg: '#F3F4F6',
    text: '#6B7280',
    border: '#D1D5DB',
    dot: '#9CA3AF',
  },
  danger: {
    bg: '#FEF2F2',
    text: '#991B1B',
    border: '#FECACA',
    dot: '#DC2626',
  },
}

const sizeStyles = {
  sm: { padding: '4px 8px', fontSize: '12px' },
  md: { padding: '6px 12px', fontSize: '14px' },
}

export function Badge({
  children,
  variant = 'neutral',
  size = 'md',
  icon,
  className = '',
}: BadgeProps) {
  const styles = variantStyles[variant]
  const sizeStyle = sizeStyles[size]

  return (
    <span
      className={`
        inline-flex items-center gap-1 rounded-full font-medium
        border transition-colors duration-200
        ${className}
      `}
      style={{
        ...sizeStyle,
        backgroundColor: styles.bg,
        color: styles.text,
        borderColor: styles.border,
      }}
    >
      {icon && <span style={{ color: styles.dot }}>{icon}</span>}
      {children}
    </span>
  )
}

interface StatusBadgeProps {
  status: 'active' | 'inactive' | 'pending' | 'error' | 'scheduled'
  label?: string
}

const statusConfig = {
  active: { variant: 'success' as BadgeVariant, label: 'Aktif' },
  inactive: { variant: 'neutral' as BadgeVariant, label: 'Tidak Aktif' },
  pending: { variant: 'warning' as BadgeVariant, label: 'Menunggu' },
  error: { variant: 'error' as BadgeVariant, label: 'Error' },
  scheduled: { variant: 'info' as BadgeVariant, label: 'Terjadwal' },
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const config = statusConfig[status]
  const displayLabel = label || config.label

  return <Badge variant={config.variant}>{displayLabel}</Badge>
}

interface SessionStatusBadgeProps {
  status: 'selesai' | 'asir' | 'mendatang' | 'batal'
}

const sessionStatusConfig = {
  selesai: { variant: 'success' as BadgeVariant, label: 'Selesai' },
  asir: { variant: 'info' as BadgeVariant, label: 'Asir' },
  mendatang: { variant: 'warning' as BadgeVariant, label: 'Mendatang' },
  batal: { variant: 'error' as BadgeVariant, label: 'Batal' },
}

export function SessionStatusBadge({ status }: SessionStatusBadgeProps) {
  const config = sessionStatusConfig[status]

  return <Badge variant={config.variant}>{config.label}</Badge>
}
