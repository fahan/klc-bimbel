'use client'

import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { storeApi, branchApi } from '@/lib/api/endpoints'
import { useBranch } from '@/lib/branch-context'
import { ArrowRight, Package, Truck, AlertCircle, CheckCircle, Send, Globe } from 'lucide-react'
import { LoadingState } from '@/components/ui/States'

const CATEGORY_LABEL: Record<string, string> = {
  STATIONARY: 'Stationary',
  MODULE: 'Modul',
  UNIFORM: 'Seragam',
  STATIONERY: 'Alat tulis',
}

function formatRupiah(amount: number | string) {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return 'Rp ' + Math.round(num).toLocaleString('id-ID')
}

export default function TransferStokPage() {
  const { canViewAllBranches } = useBranch()
  const [sourceBranchId, setSourceBranchId] = useState('')
  const [destBranchId, setDestBranchId] = useState('')
  const [productId, setProductId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchApi.getAll(),
  })
  const branches = branchesData?.data?.data || []

  const { data: productsData, refetch } = useQuery({
    queryKey: ['transfer-products', sourceBranchId],
    queryFn: () => storeApi.getProducts({ branchId: sourceBranchId }),
    enabled: !!sourceBranchId,
  })
  const products = productsData?.data?.data || []

  const { data: historyData, refetch: refetchHistory } = useQuery({
    queryKey: ['transfer-history'],
    queryFn: () => storeApi.getTransferHistory(),
  })
  const history = historyData?.data?.data || []

  const selectedProduct = products.find((p: any) => p.id === productId)

  // Reset dest branch if it equals source
  React.useEffect(() => {
    if (sourceBranchId && destBranchId && sourceBranchId === destBranchId) {
      setDestBranchId('')
    }
  }, [sourceBranchId, destBranchId])

  // Reset product when source changes
  React.useEffect(() => {
    setProductId('')
  }, [sourceBranchId])

  const handleSubmit = async () => {
    if (!sourceBranchId || !destBranchId || !productId || quantity < 1) {
      setError('Lengkapi semua field')
      return
    }

    if (selectedProduct && selectedProduct.stock < quantity) {
      setError(`Stok tidak cukup. Tersedia: ${selectedProduct.stock}`)
      return
    }

    try {
      setSubmitting(true)
      setError('')
      const result = await storeApi.transferStock({
        productId,
        destinationBranchId: destBranchId,
        quantity,
        notes: notes || undefined,
      })
      setSuccess(result.data.message)
      setProductId('')
      setQuantity(1)
      setNotes('')
      refetch()
      refetchHistory()
      setTimeout(() => setSuccess(''), 5000)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal transfer stok')
    } finally {
      setSubmitting(false)
    }
  }

  if (!canViewAllBranches) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
        <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <AlertCircle className="w-7 h-7 text-red-600" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Akses Terbatas</h2>
        <p className="text-sm text-gray-600">
          Hanya <strong>Owner</strong> dan <strong>Admin Global</strong> yang dapat melakukan transfer
          stok antar cabang.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Transfer Stok Antar Cabang</h1>
        <p className="text-gray-600 mt-1">
          Pindahkan stok produk dari satu cabang ke cabang lain. Otomatis tercatat sebagai
          TRANSFER_OUT + TRANSFER_IN.
        </p>
      </div>

      {/* Success Message */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
          <p className="text-sm text-green-800">{success}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Transfer Form */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Truck className="w-5 h-5 text-blue-600" />
            Form Transfer Stok
          </h2>

          {/* Visual flow */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 text-center">
                <p className="text-[10px] font-semibold text-blue-700 uppercase mb-1">Dari</p>
                <p className="text-sm font-medium text-gray-900 truncate">
                  {sourceBranchId
                    ? branches.find((b: any) => b.id === sourceBranchId)?.name
                    : '— Pilih cabang sumber —'}
                </p>
              </div>
              <ArrowRight className="w-6 h-6 text-blue-600 flex-shrink-0" />
              <div className="flex-1 text-center">
                <p className="text-[10px] font-semibold text-blue-700 uppercase mb-1">Ke</p>
                <p className="text-sm font-medium text-gray-900 truncate">
                  {destBranchId
                    ? branches.find((b: any) => b.id === destBranchId)?.name
                    : '— Pilih cabang tujuan —'}
                </p>
              </div>
            </div>
          </div>

          {/* Source Branch */}
          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Cabang Sumber <span className="text-red-500">*</span>
            </label>
            <select
              value={sourceBranchId}
              onChange={(e) => setSourceBranchId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Pilih cabang asal --</option>
              {branches.map((b: any) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>

          {/* Product */}
          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Produk <span className="text-red-500">*</span>
            </label>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              disabled={!sourceBranchId}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">
                {sourceBranchId ? '-- Pilih produk --' : 'Pilih cabang dulu'}
              </option>
              {products
                .filter((p: any) => p.stock > 0)
                .map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {CATEGORY_LABEL[p.category]} · stok {p.stock}
                  </option>
                ))}
            </select>
            {selectedProduct && (
              <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600">Harga satuan:</span>
                  <span className="font-medium text-gray-900">
                    {formatRupiah(selectedProduct.price)}
                  </span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-gray-600">Stok tersedia:</span>
                  <span className="font-bold text-gray-900">{selectedProduct.stock}</span>
                </div>
              </div>
            )}
          </div>

          {/* Destination Branch */}
          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Cabang Tujuan <span className="text-red-500">*</span>
            </label>
            <select
              value={destBranchId}
              onChange={(e) => setDestBranchId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Pilih cabang tujuan --</option>
              {branches
                .filter((b: any) => b.id !== sourceBranchId)
                .map((b: any) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </option>
                ))}
            </select>
          </div>

          {/* Quantity */}
          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Jumlah <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min={1}
              max={selectedProduct?.stock || undefined}
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {selectedProduct && (
              <p className="text-[11px] text-gray-500 mt-1">
                Maksimal {selectedProduct.stock} unit
              </p>
            )}
          </div>

          {/* Notes */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Catatan (opsional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Misal: Permintaan dari admin Bandung..."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {error && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-200 p-2 rounded mb-3">
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={!sourceBranchId || !destBranchId || !productId || submitting}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
          >
            <Send className="w-4 h-4" />
            {submitting ? 'Memproses...' : 'Konfirmasi Transfer'}
          </button>
        </div>

        {/* Info Card + Notes */}
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-amber-800 space-y-1.5">
                <p>
                  <strong>Cara kerja transfer stok:</strong>
                </p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Stok di cabang sumber akan otomatis berkurang.</li>
                  <li>
                    Jika produk dengan nama & kategori sama belum ada di cabang tujuan, akan
                    otomatis dibuat.
                  </li>
                  <li>Tercatat sebagai 2 mutasi: <strong>TRANSFER_OUT</strong> + <strong>TRANSFER_IN</strong>.</li>
                  <li>Tidak terhitung sebagai pengeluaran/pemasukan keuangan.</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <Globe className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-blue-800">
                <p className="font-semibold mb-1">Hak Akses</p>
                <p>
                  Transfer stok hanya bisa dilakukan oleh <strong>Owner</strong> atau{' '}
                  <strong>Admin Global</strong>. Admin cabang dapat melakukan{' '}
                  <strong>request restock</strong> ke owner.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Transfer History */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" />
            Riwayat Transfer
          </h2>
          <span className="text-xs text-gray-500">{history.length} mutasi</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Tanggal</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Tipe</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Cabang</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Produk</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">Jumlah</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Catatan</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Oleh</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8">
                    <div className="text-center">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Package className="w-6 h-6 text-gray-400" />
                      </div>
                      <p className="text-gray-900 font-medium">Belum ada riwayat transfer</p>
                      <p className="text-sm text-gray-500 mt-1">Mulai dengan mentransfer stok antar cabang menggunakan form di atas</p>
                    </div>
                  </td>
                </tr>
              ) : (
                history.map((m: any) => (
                  <tr key={m.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                      {new Date(m.createdAt).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          m.type === 'TRANSFER_OUT'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {m.type === 'TRANSFER_OUT' ? '↗ Keluar' : '↙ Masuk'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 font-medium">{m.branchName}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{m.productName}</td>
                    <td className="px-4 py-3 text-center text-sm font-semibold text-gray-900">
                      {m.type === 'TRANSFER_OUT' ? '−' : '+'}
                      {m.quantity}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 max-w-xs truncate">
                      {m.notes || '-'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">{m.createdByName || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
