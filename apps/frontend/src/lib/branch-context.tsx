'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { branchApi } from '@/lib/api/endpoints'

interface Branch {
  id: string
  name: string
  code: string
}

interface BranchContextValue {
  /** Currently selected branch ID. Empty string = "All branches" (consolidated view). */
  selectedBranchId: string
  /** Currently selected branch object, or null if "All branches" or not loaded yet. */
  selectedBranch: Branch | null
  /** All branches available to current user. */
  branches: Branch[]
  /** Whether current user can switch branches (Owner / Admin Global). */
  canSwitchBranch: boolean
  /** Whether "All Branches" option is allowed for current user. */
  canViewAllBranches: boolean
  /** Whether user is restricted to single branch (Admin Cabang). */
  isRestrictedToBranch: boolean
  /** Set the selected branch (persisted to localStorage). Pass empty string for "All branches". */
  setSelectedBranchId: (id: string) => void
  /** Loading state for branches list. */
  isLoading: boolean
}

const BranchContext = createContext<BranchContextValue | null>(null)

const STORAGE_KEY = 'selectedBranchId'

export function BranchProvider({ children }: { children: React.ReactNode }) {
  const [selectedBranchId, setSelectedBranchIdState] = useState<string>('')
  const [userRole, setUserRole] = useState<string>('')
  const [hydrated, setHydrated] = useState(false)

  // Load role + persisted branch on mount
  useEffect(() => {
    if (typeof window === 'undefined') return
    const role = localStorage.getItem('userRole') || ''
    const persisted = localStorage.getItem(STORAGE_KEY) || ''
    setUserRole(role)
    setSelectedBranchIdState(persisted)
    setHydrated(true)
  }, [])

  const { data: branchesData, isLoading } = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchApi.getAll(),
    enabled: hydrated && !!userRole && userRole !== 'GURU',
  })

  const branches: Branch[] = branchesData?.data?.data || []

  // Permission flags based on role
  const canViewAllBranches = userRole === 'OWNER' || userRole === 'ADMIN_GLOBAL'
  const canSwitchBranch = canViewAllBranches // Admin Cabang locked to their branch
  const isRestrictedToBranch = userRole === 'ADMIN_CABANG'

  // Auto-select first branch for ADMIN_CABANG (or fallback if no persisted selection)
  useEffect(() => {
    if (!hydrated || branches.length === 0) return
    if (isRestrictedToBranch) {
      // Force first branch (in real impl, would derive from user.branches)
      const targetId = branches[0].id
      if (selectedBranchId !== targetId) {
        setSelectedBranchIdState(targetId)
        localStorage.setItem(STORAGE_KEY, targetId)
      }
    } else if (canViewAllBranches && !selectedBranchId) {
      // Default to "All Branches" (empty string) for owner/global
      // No-op
    }
  }, [hydrated, branches, isRestrictedToBranch, canViewAllBranches, selectedBranchId])

  const setSelectedBranchId = useCallback(
    (id: string) => {
      // Admin Cabang cannot switch
      if (isRestrictedToBranch) return
      setSelectedBranchIdState(id)
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, id)
      }
    },
    [isRestrictedToBranch],
  )

  const selectedBranch = branches.find(b => b.id === selectedBranchId) || null

  return (
    <BranchContext.Provider
      value={{
        selectedBranchId,
        selectedBranch,
        branches,
        canSwitchBranch,
        canViewAllBranches,
        isRestrictedToBranch,
        setSelectedBranchId,
        isLoading,
      }}
    >
      {children}
    </BranchContext.Provider>
  )
}

export function useBranch() {
  const ctx = useContext(BranchContext)
  if (!ctx) {
    throw new Error('useBranch must be used within BranchProvider')
  }
  return ctx
}

/**
 * Helper to get the branchId for API queries.
 * Returns undefined when "All Branches" is selected (so backend returns consolidated).
 */
export function useApiBranchId(): string | undefined {
  const { selectedBranchId } = useBranch()
  return selectedBranchId || undefined
}
