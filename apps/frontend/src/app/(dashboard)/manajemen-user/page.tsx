'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Search, Plus, Edit2, Trash2, User, Mail, Phone, Lock, Unlock, X } from 'lucide-react'
import { useBranch } from '@/lib/branch-context'
import { Card, SectionCard } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { LoadingState, EmptyState, SkeletonCard } from '@/components/ui/States'
import { usersApi, branchApi } from '@/lib/api/endpoints'

const updateRoleSchema = z.object({
  role: z.enum(['OWNER', 'ADMIN_GLOBAL', 'ADMIN_CABANG', 'GURU']),
})

const assignBranchSchema = z.object({
  branchId: z.string().min(1, 'Branch wajib dipilih'),
  isPrimary: z.boolean().default(false),
})

type UpdateRoleForm = z.infer<typeof updateRoleSchema>
type AssignBranchForm = z.infer<typeof assignBranchSchema>

export default function UsersManagementPage() {
  const { branches, canViewAllBranches } = useBranch()
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

  const roleOptions = ['OWNER', 'ADMIN_GLOBAL', 'ADMIN_CABANG', 'GURU']
  const roleLabels: Record<string, string> = {
    OWNER: 'Owner',
    ADMIN_GLOBAL: 'Admin Global',
    ADMIN_CABANG: 'Admin Cabang',
    GURU: 'Guru',
  }
  const statusLabels: Record<string, string> = {
    active: 'Aktif',
    inactive: 'Nonaktif',
  }

  // Fetch users
  const { data: usersData, isLoading } = useQuery({
    queryKey: ['users', { page, limit, search: searchTerm, role: roleFilter, isActive: statusFilter === 'active' }],
    queryFn: async () => {
      const response = await usersApi.getAll(page, limit, {
        search: searchTerm || undefined,
        role: roleFilter || undefined,
      })
      return response.data
    },
  })

  // Fetch branches for dropdown
  const { data: branchesData = [] } = useQuery({
    queryKey: ['branches-select'],
    queryFn: async () => {
      const response = await branchApi.getAll()
      return response.data?.data || []
    },
  })

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async (data: { userId: string; role: string }) => {
      const response = await usersApi.updateRole(data.userId, data.role)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setShowRoleModal(false)
    },
  })

  // Assign branch mutation
  const assignBranchMutation = useMutation({
    mutationFn: async (data: { userId: string; branchId: string; isPrimary: boolean }) => {
      const response = await usersApi.assignBranch(data.userId, {
        branchId: data.branchId,
        isPrimary: data.isPrimary,
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setShowBranchModal(false)
    },
  })

  // Remove branch mutation
  const removeBranchMutation = useMutation({
    mutationFn: async (data: { userId: string; branchId: string }) => {
      const response = await usersApi.removeBranch(data.userId, data.branchId)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })

  // Deactivate user mutation
  const deactivateUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await usersApi.deactivate(userId)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })

  // Activate user mutation
  const activateUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await usersApi.activate(userId)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })

  // Add role mutation
  const addRoleMutation = useMutation({
    mutationFn: async (data: { userId: string; role: string }) => {
      const response = await usersApi.addRole(data.userId, data.role)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })

  // Remove role mutation
  const removeRoleMutation = useMutation({
    mutationFn: async (data: { userId: string; role: string }) => {
      const response = await usersApi.removeRole(data.userId, data.role)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })

  const roleForm = useForm<UpdateRoleForm>({
    resolver: zodResolver(updateRoleSchema),
    defaultValues: { role: selectedUser?.role || 'GURU' },
  })

  const branchForm = useForm<AssignBranchForm>({
    resolver: zodResolver(assignBranchSchema),
    defaultValues: { branchId: '', isPrimary: false },
  })

  useEffect(() => {
    if (selectedUser) {
      roleForm.reset({ role: selectedUser.role })
    }
  }, [selectedUser, roleForm])

  const onUpdateRole = async (data: UpdateRoleForm) => {
    if (!selectedUser) return
    await updateRoleMutation.mutateAsync({ userId: selectedUser.id, role: data.role })
  }

  const onAssignBranch = async (data: AssignBranchForm) => {
    if (!selectedUser) return
    await assignBranchMutation.mutateAsync({
      userId: selectedUser.id,
      branchId: data.branchId,
      isPrimary: data.isPrimary,
    })
    branchForm.reset()
  }

  const users = useMemo(() => {
    let filtered = usersData?.data || []

    if (statusFilter === 'inactive') {
      filtered = filtered.filter((u: any) => !u.isActive)
    }

    return filtered
  }, [usersData, statusFilter])

  const pagination = usersData?.pagination || {}

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Manajemen Pengguna</h1>
          <p className="text-gray-600">Kelola pengguna, peran, dan akses cabang</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <SectionCard title="">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Pengguna</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{pagination.total || 0}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <User className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </SectionCard>

          <SectionCard title="">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Admin Global</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {usersData?.data?.filter((u: any) => u.role === 'ADMIN_GLOBAL').length || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Lock className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </SectionCard>

          <SectionCard title="">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Admin Cabang</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {usersData?.data?.filter((u: any) => u.role === 'ADMIN_CABANG').length || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Lock className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </SectionCard>

          <SectionCard title="">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Guru</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {usersData?.data?.filter((u: any) => u.role === 'GURU').length || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <User className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </SectionCard>
        </div>

        {/* Filters & Search */}
        <Card className="mb-6">
          <div className="flex flex-col gap-4">
            {/* Search & Status Row */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Cari berdasarkan nama atau email..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setPage(1)
                  }}
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value)
                  setPage(1)
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="active">Status: Aktif</option>
                <option value="inactive">Status: Nonaktif</option>
              </select>

              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value)
                  setPage(1)
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Semua Peran</option>
                {roleOptions.map((role) => (
                  <option key={role} value={role}>
                    {roleLabels[role]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {/* Users Table */}
        <Card>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : users.length === 0 ? (
            <EmptyState icon={<User className="w-12 h-12 text-gray-400" />} title="Tidak ada pengguna" description="Mulai dengan menambahkan pengguna baru" />
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
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                              {user.name
                                .split(' ')
                                .map((n: string) => n[0])
                                .join('')
                                .slice(0, 2)
                                .toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{user.name}</p>
                              <p className="text-sm text-gray-500 flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {user.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {user.roles && user.roles.length > 0 ? (
                              user.roles.map((role: string) => (
                                <Badge key={role} variant="secondary">
                                  {roleLabels[role]}
                                </Badge>
                              ))
                            ) : (
                              <Badge variant="secondary">{roleLabels[user.role]}</Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {user.branches && user.branches.length > 0 ? (
                              user.branches.map((branch: any) => (
                                <div key={branch.id} className="text-xs">
                                  <Badge variant={branch.isPrimary ? 'success' : 'default'}>
                                    {branch.name}
                                    {branch.isPrimary && ' ⭐'}
                                  </Badge>
                                </div>
                              ))
                            ) : (
                              <span className="text-xs text-gray-500 italic">Belum ada cabang</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={user.isActive ? 'success' : 'danger'}>
                            {user.isActive ? '✓ Aktif' : '✗ Nonaktif'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setSelectedUser(user)
                                setShowMultiRoleModal(true)
                              }}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition"
                              title="Kelola peran"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => {
                                setSelectedUser(user)
                                setShowBranchModal(true)
                              }}
                              className="p-1.5 text-purple-600 hover:bg-purple-50 rounded transition"
                              title="Kelola cabang"
                            >
                              <Plus className="w-4 h-4" />
                            </button>

                            {user.isActive ? (
                              <button
                                onClick={() => deactivateUserMutation.mutate(user.id)}
                                disabled={deactivateUserMutation.isPending}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded transition disabled:opacity-50"
                                title="Nonaktifkan"
                              >
                                <Lock className="w-4 h-4" />
                              </button>
                            ) : (
                              <button
                                onClick={() => activateUserMutation.mutate(user.id)}
                                disabled={activateUserMutation.isPending}
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
                  Menampilkan {(page - 1) * limit + 1} - {Math.min(page * limit, pagination.total)} dari {pagination.total} pengguna
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={!pagination.hasPrevPage}
                    className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    ← Sebelumnya
                  </button>
                  <div className="flex items-center gap-1">
                    {[...Array(pagination.totalPages || 1)].map((_, i) => (
                      <button
                        key={i + 1}
                        onClick={() => setPage(i + 1)}
                        className={`px-2 py-1 text-sm rounded ${
                          page === i + 1
                            ? 'bg-blue-600 text-white'
                            : 'border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setPage(Math.min(pagination.totalPages || 1, page + 1))}
                    disabled={!pagination.hasNextPage}
                    className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Selanjutnya →
                  </button>
                </div>
              </div>
            </>
          )}
        </Card>

        {/* Update Role Modal */}
        {showRoleModal && selectedUser && (
          <>
            <div
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setShowRoleModal(false)}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <Card className="w-full max-w-md">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900">Ubah Peran Pengguna</h2>
                  <button
                    onClick={() => setShowRoleModal(false)}
                    className="p-1 hover:bg-gray-100 rounded transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="mb-4 p-3 bg-blue-50 rounded border border-blue-200">
                  <p className="font-medium text-gray-900">{selectedUser.name}</p>
                  <p className="text-sm text-gray-600">{selectedUser.email}</p>
                </div>

                <form onSubmit={roleForm.handleSubmit(onUpdateRole)}>
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Peran Baru
                    </label>
                    <select
                      {...roleForm.register('role')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {roleOptions.map((role) => (
                        <option key={role} value={role}>
                          {roleLabels[role]}
                        </option>
                      ))}
                    </select>
                    {roleForm.formState.errors.role && (
                      <p className="text-red-600 text-xs mt-1">{roleForm.formState.errors.role.message}</p>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowRoleModal(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={updateRoleMutation.isPending}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50"
                    >
                      {updateRoleMutation.isPending ? 'Menyimpan...' : 'Simpan'}
                    </button>
                  </div>
                </form>
              </Card>
            </div>
          </>
        )}

        {/* Multi-Role Management Modal */}
        {showMultiRoleModal && selectedUser && (
          <>
            <div
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setShowMultiRoleModal(false)}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900">Kelola Peran Pengguna</h2>
                  <button
                    onClick={() => setShowMultiRoleModal(false)}
                    className="p-1 hover:bg-gray-100 rounded transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="mb-6 p-3 bg-blue-50 rounded border border-blue-200">
                  <p className="font-medium text-gray-900">{selectedUser.name}</p>
                  <p className="text-sm text-gray-600">{selectedUser.email}</p>
                </div>

                {/* Current Roles */}
                {selectedUser.roles && selectedUser.roles.length > 0 && (
                  <div className="mb-6">
                    <p className="text-sm font-medium text-gray-700 mb-3">Peran Saat Ini</p>
                    <div className="space-y-2">
                      {selectedUser.roles.map((role: string) => (
                        <div
                          key={role}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200"
                        >
                          <div>
                            <p className="font-medium text-gray-900 text-sm">{roleLabels[role]}</p>
                            <p className="text-xs text-gray-600">{role}</p>
                          </div>
                          <button
                            onClick={() =>
                              removeRoleMutation.mutate({
                                userId: selectedUser.id,
                                role,
                              })
                            }
                            disabled={
                              selectedUser.roles.length === 1 || removeRoleMutation.isPending
                            }
                            className="p-1 text-red-600 hover:bg-red-50 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
                            title={
                              selectedUser.roles.length === 1
                                ? 'Pengguna harus memiliki minimal 1 peran'
                                : 'Hapus peran'
                            }
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Add Role Form */}
                <div className="border-t border-gray-200 pt-6">
                  <p className="text-sm font-medium text-gray-700 mb-3">Tambah Peran</p>
                  <div className="space-y-2">
                    {roleOptions.map((role) => {
                      const hasRole = selectedUser.roles?.includes(role)
                      return (
                        <button
                          key={role}
                          onClick={() =>
                            !hasRole &&
                            addRoleMutation.mutate({
                              userId: selectedUser.id,
                              role,
                            })
                          }
                          disabled={hasRole || addRoleMutation.isPending}
                          className={`w-full px-3 py-2 rounded-lg text-sm font-medium transition ${
                            hasRole
                              ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                              : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200'
                          }`}
                        >
                          {hasRole ? `✓ ${roleLabels[role]} (Sudah ada)` : `+ Tambah ${roleLabels[role]}`}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <button
                  onClick={() => setShowMultiRoleModal(false)}
                  className="w-full mt-4 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition"
                >
                  Tutup
                </button>
              </Card>
            </div>
          </>
        )}

        {/* Assign Branch Modal */}
        {showBranchModal && selectedUser && (
          <>
            <div
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setShowBranchModal(false)}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900">Kelola Cabang</h2>
                  <button
                    onClick={() => setShowBranchModal(false)}
                    className="p-1 hover:bg-gray-100 rounded transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="mb-4 p-3 bg-blue-50 rounded border border-blue-200">
                  <p className="font-medium text-gray-900">{selectedUser.name}</p>
                  <p className="text-sm text-gray-600">{roleLabels[selectedUser.role]}</p>
                </div>

                {/* Current Branches */}
                {selectedUser.branches && selectedUser.branches.length > 0 && (
                  <div className="mb-6">
                    <p className="text-sm font-medium text-gray-700 mb-3">Cabang Terkait</p>
                    <div className="space-y-2">
                      {selectedUser.branches.map((branch: any) => (
                        <div
                          key={branch.id}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200"
                        >
                          <div>
                            <p className="font-medium text-gray-900 text-sm">{branch.name}</p>
                            <p className="text-xs text-gray-600">{branch.code}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {branch.isPrimary && (
                              <span className="text-xs font-semibold text-yellow-600 bg-yellow-50 px-2 py-1 rounded">
                                Utama
                              </span>
                            )}
                            <button
                              onClick={() =>
                                removeBranchMutation.mutate({
                                  userId: selectedUser.id,
                                  branchId: branch.id,
                                })
                              }
                              disabled={
                                selectedUser.branches.length === 1 ||
                                removeBranchMutation.isPending
                              }
                              className="p-1 text-red-600 hover:bg-red-50 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
                              title={
                                selectedUser.branches.length === 1
                                  ? 'Pengguna harus memiliki minimal 1 cabang'
                                  : 'Hapus cabang'
                              }
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Add Branch Form */}
                <div className="border-t border-gray-200 pt-6">
                  <p className="text-sm font-medium text-gray-700 mb-3">Tambah Cabang</p>
                  <form onSubmit={branchForm.handleSubmit(onAssignBranch)}>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Pilih Cabang
                      </label>
                      <select
                        {...branchForm.register('branchId')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Pilih cabang...</option>
                        {branchesData.map((branch: any) => {
                          const isAlreadyAssigned = selectedUser.branches?.some(
                            (b: any) => b.id === branch.id
                          )
                          return (
                            <option key={branch.id} value={branch.id} disabled={isAlreadyAssigned}>
                              {branch.name} {isAlreadyAssigned ? '(Sudah ditugaskan)' : ''}
                            </option>
                          )
                        })}
                      </select>
                      {branchForm.formState.errors.branchId && (
                        <p className="text-red-600 text-xs mt-1">
                          {branchForm.formState.errors.branchId.message}
                        </p>
                      )}
                    </div>

                    <div className="mb-4 flex items-center gap-2">
                      <input
                        type="checkbox"
                        {...branchForm.register('isPrimary')}
                        id="isPrimary"
                        className="w-4 h-4 rounded border border-gray-300"
                      />
                      <label htmlFor="isPrimary" className="text-sm text-gray-700">
                        Jadikan cabang utama
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={assignBranchMutation.isPending}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50"
                    >
                      {assignBranchMutation.isPending ? 'Menambahkan...' : 'Tambah Cabang'}
                    </button>
                  </form>
                </div>

                <button
                  onClick={() => setShowBranchModal(false)}
                  className="w-full mt-4 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition"
                >
                  Tutup
                </button>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
