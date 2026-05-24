'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { useQueryClient } from '@tanstack/react-query'
import { curriculumModuleApi, subjectApi } from '@/lib/api/endpoints'

const moduleSchema = z.object({
  subjectId: z.string().min(1, 'Subject is required'),
  orderNumber: z.coerce.number().min(1, 'Order number is required'),
  name: z.string().min(3, 'Name must be at least 3 characters').max(200),
  totalChapters: z.coerce.number().min(1, 'Total chapters is required'),
})

type ModuleFormData = z.infer<typeof moduleSchema>

interface Subject {
  id: string
  name: string
  code: string
}

export default function CreateCurriculumModulePage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [subjectsLoading, setSubjectsLoading] = useState(true)
  const [selectedSubject, setSelectedSubject] = useState<string>('')
  const [nextOrderNumber, setNextOrderNumber] = useState<number>(1)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<ModuleFormData>({
    resolver: zodResolver(moduleSchema),
    defaultValues: {
      orderNumber: 1,
      totalChapters: 1,
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

  // Update order number when subject changes
  const handleSubjectChange = async (subjectId: string) => {
    setSelectedSubject(subjectId)
    setValue('subjectId', subjectId)

    // Get the highest order number for this subject
    try {
      const response = await curriculumModuleApi.getBySubject(subjectId)
      const modules = response.data.data || []
      const maxOrder = modules.length > 0
        ? Math.max(...modules.map((m: any) => m.orderNumber))
        : 0
      setNextOrderNumber(maxOrder + 1)
      setValue('orderNumber', maxOrder + 1)
    } catch (err) {
      console.error('Failed to get module count:', err)
      setNextOrderNumber(1)
      setValue('orderNumber', 1)
    }
  }

  const onSubmit = async (data: ModuleFormData) => {
    try {
      setIsLoading(true)
      setError('')

      await curriculumModuleApi.create({
        subjectId: data.subjectId,
        orderNumber: data.orderNumber,
        name: data.name,
        totalChapters: data.totalChapters,
      })

      await queryClient.invalidateQueries({ queryKey: ['curriculum-modules'] })
      router.push('/master-data/curriculum-modules')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create module')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/master-data/curriculum-modules" className="text-primary hover:underline">
          ← Curriculum Modules
        </Link>
        <h1 className="text-2xl font-bold text-primary">Create New Module</h1>
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
              onChange={(e) => handleSubjectChange(e.target.value)}
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

          {/* Order Number Field */}
          <div>
            <label htmlFor="orderNumber" className="block text-sm font-medium text-gray-700 mb-1">
              Order Number *
            </label>
            <input
              id="orderNumber"
              type="number"
              min="1"
              placeholder="e.g., 1"
              {...register('orderNumber')}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                errors.orderNumber ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={isLoading}
            />
            {errors.orderNumber && (
              <p className="text-red-500 text-sm mt-1">{errors.orderNumber.message}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              {selectedSubject && `Next auto-suggested: ${nextOrderNumber}`}
            </p>
          </div>

          {/* Module Name Field */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Module Name *
            </label>
            <input
              id="name"
              type="text"
              placeholder="e.g., Bab 1: Bilangan Bulat"
              {...register('name')}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={isLoading}
            />
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
          </div>

          {/* Total Chapters Field */}
          <div>
            <label htmlFor="totalChapters" className="block text-sm font-medium text-gray-700 mb-1">
              Total Chapters *
            </label>
            <input
              id="totalChapters"
              type="number"
              min="1"
              placeholder="e.g., 5"
              {...register('totalChapters')}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                errors.totalChapters ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={isLoading}
            />
            {errors.totalChapters && (
              <p className="text-red-500 text-sm mt-1">{errors.totalChapters.message}</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={isLoading || subjectsLoading}
              className="flex-1 bg-primary hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Creating...' : 'Create Module'}
            </button>
            <Link
              href="/master-data/curriculum-modules"
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
          <strong>Note:</strong> Each module must have a unique order number within the same subject. The system will auto-suggest the next available number.
        </p>
      </div>
    </div>
  )
}
