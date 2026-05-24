'use client'

import React from 'react'
import { usePermission } from '@/lib/use-permissions'

interface PermissionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  requiredFeature: string
  children: React.ReactNode
}

/**
 * Button component that only renders if user has permission
 * Useful for hiding action buttons based on user role
 */
export function PermissionButton({
  requiredFeature,
  children,
  ...props
}: PermissionButtonProps) {
  const { can, isLoaded } = usePermission()

  if (!isLoaded || !can(requiredFeature)) {
    return null
  }

  return <button {...props}>{children}</button>
}

interface ConditionalRenderProps {
  requiredFeature: string
  children: React.ReactNode
  fallback?: React.ReactNode
}

/**
 * Render component that only shows content if user has permission
 * Useful for hiding UI sections based on user role
 */
export function PermissionRequired({
  requiredFeature,
  children,
  fallback,
}: ConditionalRenderProps) {
  const { can, isLoaded } = usePermission()

  if (!isLoaded) {
    return null
  }

  if (!can(requiredFeature)) {
    return fallback || null
  }

  return <>{children}</>
}
