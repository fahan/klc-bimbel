'use client'

import { useState } from 'react'
import Link from 'next/link'
import { branchApi } from '@/lib/api/endpoints'
import { usePagination } from '@/hooks/usePagination'
import { Pagination } from '@/components/ui/Pagination'
import { ErrorState } from '@/components/ui/States'

interface Branch {
  id: string
  name: string
  code: string
  address?: string
  phone?: string
  isActive: boolean
  createdAt: string
}

export default function BranchesPage() {
  const [error, setError] = useState('')
  const { items: branches, page, limit, setPage, setLimit, pagination, isLoading, error: queryError, refetch } = usePagination({
    queryKey: ['branches'],
    queryFn: (page, limit) => branchApi.getAll(page, limit),
    initialLimit: 10,
  })

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this branch?')) return

    try {
      await branchApi.delete(id)
      refetch()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete branch')
    }
  }

  return (
    <div className="space-y-4">
      {/* Header with Create Button */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-primary">Branches</h1>
        <Link
          href="/master-data/branches/create"
          className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
        >
          + Add Branch
        </Link>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Query Error State */}
      {queryError ? (
        <ErrorState
          title="Gagal memuat data"
          description="Terjadi kesalahan saat memuat data. Silakan coba lagi."
          action={{ label: 'Coba Lagi', onClick: refetch }}
        />
      ) : isLoading ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <p className="text-gray-600">Loading branches...</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
          {branches.length === 0 ? (
            <div className="p-8 text-center text-gray-600">
              <p className="text-lg mb-2">No branches found</p>
              <Link href="/master-data/branches/create" className="text-primary hover:underline">
                Create the first branch
              </Link>
            </div>
          ) : (
            <>
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Name</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Code</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Address</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Phone</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {branches.map((branch) => (
                    <tr key={branch.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">{branch.name}</td>
                      <td className="px-6 py-4 text-gray-600">
                        <span className="bg-gray-100 px-3 py-1 rounded-full text-sm font-mono">
                          {branch.code}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600 text-sm">{branch.address || '-'}</td>
                      <td className="px-6 py-4 text-gray-600 text-sm">{branch.phone || '-'}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${
                            branch.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {branch.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 space-x-2 flex">
                        <Link
                          href={`/master-data/branches/${branch.id}`}
                          className="text-primary hover:underline text-sm font-medium"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => handleDelete(branch.id)}
                          className="text-red-600 hover:underline text-sm font-medium"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {branches.length > 0 && pagination && (
                <Pagination
                  currentPage={page}
                  totalPages={pagination.totalPages}
                  limit={limit}
                  onPageChange={setPage}
                  onLimitChange={setLimit}
                  isLoading={isLoading}
                />
              )}
            </>
          )}
          </div>
        </div>
      )}
    </div>
  )
}
