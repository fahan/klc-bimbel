'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { teacherApi, branchApi } from '@/lib/api/endpoints'
import { ArrowLeft, User, Mail, Phone, Building, Star, BookOpen, Calendar, Trash2 } from 'lucide-react'
import { StatusBadge } from '@/components/ui/Badge'
import { LoadingState } from '@/components/ui/States'

const teacherSchema = z.object({
  name: z.string().min(3, 'Nama minimal 3 karakter').max(100, 'Nama maksimal 100 karakter'),
  email: z.string().email('Format email tidak valid'),
  phone: z.string().optional(),
  branchIds: z.array(z.string()).min(1, 'Pilih minimal satu cabang'),
  isActive: z.boolean(),
})

type TeacherFormData = z.infer<typeof teacherSchema>

export default function TeacherDetailPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const teacherId = params?.id as string
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>([])
  const [isEditing, setIsEditing] = useState(false)

  const { data: teacherData, isLoading: isLoadingTeacher, refetch } = useQuery({
    queryKey: ['teacher', teacherId],
    queryFn: () => teacherApi.getOne(teacherId),
    enabled: !!teacherId,
  })

  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchApi.getAll(),
  })

  const teacher = teacherData?.data?.data
  const branches = branchesData?.data?.data || []

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<TeacherFormData>({
    resolver: zodResolver(teacherSchema),
  })

  // Update page title when teacher data loads
  useEffect(() => {
    if (teacher) {
      document.title = `${teacher.name} - Detail Guru`
    }
  }, [teacher])

  // Pre-fill form when teacher data loads
  useEffect(() => {
    if (teacher) {
      const branchIds =
        teacher.branches
          ?.sort((a: any, b: any) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0))
          .map((b: any) => b.branchId) || []
      setSelectedBranchIds(branchIds)
      reset({
        name: teacher.name,
        email: teacher.email,
        phone: teacher.phone || '',
        branchIds,
        isActive: teacher.isActive,
      })
    }
  }, [teacher, reset])

  const handleBranchToggle = (branchId: string) => {
    if (!isEditing) return
    let newSelected: string[]
    if (selectedBranchIds.includes(branchId)) {
      newSelected = selectedBranchIds.filter((id) => id !== branchId)
    } else {
      newSelected = [...selectedBranchIds, branchId]
    }
    setSelectedBranchIds(newSelected)
    setValue('branchIds', newSelected, { shouldValidate: true })
  }

  const handleMakePrimary = (branchId: string) => {
    const newSelected = [branchId, ...selectedBranchIds.filter((id) => id !== branchId)]
    setSelectedBranchIds(newSelected)
    setValue('branchIds', newSelected, { shouldValidate: true })
  }

  const onSubmit = async (data: TeacherFormData) => {
    try {
      setIsLoading(true)
      setError('')

      await teacherApi.update(teacherId, {
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        branchIds: data.branchIds,
        isActive: data.isActive,
      })

      await queryClient.invalidateQueries({ queryKey: ['teachers'] })
      setSuccessMessage('Data guru berhasil diperbarui')
      setIsEditing(false)
      refetch()

      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal memperbarui data guru')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!teacher) return
    if (confirm(`Yakin ingin menghapus guru "${teacher.name}"?`)) {
      try {
        await teacherApi.delete(teacherId)
        await queryClient.invalidateQueries({ queryKey: ['teachers'] })
        router.push('/master-data/teachers?success=deleted')
      } catch (err: any) {
        alert(err.response?.data?.message || 'Gagal menghapus guru')
      }
    }
  }

  const handleCancelEdit = () => {
    if (teacher) {
      const branchIds =
        teacher.branches
          ?.sort((a: any, b: any) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0))
          .map((b: any) => b.branchId) || []
      setSelectedBranchIds(branchIds)
      reset({
        name: teacher.name,
        email: teacher.email,
        phone: teacher.phone || '',
        branchIds,
        isActive: teacher.isActive,
      })
    }
    setIsEditing(false)
    setError('')
  }

  if (isLoadingTeacher) {
    return <LoadingState />
  }

  if (!teacher) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Guru tidak ditemukan</p>
        <Link
          href="/master-data/teachers"
          className="text-blue-600 hover:text-blue-700 font-medium mt-2 inline-block"
        >
          ← Kembali ke daftar guru
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/master-data/teachers"
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
        >
          <ArrowLeft className="w-5 h-5" />
          Kembali
        </Link>
        <div className="flex gap-2">
          {!isEditing ? (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium"
              >
                Edit Data
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg transition font-medium flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Hapus
              </button>
            </>
          ) : (
            <button
              onClick={handleCancelEdit}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition font-medium"
            >
              Batal
            </button>
          )}
        </div>
      </div>

      {/* Teacher Header */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <div className="flex items-start gap-4">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-2xl">
            {teacher.name
              .split(' ')
              .map((n: string) => n[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-gray-900">{teacher.name}</h1>
              <StatusBadge status={teacher.isActive ? 'active' : 'inactive'} />
            </div>
            <p className="text-sm text-gray-500">ID: {teacher.id}</p>
            <div className="flex items-center gap-4 mt-3 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-400" />
                {teacher.email}
              </div>
              {teacher.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  {teacher.phone}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <BookOpen className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Sesi Aktif</p>
              <p className="text-2xl font-bold text-gray-900">{teacher.totalSessions || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <Building className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Cabang Ditugaskan</p>
              <p className="text-2xl font-bold text-gray-900">{teacher.branches?.length || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Calendar className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Bergabung</p>
              <p className="text-sm font-bold text-gray-900">
                {new Date(teacher.createdAt).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
          <div className="text-green-600">✓</div>
          <p className="text-sm font-medium text-green-900">{successMessage}</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Personal Info Card */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-blue-600" />
            Informasi Pribadi
          </h2>

          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Nama Lengkap <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                type="text"
                {...register('name')}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                } ${!isEditing ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                disabled={!isEditing || isLoading}
              />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                type="email"
                {...register('email')}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.email ? 'border-red-500' : 'border-gray-300'
                } ${!isEditing ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                disabled={!isEditing || isLoading}
              />
              {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                Nomor HP
              </label>
              <input
                id="phone"
                type="tel"
                {...register('phone')}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.phone ? 'border-red-500' : 'border-gray-300'
                } ${!isEditing ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                disabled={!isEditing || isLoading}
              />
              {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>}
            </div>

            {isEditing && (
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    {...register('isActive')}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    disabled={isLoading}
                  />
                  <span className="text-sm font-medium text-gray-700">Status Aktif</span>
                </label>
                <p className="text-xs text-gray-500 mt-1 ml-7">
                  Hilangkan centang untuk menonaktifkan guru tanpa menghapus data
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Branch Assignment Card */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1 flex items-center gap-2">
            <Building className="w-5 h-5 text-blue-600" />
            Penugasan Cabang
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            {isEditing ? 'Pilih cabang dan tentukan cabang utama' : 'Daftar cabang yang ditugaskan'}
          </p>

          <div className="space-y-2">
            {branches.map((branch: any) => {
              const isSelected = selectedBranchIds.includes(branch.id)
              const isPrimary = selectedBranchIds[0] === branch.id

              if (!isEditing && !isSelected) return null

              return (
                <div
                  key={branch.id}
                  className={`p-4 rounded-lg border-2 transition ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white'
                  } ${isEditing ? 'cursor-pointer hover:border-gray-300' : ''}`}
                  onClick={() => handleBranchToggle(branch.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      {isEditing && (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                        />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900">{branch.name}</p>
                          <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                            {branch.code}
                          </span>
                          {isPrimary && (
                            <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full font-medium flex items-center gap-1">
                              <Star className="w-3 h-3 fill-current" />
                              Utama
                            </span>
                          )}
                        </div>
                        {branch.address && (
                          <p className="text-xs text-gray-500 mt-1">{branch.address}</p>
                        )}
                      </div>
                    </div>
                    {isEditing && isSelected && !isPrimary && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleMakePrimary(branch.id)
                        }}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium px-3 py-1 hover:bg-blue-100 rounded transition"
                      >
                        Jadikan Utama
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          {errors.branchIds && (
            <p className="text-red-500 text-sm mt-2">{errors.branchIds.message}</p>
          )}
        </div>

        {/* Save Button (only when editing) */}
        {isEditing && (
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {isLoading ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
            <button
              type="button"
              onClick={handleCancelEdit}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 rounded-lg transition"
            >
              Batal
            </button>
          </div>
        )}
      </form>
    </div>
  )
}
