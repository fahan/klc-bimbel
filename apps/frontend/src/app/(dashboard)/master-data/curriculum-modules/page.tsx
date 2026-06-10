'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { curriculumModuleApi, subjectApi } from '@/lib/api/endpoints'
import { usePagination } from '@/hooks/usePagination'
import { Pagination } from '@/components/ui/Pagination'

interface CurriculumModule {
  id: string
  subjectId: string
  orderNumber: number
  name: string
  totalChapters: number
}

interface Subject {
  id: string
  name: string
}

export default function CurriculumModulesPage() {
  const [subjects, setSubjects] = useState<Map<string, string>>(new Map())
  const [error, setError] = useState('')
  const { items: modules, page, limit, setPage, setLimit, pagination, isLoading, refetch } = usePagination({
    queryKey: ['curriculum-modules'],
    queryFn: (page, limit) => curriculumModuleApi.getAll(page, limit),
    initialLimit: 10,
  })

  useEffect(() => {
    fetchSubjects()
  }, [])

  const fetchSubjects = async () => {
    try {
      const subjectsRes = await subjectApi.getAll()

      // Create map of subject ID to name
      const subjectMap = new Map()
      subjectsRes.data.data?.forEach((s: Subject) => {
        subjectMap.set(s.id, s.name)
      })
      setSubjects(subjectMap)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load subjects')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this module?')) return

    try {
      await curriculumModuleApi.delete(id)
      refetch()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete module')
    }
  }

  // Group modules by subject
  const modulesBySubject = new Map<string, CurriculumModule[]>()
  modules.forEach((mod) => {
    if (!modulesBySubject.has(mod.subjectId)) {
      modulesBySubject.set(mod.subjectId, [])
    }
    modulesBySubject.get(mod.subjectId)!.push(mod)
  })

  // Sort modules by order number within each subject
  Array.from(modulesBySubject.values()).forEach((mods) => {
    mods.sort((a, b) => a.orderNumber - b.orderNumber)
  })

  return (
    <div className="space-y-4">
      {/* Header with Create Button */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-primary">Curriculum Modules</h1>
        <Link
          href="/master-data/curriculum-modules/create"
          className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
        >
          + Add Module
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
          <p className="text-gray-600">Loading curriculum modules...</p>
        </div>
      )}

      {/* Modules by Subject */}
      {!isLoading && (
        <>
          {modules.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-600">
              <p className="text-lg mb-2">No curriculum modules found</p>
              <Link href="/master-data/curriculum-modules/create" className="text-primary hover:underline">
                Create the first module
              </Link>
            </div>
          ) : (
            <>
              <div className="space-y-6">
                {Array.from(modulesBySubject.entries()).map(([subjectId, subjectModules]) => (
                  <div key={subjectId} className="bg-white rounded-lg shadow-md overflow-hidden">
                    {/* Subject Header */}
                    <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-4">
                      <h2 className="text-lg font-semibold">{subjects.get(subjectId) || 'Unknown'}</h2>
                      <p className="text-sm text-blue-100">{subjectModules.length} modules</p>
                    </div>

                    {/* Modules Table */}
                    <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Order</th>
                          <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Module Name</th>
                          <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Chapters</th>
                          <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {subjectModules.map((module) => (
                          <tr key={module.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-800 rounded-full font-semibold text-sm">
                                {module.orderNumber}
                              </span>
                            </td>
                            <td className="px-6 py-4 font-medium text-gray-900">{module.name}</td>
                            <td className="px-6 py-4 text-gray-600">
                              <span className="bg-gray-100 px-3 py-1 rounded-full text-sm">
                                {module.totalChapters} chapters
                              </span>
                            </td>
                            <td className="px-6 py-4 space-x-2 flex">
                              <Link
                                href={`/master-data/curriculum-modules/${module.id}`}
                                className="text-primary hover:underline text-sm font-medium"
                              >
                                Edit
                              </Link>
                              <button
                                onClick={() => handleDelete(module.id)}
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
                  </div>
                ))}
              </div>
              {modules.length > 0 && pagination && (
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
        </>
      )}
    </div>
  )
}
