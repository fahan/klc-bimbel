'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import apiClient from '@/lib/api/client'
import { useAppSettings } from '@/lib/app-settings-context'

const loginSchema = z.object({
  email: z.string().email('Email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
})

type LoginFormData = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const { settings } = useAppSettings()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    try {
      setIsLoading(true)
      setError('')

      console.log('🔐 Login attempt with:', { email: data.email })

      const response = await apiClient.post('/auth/login', data)
      console.log('✅ Login response:', response.data)

      if (response.data.success) {
        const { user, token } = response.data.data

        // Store token, roles, and branch info in localStorage
        localStorage.setItem('token', token)
        localStorage.setItem('userRole', user.role)
        localStorage.setItem('userRoles', JSON.stringify(user.roles || [user.role]))
        localStorage.setItem('userId', user.id)
        localStorage.setItem('userName', user.name)
        localStorage.setItem('userBranchIds', JSON.stringify(user.userBranchIds || []))
        if (user.primaryBranchId) {
          localStorage.setItem('primaryBranchId', user.primaryBranchId)
        } else {
          localStorage.removeItem('primaryBranchId')
        }

        // Pre-set selectedBranchId for pure ADMIN_CABANG so BranchContext
        // has it on first render after redirect (no async wait needed).
        const loginRoles: string[] = user.roles || [user.role]
        const isPureAdminCabang =
          loginRoles.includes('ADMIN_CABANG') &&
          !loginRoles.some((r: string) => r === 'OWNER' || r === 'ADMIN_GLOBAL')
        if (isPureAdminCabang) {
          const initialBranchId =
            user.primaryBranchId ||
            (Array.isArray(user.userBranchIds) && user.userBranchIds[0])
          if (initialBranchId) {
            localStorage.setItem('selectedBranchId', initialBranchId)
          }
        }

        console.log('✅ Token saved, redirecting...')

        // Redirect: go to admin if user has any admin role, otherwise guru view
        const roles: string[] = user.roles || [user.role]
        const hasAdminRole = roles.some((r) => r !== 'GURU')
        if (hasAdminRole) {
          router.push('/dashboard')
        } else {
          router.push('/guru/presensi')
        }
      } else {
        throw new Error(response.data.message || 'Login failed')
      }
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        'Login gagal - silakan cek console untuk detail'

      console.error('❌ Login error:', {
        message: errorMessage,
        status: err.response?.status,
        data: err.response?.data,
        error: err,
      })

      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-lg shadow-lg p-8">
        {/* Header */}
        <div className="text-center mb-8">
          {settings.logoUrl ? (
            <img
              src={settings.logoUrl}
              alt="Logo"
              className="w-16 h-16 rounded-xl object-cover mx-auto mb-3"
            />
          ) : (
            <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl font-bold text-white">
                {settings.appName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <h1 className="text-2xl font-bold text-gray-900 mb-1">{settings.appName}</h1>
          <p className="text-gray-500 text-sm">{settings.tagline}</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="admin@bimbel.com"
              {...register('email')}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                errors.email ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={isLoading}
            />
            {errors.email && (
              <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              {...register('password')}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                errors.password ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={isLoading}
            />
            {errors.password && (
              <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Loading...' : 'Login'}
          </button>
        </form>

        {/* Test Credentials 
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-600 mb-2">Test Credentials:</p>
          <div className="bg-gray-50 p-3 rounded text-sm space-y-1">
            <p>
              <strong>Owner:</strong> owner@bimbel.com / password
            </p>
            <p>
              <strong>Admin:</strong> admin@bimbel.com / password
            </p>
            <p>
              <strong>Guru:</strong> guru@bimbel.com / password
            </p>
          </div>
        </div>*/}
      </div>
    </div>
  )
}
