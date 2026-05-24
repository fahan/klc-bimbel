'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { useQueryClient } from '@tanstack/react-query'
import { curriculumModuleApi, subjectApi } from '@/lib/api/endpoints'

const moduleSchema = z.object({
  subjectId: z.string().optional(),
  orderNumber: z.string().optional().transform(v => v ? parseInt(v) : undefined),
  name: z.string().optional(),
  totalChapters: z.string().optional().transform(v => v ? parseInt(v) : undefined),
})

type ModuleFormData = z.infer<typeof moduleSchema>

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
  code: string
}

export default function EditCurriculumModulePage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const params = useParams()
  const id = params.id as string

  const [module, setModule] = useState<CurriculumModule | null>(null)
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [pageError, setPageError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ModuleFormData>({
    resolver: zodResolver(moduleSchema),
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [moduleRes, subjectsRes] = await Promise.all([
          curriculumModuleApi.getOne(id),
          subjectApi.getAll(),
        ])

        const moduleData = moduleRes.data.data
        setModule(moduleData)
        setSubjects(subjectsRes.data.data || [])

        reset({
          subjectId: moduleData.subjectId,
          orderNumber: moduleData.orderNumber.toString(),
          name: moduleData.name,
          totalChapters: moduleData.totalChapters.toString(),
        })
      } catch (err: any) {
        setPageError(err.response?.data?.message || 'Failed to load curriculum module')
      }
    }

    if (id) fetchData()
  }, [id, reset])

  // Update page title when module data loads
  useEffect(() => {
    if (module) {
      document.title = `${module.name} - Detail Modul Kurikulum`
    }
  }, [module])

  const onSubmit = async (data: ModuleFormData) => {
    try {
      setIsLoading(true)
      setError('')

      await curriculumModuleApi.update(id, {
        subjectId: data.subjectId || module?.subjectId,
        orderNumber: data.orderNumber || module?.orderNumber,
        name: data.name || module?.name,
        totalChapters: data.totalChapters || module?.totalChapters,
      })

      await queryClient.invalidateQueries({ queryKey: ['curriculum-modules'] })
      router.push('/master-data/curriculum-modules')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update module')
    } finally {
      setIsLoading(false)
    }
  }

  if (pageError) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/master-data/curriculum-modules" className="text-primary hover:underline">
            ← Curriculum Modules
          </Link>
          <h1 className="text-2xl font-bold text-primary">Edit Module</h1>
        </div>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {pageError}
        </div>
      </div>
    )
  }

  if (!module) {
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
        <Link href="/master-data/curriculum-modules" className="text-primary hover:underline">
          ← Curriculum Modules
        </Link>
        <h1 className="text-2xl font-bold text-primary">Edit Module</h1>
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

          {/* Order Number Field */}
          <div>
            <label htmlFor="orderNumber" className="block text-sm font-medium text-gray-700 mb-1">
              Order Number
            </label>
            <input
              id="orderNumber"
              type="number"
              min="1"
              {...register('orderNumber')}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                errors.orderNumber ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={isLoading}
            />
          </div>

          {/* Module Name Field */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Module Name
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

          {/* Total Chapters Field */}
          <div>
            <label htmlFor="totalChapters" className="block text-sm font-medium text-gray-700 mb-1">
              Total Chapters
            </label>
            <input
              id="totalChapters"
              type="number"
              min="1"
              {...register('totalChapters')}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                errors.totalChapters ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={isLoading}
            />
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
              href="/master-data/curriculum-modules"
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
