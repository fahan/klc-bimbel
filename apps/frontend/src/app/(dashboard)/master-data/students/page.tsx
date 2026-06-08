'use client'

import React, { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { studentApi, branchApi } from '@/lib/api/endpoints'
import { useApiBranchId } from '@/lib/branch-context'
import { Plus, Eye, Trash2, Search, Filter, Upload, X, ChevronDown } from 'lucide-react'
import { StatusBadge } from '@/components/ui/Badge'
import { EmptyState, LoadingState } from '@/components/ui/States'
import { ImportStudentsModal } from '@/components/students/ImportStudentsModal'
import { Pagination } from '@/components/ui/Pagination'

type StatusFilter = 'true' | 'false' | 'all'

export default function StudentsListPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const successParam = searchParams.get('success')

  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('true')
  const [filterOpen, setFilterOpen] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const filterRef = useRef<HTMLDivElement>(null)

  const branchId = useApiBranchId()

  // Reset to page 1 whenever any filter changes
  useEffect(() => { setPage(1) }, [searchTerm, branchId, statusFilter])

  // Close filter dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['students', page, limit, searchTerm, branchId ?? '', statusFilter],
    queryFn: () => studentApi.getAll(page, limit, branchId, searchTerm || undefined, statusFilter),
  })

  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchApi.getAll(),
  })

  useEffect(() => {
    if (successParam) {
      setSuccessMessage('Siswa berhasil didaftarkan!')
      refetch()
      const timer = setTimeout(() => {
        setSuccessMessage(null)
        router.replace('/master-data/students')
      }, 4000)
      return () => clearTimeout(timer)
    }
  }, [successParam, router, refetch])

  const branches = branchesData?.data?.data || []
  const studentsArray: any[] = data?.data?.data || []
  const pagination = data?.data?.pagination

  const getBranchName = (bid: string) =>
    branches.find((b: any) => b.id === bid)?.name || '-'

  const handleDelete = async (id: string) => {
    if (confirm('Yakin hapus siswa ini?')) {
      try {
        await studentApi.delete(id)
        refetch()
      } catch {
        alert('Gagal menghapus siswa')
      }
    }
  }

  const handleImportSuccess = () => {
    setSuccessMessage('Data siswa berhasil diimport!')
    refetch()
    setTimeout(() => setSuccessMessage(null), 4000)
  }

  const activeFilterCount = (statusFilter !== 'true' ? 1 : 0)

  const statusLabel: Record<StatusFilter, string> = {
    true: 'Aktif',
    false: 'Non-aktif',
    all: 'Semua Status',
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
            <p className="text-sm text-green-700 mt-1">
              Siswa telah ditambahkan ke sistem dan siap untuk pendaftaran mata pelajaran
            </p>
          </div>
        </div>
      )}

      {/* Search + Filter */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Cari nama siswa atau no. HP orang tua..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
        </div>

        {/* Filter Dropdown */}
        <div className="relative" ref={filterRef}>
          <button
            onClick={() => setFilterOpen((v) => !v)}
            className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition font-medium ${
              activeFilterCount > 0
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Filter className="w-5 h-5" />
            Filter
            {activeFilterCount > 0 && (
              <span className="ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-bold">
                {activeFilterCount}
              </span>
            )}
            <ChevronDown className={`w-4 h-4 transition-transform ${filterOpen ? 'rotate-180' : ''}`} />
          </button>

          {filterOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-lg z-20 p-4 space-y-4">
              <p className="text-sm font-semibold text-gray-700">Filter Siswa</p>

              {/* Status filter */}
              <div>
                <p className="text-xs font-medium text-gray-500 mb-2">Status</p>
                <div className="flex flex-col gap-1">
                  {(['true', 'false', 'all'] as StatusFilter[]).map((val) => (
                    <button
                      key={val}
                      onClick={() => { setStatusFilter(val); setFilterOpen(false) }}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition ${
                        statusFilter === val
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${
                        val === 'true' ? 'bg-green-500' : val === 'false' ? 'bg-red-400' : 'bg-gray-400'
                      }`} />
                      {statusLabel[val]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reset */}
              {activeFilterCount > 0 && (
                <button
                  onClick={() => { setStatusFilter('true'); setFilterOpen(false) }}
                  className="w-full text-xs text-gray-500 hover:text-gray-700 underline text-left"
                >
                  Reset ke default
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Active filter chips */}
      {(statusFilter !== 'true' || branchId) && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500">Filter aktif:</span>
          {branchId && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-medium">
              Cabang: {branches.find((b: any) => b.id === branchId)?.name || branchId}
            </span>
          )}
          {statusFilter !== 'true' && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
              Status: {statusLabel[statusFilter]}
              <button onClick={() => setStatusFilter('true')} className="ml-1 hover:text-blue-900">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <LoadingState />
      ) : studentsArray.length === 0 && !searchTerm && statusFilter === 'true' && !branchId ? (
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
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      Tidak ada siswa yang sesuai dengan filter
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
                            {new Date(student.birthDate).toLocaleDateString('id-ID', {
                              day: 'numeric', month: 'short', year: 'numeric',
                            })}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {getBranchName(student.branchId)}
                      </td>
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
              onLimitChange={(newLimit) => { setLimit(newLimit); setPage(1) }}
              isLoading={isLoading}
            />
          )}
        </div>
      )}

      <ImportStudentsModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={handleImportSuccess}
      />
    </div>
  )
}
