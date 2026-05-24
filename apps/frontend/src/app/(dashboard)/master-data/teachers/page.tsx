'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { teacherApi, branchApi } from '@/lib/api/endpoints'
import { Plus, Eye, Trash2, Search, Filter, Mail, Phone, BookOpen } from 'lucide-react'
import { StatusBadge } from '@/components/ui/Badge'
import { EmptyState, LoadingState } from '@/components/ui/States'
import { usePagination } from '@/hooks/usePagination'
import { Pagination } from '@/components/ui/Pagination'

export default function TeachersListPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const successParam = searchParams.get('success')
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null)
  const [searchTerm, setSearchTerm] = React.useState('')
  const [filterBranchId, setFilterBranchId] = React.useState<string>('')

  const { items: teachers, page, limit, setPage, setLimit, pagination, isLoading, refetch } = usePagination({
    queryKey: ['teachers', filterBranchId],
    queryFn: (page, limit) => teacherApi.getAll(page, limit, filterBranchId || undefined),
    initialLimit: 10,
  })

  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchApi.getAll(),
  })

  useEffect(() => {
    if (successParam) {
      const message =
        successParam === 'created'
          ? '✅ Guru berhasil ditambahkan!'
          : successParam === 'updated'
          ? '✅ Data guru berhasil diperbarui!'
          : '✅ Operasi berhasil!'
      setSuccessMessage(message)

      // Refetch data to show newly added/updated teacher
      refetch()

      const timer = setTimeout(() => {
        setSuccessMessage(null)
        router.replace('/master-data/teachers')
      }, 4000)
      return () => clearTimeout(timer)
    }
  }, [successParam, router, refetch])

  const branches = branchesData?.data?.data || []

  // Reset page to 1 when search term changes
  useEffect(() => {
    setPage(1)
  }, [searchTerm, setPage])

  // Filter teachers based on search
  const filteredTeachers = teachers.filter((teacher: any) =>
    teacher.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    teacher.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    teacher.phone?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Calculate pagination for filtered results
  const filteredPagination = searchTerm && pagination ? {
    ...pagination,
    total: filteredTeachers.length,
    totalPages: Math.ceil(filteredTeachers.length / limit),
  } : pagination

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Yakin ingin menghapus guru "${name}"?`)) {
      try {
        await teacherApi.delete(id)
        refetch()
      } catch (error: any) {
        alert(error.response?.data?.message || 'Gagal menghapus guru')
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Data Guru</h1>
          <p className="text-gray-600 mt-1">Kelola daftar guru dan penugasan ke cabang</p>
        </div>
        <Link
          href="/master-data/teachers/create"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium shadow-sm"
        >
          <Plus className="w-5 h-5" />
          Tambah Guru Baru
        </Link>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
          <div className="mt-0.5 text-green-600 text-xl">✓</div>
          <div>
            <p className="font-medium text-green-900">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Search and Filter */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Cari guru berdasarkan nama, email, atau nomor HP..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
        </div>
        <div className="relative">
          <select
            value={filterBranchId}
            onChange={(e) => setFilterBranchId(e.target.value)}
            className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition appearance-none bg-white text-gray-700 font-medium min-w-[200px]"
          >
            <option value="">Semua Cabang</option>
            {branches.map((branch: any) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
          <Filter className="absolute left-3 top-3 text-gray-400 w-5 h-5 pointer-events-none" />
        </div>
      </div>

      {/* Stats Cards */}
      {!isLoading && teachers.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <BookOpen className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Guru Aktif</p>
                <p className="text-2xl font-bold text-gray-900">{teachers.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <BookOpen className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Sesi Aktif</p>
                <p className="text-2xl font-bold text-gray-900">
                  {teachers.reduce((sum: number, t: any) => sum + (t.totalSessions || 0), 0)}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-lg">
                <BookOpen className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Multi-Cabang</p>
                <p className="text-2xl font-bold text-gray-900">
                  {teachers.filter((t: any) => (t.branches?.length || 0) > 1).length}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Teachers Table */}
      {isLoading ? (
        <LoadingState />
      ) : teachers.length === 0 && !searchTerm ? (
        <EmptyState
          title="Belum ada guru"
          description="Mulai dengan menambahkan guru pertama ke sistem"
          action={{
            label: 'Tambah Guru Pertama',
            onClick: () => router.push('/master-data/teachers/create'),
          }}
        />
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Nama Guru</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Email</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">No. HP</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Cabang</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Sesi Aktif</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredTeachers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center">
                      <p className="text-gray-500">
                        {searchTerm ? 'Tidak ada guru yang sesuai dengan pencarian' : 'Tidak ada guru'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredTeachers.map((teacher: any) => (
                    <tr key={teacher.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                            {teacher.name
                              .split(' ')
                              .map((n: string) => n[0])
                              .join('')
                              .slice(0, 2)
                              .toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{teacher.name}</p>
                            <p className="text-xs text-gray-500 mt-0.5">ID: {teacher.id.slice(0, 8)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Mail className="w-4 h-4 text-gray-400" />
                          {teacher.email}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {teacher.phone ? (
                          <div className="flex items-center gap-2 text-gray-600">
                            <Phone className="w-4 h-4 text-gray-400" />
                            {teacher.phone}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex flex-wrap gap-1">
                          {teacher.branches?.length > 0 ? (
                            teacher.branches.map((b: any) => (
                              <span
                                key={b.id}
                                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  b.isPrimary
                                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                                    : 'bg-gray-100 text-gray-700'
                                }`}
                              >
                                {b.isPrimary && '⭐ '}
                                {b.name || b.branchName || b.branchCode}
                              </span>
                            ))
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium">
                          {teacher.totalSessions || 0} sesi
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={teacher.isActive ? 'active' : 'inactive'} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <Link
                            href={`/master-data/teachers/${teacher.id}`}
                            className="text-blue-600 hover:text-blue-700 p-2 hover:bg-blue-50 rounded transition"
                            title="Lihat detail"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => handleDelete(teacher.id, teacher.name)}
                            className="text-red-600 hover:text-red-700 p-2 hover:bg-red-50 rounded transition"
                            title="Hapus guru"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {filteredTeachers.length > 0 && filteredPagination && (
            <Pagination
              currentPage={page}
              totalPages={filteredPagination.totalPages}
              limit={limit}
              onPageChange={setPage}
              onLimitChange={setLimit}
              isLoading={isLoading}
            />
          )}
        </div>
      )}
    </div>
  )
}
