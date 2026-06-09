'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { useQueryClient } from '@tanstack/react-query'
import { sppRateApi, subjectApi } from '@/lib/api/endpoints'

const rateSchema = z.object({
  subjectId: z.string().min(1, 'Subject is required'),
  type: z.enum(['REGULAR', 'PRIVATE']),
  billingType: z.enum(['FLAT_MONTHLY', 'PER_SESSION']),
  amount: z.string().min(1, 'Amount is required').transform(v => parseInt(v)),
  effectiveFrom: z.string().min(1, 'Effective from date is required'),
  effectiveUntil: z.string().transform(v => v === '' ? null : v).nullable(),
})

type RateFormData = z.infer<typeof rateSchema>

interface Subject {
  id: string
  name: string
  code: string
}

export default function CreateSppRatePage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [subjectsLoading, setSubjectsLoading] = useState(true)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RateFormData>({
    resolver: zodResolver(rateSchema),
    defaultValues: {
      type: 'REGULAR',
      billingType: 'FLAT_MONTHLY',
    },
  })

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const response = await subjectApi.getAll()
        setSubjects(response.data.data || [])
      } catch (err: any) {
        console.error('Failed to load subjects:', err)
      } finally {
        setSubjectsLoading(false)
      }
    }

    fetchSubjects()
  }, [])

  const onSubmit = async (data: RateFormData) => {
    try {
      setIsLoading(true)
      setError('')

      await sppRateApi.create({
        subjectId: data.subjectId,
        type: data.type,
        billingType: data.billingType,
        amount: data.amount,
        effectiveFrom: data.effectiveFrom,
        effectiveUntil: data.effectiveUntil || null,
      })

      // Invalidate SPP rates cache
      await queryClient.invalidateQueries({ queryKey: ['spp-rates'] })

      router.push('/master-data/spp-rates')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create SPP rate')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/master-data/spp-rates" className="text-primary hover:underline">
          ← SPP Rates
        </Link>
        <h1 className="text-2xl font-bold text-primary">Create New SPP Rate</h1>
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
              Subject *
            </label>
            <select
              id="subjectId"
              {...register('subjectId')}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                errors.subjectId ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={isLoading || subjectsLoading}
            >
              <option value="">-- Select Subject --</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name} ({subject.code})
                </option>
              ))}
            </select>
            {errors.subjectId && (
              <p className="text-red-500 text-sm mt-1">{errors.subjectId.message}</p>
            )}
          </div>

          {/* Type Field */}
          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
              Type *
            </label>
            <select
              id="type"
              {...register('type')}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                errors.type ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={isLoading}
            >
              <option value="REGULAR">Regular Class</option>
              <option value="PRIVATE">Private Class</option>
            </select>
            {errors.type && <p className="text-red-500 text-sm mt-1">{errors.type.message}</p>}
          </div>

          {/* Billing Type Field */}
          <div>
            <label htmlFor="billingType" className="block text-sm font-medium text-gray-700 mb-1">
              Model Billing *
            </label>
            <select
              id="billingType"
              {...register('billingType')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={isLoading}
            >
              <option value="FLAT_MONTHLY">Flat Bulanan — nominal tetap per bulan</option>
              <option value="PER_SESSION">Per Pertemuan — nominal × jumlah sesi hadir</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Per Pertemuan: nominal yang diinput adalah harga per sesi, bukan per bulan.
            </p>
          </div>

          {/* Amount Field */}
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
              Amount (IDR) *
            </label>
            <input
              id="amount"
              type="number"
              placeholder="e.g., 500000"
              min="0"
              {...register('amount')}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                errors.amount ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={isLoading}
            />
            {errors.amount && <p className="text-red-500 text-sm mt-1">{errors.amount.message}</p>}
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="effectiveFrom" className="block text-sm font-medium text-gray-700 mb-1">
                Effective From *
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
              {errors.effectiveFrom && (
                <p className="text-red-500 text-sm mt-1">{errors.effectiveFrom.message}</p>
              )}
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
              <p className="text-xs text-gray-500 mt-1">Leave empty for no end date</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={isLoading || subjectsLoading}
              className="flex-1 bg-primary hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Creating...' : 'Create Rate'}
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

      {/* Info Box */}
      <div className="mt-6 bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> The effective from date must be before the effective until date. You can leave the until date empty for an ongoing rate.
        </p>
      </div>
    </div>
  )
}
