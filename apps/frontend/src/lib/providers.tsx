'use client'

import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BranchProvider } from '@/lib/branch-context'
import { AppSettingsProvider } from '@/lib/app-settings-context'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
    },
  },
})

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AppSettingsProvider>
        <BranchProvider>{children}</BranchProvider>
      </AppSettingsProvider>
    </QueryClientProvider>
  )
}
