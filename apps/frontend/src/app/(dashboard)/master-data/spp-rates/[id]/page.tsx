'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { useQueryClient } from '@tanstack/react-query'
import { sppRateApi, subjectApi } from '@/lib/api/endpoints'

const rateSchema = z.object({
  subjectId: z.string().optional(),
  type: z.enum(['REGULAR', 'PRIVATE']).optional(),
  amount: z.string().optional().transform(v => v ? parseInt(v) : undefined),
  effectiveFrom: z.string().optional(),
  effectiveUntil: z.string().transform(v => v === '' ? null : v).nullable(),
})

type RateFormData = z.infer<typeof rateSchema>

interface SppRate {
  id: string
  subjectId: string
  type: string
  amount: number
  effectiveFrom: string
  effectiveUntil?: string
  createdAt: string
}

interface Subject {
  id: string
  name: string
  code: string
}

// Helper function to calculate rate status
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

export default function EditSppRatePage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const params = useParams()
  const id = params.id as string

  const [rate, setRate] = useState<SppRate | null>(null)
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [pageError, setPageError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<RateFormData>({
    resolver: zodResolver(rateSchema),
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [rateRes, subjectsRes] = await Promise.all([
          sppRateApi.getOne(id),
          subjectApi.getAll(),
        ])

        const rateData = rateRes.data.data
        setRate(rateData)
        setSubjects(subjectsRes.data.data || [])

        reset({
          subjectId: rateData.subjectId,
          type: rateData.type,
          amount: rateData.amount.toString(),
          effectiveFrom: rateData.effectiveFrom.split('T')[0],
          effectiveUntil: rateData.effectiveUntil ? rateData.effectiveUntil.split('T')[0] : '',
        })
      } catch (err: any) {
        setPageError(err.response?.data?.message || 'Failed to load SPP rate')
      }
    }

    if (id) fetchData()
  }, [id, reset])

  // Update page title when rate data loads
  useEffect(() => {
    if (rate && subjects.length > 0) {
      const subject = subjects.find(s => s.id === rate.subjectId)
      const title = subject ? `${subject.name} - ${rate.type}` : `Tarif SPP ${rate.type}`
      document.title = `${title} - Detail Tarif SPP`
    }
  }, [rate, subjects])

  const onSubmit = async (data: RateFormData) => {
    try {
      setIsLoading(true)
      setError('')

      await sppRateApi.update(id, {
        subjectId: data.subjectId || rate?.subjectId,
        type: data.type || rate?.type,
        amount: data.amount || rate?.amount,
        effectiveFrom: data.effectiveFrom || rate?.effectiveFrom,
        effectiveUntil: data.effectiveUntil || null,
      })

      // Invalidate SPP rates cache
      await queryClient.invalidateQueries({ queryKey: ['spp-rates'] })

      router.push('/master-data/spp-rates')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update SPP rate')
    } finally {
      setIsLoading(false)
    }
  }

  if (pageError) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/master-data/spp-rates" className="text-primary hover:underline">
            ← SPP Rates
          </Link>
          <h1 className="text-2xl font-bold text-primary">Edit SPP Rate</h1>
        </div>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {pageError}
        </div>
      </div>
    )
  }

  if (!rate) {
    return (
      <div className="max-w-2xl mx-auto">
        <p className="text-gray-600">Loading...</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/master-data/spp-rates" className="text-primary hover:underline">
          ← SPP Rates
        </Link>
        <h1 className="text-2xl font-bold text-primary">Edit SPP Rate</h1>
      </div>

      {/* Form Card */}
      <div className="bg-white rounded-lg shadow-md p-6">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Subject Field */}
          <div>
            <label htmlFor="subjectId" className="block text-sm font-medium text-gray-700 mb-1">
              Subject
            </label>
            <select
              id="subjectId"
              {...register('subjectId')}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                errors.subjectId ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={isLoading}
            >
              <option value="">-- Select Subject --</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name} ({subject.code})
                </option>
              ))}
            </select>
          </div>

          {/* Type Field */}
          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
              Type
            </label>
            <select
              id="type"
              {...register('type')}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                errors.type ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={isLoading}
            >
              <option value="">-- Select Type --</option>
              <option value="REGULAR">Regular Class</option>
              <option value="PRIVATE">Private Class</option>
            </select>
          </div>

          {/* Amount Field */}
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
              Amount (IDR)
            </label>
            <input
              id="amount"
              type="number"
              min="0"
              {...register('amount')}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                errors.amount ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={isLoading}
            />
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="effectiveFrom" className="block text-sm font-medium text-gray-700 mb-1">
                Effective From
              </label>
              <input
                id="effectiveFrom"
                type="date"
                {...register('effectiveFrom')}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                  errors.effectiveFrom ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={isLoading}
              />
            </div>
            <div>
              <label htmlFor="effectiveUntil" className="block text-sm font-medium text-gray-700 mb-1">
                Effective Until
              </label>
              <input
                id="effectiveUntil"
                type="date"
                {...register('effectiveUntil')}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                  errors.effectiveUntil ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Status Info */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">
              Status:{' '}
              <span
                className={`font-semibold px-2 py-1 rounded text-sm ${
                  calculateRateStatus(rate.effectiveFrom, rate.effectiveUntil).color
                }`}
              >
                {calculateRateStatus(rate.effectiveFrom, rate.effectiveUntil).status}
              </span>
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-primary hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
            <Link
              href="/master-data/spp-rates"
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 rounded-lg transition text-center"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
