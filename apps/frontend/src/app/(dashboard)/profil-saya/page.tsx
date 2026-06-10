'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { User, Building, Save, Lock, LogOut, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react'
import { LoadingState } from '@/components/ui/States'
import { authApi } from '@/lib/api/endpoints'

const profileSchema = z.object({
  name: z.string().min(3, 'Nama minimal 3 karakter').max(100),
  email: z.string().email('Format email tidak valid'),
  phone: z.string().optional(),
})

const passwordSchema = z
  .object({
    currentPassword: z.string().min(6, 'Password minimal 6 karakter'),
    newPassword: z.string().min(6, 'Password baru minimal 6 karakter'),
    confirmPassword: z.string().min(6, 'Konfirmasi password minimal 6 karakter'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Password tidak cocok',
    path: ['confirmPassword'],
  })

type ProfileFormData = z.infer<typeof profileSchema>
type PasswordFormData = z.infer<typeof passwordSchema>

export default function ProfilePage() {
  const router = useRouter()
  const [userRole, setUserRole] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [profileData, setProfileData] = useState<{
    name: string
    email: string
    phone?: string | null
    primaryBranchId?: string | null
  } | null>(null)

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    reset: resetProfile,
    formState: { errors: profileErrors },
  } = useForm<ProfileFormData>({ resolver: zodResolver(profileSchema) })

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPassword,
    formState: { errors: passwordErrors },
  } = useForm<PasswordFormData>({ resolver: zodResolver(passwordSchema) })

  useEffect(() => {
    document.title = 'Profil Saya'
    const role = localStorage.getItem('userRole') || ''
    setUserRole(role)

    authApi
      .getMe()
      .then((res) => {
        const d = res.data.data
        setProfileData(d)
        resetProfile({ name: d.name, email: d.email, phone: d.phone ?? '' })
      })
      .catch(() => {
        // fallback to localStorage if API fails
        setProfileData({
          name: localStorage.getItem('userName') || '',
          email: localStorage.getItem('userEmail') || '',
        })
        resetProfile({
          name: localStorage.getItem('userName') || '',
          email: localStorage.getItem('userEmail') || '',
        })
      })
      .finally(() => setIsLoading(false))
  }, [resetProfile])

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg)
    setErrorMessage('')
    setTimeout(() => setSuccessMessage(''), 5000)
  }

  const showError = (msg: string) => {
    setErrorMessage(msg)
    setSuccessMessage('')
  }

  const onProfileSubmit = async (data: ProfileFormData) => {
    try {
      setIsSaving(true)
      const res = await authApi.updateProfile({
        name: data.name,
        email: data.email,
        phone: data.phone || undefined,
      })
      const updated = res.data.data
      setProfileData((prev) => ({ ...prev, ...updated }))
      localStorage.setItem('userName', updated.name)
      showSuccess('Profil berhasil diperbarui!')
    } catch (err: any) {
      showError(err.response?.data?.message || 'Gagal memperbarui profil')
    } finally {
      setIsSaving(false)
    }
  }

  const onPasswordSubmit = async (data: PasswordFormData) => {
    try {
      setIsSaving(true)
      await authApi.changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      })
      resetPassword()
      setShowPasswordForm(false)
      showSuccess('Password berhasil diubah!')
    } catch (err: any) {
      showError(err.response?.data?.message || 'Gagal mengubah password. Password saat ini mungkin salah.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleLogout = () => {
    if (confirm('Yakin ingin keluar dari akun ini?')) {
      localStorage.removeItem('token')
      localStorage.removeItem('userRole')
      localStorage.removeItem('userId')
      localStorage.removeItem('userName')
      localStorage.removeItem('userEmail')
      localStorage.removeItem('selectedBranchId')
      router.push('/login')
    }
  }

  const roleLabel: Record<string, string> = {
    OWNER: 'Owner',
    ADMIN_GLOBAL: 'Admin Global',
    ADMIN_CABANG: 'Admin Cabang',
    GURU: 'Guru',
  }

  const initials = (profileData?.name || '')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  if (isLoading) return <LoadingState />

  return (
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-3xl font-bold text-gray-900">Profil Saya</h1>
        <p className="text-gray-600 mt-1">Kelola informasi akun dan pengaturan keamanan Anda</p>
      </div>

      {successMessage && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-800">{successMessage}</p>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{errorMessage}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Avatar & summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white text-xl font-semibold mb-3">
                {initials || <User className="w-7 h-7" />}
              </div>
              <h2 className="text-lg font-semibold text-gray-900">{profileData?.name}</h2>
              <p className="text-sm text-gray-600 mt-1">{roleLabel[userRole] || userRole}</p>
              <p className="text-xs text-gray-500 mt-2">{profileData?.email}</p>

              {profileData?.primaryBranchId && (
                <div className="mt-4 pt-4 border-t border-gray-200 w-full">
                  <p className="text-xs text-gray-600 mb-1">Cabang Utama</p>
                  <div className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 rounded-lg">
                    <Building className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-700">Terpilih</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {/* Informasi Pribadi */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" />
              Informasi Pribadi
            </h3>

            <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nama Lengkap <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...registerProfile('name')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  placeholder="Nama Anda"
                />
                {profileErrors.name && (
                  <p className="text-sm text-red-600 mt-1">{profileErrors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  {...registerProfile('email')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  placeholder="email@contoh.com"
                />
                {profileErrors.email && (
                  <p className="text-sm text-red-600 mt-1">{profileErrors.email.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nomor HP</label>
                <input
                  type="tel"
                  {...registerProfile('phone')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  placeholder="08123456789"
                />
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </form>
          </div>

          {/* Keamanan */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Lock className="w-5 h-5 text-blue-600" />
              Keamanan
            </h3>

            {!showPasswordForm ? (
              <button
                onClick={() => setShowPasswordForm(true)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition"
              >
                Ubah Password
              </button>
            ) : (
              <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password Saat Ini <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    {...registerPassword('currentPassword')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    placeholder="Masukkan password saat ini"
                  />
                  {passwordErrors.currentPassword && (
                    <p className="text-sm text-red-600 mt-1">{passwordErrors.currentPassword.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password Baru <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      {...registerPassword('newPassword')}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition pr-10"
                      placeholder="Masukkan password baru"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-3 text-gray-500 hover:text-gray-700"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {passwordErrors.newPassword && (
                    <p className="text-sm text-red-600 mt-1">{passwordErrors.newPassword.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Konfirmasi Password Baru <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      {...registerPassword('confirmPassword')}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition pr-10"
                      placeholder="Konfirmasi password baru"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-3 text-gray-500 hover:text-gray-700"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {passwordErrors.confirmPassword && (
                    <p className="text-sm text-red-600 mt-1">{passwordErrors.confirmPassword.message}</p>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Lock className="w-4 h-4" />
                    {isSaving ? 'Menyimpan...' : 'Ubah Password'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordForm(false)
                      resetPassword()
                    }}
                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition"
                  >
                    Batal
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Keluar */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Keluar dari Akun</h3>
            <p className="text-sm text-gray-600 mb-4">Anda akan keluar dari semua sesi yang aktif.</p>
            <button
              onClick={handleLogout}
              className="w-full px-4 py-2.5 border border-red-300 rounded-lg text-red-700 font-medium hover:bg-red-50 transition flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Keluar dari Akun
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
