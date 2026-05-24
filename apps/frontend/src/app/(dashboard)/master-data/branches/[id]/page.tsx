'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { useQueryClient } from '@tanstack/react-query'
import { branchApi } from '@/lib/api/endpoints'

const branchSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters').max(100),
  code: z.string().min(2, 'Code must be at least 2 characters').max(20),
  address: z.string().optional(),
  phone: z.string().optional(),
})

type BranchFormData = z.infer<typeof branchSchema>

interface Branch {
  id: string
  name: string
  code: string
  address?: string
  phone?: string
  isActive: boolean
}

export default function EditBranchPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const params = useParams()
  const id = params.id as string

  const [branch, setBranch] = useState<Branch | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [pageError, setPageError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<BranchFormData>({
    resolver: zodResolver(branchSchema),
  })

  // Fetch branch data
  useEffect(() => {
    const fetchBranch = async () => {
      try {
        const response = await branchApi.getOne(id)
        const data = response.data.data
        setBranch(data)
        reset({
          name: data.name,
          code: data.code,
          address: data.address || '',
          phone: data.phone || '',
        })
      } catch (err: any) {
        setPageError(err.response?.data?.message || 'Failed to load branch')
      }
    }

    if (id) fetchBranch()
  }, [id, reset])

  // Update page title when branch data loads
  useEffect(() => {
    if (branch) {
      document.title = `${branch.name} - Detail Cabang`
    }
  }, [branch])

  const onSubmit = async (data: BranchFormData) => {
    try {
      setIsLoading(true)
      setError('')

      await branchApi.update(id, {
        name: data.name,
        code: data.code,
        address: data.address || null,
        phone: data.phone || null,
      })

      await queryClient.invalidateQueries({ queryKey: ['branches'] })
      router.push('/master-data/branches')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update branch')
    } finally {
      setIsLoading(false)
    }
  }

  if (pageError) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/master-data/branches" className="text-primary hover:underline">
            ← Branches
          </Link>
          <h1 className="text-2xl font-bold text-primary">Edit Branch</h1>
        </div>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {pageError}
        </div>
      </div>
    )
  }

  if (!branch) {
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
        <Link href="/master-data/branches" className="text-primary hover:underline">
          ← Branches
        </Link>
        <h1 className="text-2xl font-bold text-primary">Edit Branch</h1>
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
              Branch Name *
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
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
          </div>

          {/* Code Field */}
          <div>
            <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
              Branch Code *
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
            {errors.code && <p className="text-red-500 text-sm mt-1">{errors.code.message}</p>}
          </div>

          {/* Address Field */}
          <div>
            <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
              Address
            </label>
            <input
              id="address"
              type="text"
              {...register('address')}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                errors.address ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={isLoading}
            />
            {errors.address && <p className="text-red-500 text-sm mt-1">{errors.address.message}</p>}
          </div>

          {/* Phone Field */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              Phone
            </label>
            <input
              id="phone"
              type="tel"
              {...register('phone')}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                errors.phone ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={isLoading}
            />
            {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>}
          </div>

          {/* Status Info */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">
              Status: <span className="font-semibold text-gray-900">{branch.isActive ? '✓ Active' : '✗ Inactive'}</span>
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
              href="/master-data/branches"
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
