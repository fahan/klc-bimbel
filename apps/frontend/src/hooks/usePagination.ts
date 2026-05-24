import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export interface UsePaginationProps {
  queryKey: string[]
  queryFn: (page: number, limit: number, searchTerm?: string) => Promise<any>
  searchTerm?: string
  initialLimit?: number
}

export function usePagination(props: UsePaginationProps) {
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(props.initialLimit || 10)

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [...props.queryKey, page, limit, props.searchTerm || ''],
    queryFn: () => props.queryFn(page, limit, props.searchTerm),
  })

  const pagination: PaginationMeta | undefined = data?.data?.pagination
  const items = data?.data?.data || []

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage)
  }, [])

  const handleLimitChange = useCallback((newLimit: number) => {
    setLimit(newLimit)
    setPage(1) // Reset to first page when limit changes
  }, [])

  return {
    items,
    page,
    limit,
    setPage: handlePageChange,
    setLimit: handleLimitChange,
    pagination,
    isLoading,
    error,
    refetch,
  }
}
