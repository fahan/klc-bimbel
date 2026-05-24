'use client'

import React, { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { branchApi } from '@/lib/api/endpoints'
import { useForm } from 'react-hook-form'

interface StudentData {
  name: string
  classLevel: string | null
  parentName: string | null
  parentPhone: string | null
  branchId: string
}

interface EnrollmentStep1Props {
  onComplete: (data: Partial<StudentData>) => void
  initialData?: Partial<StudentData>
}

export default function EnrollmentStep1({ onComplete, initialData }: EnrollmentStep1Props) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Partial<StudentData>>({
    defaultValues: {
      name: initialData?.name || '',
      classLevel: initialData?.classLevel || '',
      parentName: initialData?.parentName || '',
      parentPhone: initialData?.parentPhone || '',
      branchId: initialData?.branchId || '',
    },
  })

  // Re-populate form when initialData changes (e.g., user navigates back to edit)
  useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name || '',
        classLevel: initialData.classLevel || '',
        parentName: initialData.parentName || '',
        parentPhone: initialData.parentPhone || '',
        branchId: initialData.branchId || '',
      })
    }
  }, [initialData, reset])

  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchApi.getAll(),
  })

  const branches = branchesData?.data?.data || []

  const onSubmit = (formData: any) => {
    onComplete(formData)
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Siswa</h3>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Nama Lengkap */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nama Lengkap <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            {...register('name', { required: 'Nama siswa wajib diisi' })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Nama lengkap siswa"
          />
          {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
        </div>

        {/* Kelas */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Kelas</label>
          <input
            type="text"
            {...register('classLevel')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Misal: 3 SD"
          />
        </div>

        {/* No. HP Orang Tua */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            No. HP Orang Tua <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            {...register('parentPhone', { required: 'No. HP orang tua wajib diisi' })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="08xx xxxx xxxx"
          />
          {errors.parentPhone && (
            <p className="text-red-500 text-xs mt-1">{errors.parentPhone.message}</p>
          )}
        </div>

        {/* Nama Orang Tua */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nama Orang Tua</label>
          <input
            type="text"
            {...register('parentName')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Nama orang tua / wali"
          />
        </div>

        {/* Cabang */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Cabang <span className="text-red-500">*</span>
          </label>
          <select
            {...register('branchId', { required: 'Cabang wajib dipilih' })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Pilih cabang...</option>
            {branches.map((branch: any) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
          {errors.branchId && (
            <p className="text-red-500 text-xs mt-1">{errors.branchId.message}</p>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
        >
          {initialData?.name ? 'Simpan Perubahan →' : 'Lanjut ke Mata Pelajaran →'}
        </button>
      </form>
    </div>
  )
}
