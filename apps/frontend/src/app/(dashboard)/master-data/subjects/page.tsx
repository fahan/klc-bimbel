'use client'

import { useState } from 'react'
import Link from 'next/link'
import { subjectApi } from '@/lib/api/endpoints'
import { usePagination } from '@/hooks/usePagination'
import { Pagination } from '@/components/ui/Pagination'

interface Subject {
  id: string
  name: string
  code: string
  trackingType: string
  maxCapacityRegular?: number
  maxCapacityPrivate?: number
  createdAt?: string
}

export default function SubjectsPage() {
  const [error, setError] = useState('')
  const { items: subjects, page, limit, setPage, setLimit, pagination, isLoading, refetch } = usePagination({
    queryKey: ['subjects'],
    queryFn: (page, limit) => subjectApi.getAll(page, limit),
    initialLimit: 10,
  })

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this subject?')) return

    try {
      await subjectApi.delete(id)
      refetch()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete subject')
    }
  }

  const getTrackingTypeColor = (type: string) => {
    return type === 'MODULE_BASED' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
  }

  return (
    <div className="space-y-4">
      {/* Header with Create Button */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-primary">Subjects</h1>
        <Link
          href="/master-data/subjects/create"
          className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
        >
          + Add Subject
        </Link>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <p className="text-gray-600">Loading subjects...</p>
        </div>
      )}

      {/* Subjects Table */}
      {!isLoading && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {subjects.length === 0 ? (
            <div className="p-8 text-center text-gray-600">
              <p className="text-lg mb-2">No subjects found</p>
              <Link href="/master-data/subjects/create" className="text-primary hover:underline">
                Create the first subject
              </Link>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Name</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Code</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Type</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Capacity</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {subjects.map((subject) => (
                    <tr key={subject.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900">{subject.name}</p>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        <span className="bg-gray-100 px-3 py-1 rounded-full text-sm font-mono">
                          {subject.code}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getTrackingTypeColor(subject.trackingType)}`}>
                          {subject.trackingType === 'MODULE_BASED' ? 'Module Based' : 'Free Material'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600 text-sm">
                        {subject.maxCapacityRegular ? `Regular: ${subject.maxCapacityRegular} / Private: ${subject.maxCapacityPrivate || '-'}` : '-'}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                          Active
                        </span>
                      </td>
                      <td className="px-6 py-4 space-x-2 flex">
                        <Link
                          href={`/master-data/subjects/${subject.id}`}
                          className="text-primary hover:underline text-sm font-medium"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => handleDelete(subject.id)}
                          className="text-red-600 hover:underline text-sm font-medium"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
              {subjects.length > 0 && pagination && (
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
      )}
    </div>
  )
}
