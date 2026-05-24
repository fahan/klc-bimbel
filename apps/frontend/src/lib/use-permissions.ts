import { useEffect, useState } from 'react'
import { hasPermission } from './permissions'

/**
 * Hook to check permissions for current user
 */
export function usePermission() {
  const [userRoles, setUserRoles] = useState<string[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    // Load roles from localStorage
    if (typeof window === 'undefined') return

    const roleStr = localStorage.getItem('userRole') || ''
    const roles = roleStr ? [roleStr] : []

    // Check if we have multiple roles stored (from API response after multi-role implementation)
    let allRoles = roles

    // Try to get all roles from localStorage
    const allRolesStr = localStorage.getItem('userRoles')
    if (allRolesStr) {
      try {
        const parsed = JSON.parse(allRolesStr)
        allRoles = Array.isArray(parsed) ? parsed : roles
      } catch {
        // If parsing fails, use single role as fallback
        allRoles = roles
      }
    }

    // Ensure we have at least the primary role
    if (allRoles.length === 0 && roleStr) {
      allRoles = [roleStr]
    }

    setUserRoles(allRoles)
    setIsLoaded(true)
  }, [])

  /**
   * Check if user can access a specific feature
   */
  const can = (feature: string): boolean => {
    return hasPermission(userRoles, feature)
  }

  /**
   * Check if user has a specific role
   */
  const hasRole = (role: string): boolean => {
    return userRoles.includes(role)
  }

  /**
   * Check if user has ANY of the provided roles
   */
  const hasAnyRole = (roles: string[]): boolean => {
    return roles.some((role) => userRoles.includes(role))
  }

  /**
   * Check if user has ALL of the provided roles
   */
  const hasAllRoles = (roles: string[]): boolean => {
    return roles.every((role) => userRoles.includes(role))
  }

  return {
    userRoles,
    isLoaded,
    can,
    hasRole,
    hasAnyRole,
    hasAllRoles,
  }
}
