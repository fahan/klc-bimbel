'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
  registrationFee: z.coerce.number().int().min(0, 'Biaya registrasi tidak boleh negatif'),
})

type BranchFormData = z.infer<typeof branchSchema>

export default function CreateBranchPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BranchFormData>({
    resolver: zodResolver(branchSchema),
    defaultValues: { registrationFee: 200000 },
  })

  const onSubmit = async (data: BranchFormData) => {
    try {
      setIsLoading(true)
      setError('')

      await branchApi.create({
        name: data.name,
        code: data.code,
        address: data.address || null,
        phone: data.phone || null,
        registrationFee: data.registrationFee,
      })

      await queryClient.invalidateQueries({ queryKey: ['branches'] })
      router.push('/master-data/branches')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create branch')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/master-data/branches" className="text-primary hover:underline">
          ← Branches
        </Link>
        <h1 className="text-2xl font-bold text-primary">Create New Branch</h1>
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
              placeholder="e.g., Cabang Purwokerto"
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
              placeholder="e.g., PWK"
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
              placeholder="e.g., Jl. Jendral Sudirman No. 123"
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
              placeholder="e.g., 0281-6123456"
              {...register('phone')}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                errors.phone ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={isLoading}
            />
            {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>}
          </div>

          {/* Registration Fee Field */}
          <div>
            <label htmlFor="registrationFee" className="block text-sm font-medium text-gray-700 mb-1">
              Biaya Registrasi (Rp) *
            </label>
            <input
              id="registrationFee"
              type="number"
              min="0"
              step="1000"
              {...register('registrationFee')}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                errors.registrationFee ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={isLoading}
            />
            {errors.registrationFee && <p className="text-red-500 text-sm mt-1">{errors.registrationFee.message}</p>}
            <p className="text-xs text-gray-500 mt-1">Biaya pendaftaran siswa baru di cabang ini</p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-primary hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Creating...' : 'Create Branch'}
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

      {/* Info Box */}
      <div className="mt-6 bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> Branch name and code must be unique. The branch code should be a short identifier (2-20 characters).
        </p>
      </div>
    </div>
  )
}
