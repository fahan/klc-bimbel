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
  /** True once localStorage has been read on the client. False during SSR/first render. */
  hydrated: boolean
}

const BranchContext = createContext<BranchContextValue | null>(null)

const STORAGE_KEY = 'selectedBranchId'

export function BranchProvider({ children }: { children: React.ReactNode }) {
  const [selectedBranchId, setSelectedBranchIdState] = useState<string>('')
  const [userRoles, setUserRoles] = useState<string[]>([])
  const [userBranchIds, setUserBranchIds] = useState<string[]>([])
  const [primaryBranchId, setPrimaryBranchId] = useState<string>('')
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const primaryRole = localStorage.getItem('userRole') || ''
    const persisted = localStorage.getItem(STORAGE_KEY) || ''
    const primary = localStorage.getItem('primaryBranchId') || ''

    // Read all roles — fall back to primary role if userRoles not stored
    let roles: string[] = []
    try {
      const parsed = JSON.parse(localStorage.getItem('userRoles') || '[]')
      roles = Array.isArray(parsed) && parsed.length > 0 ? parsed : (primaryRole ? [primaryRole] : [])
    } catch {
      roles = primaryRole ? [primaryRole] : []
    }

    let branchIds: string[] = []
    try {
      branchIds = JSON.parse(localStorage.getItem('userBranchIds') || '[]')
    } catch {
      branchIds = []
    }

    setUserRoles(roles)
    setUserBranchIds(branchIds)
    setPrimaryBranchId(primary)
    setSelectedBranchIdState(persisted)
    setHydrated(true)
  }, [])

  // Derive flags from all roles (handles dual-role users correctly)
  const isAdminCabang = userRoles.includes('ADMIN_CABANG')
  const canViewAllBranches = userRoles.some(r => r === 'OWNER' || r === 'ADMIN_GLOBAL')
  // Pure ADMIN_CABANG = has ADMIN_CABANG but NOT OWNER/ADMIN_GLOBAL
  const isPureAdminCabang = isAdminCabang && !canViewAllBranches

  const { data: branchesData, isLoading } = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchApi.getAll(),
    enabled: hydrated && userRoles.length > 0 && !userRoles.every(r => r === 'GURU'),
  })

  const allBranches: Branch[] = branchesData?.data?.data || []

  // ADMIN_CABANG (pure) only sees their assigned branches; others see all
  const branches = isPureAdminCabang && userBranchIds.length > 0
    ? allBranches.filter(b => userBranchIds.includes(b.id))
    : allBranches

  // Use userBranchIds.length as fallback when branches API hasn't resolved yet.
  // This unblocks the dropdown button immediately on first render after login.
  const effectiveBranchCount = branches.length > 0
    ? branches.length
    : (isPureAdminCabang ? userBranchIds.length : allBranches.length)

  // While branches are loading we don't know the count yet — don't lock the button.
  const isRestrictedToBranch = isPureAdminCabang && !isLoading && effectiveBranchCount <= 1

  // Enable switching for ADMIN_CABANG while branches are loading (count unknown).
  // Once loaded, only disable when count is proven ≤ 1.
  const canSwitchBranch = canViewAllBranches ||
    (isPureAdminCabang && (effectiveBranchCount > 1 || isLoading))

  // Auto-select correct branch on load for ADMIN_CABANG
  useEffect(() => {
    if (!hydrated || branches.length === 0) return

    if (isPureAdminCabang) {
      // Use primaryBranchId if valid in their branches, else first assigned branch
      const target = branches.find(b => b.id === primaryBranchId) || branches[0]
      if (selectedBranchId !== target.id) {
        setSelectedBranchIdState(target.id)
        localStorage.setItem(STORAGE_KEY, target.id)
      }
    }
  }, [hydrated, branches.length, isPureAdminCabang, primaryBranchId]) // eslint-disable-line react-hooks/exhaustive-deps

  const setSelectedBranchId = useCallback(
    (id: string) => {
      // Pure ADMIN_CABANG can only select their assigned branches (when userBranchIds is populated)
      if (isPureAdminCabang && userBranchIds.length > 0 && id && !userBranchIds.includes(id)) return
      // Single-branch ADMIN_CABANG cannot switch
      if (isPureAdminCabang && branches.length <= 1) return

      setSelectedBranchIdState(id)
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, id)
      }
    },
    [isPureAdminCabang, userBranchIds, branches.length],
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
        hydrated,
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
