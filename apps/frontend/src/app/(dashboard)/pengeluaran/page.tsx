'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, Trash2, X, Filter } from 'lucide-react'
import { useBranch, useApiBranchId } from '@/lib/branch-context'
import { ErrorState } from '@/components/ui/States'
import { expenseApi } from '@/lib/api/endpoints'

const CATEGORY_LABELS: Record<string, string> = {
  OPERATIONAL: 'Operasional',
  ASSET: 'Aset',
}

const CATEGORY_COLORS: Record<string, string> = {
  OPERATIONAL: 'bg-blue-100 text-blue-700',
  ASSET: 'bg-purple-100 text-purple-700',
}

const schema = z.object({
  branchId: z.string().min(1, 'Pilih cabang'),
  category: z.enum(['OPERATIONAL', 'ASSET'], { required_error: 'Pilih kategori' }),
  description: z.string().min(3, 'Deskripsi minimal 3 karakter'),
  amount: z.coerce.number().min(1, 'Jumlah harus lebih dari 0'),
  date: z.string().min(1, 'Pilih tanggal'),
  notes: z.string().optional(),
})

type FormData = z.infer<typeof schema>

function formatRupiah(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)
}

export default function PengeluaranPage() {
  const queryClient = useQueryClient()
  const branchId = useApiBranchId()
  const { branches, selectedBranchId, canViewAllBranches, setSelectedBranchId } = useBranch()

  const now = new Date()
  const [filterMonth, setFilterMonth] = useState(now.getMonth() + 1)
  const [filterYear, setFilterYear] = useState(now.getFullYear())
  const [filterCategory, setFilterCategory] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const { data, isLoading, error: queryError, refetch } = useQuery({
    queryKey: ['expenses', branchId, filterMonth, filterYear, filterCategory],
    queryFn: () =>
      expenseApi.getAll({
        branchId: branchId || undefined,
        month: filterMonth,
        year: filterYear,
        category: filterCategory || undefined,
      }),
    networkMode: 'always',
  })

  const expenses: any[] = data?.data?.data || []
  const meta = data?.data?.meta || { total: 0, count: 0 }

  const operationalTotal = useMemo(
    () => expenses.filter(e => e.category === 'OPERATIONAL').reduce((s, e) => s + e.amount, 0),
    [expenses],
  )
  const assetTotal = useMemo(
    () => expenses.filter(e => e.category === 'ASSET').reduce((s, e) => s + e.amount, 0),
    [expenses],
  )

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { date: now.toISOString().split('T')[0] },
  })

  const createMutation = useMutation({
    mutationFn: (data: FormData) => expenseApi.create(data),
    onSuccess: () => { refetch(); closeForm() },
    onError: (e: any) => setError(e.response?.data?.message || 'Gagal menyimpan pengeluaran'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<FormData> }) => expenseApi.update(id, data),
    onSuccess: () => { refetch(); closeForm() },
    onError: (e: any) => setError(e.response?.data?.message || 'Gagal mengupdate pengeluaran'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => expenseApi.delete(id),
    onSuccess: () => { refetch(); setDeleteId(null) },
  })

  function openCreate() {
    reset({ date: now.toISOString().split('T')[0], branchId: selectedBranchId || '' })
    setEditingId(null)
    setError('')
    setShowForm(true)
  }

  function openEdit(expense: any) {
    reset({
      branchId: expense.branchId,
      category: expense.category,
      description: expense.description,
      amount: expense.amount,
      date: expense.date,
      notes: expense.notes || '',
    })
    setEditingId(expense.id)
    setError('')
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditingId(null)
    setError('')
    reset()
  }

  const onSubmit = (data: FormData) => {
    if (editingId) {
      updateMutation.mutate({ id: editingId, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ]

  const years = Array.from({ length: 4 }, (_, i) => now.getFullYear() - 1 + i)

  if (!selectedBranchId && canViewAllBranches) {
    return (
      <div className="p-6">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
          <p className="text-amber-800 font-medium mb-3">Pilih cabang untuk melihat pengeluaran</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {branches.map(b => (
              <button
                key={b.id}
                onClick={() => setSelectedBranchId(b.id)}
                className="px-4 py-2 bg-white border border-amber-300 rounded-lg text-sm font-medium hover:bg-amber-50 transition"
              >
                {b.name}
              </button>
            ))}
          </div>
          <p className="text-xs text-amber-600 mt-3">Anda tetap bisa melihat laporan keuangan konsolidasi di halaman Laporan Keuangan</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-900">Pencatatan Pengeluaran</h2>
          <p className="text-sm text-gray-500 mt-0.5 hidden sm:block">Operasional dan pembelian aset per cabang</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Tambah </span>Pengeluaran
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Total Pengeluaran</p>
          <p className="text-xl font-bold text-red-700">{formatRupiah(meta.total)}</p>
          <p className="text-xs text-gray-400 mt-1">{meta.count} transaksi</p>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
          <p className="text-xs text-blue-600 mb-1">Operasional</p>
          <p className="text-xl font-bold text-blue-700">{formatRupiah(operationalTotal)}</p>
          <p className="text-xs text-blue-400 mt-1">{expenses.filter(e => e.category === 'OPERATIONAL').length} transaksi</p>
        </div>
        <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
          <p className="text-xs text-purple-600 mb-1">Aset</p>
          <p className="text-xl font-bold text-purple-700">{formatRupiah(assetTotal)}</p>
          <p className="text-xs text-purple-400 mt-1">{expenses.filter(e => e.category === 'ASSET').length} transaksi</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap bg-white border border-gray-200 rounded-xl p-4">
        <Filter className="w-4 h-4 text-gray-400" />
        <select
          value={filterMonth}
          onChange={e => setFilterMonth(Number(e.target.value))}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {months.map((m, i) => (
            <option key={i + 1} value={i + 1}>{m}</option>
          ))}
        </select>
        <select
          value={filterYear}
          onChange={e => setFilterYear(Number(e.target.value))}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Semua kategori</option>
          <option value="OPERATIONAL">Operasional</option>
          <option value="ASSET">Aset</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
        {queryError ? (
          <ErrorState
            title="Gagal memuat data"
            description="Terjadi kesalahan saat memuat data. Silakan coba lagi."
            action={{ label: 'Coba Lagi', onClick: refetch }}
          />
        ) : isLoading ? (
          <div className="p-12 text-center text-gray-400 text-sm">Memuat data...</div>
        ) : expenses.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-400 text-sm">Belum ada pengeluaran untuk periode ini</p>
            <button onClick={openCreate} className="mt-3 text-blue-600 text-sm font-medium hover:underline">
              + Tambah pengeluaran pertama
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tanggal</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Kategori</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Deskripsi</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Cabang</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Jumlah</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Dicatat oleh</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {expenses.map(expense => (
                <tr key={expense.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3 text-gray-700">
                    {new Date(expense.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_COLORS[expense.category]}`}>
                      {CATEGORY_LABELS[expense.category]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-900 font-medium">
                    {expense.description}
                    {expense.notes && <p className="text-xs text-gray-400 font-normal mt-0.5">{expense.notes}</p>}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{expense.branch?.name}</td>
                  <td className="px-4 py-3 text-right font-semibold text-red-700">{formatRupiah(expense.amount)}</td>
                  <td className="px-4 py-3 text-gray-500">{expense.recordedBy?.name}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => openEdit(expense)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteId(expense.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-base font-semibold text-gray-900">
                {editingId ? 'Edit Pengeluaran' : 'Tambah Pengeluaran'}
              </h3>
              <button onClick={closeForm} className="p-1 text-gray-400 hover:text-gray-600 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cabang</label>
                <select
                  {...register('branchId')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Pilih cabang --</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
                {errors.branchId && <p className="text-red-500 text-xs mt-1">{errors.branchId.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
                  <select
                    {...register('category')}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Pilih --</option>
                    <option value="OPERATIONAL">Operasional</option>
                    <option value="ASSET">Aset</option>
                  </select>
                  {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal</label>
                  <input
                    type="date"
                    {...register('date')}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date.message}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
                <input
                  type="text"
                  {...register('description')}
                  placeholder="cth: Biaya listrik bulan Juni"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah (Rp)</label>
                <input
                  type="number"
                  {...register('amount')}
                  placeholder="500000"
                  min="1"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Catatan (opsional)</label>
                <textarea
                  {...register('notes')}
                  rows={2}
                  placeholder="cth: Tagihan PLN no. xxxxxx"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeForm}
                  className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {createMutation.isPending || updateMutation.isPending ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Tambah'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-2">Hapus Pengeluaran?</h3>
            <p className="text-sm text-gray-600 mb-6">Data pengeluaran ini akan dihapus permanen dan tidak bisa dikembalikan.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
              >
                Batal
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteId)}
                disabled={deleteMutation.isPending}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Menghapus...' : 'Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
