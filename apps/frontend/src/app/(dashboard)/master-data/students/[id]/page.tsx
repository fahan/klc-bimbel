'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { studentApi, branchApi } from '@/lib/api/endpoints'
import {
  ArrowLeft,
  BookOpen,
  User,
  Phone,
  Building,
  Calendar,
  Trash2,
  Edit3,
  Plus,
} from 'lucide-react'
import { LoadingState } from '@/components/ui/States'
import { StatusBadge } from '@/components/ui/Badge'
import AddSubjectModal from '@/components/enrollment/AddSubjectModal'
import EditSubjectModal from '@/components/enrollment/EditSubjectModal'

const studentSchema = z.object({
  name: z.string().min(3, 'Nama minimal 3 karakter').max(100, 'Nama maksimal 100 karakter'),
  classLevel: z.string().optional(),
  parentName: z.string().optional(),
  parentPhone: z.string().optional(),
})

type StudentFormData = z.infer<typeof studentSchema>

export default function StudentDetailPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const params = useParams()
  const studentId = params?.id as string

  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showAddSubjectModal, setShowAddSubjectModal] = useState(false)
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null)

  const { data: studentData, isLoading: loadingStudent, refetch } = useQuery({
    queryKey: ['student', studentId],
    queryFn: () => studentApi.getOne(studentId),
    enabled: !!studentId,
  })

  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchApi.getAll(),
  })

  const student = studentData?.data?.data
  const branches = branchesData?.data?.data || []

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<StudentFormData>({
    resolver: zodResolver(studentSchema),
  })

  // Pre-fill form and set page title when student data loads
  useEffect(() => {
    if (student) {
      reset({
        name: student.name || '',
        classLevel: student.classLevel || '',
        parentName: student.parentName || '',
        parentPhone: student.parentPhone || '',
      })
      // Update browser tab title
      document.title = `${student.name} - Detail Siswa`
    }
  }, [student, reset])

  const onSubmit = async (data: StudentFormData) => {
    try {
      setIsLoading(true)
      setError('')

      await studentApi.update(studentId, {
        name: data.name,
        classLevel: data.classLevel || null,
        parentName: data.parentName || null,
        parentPhone: data.parentPhone || null,
      })

      await queryClient.invalidateQueries({ queryKey: ['students'] })
      setSuccess('Data siswa berhasil diperbarui')
      setIsEditing(false)
      refetch()

      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal memperbarui data siswa')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!student) return
    if (confirm(`Yakin ingin menghapus siswa "${student.name}"?`)) {
      try {
        await studentApi.delete(studentId)
        await queryClient.invalidateQueries({ queryKey: ['students'] })
        router.push('/master-data/students')
      } catch (err: any) {
        alert(err.response?.data?.message || 'Gagal menghapus siswa')
      }
    }
  }

  const handleCancelEdit = () => {
    if (student) {
      reset({
        name: student.name || '',
        classLevel: student.classLevel || '',
        parentName: student.parentName || '',
        parentPhone: student.parentPhone || '',
      })
    }
    setIsEditing(false)
    setError('')
  }

  if (loadingStudent) return <LoadingState />

  if (!student) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-gray-500">Siswa tidak ditemukan</p>
        <Link href="/master-data/students" className="text-blue-600 hover:text-blue-700 font-medium">
          ← Kembali ke daftar siswa
        </Link>
      </div>
    )
  }

  const branchName = branches.find((b: any) => b.id === student.branchId)?.name || '-'
  const totalSubjects = student.subjects?.length || 0
  const totalSPP = student.subjects?.reduce(
    (sum: number, s: any) => sum + parseFloat(s.sppAmount || '0'),
    0,
  ) || 0

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/master-data/students"
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
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium flex items-center gap-2"
              >
                <Edit3 className="w-4 h-4" />
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

      {/* Student Header */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <div className="flex items-start gap-4">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-2xl">
            {student.name
              .split(' ')
              .map((n: string) => n[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-gray-900">{student.name}</h1>
              <StatusBadge status={student.isActive ? 'active' : 'inactive'} />
            </div>
            <p className="text-sm text-gray-500">ID: {student.id}</p>
            <div className="flex items-center gap-4 mt-3 text-sm text-gray-600 flex-wrap">
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-gray-400" />
                {branchName}
              </div>
              {student.classLevel && (
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400" />
                  {student.classLevel}
                </div>
              )}
              {student.parentPhone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  {student.parentPhone}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <BookOpen className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Mata Pelajaran</p>
              <p className="text-2xl font-bold text-gray-900">{totalSubjects}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <BookOpen className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total SPP/Bulan</p>
              <p className="text-lg font-bold text-gray-900">
                Rp {totalSPP.toLocaleString('id-ID')}
              </p>
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
                {new Date(student.registeredAt).toLocaleDateString('id-ID', {
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
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
          <div className="text-green-600">✓</div>
          <p className="text-sm font-medium text-green-900">{success}</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Form (or Read View) */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Personal Info Card */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-blue-600" />
            Informasi Pribadi
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Nama Lengkap <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                type="text"
                {...register('name')}
                disabled={!isEditing || isLoading}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                } ${!isEditing ? 'bg-gray-50 cursor-not-allowed' : ''}`}
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
            </div>

            {/* Class Level */}
            <div>
              <label htmlFor="classLevel" className="block text-sm font-medium text-gray-700 mb-1">
                Kelas
              </label>
              <input
                id="classLevel"
                type="text"
                placeholder="Contoh: 10 SMA"
                {...register('classLevel')}
                disabled={!isEditing || isLoading}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.classLevel ? 'border-red-500' : 'border-gray-300'
                } ${!isEditing ? 'bg-gray-50 cursor-not-allowed' : ''}`}
              />
              {errors.classLevel && (
                <p className="text-red-500 text-xs mt-1">{errors.classLevel.message}</p>
              )}
            </div>

            {/* Parent Name */}
            <div>
              <label htmlFor="parentName" className="block text-sm font-medium text-gray-700 mb-1">
                Nama Orang Tua
              </label>
              <input
                id="parentName"
                type="text"
                placeholder="Contoh: Ibu Sarah"
                {...register('parentName')}
                disabled={!isEditing || isLoading}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.parentName ? 'border-red-500' : 'border-gray-300'
                } ${!isEditing ? 'bg-gray-50 cursor-not-allowed' : ''}`}
              />
              {errors.parentName && (
                <p className="text-red-500 text-xs mt-1">{errors.parentName.message}</p>
              )}
            </div>

            {/* Parent Phone */}
            <div>
              <label htmlFor="parentPhone" className="block text-sm font-medium text-gray-700 mb-1">
                No. HP Orang Tua
              </label>
              <input
                id="parentPhone"
                type="tel"
                placeholder="081234567890"
                {...register('parentPhone')}
                disabled={!isEditing || isLoading}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.parentPhone ? 'border-red-500' : 'border-gray-300'
                } ${!isEditing ? 'bg-gray-50 cursor-not-allowed' : ''}`}
              />
              {errors.parentPhone && (
                <p className="text-red-500 text-xs mt-1">{errors.parentPhone.message}</p>
              )}
            </div>

            {/* Branch (read-only) */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Cabang</label>
              <input
                type="text"
                value={branchName}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed text-gray-600"
              />
              <p className="text-xs text-gray-500 mt-1">
                Cabang tidak bisa diubah dari halaman ini. Gunakan fitur transfer cabang jika perlu.
              </p>
            </div>
          </div>
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

      {/* Enrolled Subjects with Management */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            Mata Pelajaran Terdaftar ({totalSubjects})
          </h2>
          <button
            onClick={() => setShowAddSubjectModal(true)}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium text-sm flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            Tambah
          </button>
        </div>

        {totalSubjects === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <BookOpen className="w-12 h-12 text-gray-300" />
            <p className="text-sm text-gray-500">Belum terdaftar untuk mata pelajaran apapun</p>
            <button
              onClick={() => setShowAddSubjectModal(true)}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Tambah mata pelajaran →
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {student.subjects.map((subject: any) => (
              <div
                key={subject.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{subject.subjectName}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          subject.type === 'REGULAR'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-purple-100 text-purple-700'
                        }`}
                      >
                        {subject.type === 'REGULAR' ? 'Reguler' : 'Privat'}
                      </span>
                      <p className="text-xs text-gray-500">
                        Terdaftar: {new Date(subject.enrolledAt).toLocaleDateString('id-ID')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right space-y-2">
                    <div>
                      <p className="font-semibold text-blue-600">
                        Rp{' '}
                        {parseFloat(subject.sppAmount || '0').toLocaleString('id-ID')}
                      </p>
                      <p className="text-xs text-gray-500">per bulan</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingSubjectId(subject.subjectId)}
                        className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded text-xs font-medium transition"
                      >
                        <Edit3 className="w-3 h-3 inline mr-1" />
                        Ubah
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Yakin ingin menghapus ${subject.subjectName}?`)) {
                            studentApi.removeSubject(studentId, subject.subjectId).then(() => {
                              refetch()
                            })
                          }
                        }}
                        className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded text-xs font-medium transition"
                      >
                        <Trash2 className="w-3 h-3 inline mr-1" />
                        Hapus
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Subject Modal */}
      {showAddSubjectModal && (
        <AddSubjectModal
          studentId={studentId}
          enrolledSubjectIds={student?.subjects?.map((s: any) => s.subjectId) || []}
          onClose={() => setShowAddSubjectModal(false)}
          onSuccess={() => {
            refetch()
          }}
        />
      )}

      {/* Edit Subject Modal */}
      {editingSubjectId && (
        <EditSubjectModal
          studentId={studentId}
          subjectId={editingSubjectId}
          branchId={student.branchId}
          subjectName={student.subjects.find((s: any) => s.subjectId === editingSubjectId)?.subjectName || ''}
          currentType={student.subjects.find((s: any) => s.subjectId === editingSubjectId)?.type || 'REGULAR'}
          onClose={() => setEditingSubjectId(null)}
          onSuccess={() => {
            refetch()
            setEditingSubjectId(null)
          }}
        />
      )}
    </div>
  )
}
