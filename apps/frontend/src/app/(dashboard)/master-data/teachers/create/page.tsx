'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { teacherApi, branchApi } from '@/lib/api/endpoints'
import { ArrowLeft, User, Mail, Phone, Building, Star, Lock } from 'lucide-react'

const teacherSchema = z.object({
  name: z.string().min(3, 'Nama minimal 3 karakter').max(100, 'Nama maksimal 100 karakter'),
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
  phone: z.string().optional(),
  branchIds: z.array(z.string()).min(1, 'Pilih minimal satu cabang'),
})

type TeacherFormData = z.infer<typeof teacherSchema>

export default function CreateTeacherPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>([])

  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchApi.getAll(),
  })

  const branches = branchesData?.data?.data || []

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<TeacherFormData>({
    resolver: zodResolver(teacherSchema),
    defaultValues: {
      branchIds: [],
    },
  })

  const handleBranchToggle = (branchId: string) => {
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
    // Move this branch to first position (primary)
    const newSelected = [branchId, ...selectedBranchIds.filter((id) => id !== branchId)]
    setSelectedBranchIds(newSelected)
    setValue('branchIds', newSelected, { shouldValidate: true })
  }

  const onSubmit = async (data: TeacherFormData) => {
    try {
      setIsLoading(true)
      setError('')

      await teacherApi.create({
        name: data.name,
        email: data.email,
        password: data.password,
        phone: data.phone || null,
        branchIds: data.branchIds,
      })

      await queryClient.invalidateQueries({ queryKey: ['teachers'] })
      router.push('/master-data/teachers?success=created')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal menambahkan guru')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/master-data/teachers"
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
        >
          <ArrowLeft className="w-5 h-5" />
          Kembali
        </Link>
      </div>
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Tambah Guru Baru</h1>
        <p className="text-gray-600 mt-1">Daftarkan guru baru ke sistem dan tugaskan ke cabang</p>
      </div>

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
            {/* Name Field */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Nama Lengkap <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                type="text"
                placeholder="Contoh: Ibu Siti Rahayu"
                {...register('name')}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={isLoading}
              />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
            </div>

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                <input
                  id="email"
                  type="email"
                  placeholder="contoh@bimbel.com"
                  {...register('email')}
                  className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={isLoading}
                />
              </div>
              {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
              <p className="text-xs text-gray-500 mt-1">Email akan digunakan untuk login guru</p>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password Awal <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                <input
                  id="password"
                  type="password"
                  placeholder="Minimal 6 karakter"
                  {...register('password')}
                  className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.password ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={isLoading}
                />
              </div>
              {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>}
              <p className="text-xs text-gray-500 mt-1">Password untuk login pertama kali guru</p>
            </div>

            {/* Phone Field */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                Nomor HP
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                <input
                  id="phone"
                  type="tel"
                  placeholder="081234567890"
                  {...register('phone')}
                  className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.phone ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={isLoading}
                />
              </div>
              {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>}
            </div>
          </div>
        </div>

        {/* Branch Assignment Card */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1 flex items-center gap-2">
            <Building className="w-5 h-5 text-blue-600" />
            Penugasan Cabang
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Pilih satu atau beberapa cabang untuk guru ini. Cabang pertama akan dijadikan cabang utama.
          </p>

          {branches.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <p className="text-gray-500">Belum ada cabang. Tambahkan cabang terlebih dahulu.</p>
              <Link
                href="/master-data/branches/create"
                className="text-blue-600 hover:text-blue-700 text-sm font-medium mt-2 inline-block"
              >
                Tambah Cabang →
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {branches.map((branch: any) => {
                const isSelected = selectedBranchIds.includes(branch.id)
                const isPrimary = selectedBranchIds[0] === branch.id
                return (
                  <div
                    key={branch.id}
                    className={`p-4 rounded-lg border-2 transition cursor-pointer ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                    onClick={() => handleBranchToggle(branch.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                        />
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
                      {isSelected && !isPrimary && (
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
          )}
          {errors.branchIds && (
            <p className="text-red-500 text-sm mt-2">{errors.branchIds.message}</p>
          )}

          {selectedBranchIds.length > 0 && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Terpilih:</strong> {selectedBranchIds.length} cabang. Cabang utama akan menjadi cabang
                default untuk penugasan sesi.
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {isLoading ? 'Menyimpan...' : 'Simpan Guru'}
          </button>
          <Link
            href="/master-data/teachers"
            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 rounded-lg transition text-center"
          >
            Batal
          </Link>
        </div>
      </form>

      {/* Info Box */}
      <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>💡 Catatan:</strong> Email guru harus unik. Guru bisa ditugaskan ke beberapa cabang sekaligus,
          dan akan otomatis memiliki role <strong>GURU</strong> dengan akses ke fitur presensi, jadwal, dan
          laporan komisi pribadi.
        </p>
      </div>
    </div>
  )
}
