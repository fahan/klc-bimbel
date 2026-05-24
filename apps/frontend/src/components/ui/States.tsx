import React from 'react'
import { AlertCircle, Inbox, Zap } from 'lucide-react'

interface EmptyStateProps {
  title: string
  description: string
  icon?: React.ReactNode
  action?: {
    label: string
    onClick: () => void
  }
}

export function EmptyState({
  title,
  description,
  icon,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="mb-4 p-3 bg-gray-100 rounded-lg">
        {icon ? (
          <div className="text-gray-400 w-12 h-12">{icon}</div>
        ) : (
          <Inbox className="w-12 h-12 text-gray-400" />
        )}
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 text-center text-sm mb-4 max-w-xs">
        {description}
      </p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}

export function LoadingState() {
  return (
    <div className="flex flex-col gap-4">
      {[1, 2, 3].map(i => (
        <div
          key={i}
          className="h-16 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded-lg animate-pulse"
        />
      ))}
    </div>
  )
}

export function SkeletonCard({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="h-32 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded-lg animate-pulse"
        />
      ))}
    </div>
  )
}

interface ErrorStateProps {
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
}

export function ErrorState({ title, description, action }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="mb-4 p-3 bg-red-100 rounded-lg">
        <AlertCircle className="w-12 h-12 text-red-600" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 text-center text-sm mb-4 max-w-xs">
        {description}
      </p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}

interface NoDataProps {
  message?: string
}

export function NoData({ message = 'Tidak ada data' }: NoDataProps) {
  return (
    <div className="text-center py-8 text-gray-500">
      <Inbox className="w-12 h-12 mx-auto mb-3 text-gray-400" />
      <p className="text-sm">{message}</p>
    </div>
  )
}
