'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { sppRateApi, subjectApi } from '@/lib/api/endpoints'
import { usePagination } from '@/hooks/usePagination'
import { Pagination } from '@/components/ui/Pagination'
import { ErrorState } from '@/components/ui/States'

interface SppRate {
  id: string
  subjectId: string
  type: string
  amount: number | string
  effectiveFrom: string
  effectiveUntil?: string
}

interface Subject {
  id: string
  name: string
}

export default function SppRatesPage() {
  const [subjects, setSubjects] = useState<Map<string, string>>(new Map())
  const [error, setError] = useState('')
  const { items: rates, page, limit, setPage, setLimit, pagination, isLoading, error: queryError, refetch } = usePagination({
    queryKey: ['spp-rates'],
    queryFn: (page, limit) => sppRateApi.getAll(page, limit),
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
    if (!confirm('Are you sure you want to delete this SPP rate?')) return

    try {
      await sppRateApi.delete(id)
      refetch()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete rate')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID')
  }

  const formatCurrency = (amount: number | string) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(typeof amount === 'string' ? parseInt(amount) : amount)
  }

  const calculateRateStatus = (effectiveFrom: string, effectiveUntil?: string) => {
    const now = new Date()
    const from = new Date(effectiveFrom)
    const until = effectiveUntil ? new Date(effectiveUntil) : null

    if (now < from) {
      return { status: 'Scheduled', color: 'bg-yellow-100 text-yellow-800' }
    }
    if (until && now > until) {
      return { status: 'Expired', color: 'bg-red-100 text-red-800' }
    }
    return { status: 'Active', color: 'bg-green-100 text-green-800' }
  }

  return (
    <div className="space-y-4">
      {/* Header with Create Button */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-primary">SPP Rates</h1>
        <Link
          href="/master-data/spp-rates/create"
          className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
        >
          + Add Rate
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
          <p className="text-gray-600">Loading SPP rates...</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {rates.length === 0 ? (
            <div className="p-8 text-center text-gray-600">
              <p className="text-lg mb-2">No SPP rates found</p>
              <Link href="/master-data/spp-rates/create" className="text-primary hover:underline">
                Create the first SPP rate
              </Link>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Subject</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Type</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Billing</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Amount</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Effective From</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Until</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {rates.map((rate) => (
                    <tr key={rate.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {subjects.get(rate.subjectId) || 'Unknown'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          rate.type === 'REGULAR'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {rate.type}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          (rate as any).billingType === 'PER_SESSION'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {(rate as any).billingType === 'PER_SESSION' ? 'Per Sesi' : 'Flat Bulanan'}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-semibold text-gray-900">
                        {formatCurrency(rate.amount)}
                        <span className="text-xs font-normal text-gray-500 ml-1">
                          {(rate as any).billingType === 'PER_SESSION' ? '/sesi' : '/bln'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600 text-sm">
                        {formatDate(rate.effectiveFrom)}
                      </td>
                      <td className="px-6 py-4 text-gray-600 text-sm">
                        {rate.effectiveUntil ? formatDate(rate.effectiveUntil) : '∞'}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${
                            calculateRateStatus(rate.effectiveFrom, rate.effectiveUntil).color
                          }`}
                        >
                          {calculateRateStatus(rate.effectiveFrom, rate.effectiveUntil).status}
                        </span>
                      </td>
                      <td className="px-6 py-4 space-x-2 flex">
                        <Link
                          href={`/master-data/spp-rates/${rate.id}`}
                          className="text-primary hover:underline text-sm font-medium"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => handleDelete(rate.id)}
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
              {rates.length > 0 && pagination && (
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
