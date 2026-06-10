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
  /** Branches accessible to current user (all for OWNER/ADMIN_GLOBAL, assigned only for ADMIN_CABANG). */
  branches: Branch[]
  /** Whether current user can switch between branches. */
  canSwitchBranch: boolean
  /** Whether "All Branches" consolidated view is allowed. */
  canViewAllBranches: boolean
  /** Whether user is restricted to their assigned branches only (ADMIN_CABANG). */
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
  const [userBranchIds, setUserBranchIds] = useState<string[]>([])
  const [primaryBranchId, setPrimaryBranchId] = useState<string>('')
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const role = localStorage.getItem('userRole') || ''
    const persisted = localStorage.getItem(STORAGE_KEY) || ''
    const primary = localStorage.getItem('primaryBranchId') || ''

    let branchIds: string[] = []
    try {
      branchIds = JSON.parse(localStorage.getItem('userBranchIds') || '[]')
    } catch {
      branchIds = []
    }

    setUserRole(role)
    setUserBranchIds(branchIds)
    setPrimaryBranchId(primary)
    setSelectedBranchIdState(persisted)
    setHydrated(true)
  }, [])

  const { data: branchesData, isLoading } = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchApi.getAll(),
    enabled: hydrated && !!userRole && userRole !== 'GURU',
  })

  const allBranches: Branch[] = branchesData?.data?.data || []

  const isAdminCabang = userRole === 'ADMIN_CABANG'
  const canViewAllBranches = userRole === 'OWNER' || userRole === 'ADMIN_GLOBAL'
  const isRestrictedToBranch = isAdminCabang && branches.length <= 1

  // ADMIN_CABANG only sees their assigned branches; others see all
  const branches = isAdminCabang && userBranchIds.length > 0
    ? allBranches.filter(b => userBranchIds.includes(b.id))
    : allBranches

  // ADMIN_CABANG can switch only if assigned to more than one branch
  const canSwitchBranch = canViewAllBranches || (isAdminCabang && branches.length > 1)

  // Auto-select correct branch on load
  useEffect(() => {
    if (!hydrated || branches.length === 0) return

    if (isAdminCabang) {
      // Use primaryBranchId if valid, else first assigned branch
      const target = branches.find(b => b.id === primaryBranchId) || branches[0]
      if (selectedBranchId !== target.id) {
        setSelectedBranchIdState(target.id)
        localStorage.setItem(STORAGE_KEY, target.id)
      }
    }
  }, [hydrated, branches.length, isAdminCabang, primaryBranchId]) // eslint-disable-line react-hooks/exhaustive-deps

  const setSelectedBranchId = useCallback(
    (id: string) => {
      // ADMIN_CABANG can only select their own branches
      if (isAdminCabang && id && !userBranchIds.includes(id)) return
      // Single-branch ADMIN_CABANG cannot switch
      if (isAdminCabang && branches.length <= 1) return

      setSelectedBranchIdState(id)
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, id)
      }
    },
    [isAdminCabang, userBranchIds, branches.length],
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
