'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { studentApi, branchApi, sppRateApi } from '@/lib/api/endpoints'
import {
  ArrowLeft,
  BookOpen,
  User,
  Phone,
  Building,
  Calendar,
  MapPin,
  Trash2,
  Edit3,
  Plus,
  Tag,
  X,
  DollarSign,
} from 'lucide-react'
import { LoadingState } from '@/components/ui/States'
import { StatusBadge } from '@/components/ui/Badge'
import AddSubjectModal from '@/components/enrollment/AddSubjectModal'
import EditSubjectModal from '@/components/enrollment/EditSubjectModal'

const studentSchema = z.object({
  name: z.string().min(3, 'Nama minimal 3 karakter').max(100, 'Nama maksimal 100 karakter'),
  sureName: z.string().optional(),
  classLevel: z.string().optional(),
  birthDate: z.string().optional(),
  birthPlace: z.string().optional(),
  parentName: z.string().optional(),
  parentPhone: z.string().optional(),
  address: z.string().optional(),
  endDate: z.string().optional(),
  isActive: z.boolean().optional(),
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
  const [discountSubjectId, setDiscountSubjectId] = useState<string | null>(null)
  const [discountAmount, setDiscountAmount] = useState('')
  const [discountNote, setDiscountNote] = useState('')
  const [savingDiscount, setSavingDiscount] = useState(false)
  const [sppRateSubjectId, setSppRateSubjectId] = useState<string | null>(null)
  const [sppRateSubjectType, setSppRateSubjectType] = useState<string>('')
  const [selectedSppRateId, setSelectedSppRateId] = useState<string>('')
  const [savingSppRate, setSavingSppRate] = useState(false)
  // Custom SPP editor state
  const [customSppSubjectId, setCustomSppSubjectId] = useState<string | null>(null)
  const [customSppAmount, setCustomSppAmount] = useState('')
  const [customSppNote, setCustomSppNote] = useState('')
  const [discountAffectsCommission, setDiscountAffectsCommission] = useState(false)
  const [savingCustomSpp, setSavingCustomSpp] = useState(false)

  const { data: studentData, isLoading: loadingStudent, refetch } = useQuery({
    queryKey: ['student', studentId],
    queryFn: () => studentApi.getOne(studentId),
    enabled: !!studentId,
  })

  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchApi.getAll(),
  })

  const { data: sppRatesData } = useQuery({
    queryKey: ['spp-rates-by-subject', sppRateSubjectId],
    queryFn: () => sppRateApi.getBySubject(sppRateSubjectId!),
    enabled: !!sppRateSubjectId,
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

  useEffect(() => {
    if (student) {
      reset({
        name: student.name || '',
        sureName: student.sureName || '',
        classLevel: student.classLevel || '',
        birthDate: student.birthDate ? student.birthDate.split('T')[0] : '',
        birthPlace: student.birthPlace || '',
        parentName: student.parentName || '',
        parentPhone: student.parentPhone || '',
        address: student.address || '',
        endDate: student.endDate ? student.endDate.split('T')[0] : '',
        isActive: student.isActive,
      })
      document.title = `${student.name} - Detail Siswa`
    }
  }, [student, reset])

  const onSubmit = async (data: StudentFormData) => {
    try {
      setIsLoading(true)
      setError('')

      await studentApi.update(studentId, {
        name: data.name,
        sureName: data.sureName || null,
        classLevel: data.classLevel || null,
        birthDate: data.birthDate || null,
        birthPlace: data.birthPlace || null,
        parentName: data.parentName || null,
        parentPhone: data.parentPhone || null,
        address: data.address || null,
        endDate: data.endDate || null,
        isActive: data.isActive,
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

  const openDiscountEditor = (subject: any) => {
    setSppRateSubjectId(null)
    setCustomSppSubjectId(null)
    setDiscountSubjectId(subject.subjectId)
    setDiscountAmount(subject.discountAmount ? parseFloat(subject.discountAmount).toString() : '')
    setDiscountNote(subject.discountNote || '')
  }

  const handleSaveDiscount = async () => {
    if (!discountSubjectId) return
    try {
      setSavingDiscount(true)
      const amount = parseFloat(discountAmount || '0') || null
      await studentApi.updateSubjectDiscount(studentId, discountSubjectId, {
        discountAmount: amount && amount > 0 ? amount : null,
        discountNote: discountNote.trim() || null,
      })
      setDiscountSubjectId(null)
      setDiscountAmount('')
      setDiscountNote('')
      refetch()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal menyimpan diskon')
    } finally {
      setSavingDiscount(false)
    }
  }

  const openSppRateEditor = (subject: any) => {
    setSppRateSubjectId(subject.subjectId)
    setSppRateSubjectType(subject.type)
    setSelectedSppRateId(subject.sppRateId || '')
    setDiscountSubjectId(null)
    setCustomSppSubjectId(null)
  }

  const openCustomSppEditor = (subject: any) => {
    setCustomSppSubjectId(subject.subjectId)
    setCustomSppAmount(subject.customSppAmount ? parseFloat(subject.customSppAmount).toString() : '')
    setCustomSppNote(subject.customSppNote || '')
    setDiscountAffectsCommission(subject.discountAffectsCommission ?? false)
    setDiscountSubjectId(null)
    setSppRateSubjectId(null)
  }

  const handleSaveCustomSpp = async () => {
    if (!customSppSubjectId) return
    try {
      setSavingCustomSpp(true)
      const amount = customSppAmount ? parseFloat(customSppAmount) : null
      await studentApi.updateSubjectDiscount(studentId, customSppSubjectId, {
        customSppAmount: amount && amount > 0 ? amount : null,
        customSppNote: customSppNote.trim() || null,
        discountAffectsCommission,
      })
      setCustomSppSubjectId(null)
      setCustomSppAmount('')
      setCustomSppNote('')
      refetch()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal menyimpan tarif custom')
    } finally {
      setSavingCustomSpp(false)
    }
  }

  const handleSaveSppRate = async () => {
    if (!sppRateSubjectId || !selectedSppRateId) return
    try {
      setSavingSppRate(true)
      await studentApi.updateSubjectSppRate(studentId, sppRateSubjectId, { sppRateId: selectedSppRateId })
      setSppRateSubjectId(null)
      setSelectedSppRateId('')
      refetch()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal memperbarui tarif SPP')
    } finally {
      setSavingSppRate(false)
    }
  }

  const handleCancelEdit = () => {
    if (student) {
      reset({
        name: student.name || '',
        sureName: student.sureName || '',
        classLevel: student.classLevel || '',
        birthDate: student.birthDate ? student.birthDate.split('T')[0] : '',
        birthPlace: student.birthPlace || '',
        parentName: student.parentName || '',
        parentPhone: student.parentPhone || '',
        address: student.address || '',
        endDate: student.endDate ? student.endDate.split('T')[0] : '',
        isActive: student.isActive,
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
  const allSppRates: any[] = sppRatesData?.data?.data || []
  // Tampilkan semua rate dengan tipe sesi yang sama, dikelompokkan per billingType
  const filteredSppRates = allSppRates.filter((r: any) => r.type === sppRateSubjectType)
  const totalSubjects = student.subjects?.length || 0
  const totalSPP = student.subjects?.reduce(
    (sum: number, s: any) => sum + parseFloat(s.sppAmount || '0'),
    0,
  ) || 0

  const inputClass = (hasError?: boolean) =>
    `w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
      hasError ? 'border-red-500' : 'border-gray-300'
    } ${!isEditing ? 'bg-gray-50 cursor-not-allowed text-gray-600' : 'bg-white'}`

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
          <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-2xl shrink-0">
            {student.name
              .split(' ')
              .map((n: string) => n[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900">{student.name}</h1>
              {student.sureName && (
                <span className="text-sm text-gray-500 font-normal">({student.sureName})</span>
              )}
              <StatusBadge status={student.isActive ? 'active' : 'inactive'} />
            </div>
            <p className="text-sm text-gray-500">ID: {student.id}</p>
            <div className="flex items-center gap-4 mt-3 text-sm text-gray-600 flex-wrap">
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-gray-400 shrink-0" />
                {branchName}
              </div>
              {student.classLevel && (
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400 shrink-0" />
                  {student.classLevel}
                </div>
              )}
              {student.birthDate && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                  {student.birthPlace ? `${student.birthPlace}, ` : ''}
                  {new Date(student.birthDate).toLocaleDateString('id-ID', {
                    day: 'numeric', month: 'long', year: 'numeric',
                  })}
                </div>
              )}
              {student.parentPhone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                  {student.parentPhone}
                </div>
              )}
              {student.address && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="truncate max-w-xs">{student.address}</span>
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
                  day: 'numeric', month: 'long', year: 'numeric',
                })}
              </p>
              {student.endDate && (
                <p className="text-xs text-red-500 mt-0.5">
                  Keluar: {new Date(student.endDate).toLocaleDateString('id-ID', {
                    day: 'numeric', month: 'short', year: 'numeric',
                  })}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Success / Error */}
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
          <div className="text-green-600">✓</div>
          <p className="text-sm font-medium text-green-900">{success}</p>
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

        {/* Informasi Pribadi */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-blue-600" />
            Informasi Pribadi
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Nama Lengkap */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nama Lengkap <span className="text-red-500">*</span>
              </label>
              <input type="text" {...register('name')} disabled={!isEditing || isLoading}
                className={inputClass(!!errors.name)} />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
            </div>

            {/* Nama Panggilan */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nama Panggilan</label>
              <input type="text" {...register('sureName')} disabled={!isEditing || isLoading}
                placeholder="Nama panggilan sehari-hari"
                className={inputClass()} />
            </div>

            {/* Tempat Lahir */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tempat Lahir</label>
              <input type="text" {...register('birthPlace')} disabled={!isEditing || isLoading}
                placeholder="Misal: Brebes"
                className={inputClass()} />
            </div>

            {/* Tanggal Lahir */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Lahir</label>
              <input type="date" {...register('birthDate')} disabled={!isEditing || isLoading}
                className={inputClass()} />
            </div>

            {/* Kelas */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kelas</label>
              <input type="text" {...register('classLevel')} disabled={!isEditing || isLoading}
                placeholder="Misal: 3 SD"
                className={inputClass()} />
            </div>

            {/* Cabang (read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cabang</label>
              <input type="text" value={branchName} disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed text-gray-600" />
            </div>

            {/* Alamat */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Alamat</label>
              <textarea {...register('address')} disabled={!isEditing || isLoading} rows={2}
                placeholder="Alamat lengkap siswa"
                className={`${inputClass()} resize-none`} />
            </div>
          </div>
        </div>

        {/* Informasi Orang Tua */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Phone className="w-5 h-5 text-blue-600" />
            Informasi Orang Tua
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nama Orang Tua</label>
              <input type="text" {...register('parentName')} disabled={!isEditing || isLoading}
                placeholder="Nama orang tua / wali"
                className={inputClass()} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">No. HP Orang Tua</label>
              <input type="tel" {...register('parentPhone')} disabled={!isEditing || isLoading}
                placeholder="081234567890"
                className={inputClass()} />
            </div>
          </div>
        </div>

        {/* Status Keanggotaan */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            Status Keanggotaan
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Keluar</label>
              <input type="date" {...register('endDate')} disabled={!isEditing || isLoading}
                className={inputClass()} />
              <p className="text-xs text-gray-400 mt-1">Isi jika siswa sudah tidak aktif bimbel</p>
            </div>
            {isEditing && (
              <div className="flex items-center gap-3 pt-6">
                <input
                  type="checkbox"
                  id="isActive"
                  {...register('isActive')}
                  disabled={isLoading}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                  Siswa Aktif
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Save Button */}
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

      {/* Enrolled Subjects */}
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
            {student.subjects.map((subject: any) => {
              const masterRate = parseFloat(subject.sppAmount || '0')
              const effectiveRate = subject.customSppAmount ? parseFloat(subject.customSppAmount) : masterRate
              const subjectDiscount = parseFloat(subject.discountAmount || '0')
              const netAmount = Math.max(0, effectiveRate - subjectDiscount)
              const isPerSession = subject.billingType === 'PER_SESSION'
              const isEditingDiscount = discountSubjectId === subject.subjectId
              const isEditingSppRate = sppRateSubjectId === subject.subjectId
              const isEditingCustomSpp = customSppSubjectId === subject.subjectId

              return (
                <div
                  key={subject.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{subject.subjectName}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
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
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            isPerSession
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {isPerSession ? 'Per Sesi' : 'Flat Bulanan'}
                        </span>
                        {subject.customSppAmount && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-purple-100 text-purple-700">
                            Tarif Custom{subject.customSppNote ? ` · ${subject.customSppNote}` : ''}
                          </span>
                        )}
                        {subjectDiscount > 0 && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700 flex items-center gap-1">
                            <Tag className="w-2.5 h-2.5" />
                            Diskon Rp {subjectDiscount.toLocaleString('id-ID')}
                            {subject.discountNote && ` · ${subject.discountNote}`}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right space-y-2">
                      <div>
                        {subjectDiscount > 0 ? (
                          <>
                            <p className="text-xs text-gray-400 line-through">
                              Rp {effectiveRate.toLocaleString('id-ID')}
                            </p>
                            <p className="font-semibold text-green-600">
                              Rp {netAmount.toLocaleString('id-ID')}
                            </p>
                          </>
                        ) : subject.customSppAmount ? (
                          <>
                            <p className="text-xs text-gray-400 line-through">
                              Rp {masterRate.toLocaleString('id-ID')}
                            </p>
                            <p className="font-semibold text-purple-600">
                              Rp {effectiveRate.toLocaleString('id-ID')}
                            </p>
                          </>
                        ) : (
                          <p className="font-semibold text-blue-600">
                            Rp {effectiveRate.toLocaleString('id-ID')}
                          </p>
                        )}
                        <p className="text-xs text-gray-500">{isPerSession ? 'per sesi' : 'per bulan'}</p>
                      </div>
                      <div className="flex gap-1 justify-end flex-wrap">
                        <button
                          onClick={() => openDiscountEditor(subject)}
                          className="px-2 py-1 bg-green-50 hover:bg-green-100 text-green-700 rounded text-xs font-medium transition"
                        >
                          <Tag className="w-3 h-3 inline mr-1" />
                          Diskon
                        </button>
                        <button
                          onClick={() => {
                            if (isEditingCustomSpp) setCustomSppSubjectId(null)
                            else openCustomSppEditor(subject)
                          }}
                          className={`px-2 py-1 rounded text-xs font-medium transition ${
                            isEditingCustomSpp
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-purple-50 hover:bg-purple-100 text-purple-700'
                          }`}
                        >
                          <DollarSign className="w-3 h-3 inline mr-1" />
                          Custom SPP
                        </button>
                        <button
                          onClick={() => {
                            if (isEditingSppRate) { setSppRateSubjectId(null) }
                            else { openSppRateEditor(subject) }
                          }}
                          className={`px-2 py-1 rounded text-xs font-medium transition ${
                            isEditingSppRate
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-orange-50 hover:bg-orange-100 text-orange-700'
                          }`}
                        >
                          <DollarSign className="w-3 h-3 inline mr-1" />
                          Tarif SPP
                        </button>
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
                              studentApi.removeSubject(studentId, subject.subjectId).then(() => refetch())
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

                  {/* Inline SPP rate editor */}
                  {isEditingSppRate && (
                    <div className="mt-3 pt-3 border-t border-gray-200 bg-orange-50 rounded-lg p-3 space-y-2">
                      <p className="text-xs font-semibold text-orange-800 flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        Ganti Tarif SPP Terkunci
                      </p>
                      <p className="text-[10px] text-orange-700">
                        Pilih tarif SPP yang akan digunakan untuk enrollment ini. Hanya tarif dengan tipe {sppRateSubjectType === 'REGULAR' ? 'Reguler' : 'Private'} yang ditampilkan.
                      </p>
                      <div>
                        <label className="block text-[10px] font-medium text-gray-600 mb-1">Pilih Tarif SPP</label>
                        <select
                          value={selectedSppRateId}
                          onChange={(e) => setSelectedSppRateId(e.target.value)}
                          className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-orange-500"
                        >
                          <option value="">-- Pilih tarif --</option>
                          {filteredSppRates.map((rate: any) => (
                            <option key={rate.id} value={rate.id}>
                              [{rate.billingType === 'PER_SESSION' ? 'Per Sesi' : 'Flat Bln'}]
                              {' '}Rp {parseFloat(rate.amount).toLocaleString('id-ID')}
                              {rate.billingType === 'PER_SESSION' ? '/sesi' : '/bln'}
                              {' · '}Berlaku: {new Date(rate.effectiveFrom).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                              {rate.effectiveUntil ? ` s/d ${new Date(rate.effectiveUntil).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}` : ' (aktif)'}
                              {rate.id === subject.sppRateId ? ' ✓ Saat ini' : ''}
                            </option>
                          ))}
                        </select>
                        {filteredSppRates.length === 0 && (
                          <p className="text-[10px] text-gray-400 mt-1">Tidak ada tarif SPP tersedia untuk tipe ini</p>
                        )}
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={handleSaveSppRate}
                          disabled={savingSppRate || !selectedSppRateId || selectedSppRateId === subject.sppRateId}
                          className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-medium rounded transition disabled:opacity-50"
                        >
                          {savingSppRate ? 'Menyimpan...' : 'Simpan'}
                        </button>
                        <button
                          onClick={() => setSppRateSubjectId(null)}
                          className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded transition"
                        >
                          <X className="w-3 h-3 inline" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Inline discount editor */}
                  {isEditingDiscount && (
                    <div className="mt-3 pt-3 border-t border-gray-200 bg-green-50 rounded-lg p-3 space-y-2">
                      <p className="text-xs font-semibold text-green-800 flex items-center gap-1">
                        <Tag className="w-3 h-3" />
                        Set Diskon Enrollment
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-medium text-gray-600 mb-1">Nominal Diskon (Rp)</label>
                          <input
                            type="number"
                            placeholder="0"
                            min={0}
                            value={discountAmount}
                            onChange={(e) => setDiscountAmount(e.target.value)}
                            className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-medium text-gray-600 mb-1">Keterangan</label>
                          <input
                            type="text"
                            placeholder="Misal: Diskon kakak-adik"
                            value={discountNote}
                            onChange={(e) => setDiscountNote(e.target.value)}
                            className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={handleSaveDiscount}
                          disabled={savingDiscount}
                          className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded transition disabled:opacity-50"
                        >
                          {savingDiscount ? 'Menyimpan...' : 'Simpan'}
                        </button>
                        <button
                          onClick={() => {
                            if (subjectDiscount > 0 && confirm('Yakin hapus diskon ini?')) {
                              setSavingDiscount(true)
                              studentApi.updateSubjectDiscount(studentId, subject.subjectId, {
                                discountAmount: null,
                                discountNote: null,
                              }).then(() => { refetch(); setDiscountSubjectId(null) })
                                .catch((e: any) => alert(e.response?.data?.message || 'Gagal'))
                                .finally(() => setSavingDiscount(false))
                            }
                          }}
                          disabled={savingDiscount || subjectDiscount === 0}
                          className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-medium rounded transition disabled:opacity-40"
                        >
                          Hapus Diskon
                        </button>
                        <button
                          onClick={() => setDiscountSubjectId(null)}
                          className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded transition"
                        >
                          <X className="w-3 h-3 inline" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Inline Custom SPP editor */}
                  {isEditingCustomSpp && (
                    <div className="mt-3 pt-3 border-t border-gray-200 bg-purple-50 rounded-lg p-3 space-y-2">
                      <p className="text-xs font-semibold text-purple-800 flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        Tarif SPP Khusus Siswa Ini
                      </p>
                      <p className="text-[10px] text-purple-700">
                        Override tarif master untuk siswa ini. Bisa lebih rendah (keringanan) atau lebih tinggi (premium). Kosongkan untuk kembali ke tarif master.
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-medium text-gray-600 mb-1">
                            Tarif Custom (Rp{isPerSession ? '/sesi' : '/bulan'})
                          </label>
                          <input
                            type="number"
                            placeholder={`master: ${masterRate.toLocaleString('id-ID')}`}
                            min={0}
                            value={customSppAmount}
                            onChange={e => setCustomSppAmount(e.target.value)}
                            className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-medium text-gray-600 mb-1">Keterangan</label>
                          <input
                            type="text"
                            placeholder="Misal: Tarif 1x/minggu"
                            value={customSppNote}
                            onChange={e => setCustomSppNote(e.target.value)}
                            className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
                          />
                        </div>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={discountAffectsCommission}
                          onChange={e => setDiscountAffectsCommission(e.target.checked)}
                          className="w-3 h-3 rounded"
                        />
                        <span className="text-[10px] text-gray-600">
                          Gunakan tarif custom ini sebagai dasar komisi guru (default: komisi tetap dari tarif master)
                        </span>
                      </label>
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={handleSaveCustomSpp}
                          disabled={savingCustomSpp}
                          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium rounded transition disabled:opacity-50"
                        >
                          {savingCustomSpp ? 'Menyimpan...' : 'Simpan'}
                        </button>
                        {subject.customSppAmount && (
                          <button
                            onClick={() => {
                              if (confirm('Yakin hapus tarif custom? Akan kembali ke tarif master.')) {
                                setSavingCustomSpp(true)
                                studentApi.updateSubjectDiscount(studentId, subject.subjectId, {
                                  customSppAmount: null,
                                  customSppNote: null,
                                  discountAffectsCommission: false,
                                }).then(() => { refetch(); setCustomSppSubjectId(null) })
                                  .catch((e: any) => alert(e.response?.data?.message || 'Gagal'))
                                  .finally(() => setSavingCustomSpp(false))
                              }
                            }}
                            disabled={savingCustomSpp}
                            className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-medium rounded transition disabled:opacity-40"
                          >
                            Hapus Custom
                          </button>
                        )}
                        <button
                          onClick={() => setCustomSppSubjectId(null)}
                          className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded transition"
                        >
                          <X className="w-3 h-3 inline" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showAddSubjectModal && (
        <AddSubjectModal
          studentId={studentId}
          enrolledSubjectIds={student?.subjects?.map((s: any) => s.subjectId) || []}
          onClose={() => setShowAddSubjectModal(false)}
          onSuccess={() => refetch()}
        />
      )}

      {editingSubjectId && (() => {
        const editingSubject = student.subjects.find((s: any) => s.subjectId === editingSubjectId)
        return (
          <EditSubjectModal
            studentId={studentId}
            subjectId={editingSubjectId}
            branchId={student.branchId}
            subjectName={editingSubject?.subjectName || ''}
            currentType={editingSubject?.type || 'REGULAR'}
            currentBillingType={editingSubject?.billingType || 'FLAT_MONTHLY'}
            currentSessionId={editingSubject?.sessionId}
            onClose={() => setEditingSubjectId(null)}
            onSuccess={() => {
              refetch()
              setEditingSubjectId(null)
            }}
          />
        )
      })()}
    </div>
  )
}
