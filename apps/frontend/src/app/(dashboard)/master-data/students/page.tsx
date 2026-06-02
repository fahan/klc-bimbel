'use client'

import React, { useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { studentApi, branchApi } from '@/lib/api/endpoints'
import { Plus, Eye, Trash2, Search, Filter, Upload } from 'lucide-react'
import { Card, SectionCard } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/Badge'
import { SkeletonCard, EmptyState, LoadingState } from '@/components/ui/States'
import { ImportStudentsModal } from '@/components/students/ImportStudentsModal'
import { usePagination } from '@/hooks/usePagination'
import { Pagination } from '@/components/ui/Pagination'

export default function StudentsListPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const successParam = searchParams.get('success')
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null)
  const [searchTerm, setSearchTerm] = React.useState('')
  const [isImportModalOpen, setIsImportModalOpen] = React.useState(false)

  const { items: students, page, limit, setPage, setLimit, pagination, isLoading, refetch } = usePagination({
    queryKey: ['students'],
    queryFn: (page, limit, search) => studentApi.getAll(page, limit, undefined, search),
    searchTerm,
    initialLimit: 10,
  })

  // Reset page to 1 when search term changes
  useEffect(() => {
    setPage(1)
  }, [searchTerm]) // Only depend on searchTerm, not setPage

  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchApi.getAll(),
  })

  useEffect(() => {
    if (successParam) {
      setSuccessMessage('✅ Siswa berhasil didaftarkan!')

      // Refetch data to show newly added student
      refetch()

      const timer = setTimeout(() => {
        setSuccessMessage(null)
        router.replace('/master-data/students')
      }, 4000)
      return () => clearTimeout(timer)
    }
  }, [successParam, router, refetch])

  const branches = branchesData?.data?.data || []
  const studentsArray = Array.isArray(students) ? students : []

  const getBranchName = (branchId: string) => {
    return branches.find((b: any) => b.id === branchId)?.name || '-'
  }

  const handleDelete = async (id: string) => {
    if (confirm('Yakin hapus siswa ini?')) {
      try {
        await studentApi.delete(id)
        window.location.reload()
      } catch (error) {
        alert('Gagal menghapus siswa')
      }
    }
  }

  const handleImportSuccess = () => {
    setSuccessMessage('✅ Data siswa berhasil diimport!')
    refetch()
    setTimeout(() => {
      setSuccessMessage(null)
    }, 4000)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Data Siswa</h1>
          <p className="text-gray-600 mt-1">Kelola daftar siswa terdaftar di semua cabang</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition font-medium shadow-sm"
          >
            <Upload className="w-5 h-5" />
            Import CSV
          </button>
          <Link
            href="/master-data/students/create"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium shadow-sm"
          >
            <Plus className="w-5 h-5" />
            Daftarkan Siswa Baru
          </Link>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
          <div className="mt-0.5 text-green-600 text-xl">✓</div>
          <div>
            <p className="font-medium text-green-900">{successMessage}</p>
            <p className="text-sm text-green-700 mt-1">Siswa telah ditambahkan ke sistem dan siap untuk pendaftaran mata pelajaran</p>
          </div>
        </div>
      )}

      {/* Search and Filter */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Cari siswa atau nomor HP..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
        </div>
        <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition flex items-center gap-2 text-gray-700 font-medium">
          <Filter className="w-5 h-5" />
          Filter
        </button>
      </div>

      {/* Students Table */}
      {isLoading ? (
        <LoadingState />
      ) : studentsArray.length === 0 && !searchTerm ? (
        <EmptyState
          title="Belum ada siswa"
          description="Mulai dengan mendaftarkan siswa pertama ke sistem"
          action={{
            label: 'Daftarkan Siswa Pertama',
            onClick: () => router.push('/master-data/students/create'),
          }}
        />
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Nama Siswa</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Cabang</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">No. HP Orang Tua</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Mata Pelajaran</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {studentsArray.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center">
                      <p className="text-gray-500">
                        {searchTerm ? 'Tidak ada siswa yang sesuai dengan pencarian' : 'Tidak ada siswa'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  studentsArray.map((student: any) => (
                    <tr key={student.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900">{student.name}</p>
                        {student.sureName && (
                          <p className="text-xs text-blue-500 mt-0.5">"{student.sureName}"</p>
                        )}
                        {student.birthDate && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            {new Date(student.birthDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{getBranchName(student.branchId)}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        <p>{student.parentPhone || '-'}</p>
                        {student.parentName && (
                          <p className="text-xs text-gray-400 mt-0.5">{student.parentName}</p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                          {student.subjects?.length || 0} mapel
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={student.isActive ? 'active' : 'inactive'} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <Link
                            href={`/master-data/students/${student.id}`}
                            className="text-blue-600 hover:text-blue-700 p-2 hover:bg-blue-50 rounded transition"
                            title="Lihat detail"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => handleDelete(student.id)}
                            className="text-red-600 hover:text-red-700 p-2 hover:bg-red-50 rounded transition"
                            title="Hapus siswa"
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
          {studentsArray.length > 0 && pagination && (
            <Pagination
              currentPage={page}
              totalPages={pagination.totalPages}
              limit={limit}
              onPageChange={setPage}
              onLimitChange={setLimit}
              isLoading={isLoading}
            />
          )}
        </div>
      )}

      {/* Import Modal */}
      <ImportStudentsModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={handleImportSuccess}
      />
    </div>
  )
}
