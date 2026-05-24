'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { useQueryClient } from '@tanstack/react-query'
import { subjectApi } from '@/lib/api/endpoints'

const subjectSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters').max(100),
  code: z.string().min(2, 'Code must be at least 2 characters').max(20),
  trackingType: z.enum(['MODULE_BASED', 'FREE_MATERIAL']),
  capacity: z.string().optional().transform(v => v ? parseInt(v) : undefined),
  maxCapacity: z.string().optional().transform(v => v ? parseInt(v) : undefined),
  commissionPercentage: z.string().optional().transform(v => v ? parseFloat(v) : undefined),
})

type SubjectFormData = z.infer<typeof subjectSchema>

export default function CreateSubjectPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SubjectFormData>({
    resolver: zodResolver(subjectSchema),
    defaultValues: {
      trackingType: 'MODULE_BASED',
    },
  })

  const onSubmit = async (data: SubjectFormData) => {
    try {
      setIsLoading(true)
      setError('')

      await subjectApi.create({
        name: data.name,
        code: data.code,
        trackingType: data.trackingType,
        capacity: data.capacity || undefined,
        maxCapacity: data.maxCapacity || undefined,
        commissionPercentage: data.commissionPercentage || undefined,
      })

      await queryClient.invalidateQueries({ queryKey: ['subjects'] })
      router.push('/master-data/subjects')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create subject')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/master-data/subjects" className="text-primary hover:underline">
          ← Subjects
        </Link>
        <h1 className="text-2xl font-bold text-primary">Create New Subject</h1>
      </div>

      {/* Form Card */}
      <div className="bg-white rounded-lg shadow-md p-6">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Name Field */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Subject Name *
            </label>
            <input
              id="name"
              type="text"
              placeholder="e.g., Matematika"
              {...register('name')}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={isLoading}
            />
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
          </div>

          {/* Code Field */}
          <div>
            <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
              Subject Code *
            </label>
            <input
              id="code"
              type="text"
              placeholder="e.g., MAT"
              {...register('code')}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                errors.code ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={isLoading}
            />
            {errors.code && <p className="text-red-500 text-sm mt-1">{errors.code.message}</p>}
          </div>


          {/* Tracking Type Field */}
          <div>
            <label htmlFor="trackingType" className="block text-sm font-medium text-gray-700 mb-1">
              Tracking Type *
            </label>
            <select
              id="trackingType"
              {...register('trackingType')}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                errors.trackingType ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={isLoading}
            >
              <option value="MODULE_BASED">Module Based</option>
              <option value="FREE_MATERIAL">Free Material</option>
            </select>
            {errors.trackingType && (
              <p className="text-red-500 text-sm mt-1">{errors.trackingType.message}</p>
            )}
          </div>

          {/* Capacity Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="capacity" className="block text-sm font-medium text-gray-700 mb-1">
                Regular Class Capacity
              </label>
              <input
                id="capacity"
                type="number"
                min="1"
                placeholder="e.g., 3"
                {...register('capacity')}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                  errors.capacity ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={isLoading}
              />
            </div>
            <div>
              <label htmlFor="maxCapacity" className="block text-sm font-medium text-gray-700 mb-1">
                Private Class Capacity
              </label>
              <input
                id="maxCapacity"
                type="number"
                min="1"
                placeholder="e.g., 1"
                {...register('maxCapacity')}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                  errors.maxCapacity ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Commission Percentage */}
          <div>
            <label htmlFor="commissionPercentage" className="block text-sm font-medium text-gray-700 mb-1">
              Persentase Komisi Guru (%)
            </label>
            <input
              id="commissionPercentage"
              type="number"
              min="0"
              max="100"
              step="0.01"
              placeholder="Default: 40"
              {...register('commissionPercentage')}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                errors.commissionPercentage ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500 mt-1">Persentase dari SPP yang diterima guru. Kosongkan untuk pakai default (40%).</p>
            {errors.commissionPercentage && <p className="text-red-500 text-sm mt-1">{errors.commissionPercentage.message}</p>}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-primary hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Creating...' : 'Create Subject'}
            </button>
            <Link
              href="/master-data/subjects"
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
