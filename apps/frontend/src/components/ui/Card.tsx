import React from 'react'
import { COLORS, SHADOWS, BORDER_RADIUS, SPACING } from '@/lib/design-tokens'

interface CardProps {
  children: React.ReactNode
  className?: string
  hoverable?: boolean
  padding?: 'sm' | 'md' | 'lg'
}

export function Card({
  children,
  className = '',
  hoverable = false,
  padding = 'md'
}: CardProps) {
  const paddingMap = {
    sm: SPACING.sm,
    md: SPACING.md,
    lg: SPACING.lg,
  }

  return (
    <div
      className={`
        bg-white rounded-lg border border-gray-200
        transition-all duration-300
        ${hoverable ? 'hover:shadow-lg hover:border-blue-200 cursor-pointer' : 'shadow-sm'}
        ${className}
      `}
      style={{
        padding: paddingMap[padding],
        borderColor: COLORS.border,
        boxShadow: hoverable ? SHADOWS.sm : SHADOWS.xs,
      }}
    >
      {children}
    </div>
  )
}

interface MetricCardProps {
  label: string
  value: string | number
  subtext?: string
  icon?: React.ReactNode
  color?: 'blue' | 'green' | 'amber' | 'purple'
  trend?: {
    value: number
    isPositive: boolean
  }
}

const colorMap = {
  blue: { bg: '#EFF6FF', text: '#1E40AF', icon: '#2563EB' },
  green: { bg: '#F0FDF4', text: '#15803D', icon: '#10B981' },
  amber: { bg: '#FFFBEB', text: '#92400E', icon: '#F59E0B' },
  purple: { bg: '#F3E8FF', text: '#6B21A8', icon: '#A855F7' },
}

export function MetricCard({
  label,
  value,
  subtext,
  icon,
  color = 'blue',
  trend,
}: MetricCardProps) {
  const colors = colorMap[color]

  return (
    <Card padding="md">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-600 font-medium mb-2">{label}</p>
          <p className="text-3xl font-bold text-gray-900 mb-1">{value}</p>
          {subtext && <p className="text-xs text-gray-500">{subtext}</p>}
          {trend && (
            <div className="mt-2 flex items-center gap-1">
              <span
                className={`text-xs font-semibold ${
                  trend.isPositive ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
              </span>
            </div>
          )}
        </div>
        {icon && (
          <div
            className="p-3 rounded-lg flex-shrink-0"
            style={{ backgroundColor: colors.bg }}
          >
            <div style={{ color: colors.icon }}>{icon}</div>
          </div>
        )}
      </div>
    </Card>
  )
}

interface SectionCardProps {
  title: string
  description?: string
  children: React.ReactNode
  action?: React.ReactNode
}

export function SectionCard({
  title,
  description,
  children,
  action,
}: SectionCardProps) {
  return (
    <Card padding="lg">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {description && (
            <p className="text-sm text-gray-500 mt-1">{description}</p>
          )}
        </div>
        {action && <div>{action}</div>}
      </div>
      {children}
    </Card>
  )
}
