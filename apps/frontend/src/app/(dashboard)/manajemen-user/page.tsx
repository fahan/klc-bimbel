'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Search, Plus, Edit2, Trash2, User, Mail, Phone,
  Lock, Unlock, X, KeyRound, AlertCircle, CheckCircle,
} from 'lucide-react'
import { useBranch } from '@/lib/branch-context'
import { Card, SectionCard } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { LoadingState, EmptyState, SkeletonCard, ErrorState } from '@/components/ui/States'
import { usersApi, branchApi } from '@/lib/api/endpoints'

// ── schemas ──────────────────────────────────────────────────────────────────
const updateRoleSchema = z.object({
  role: z.enum(['OWNER', 'ADMIN_GLOBAL', 'ADMIN_CABANG', 'GURU']),
})

const assignBranchSchema = z.object({
  branchId: z.string().min(1, 'Branch wajib dipilih'),
  isPrimary: z.boolean().default(false),
})

const editInfoSchema = z.object({
  name: z.string().min(3, 'Nama minimal 3 karakter').max(100),
  email: z.string().email('Format email tidak valid'),
  phone: z.string().optional(),
})

type UpdateRoleForm = z.infer<typeof updateRoleSchema>
type AssignBranchForm = z.infer<typeof assignBranchSchema>
type EditInfoForm = z.infer<typeof editInfoSchema>

// ── constants ─────────────────────────────────────────────────────────────────
const roleOptions = ['OWNER', 'ADMIN_GLOBAL', 'ADMIN_CABANG', 'GURU'] as const
const roleLabels: Record<string, string> = {
  OWNER: 'Owner',
  ADMIN_GLOBAL: 'Admin Global',
  ADMIN_CABANG: 'Admin Cabang',
  GURU: 'Guru',
}

// ── helpers ───────────────────────────────────────────────────────────────────
function UserAvatar({ name }: { name: string }) {
  const initials = name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
      {initials}
    </div>
  )
}

// ── page ──────────────────────────────────────────────────────────────────────
export default function UsersManagementPage() {
  const { branches } = useBranch()
  const queryClient = useQueryClient()

  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('active')
  const [page, setPage] = useState(1)
  const limit = 10

  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [showRoleModal, setShowRoleModal] = useState(false)
  const [showMultiRoleModal, setShowMultiRoleModal] = useState(false)
  const [showBranchModal, setShowBranchModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  // toast state
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 4000)
  }

  // ── queries ────────────────────────────────────────────────────────────────
  const { data: usersData, isLoading, error, refetch: refetchUsers } = useQuery({
    queryKey: ['users', { page, limit, search: searchTerm, role: roleFilter }],
    queryFn: async () => {
      const res = await usersApi.getAll(page, limit, {
        search: searchTerm || undefined,
        role: roleFilter || undefined,
      })
      return res.data
    },
    networkMode: 'always',
  })

  const { data: branchesData = [] } = useQuery({
    queryKey: ['branches-select'],
    queryFn: async () => {
      const res = await branchApi.getAll()
      return res.data?.data || []
    },
  })

  // ── mutations ──────────────────────────────────────────────────────────────
  const invalidateUsers = () => queryClient.invalidateQueries({ queryKey: ['users'] })

  const updateRoleMutation = useMutation({
    mutationFn: (data: { userId: string; role: string }) =>
      usersApi.updateRole(data.userId, data.role),
    onSuccess: () => { invalidateUsers(); setShowRoleModal(false) },
  })

  const assignBranchMutation = useMutation({
    mutationFn: (data: { userId: string; branchId: string; isPrimary: boolean }) =>
      usersApi.assignBranch(data.userId, { branchId: data.branchId, isPrimary: data.isPrimary }),
    onSuccess: () => { invalidateUsers(); setShowBranchModal(false) },
  })

  const removeBranchMutation = useMutation({
    mutationFn: (data: { userId: string; branchId: string }) =>
      usersApi.removeBranch(data.userId, data.branchId),
    onSuccess: invalidateUsers,
  })

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => usersApi.deactivate(id),
    onSuccess: invalidateUsers,
  })

  const activateMutation = useMutation({
    mutationFn: (id: string) => usersApi.activate(id),
    onSuccess: invalidateUsers,
  })

  const addRoleMutation = useMutation({
    mutationFn: (data: { userId: string; role: string }) =>
      usersApi.addRole(data.userId, data.role),
    onSuccess: invalidateUsers,
  })

  const removeRoleMutation = useMutation({
    mutationFn: (data: { userId: string; role: string }) =>
      usersApi.removeRole(data.userId, data.role),
    onSuccess: invalidateUsers,
  })

  const editInfoMutation = useMutation({
    mutationFn: (data: { userId: string } & EditInfoForm) =>
      usersApi.updateInfo(data.userId, { name: data.name, email: data.email, phone: data.phone }),
    onSuccess: () => {
      invalidateUsers()
      setShowEditModal(false)
      showToast('success', 'Informasi pengguna berhasil diperbarui')
    },
    onError: (err: any) => {
      showToast('error', err.response?.data?.message || 'Gagal memperbarui informasi')
    },
  })

  const resetPasswordMutation = useMutation({
    mutationFn: (userId: string) => usersApi.resetPassword(userId),
    onSuccess: (res) => {
      setShowResetConfirm(false)
      showToast('success', res.data?.message || 'Password berhasil direset dan dikirim ke email')
    },
    onError: (err: any) => {
      setShowResetConfirm(false)
      showToast('error', err.response?.data?.message || 'Gagal mereset password')
    },
  })

  // ── forms ──────────────────────────────────────────────────────────────────
  const roleForm = useForm<UpdateRoleForm>({
    resolver: zodResolver(updateRoleSchema),
    defaultValues: { role: 'GURU' },
  })

  const branchForm = useForm<AssignBranchForm>({
    resolver: zodResolver(assignBranchSchema),
    defaultValues: { branchId: '', isPrimary: false },
  })

  const editInfoForm = useForm<EditInfoForm>({
    resolver: zodResolver(editInfoSchema),
  })

  useEffect(() => {
    if (selectedUser) {
      roleForm.reset({ role: selectedUser.role })
    }
  }, [selectedUser, roleForm])

  const openEditModal = (user: any) => {
    setSelectedUser(user)
    editInfoForm.reset({ name: user.name, email: user.email, phone: user.phone || '' })
    setShowEditModal(true)
  }

  const openResetConfirm = (user: any) => {
    setSelectedUser(user)
    setShowResetConfirm(true)
  }

  // ── handlers ───────────────────────────────────────────────────────────────
  const onUpdateRole = (data: UpdateRoleForm) => {
    if (!selectedUser) return
    updateRoleMutation.mutate({ userId: selectedUser.id, role: data.role })
  }

  const onAssignBranch = (data: AssignBranchForm) => {
    if (!selectedUser) return
    assignBranchMutation.mutate({ userId: selectedUser.id, ...data })
    branchForm.reset()
  }

  const onEditInfo = (data: EditInfoForm) => {
    if (!selectedUser) return
    editInfoMutation.mutate({ userId: selectedUser.id, ...data })
  }

  // ── derived data ───────────────────────────────────────────────────────────
  const users = useMemo(() => {
    const all = usersData?.data || []
    return statusFilter === 'inactive' ? all.filter((u: any) => !u.isActive) : all
  }, [usersData, statusFilter])

  const pagination = usersData?.pagination || {}

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto">

        {/* Toast */}
        {toast && (
          <div className={`fixed top-6 right-6 z-[9999] flex items-start gap-3 px-4 py-3 rounded-lg shadow-lg border max-w-sm transition-all
            ${toast.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
            {toast.type === 'success'
              ? <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              : <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />}
            <p className="text-sm">{toast.msg}</p>
          </div>
        )}

        {/* Header */}
        <div className="mb-4 sm:mb-8">
          <h1 className="text-xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">Manajemen Pengguna</h1>
          <p className="text-gray-600 text-sm hidden sm:block">Kelola pengguna, peran, dan akses cabang</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-8">
          {[
            { label: 'Total Pengguna', value: pagination.total || 0, color: 'blue' },
            { label: 'Admin Global', value: usersData?.data?.filter((u: any) => u.role === 'ADMIN_GLOBAL').length || 0, color: 'purple' },
            { label: 'Admin Cabang', value: usersData?.data?.filter((u: any) => u.role === 'ADMIN_CABANG').length || 0, color: 'orange' },
            { label: 'Guru', value: usersData?.data?.filter((u: any) => u.role === 'GURU').length || 0, color: 'green' },
          ].map(({ label, value, color }) => (
            <SectionCard key={label} title="">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">{label}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
                </div>
                <div className={`w-12 h-12 bg-${color}-100 rounded-lg flex items-center justify-center`}>
                  <User className={`w-6 h-6 text-${color}-600`} />
                </div>
              </div>
            </SectionCard>
          ))}
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Cari nama atau email..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPage(1) }}
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="active">Status: Aktif</option>
              <option value="inactive">Status: Nonaktif</option>
            </select>
            <select
              value={roleFilter}
              onChange={(e) => { setRoleFilter(e.target.value); setPage(1) }}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Semua Peran</option>
              {roleOptions.map((r) => <option key={r} value={r}>{roleLabels[r]}</option>)}
            </select>
          </div>
        </Card>

        {/* Table */}
        <Card>
          {error ? (
            <ErrorState
              title="Gagal memuat data"
              description="Terjadi kesalahan saat memuat data. Silakan coba lagi."
              action={{ label: 'Coba Lagi', onClick: refetchUsers }}
            />
          ) : isLoading ? (
            <div className="space-y-3">{[1, 2, 3].map((i) => <SkeletonCard key={i} />)}</div>
          ) : users.length === 0 ? (
            <EmptyState icon={<User className="w-12 h-12 text-gray-400" />} title="Tidak ada pengguna" description="Tidak ada pengguna yang cocok dengan filter" />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Nama & Email</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Peran</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Cabang</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {users.map((user: any) => (
                      <tr key={user.id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <UserAvatar name={user.name} />
                            <div>
                              <p className="font-medium text-gray-900">{user.name}</p>
                              <p className="text-sm text-gray-500 flex items-center gap-1">
                                <Mail className="w-3 h-3" />{user.email}
                              </p>
                              {user.phone && (
                                <p className="text-xs text-gray-400 flex items-center gap-1">
                                  <Phone className="w-3 h-3" />{user.phone}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {(user.roles?.length > 0 ? user.roles : [user.role]).map((r: string) => (
                              <Badge key={r} variant="secondary">{roleLabels[r]}</Badge>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {user.branches?.length > 0 ? user.branches.map((b: any) => (
                              <Badge key={b.id} variant={b.isPrimary ? 'success' : 'default'}>
                                {b.name}{b.isPrimary ? ' ⭐' : ''}
                              </Badge>
                            )) : <span className="text-xs text-gray-500 italic">Belum ada cabang</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={user.isActive ? 'success' : 'danger'}>
                            {user.isActive ? '✓ Aktif' : '✗ Nonaktif'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1">
                            {/* Edit info */}
                            <button
                              onClick={() => openEditModal(user)}
                              className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition"
                              title="Edit informasi"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>

                            {/* Kelola peran */}
                            <button
                              onClick={() => { setSelectedUser(user); setShowMultiRoleModal(true) }}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition"
                              title="Kelola peran"
                            >
                              <User className="w-4 h-4" />
                            </button>

                            {/* Kelola cabang */}
                            <button
                              onClick={() => { setSelectedUser(user); setShowBranchModal(true) }}
                              className="p-1.5 text-purple-600 hover:bg-purple-50 rounded transition"
                              title="Kelola cabang"
                            >
                              <Plus className="w-4 h-4" />
                            </button>

                            {/* Reset password */}
                            <button
                              onClick={() => openResetConfirm(user)}
                              className="p-1.5 text-amber-600 hover:bg-amber-50 rounded transition"
                              title="Reset password"
                              disabled={user.role === 'OWNER'}
                            >
                              <KeyRound className="w-4 h-4" />
                            </button>

                            {/* Aktif / nonaktif */}
                            {user.isActive ? (
                              <button
                                onClick={() => deactivateMutation.mutate(user.id)}
                                disabled={deactivateMutation.isPending}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded transition disabled:opacity-50"
                                title="Nonaktifkan"
                              >
                                <Lock className="w-4 h-4" />
                              </button>
                            ) : (
                              <button
                                onClick={() => activateMutation.mutate(user.id)}
                                disabled={activateMutation.isPending}
                                className="p-1.5 text-green-600 hover:bg-green-50 rounded transition disabled:opacity-50"
                                title="Aktifkan"
                              >
                                <Unlock className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Menampilkan {(page - 1) * limit + 1}–{Math.min(page * limit, pagination.total)} dari {pagination.total} pengguna
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setPage(Math.max(1, page - 1))} disabled={!pagination.hasPrevPage}
                    className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 hover:bg-gray-50">
                    ← Sebelumnya
                  </button>
                  {[...Array(pagination.totalPages || 1)].map((_, i) => (
                    <button key={i + 1} onClick={() => setPage(i + 1)}
                      className={`px-2 py-1 text-sm rounded ${page === i + 1 ? 'bg-blue-600 text-white' : 'border border-gray-300 hover:bg-gray-50'}`}>
                      {i + 1}
                    </button>
                  ))}
                  <button onClick={() => setPage(Math.min(pagination.totalPages || 1, page + 1))} disabled={!pagination.hasNextPage}
                    className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 hover:bg-gray-50">
                    Selanjutnya →
                  </button>
                </div>
              </div>
            </>
          )}
        </Card>
      </div>

      {/* ── MODAL: Edit Informasi User ─────────────────────────────────────── */}
      {showEditModal && selectedUser && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowEditModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Edit Informasi Pengguna</h2>
                <button onClick={() => setShowEditModal(false)} className="p-1 hover:bg-gray-100 rounded transition">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-5 flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <UserAvatar name={selectedUser.name} />
                <div>
                  <p className="font-medium text-gray-900">{selectedUser.name}</p>
                  <p className="text-xs text-gray-500">{roleLabels[selectedUser.role]}</p>
                </div>
              </div>

              <form onSubmit={editInfoForm.handleSubmit(onEditInfo)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nama Lengkap <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    {...editInfoForm.register('name')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="Nama lengkap"
                  />
                  {editInfoForm.formState.errors.name && (
                    <p className="text-red-600 text-xs mt-1">{editInfoForm.formState.errors.name.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    {...editInfoForm.register('email')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="email@contoh.com"
                  />
                  {editInfoForm.formState.errors.email && (
                    <p className="text-red-600 text-xs mt-1">{editInfoForm.formState.errors.email.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nomor HP</label>
                  <input
                    type="tel"
                    {...editInfoForm.register('phone')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="08123456789"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowEditModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 text-sm font-medium hover:bg-gray-50 transition">
                    Batal
                  </button>
                  <button type="submit" disabled={editInfoMutation.isPending}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50">
                    {editInfoMutation.isPending ? 'Menyimpan...' : 'Simpan'}
                  </button>
                </div>
              </form>
            </Card>
          </div>
        </>
      )}

      {/* ── MODAL: Konfirmasi Reset Password ──────────────────────────────── */}
      {showResetConfirm && selectedUser && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowResetConfirm(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-sm">
              <div className="flex items-start gap-4 mb-5">
                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <KeyRound className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Reset Password</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Password baru akan digenerate secara acak dan dikirim ke email:
                  </p>
                  <p className="text-sm font-semibold text-blue-700 mt-2 flex items-center gap-1">
                    <Mail className="w-4 h-4" />{selectedUser.email}
                  </p>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-5">
                <p className="text-xs text-amber-800">
                  ⚠️ Password lama akan langsung tidak berlaku. Pengguna harus segera login dengan password baru dan menggantinya melalui <strong>Profil Saya</strong>.
                </p>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setShowResetConfirm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 text-sm font-medium hover:bg-gray-50 transition">
                  Batal
                </button>
                <button
                  onClick={() => resetPasswordMutation.mutate(selectedUser.id)}
                  disabled={resetPasswordMutation.isPending}
                  className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition disabled:opacity-50">
                  {resetPasswordMutation.isPending ? 'Memproses...' : 'Ya, Reset Password'}
                </button>
              </div>
            </Card>
          </div>
        </>
      )}

      {/* ── MODAL: Kelola Peran ────────────────────────────────────────────── */}
      {showMultiRoleModal && selectedUser && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowMultiRoleModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Kelola Peran Pengguna</h2>
                <button onClick={() => setShowMultiRoleModal(false)} className="p-1 hover:bg-gray-100 rounded transition">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-6 p-3 bg-blue-50 rounded border border-blue-200">
                <p className="font-medium text-gray-900">{selectedUser.name}</p>
                <p className="text-sm text-gray-600">{selectedUser.email}</p>
              </div>

              {selectedUser.roles?.length > 0 && (
                <div className="mb-6">
                  <p className="text-sm font-medium text-gray-700 mb-3">Peran Saat Ini</p>
                  <div className="space-y-2">
                    {selectedUser.roles.map((role: string) => (
                      <div key={role} className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200">
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{roleLabels[role]}</p>
                          <p className="text-xs text-gray-600">{role}</p>
                        </div>
                        <button
                          onClick={() => removeRoleMutation.mutate({ userId: selectedUser.id, role })}
                          disabled={selectedUser.roles.length === 1 || removeRoleMutation.isPending}
                          className="p-1 text-red-600 hover:bg-red-50 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
                          title={selectedUser.roles.length === 1 ? 'Minimal 1 peran' : 'Hapus peran'}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t border-gray-200 pt-6">
                <p className="text-sm font-medium text-gray-700 mb-3">Tambah Peran</p>
                <div className="space-y-2">
                  {roleOptions.map((role) => {
                    const hasRole = selectedUser.roles?.includes(role)
                    return (
                      <button key={role}
                        onClick={() => !hasRole && addRoleMutation.mutate({ userId: selectedUser.id, role })}
                        disabled={hasRole || addRoleMutation.isPending}
                        className={`w-full px-3 py-2 rounded-lg text-sm font-medium transition ${hasRole ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200'}`}>
                        {hasRole ? `✓ ${roleLabels[role]} (Sudah ada)` : `+ Tambah ${roleLabels[role]}`}
                      </button>
                    )
                  })}
                </div>
              </div>

              <button onClick={() => setShowMultiRoleModal(false)}
                className="w-full mt-4 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition">
                Tutup
              </button>
            </Card>
          </div>
        </>
      )}

      {/* ── MODAL: Kelola Cabang ───────────────────────────────────────────── */}
      {showBranchModal && selectedUser && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowBranchModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Kelola Cabang</h2>
                <button onClick={() => setShowBranchModal(false)} className="p-1 hover:bg-gray-100 rounded transition">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-4 p-3 bg-blue-50 rounded border border-blue-200">
                <p className="font-medium text-gray-900">{selectedUser.name}</p>
                <p className="text-sm text-gray-600">{roleLabels[selectedUser.role]}</p>
              </div>

              {selectedUser.branches?.length > 0 && (
                <div className="mb-6">
                  <p className="text-sm font-medium text-gray-700 mb-3">Cabang Terkait</p>
                  <div className="space-y-2">
                    {selectedUser.branches.map((branch: any) => (
                      <div key={branch.id} className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200">
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{branch.name}</p>
                          <p className="text-xs text-gray-600">{branch.code}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {branch.isPrimary && (
                            <span className="text-xs font-semibold text-yellow-600 bg-yellow-50 px-2 py-1 rounded">Utama</span>
                          )}
                          <button
                            onClick={() => removeBranchMutation.mutate({ userId: selectedUser.id, branchId: branch.id })}
                            disabled={selectedUser.branches.length === 1 || removeBranchMutation.isPending}
                            className="p-1 text-red-600 hover:bg-red-50 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
                            title={selectedUser.branches.length === 1 ? 'Minimal 1 cabang' : 'Hapus cabang'}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t border-gray-200 pt-6">
                <p className="text-sm font-medium text-gray-700 mb-3">Tambah Cabang</p>
                <form onSubmit={branchForm.handleSubmit(onAssignBranch)}>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Pilih Cabang</label>
                    <select
                      {...branchForm.register('branchId')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">Pilih cabang...</option>
                      {branchesData.map((branch: any) => {
                        const assigned = selectedUser.branches?.some((b: any) => b.id === branch.id)
                        return (
                          <option key={branch.id} value={branch.id} disabled={assigned}>
                            {branch.name} {assigned ? '(Sudah ditugaskan)' : ''}
                          </option>
                        )
                      })}
                    </select>
                    {branchForm.formState.errors.branchId && (
                      <p className="text-red-600 text-xs mt-1">{branchForm.formState.errors.branchId.message}</p>
                    )}
                  </div>
                  <div className="mb-4 flex items-center gap-2">
                    <input type="checkbox" {...branchForm.register('isPrimary')} id="isPrimary" className="w-4 h-4 rounded border border-gray-300" />
                    <label htmlFor="isPrimary" className="text-sm text-gray-700">Jadikan cabang utama</label>
                  </div>
                  <button type="submit" disabled={assignBranchMutation.isPending}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50">
                    {assignBranchMutation.isPending ? 'Menambahkan...' : 'Tambah Cabang'}
                  </button>
                </form>
              </div>

              <button onClick={() => setShowBranchModal(false)}
                className="w-full mt-4 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition">
                Tutup
              </button>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
