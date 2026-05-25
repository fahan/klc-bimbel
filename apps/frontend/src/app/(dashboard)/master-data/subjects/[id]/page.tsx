'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { useQueryClient } from '@tanstack/react-query'
import { subjectApi } from '@/lib/api/endpoints'

const subjectSchema = z.object({
  name: z.string().min(3).max(100).optional(),
  code: z.string().min(2).max(20).optional(),
  trackingType: z.enum(['MODULE_BASED', 'FREE_MATERIAL']).optional(),
  capacity: z.string().optional().transform(v => v ? parseInt(v) : undefined),
  maxCapacity: z.string().optional().transform(v => v ? parseInt(v) : undefined),
  commissionPercentage: z.string().optional().transform(v => v ? parseFloat(v) : undefined),
})

type SubjectFormData = z.infer<typeof subjectSchema>

interface Subject {
  id: string
  name: string
  code: string
  trackingType: string
  maxCapacityRegular?: number
  maxCapacityPrivate?: number
  commissionPercentage?: number
  isActive: boolean
}

export default function EditSubjectPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const params = useParams()
  const id = params.id as string

  const [subject, setSubject] = useState<Subject | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [pageError, setPageError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<SubjectFormData>({
    resolver: zodResolver(subjectSchema),
  })

  useEffect(() => {
    const fetchSubject = async () => {
      try {
        const response = await subjectApi.getOne(id)
        const data = response.data.data
        setSubject(data)
        reset({
          name: data.name,
          code: data.code,
          trackingType: data.trackingType,
          capacity: data.maxCapacityRegular?.toString() || '',
          maxCapacity: data.maxCapacityPrivate?.toString() || '',
          commissionPercentage: data.commissionPercentage?.toString() || '',
        })
      } catch (err: any) {
        setPageError(err.response?.data?.message || 'Failed to load subject')
      }
    }

    if (id) fetchSubject()
  }, [id, reset])

  // Update page title when subject data loads
  useEffect(() => {
    if (subject) {
      document.title = `${subject.name} - Detail Mata Pelajaran`
    }
  }, [subject])

  const onSubmit = async (data: SubjectFormData) => {
    try {
      setIsLoading(true)
      setError('')

      await subjectApi.update(id, {
        name: data.name,
        code: data.code,
        trackingType: data.trackingType,
        capacity: data.capacity,
        maxCapacity: data.maxCapacity,
        commissionPercentage: data.commissionPercentage,
      })

      await queryClient.invalidateQueries({ queryKey: ['subjects'] })
      router.push('/master-data/subjects')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update subject')
    } finally {
      setIsLoading(false)
    }
  }

  if (pageError) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/master-data/subjects" className="text-primary hover:underline">
            ← Subjects
          </Link>
          <h1 className="text-2xl font-bold text-primary">Edit Subject</h1>
        </div>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {pageError}
        </div>
      </div>
    )
  }

  if (!subject) {
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
        <Link href="/master-data/subjects" className="text-primary hover:underline">
          ← Subjects
        </Link>
        <h1 className="text-2xl font-bold text-primary">Edit Subject</h1>
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
              Subject Name
            </label>
            <input
              id="name"
              type="text"
              {...register('name')}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={isLoading}
            />
          </div>

          {/* Code Field */}
          <div>
            <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
              Subject Code
            </label>
            <input
              id="code"
              type="text"
              {...register('code')}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                errors.code ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={isLoading}
            />
          </div>


          {/* Tracking Type Field */}
          <div>
            <label htmlFor="trackingType" className="block text-sm font-medium text-gray-700 mb-1">
              Tracking Type
            </label>
            <select
              id="trackingType"
              {...register('trackingType')}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                errors.trackingType ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={isLoading}
            >
              <option value="">-- Select Type --</option>
              <option value="MODULE_BASED">Module Based</option>
              <option value="FREE_MATERIAL">Free Material</option>
            </select>
          </div>

          {/* Capacity Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="capacity" className="block text-sm font-medium text-gray-700 mb-1">
                Capacity
              </label>
              <input
                id="capacity"
                type="number"
                min="1"
                {...register('capacity')}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                  errors.capacity ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={isLoading}
              />
            </div>
            <div>
              <label htmlFor="maxCapacity" className="block text-sm font-medium text-gray-700 mb-1">
                Max Capacity
              </label>
              <input
                id="maxCapacity"
                type="number"
                min="1"
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
              {...register('commissionPercentage')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500 mt-1">Persentase dari SPP yang diterima guru untuk mata pelajaran ini.</p>
          </div>

          {/* Status Info */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">
              Status: <span className="font-semibold text-gray-900">{subject.isActive ? '✓ Active' : '✗ Inactive'}</span>
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
