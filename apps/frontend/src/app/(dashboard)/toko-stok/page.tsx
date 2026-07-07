'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { storeApi, studentApi } from '@/lib/api/endpoints'
import { useBranch } from '@/lib/branch-context'
import {
  Plus,
  Search,
  AlertTriangle,
  Package,
  ShoppingCart,
  TrendingUp,
  X,
  RefreshCw,
  ChevronDown,
  User,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { LoadingState, EmptyState, ErrorState } from '@/components/ui/States'

const PAGE_SIZE = 10

const CATEGORY_LABEL: Record<string, string> = {
  STATIONARY: 'Stationary',
  MODULE: 'Modul',
  UNIFORM: 'Seragam',
  STATIONERY: 'Alat tulis',
}

const CATEGORY_COLOR: Record<string, string> = {
  STATIONARY: 'bg-blue-100 text-blue-700',
  MODULE: 'bg-purple-100 text-purple-700',
  UNIFORM: 'bg-pink-100 text-pink-700',
  STATIONERY: 'bg-amber-100 text-amber-700',
}

function formatRupiah(amount: number | string) {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return 'Rp ' + Math.round(num).toLocaleString('id-ID')
}

interface CartItem {
  productId: string
  productName: string
  quantity: number
  unitPrice: number
}

export default function TokoStokPage() {
  const [filterCategory, setFilterCategory] = useState<string>('')
  const [filterLowStock, setFilterLowStock] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const { selectedBranchId, branches, canViewAllBranches, setSelectedBranchId } = useBranch()
  const branchId = selectedBranchId

  // Sale form
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [studentInputValue, setStudentInputValue] = useState('')
  const [studentDropdownOpen, setStudentDropdownOpen] = useState(false)
  const [debouncedStudentSearch, setDebouncedStudentSearch] = useState('')
  const studentDropdownRef = useRef<HTMLDivElement>(null)
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'TRANSFER' | 'OTHER'>('CASH')
  const [selectedProductId, setSelectedProductId] = useState('')
  const [selectedQty, setSelectedQty] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [saleError, setSaleError] = useState('')

  // Modals
  const [showProductModal, setShowProductModal] = useState(false)
  const [showRestockModal, setShowRestockModal] = useState<any>(null)

  // Product form
  const [pName, setPName] = useState('')
  const [pCategory, setPCategory] = useState<string>('STATIONARY')
  const [pPrice, setPPrice] = useState('')
  const [pStock, setPStock] = useState('')
  const [pMinStock, setPMinStock] = useState('')
  const [pSubmitting, setPSubmitting] = useState(false)
  const [pError, setPError] = useState('')

  // Restock form
  const [restockQty, setRestockQty] = useState(1)
  const [restockNotes, setRestockNotes] = useState('')

  // Debounce search → reset to page 1 on new search
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchTerm)
      setPage(1)
    }, 350)
    return () => clearTimeout(t)
  }, [searchTerm])

  // Reset page when filters change
  useEffect(() => { setPage(1) }, [filterCategory, filterLowStock, branchId])

  const { data: productsData, isLoading, error, refetch } = useQuery({
    queryKey: ['store-products', branchId, filterCategory, filterLowStock, debouncedSearch, page],
    queryFn: () =>
      storeApi.getProducts({
        branchId: branchId || undefined,
        category: filterCategory || undefined,
        lowStock: filterLowStock,
        search: debouncedSearch || undefined,
        page,
        limit: PAGE_SIZE,
      }),
    enabled: !!branchId,
    placeholderData: (prev) => prev,
    networkMode: 'always',
  })

  // Separate query for sale form dropdown (all products, no pagination)
  const { data: allProductsData } = useQuery({
    queryKey: ['store-products-all', branchId],
    queryFn: () =>
      storeApi.getProducts({ branchId: branchId || undefined, limit: 1000, page: 1 }),
    enabled: !!branchId,
    staleTime: 60_000,
  })

  const { data: metricsData, refetch: refetchMetrics } = useQuery({
    queryKey: ['store-metrics', branchId],
    queryFn: () => storeApi.getProductMetrics(branchId || undefined),
    enabled: !!branchId,
  })

  const { data: lowStockData, refetch: refetchLowStock } = useQuery({
    queryKey: ['store-low-stock', branchId],
    queryFn: () => storeApi.getLowStock(branchId || undefined),
    enabled: !!branchId,
  })

  // Debounce student search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedStudentSearch(studentInputValue), 300)
    return () => clearTimeout(t)
  }, [studentInputValue])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (studentDropdownRef.current && !studentDropdownRef.current.contains(e.target as Node)) {
        setStudentDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const { data: studentSearchData, isFetching: studentSearchFetching } = useQuery({
    queryKey: ['students-search', debouncedStudentSearch, branchId],
    queryFn: () => studentApi.getAll(1, 20, branchId || undefined, debouncedStudentSearch || undefined),
    enabled: studentDropdownOpen,
    staleTime: 30_000,
  })

  const paginatedResult = productsData?.data?.data
  const products: any[] = paginatedResult?.data || []
  const totalProducts: number = paginatedResult?.total || 0
  const totalPages: number = paginatedResult?.totalPages || 1

  const allProductsForSale: any[] = allProductsData?.data?.data?.data || []
  const metrics = metricsData?.data?.data
  const lowStock = lowStockData?.data?.data || []
  const studentSearchResults: any[] = studentSearchData?.data?.data || []

  const cartTotal = cart.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0)

  const refreshAll = () => {
    refetch()
    refetchMetrics()
    refetchLowStock()
  }

  // ============== CART HANDLERS ==============
  const addToCart = () => {
    if (!selectedProductId || selectedQty < 1) return
    const product = allProductsForSale.find((p: any) => p.id === selectedProductId)
    if (!product) return
    if (product.stock < selectedQty) {
      alert(`Stok tidak cukup. Tersedia: ${product.stock}`)
      return
    }
    const existing = cart.find((c) => c.productId === selectedProductId)
    if (existing) {
      setCart(
        cart.map((c) =>
          c.productId === selectedProductId ? { ...c, quantity: c.quantity + selectedQty } : c,
        ),
      )
    } else {
      setCart([
        ...cart,
        {
          productId: product.id,
          productName: product.name,
          quantity: selectedQty,
          unitPrice: parseFloat(product.price),
        },
      ])
    }
    setSelectedProductId('')
    setSelectedQty(1)
  }

  const removeFromCart = (productId: string) => {
    setCart(cart.filter((c) => c.productId !== productId))
  }

  const submitSale = async () => {
    if (cart.length === 0) {
      setSaleError('Tambahkan minimal 1 produk')
      return
    }
    try {
      setSubmitting(true)
      setSaleError('')
      await storeApi.createSale({
        branchId,
        studentId: selectedStudentId || undefined,
        items: cart.map((c) => ({ productId: c.productId, quantity: c.quantity })),
        paymentMethod,
      })
      setCart([])
      setSelectedStudentId('')
      setStudentInputValue('')
      refreshAll()
      alert('Transaksi berhasil dicatat!')
    } catch (err: any) {
      setSaleError(err.response?.data?.message || 'Gagal catat penjualan')
    } finally {
      setSubmitting(false)
    }
  }

  // ============== PRODUCT MODAL ==============
  const openProductModal = () => {
    setPName('')
    setPCategory('STATIONARY')
    setPPrice('')
    setPStock('')
    setPMinStock('')
    setPError('')
    setShowProductModal(true)
  }

  const submitProduct = async () => {
    if (!pName || !pPrice) {
      setPError('Nama dan harga wajib diisi')
      return
    }
    try {
      setPSubmitting(true)
      setPError('')
      await storeApi.createProduct({
        branchId,
        name: pName,
        category: pCategory,
        price: parseFloat(pPrice),
        stock: parseInt(pStock || '0', 10),
        minStock: parseInt(pMinStock || '0', 10),
      })
      setShowProductModal(false)
      refreshAll()
    } catch (err: any) {
      setPError(err.response?.data?.message || 'Gagal tambah produk')
    } finally {
      setPSubmitting(false)
    }
  }

  // ============== RESTOCK MODAL ==============
  const openRestockModal = (product: any) => {
    setRestockQty(Math.max(1, (product.minStock || 10) - (product.stock || 0)))
    setRestockNotes('')
    setShowRestockModal(product)
  }

  const submitRestock = async () => {
    if (!showRestockModal || restockQty < 1) return
    try {
      await storeApi.restock({
        productId: showRestockModal.id,
        quantity: restockQty,
        notes: restockNotes || undefined,
      })
      setShowRestockModal(null)
      refreshAll()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal restock')
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold text-gray-900">Toko & Stok</h1>
          <p className="text-gray-600 mt-1 text-sm hidden sm:block">Penjualan stationary, modul, dan seragam</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={openProductModal}
            disabled={!branchId}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            title={!branchId ? 'Pilih cabang dulu' : ''}
          >
            <Plus className="w-4 h-4" />
            Tambah Produk
          </button>
        </div>
      </div>

      {/* No Branch Selected Notice */}
      {!branchId && canViewAllBranches && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-blue-900 text-sm">Pilih cabang dulu</p>
            <p className="text-xs text-blue-700 mt-1">
              Toko & stok dikelola per cabang. Pilih cabang dari topbar untuk melihat & mengelola produk.
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              {branches.map(b => (
                <button
                  key={b.id}
                  onClick={() => setSelectedBranchId(b.id)}
                  className="px-3 py-1 text-xs bg-white hover:bg-blue-100 border border-blue-300 text-blue-700 rounded-full font-medium transition"
                >
                  📍 {b.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Alert Bar */}
      {metrics && (metrics.lowStockCount > 0 || metrics.outOfStockCount > 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <p className="text-sm text-amber-800">
              <strong>{metrics.lowStockCount}</strong> produk stok menipis dan{' '}
              <strong>{metrics.outOfStockCount}</strong> produk stok habis — segera lakukan restock.
            </p>
          </div>
          <button
            onClick={() => setFilterLowStock(true)}
            className="text-xs text-amber-700 hover:text-amber-900 font-medium"
          >
            Lihat produk →
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm flex items-center gap-3 flex-wrap">
        <span className="text-sm font-medium text-gray-700">Kategori:</span>
        {[
          { v: '', l: 'Semua' },
          { v: 'STATIONARY', l: 'Stationary' },
          { v: 'MODULE', l: 'Modul' },
          { v: 'UNIFORM', l: 'Seragam' },
          { v: 'STATIONERY', l: 'Alat tulis' },
        ].map((s) => (
          <button
            key={s.v}
            onClick={() => setFilterCategory(s.v)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition ${
              filterCategory === s.v
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {s.l}
          </button>
        ))}
        <button
          onClick={() => setFilterLowStock(!filterLowStock)}
          className={`px-3 py-1 rounded-full text-xs font-medium transition ${
            filterLowStock
              ? 'bg-amber-600 text-white'
              : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
          }`}
        >
          Stok menipis
        </button>
        <div className="flex-1 ml-auto max-w-md relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Cari produk..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Left: Metrics + Products Table */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          {/* Metrics */}
          {metrics && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <Package className="w-4 h-4 text-blue-600" />
                  <p className="text-xs text-gray-600 font-medium">Total Produk</p>
                </div>
                <p className="text-2xl font-bold text-gray-900 mt-1">{metrics.totalProducts}</p>
                <p className="text-xs text-gray-500 mt-1">{metrics.categoriesCount} kategori</p>
              </div>
              <div className="bg-white rounded-lg border border-amber-200 p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <p className="text-xs text-gray-600 font-medium">Stok Menipis</p>
                </div>
                <p className="text-2xl font-bold text-amber-700 mt-1">{metrics.lowStockCount}</p>
              </div>
              <div className="bg-white rounded-lg border border-red-200 p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <X className="w-4 h-4 text-red-600" />
                  <p className="text-xs text-gray-600 font-medium">Stok Habis</p>
                </div>
                <p className="text-2xl font-bold text-red-700 mt-1">{metrics.outOfStockCount}</p>
              </div>
              <div className="bg-white rounded-lg border border-green-200 p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <p className="text-xs text-gray-600 font-medium">Penjualan Bulan Ini</p>
                </div>
                <p className="text-lg font-bold text-green-700 mt-1">
                  {formatRupiah(metrics.monthlyRevenue)}
                </p>
                <p className="text-xs text-gray-500 mt-1">{metrics.monthlySalesCount} transaksi</p>
              </div>
            </div>
          )}

          {/* Products Table */}
          {error ? (
            <ErrorState
              title="Gagal memuat data"
              description="Terjadi kesalahan saat memuat data. Silakan coba lagi."
              action={{ label: 'Coba Lagi', onClick: () => refetch() }}
            />
          ) : isLoading ? (
            <LoadingState />
          ) : products.length === 0 ? (
            <EmptyState
              title="Belum ada produk"
              description="Tambah produk pertama untuk mulai menjual"
              action={{ label: 'Tambah Produk', onClick: openProductModal }}
            />
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">
                        Produk
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">
                        Kategori
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">
                        Harga
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">
                        Stok Min
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">
                        Status Stok
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {products.map((p: any) => {
                      const lowOrOut = p.stockStatus === 'LOW' || p.stockStatus === 'OUT'
                      const stockPercent = p.minStock > 0 ? Math.min(100, (p.stock / (p.minStock * 2)) * 100) : 100
                      return (
                        <tr
                          key={p.id}
                          className={`transition ${lowOrOut ? 'bg-amber-50/50' : 'hover:bg-gray-50'}`}
                        >
                          <td className="px-4 py-3">
                            <p className="text-sm font-medium text-gray-900">{p.name}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_COLOR[p.category]}`}
                            >
                              {CATEGORY_LABEL[p.category]}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                            {formatRupiah(p.price)}
                          </td>
                          <td className="px-4 py-3 text-center text-xs text-gray-600">
                            {p.minStock}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-gray-200 rounded-full h-1.5">
                                <div
                                  className={`h-1.5 rounded-full ${
                                    p.stockStatus === 'OUT'
                                      ? 'bg-red-500'
                                      : p.stockStatus === 'LOW'
                                      ? 'bg-amber-500'
                                      : 'bg-green-500'
                                  }`}
                                  style={{ width: `${stockPercent}%` }}
                                ></div>
                              </div>
                              <span
                                className={`text-xs font-bold ${
                                  p.stockStatus === 'OUT'
                                    ? 'text-red-700'
                                    : p.stockStatus === 'LOW'
                                    ? 'text-amber-700'
                                    : 'text-gray-700'
                                }`}
                              >
                                {p.stock}
                              </span>
                              {p.stockStatus === 'OUT' && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-red-100 text-red-700 rounded font-bold">
                                  Habis
                                </span>
                              )}
                              {p.stockStatus === 'LOW' && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded font-bold">
                                  Menipis
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              <button
                                onClick={() => {
                                  setSelectedProductId(p.id)
                                  setSelectedQty(1)
                                }}
                                disabled={p.stock === 0}
                                className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
                              >
                                Jual
                              </button>
                              <button
                                onClick={() => openRestockModal(p)}
                                className="px-2 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded transition font-medium"
                              >
                                Restock
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between bg-gray-50">
                  <p className="text-xs text-gray-600">
                    Menampilkan{' '}
                    <span className="font-medium">{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, totalProducts)}</span>
                    {' '}dari <span className="font-medium">{totalProducts}</span> produk
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="p-1.5 rounded-md hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      <ChevronLeft className="w-4 h-4 text-gray-700" />
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                      .reduce<(number | 'ellipsis')[]>((acc, p, idx, arr) => {
                        if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('ellipsis')
                        acc.push(p)
                        return acc
                      }, [])
                      .map((item, idx) =>
                        item === 'ellipsis' ? (
                          <span key={`e-${idx}`} className="px-1 text-gray-400 text-xs">…</span>
                        ) : (
                          <button
                            key={item}
                            onClick={() => setPage(item as number)}
                            className={`min-w-[28px] h-7 px-1.5 rounded-md text-xs font-medium transition ${
                              page === item
                                ? 'bg-blue-600 text-white'
                                : 'hover:bg-gray-200 text-gray-700'
                            }`}
                          >
                            {item}
                          </button>
                        ),
                      )}
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="p-1.5 rounded-md hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      <ChevronRight className="w-4 h-4 text-gray-700" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Sale Form + Restock Panel */}
        <div className="space-y-6">
          {/* Sale Form */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-blue-600" />
              Catat Penjualan
            </h2>

            {/* Buyer */}
            <div className="mb-3">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Pembeli (opsional)
              </label>
              <div className="relative" ref={studentDropdownRef}>
                <div className="relative">
                  {selectedStudentId ? (
                    <User className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-blue-500 pointer-events-none" />
                  ) : (
                    <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                  )}
                  <input
                    type="text"
                    value={studentInputValue}
                    onChange={(e) => {
                      setStudentInputValue(e.target.value)
                      setSelectedStudentId('')
                      setStudentDropdownOpen(true)
                    }}
                    onFocus={() => setStudentDropdownOpen(true)}
                    placeholder="Cari siswa... (kosong = pelanggan umum)"
                    className={`w-full pl-8 pr-8 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      selectedStudentId ? 'border-blue-400 bg-blue-50' : 'border-gray-300'
                    }`}
                  />
                  <div className="absolute right-1.5 top-1.5 flex items-center gap-0.5">
                    {studentInputValue && (
                      <button
                        type="button"
                        onClick={() => {
                          setStudentInputValue('')
                          setSelectedStudentId('')
                          setStudentDropdownOpen(false)
                        }}
                        className="p-1 hover:bg-gray-200 text-gray-400 hover:text-gray-600 rounded"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setStudentDropdownOpen((v) => !v)}
                      className="p-1 hover:bg-gray-200 text-gray-400 rounded"
                    >
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${studentDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                </div>
                {studentDropdownOpen && (
                  <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
                    <div
                      onMouseDown={(e) => {
                        e.preventDefault()
                        setSelectedStudentId('')
                        setStudentInputValue('')
                        setStudentDropdownOpen(false)
                      }}
                      className={`px-3 py-2 text-sm cursor-pointer flex items-center gap-2 hover:bg-gray-50 ${
                        !selectedStudentId ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-500'
                      }`}
                    >
                      <User className="w-3.5 h-3.5 flex-shrink-0" />
                      Pelanggan umum
                    </div>
                    {studentSearchFetching ? (
                      <div className="px-3 py-2 text-xs text-gray-400 italic">Mencari...</div>
                    ) : studentSearchResults.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-gray-400 italic">
                        {debouncedStudentSearch ? `Tidak ada siswa "${debouncedStudentSearch}"` : 'Tidak ada siswa terdaftar'}
                      </div>
                    ) : (
                      studentSearchResults.map((s: any) => (
                        <div
                          key={s.id}
                          onMouseDown={(e) => {
                            e.preventDefault()
                            setSelectedStudentId(s.id)
                            setStudentInputValue(s.name)
                            setStudentDropdownOpen(false)
                          }}
                          className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 ${
                            selectedStudentId === s.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-800'
                          }`}
                        >
                          <p className="font-medium">{s.name}</p>
                          {s.classLevel && (
                            <p className="text-[11px] text-gray-500">{s.classLevel}</p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Cart Items */}
            <div className="mb-3">
              <label className="block text-xs font-medium text-gray-700 mb-1">Item</label>
              {cart.length === 0 ? (
                <p className="text-xs text-gray-400 italic p-2 bg-gray-50 rounded">
                  Belum ada item ditambahkan
                </p>
              ) : (
                <div className="space-y-1.5">
                  {cart.map((c) => (
                    <div
                      key={c.productId}
                      className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg p-2 text-sm"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 text-xs">{c.productName}</p>
                        <p className="text-[10px] text-gray-600">
                          {c.quantity} × {formatRupiah(c.unitPrice)} ={' '}
                          <strong>{formatRupiah(c.unitPrice * c.quantity)}</strong>
                        </p>
                      </div>
                      <button
                        onClick={() => removeFromCart(c.productId)}
                        className="p-1 hover:bg-red-100 text-red-600 rounded"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add Item */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="col-span-2 px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Pilih produk --</option>
                {allProductsForSale
                  .filter((p: any) => p.stock > 0)
                  .map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.stock} stok)
                    </option>
                  ))}
              </select>
              <div className="flex gap-1">
                <input
                  type="number"
                  min={1}
                  value={selectedQty}
                  onChange={(e) => setSelectedQty(parseInt(e.target.value, 10) || 1)}
                  className="w-12 px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={addToCart}
                  disabled={!selectedProductId}
                  className="flex-1 px-2 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs rounded-lg font-medium transition disabled:opacity-50"
                >
                  +
                </button>
              </div>
            </div>

            {/* Payment Method */}
            <div className="mb-3">
              <label className="block text-xs font-medium text-gray-700 mb-1">Metode</label>
              <div className="grid grid-cols-3 gap-1">
                {(['CASH', 'TRANSFER', 'OTHER'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setPaymentMethod(m)}
                    className={`py-1.5 text-xs rounded-lg font-medium transition ${
                      paymentMethod === m
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {m === 'CASH' ? 'Tunai' : m === 'TRANSFER' ? 'Transfer' : 'Lain'}
                  </button>
                ))}
              </div>
            </div>

            {/* Total */}
            <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg mb-3">
              <span className="text-xs font-medium text-gray-700">Total</span>
              <span className="text-base font-bold text-gray-900">{formatRupiah(cartTotal)}</span>
            </div>

            {saleError && (
              <div className="text-xs text-red-600 bg-red-50 p-2 rounded mb-2">{saleError}</div>
            )}

            <button
              onClick={submitSale}
              disabled={cart.length === 0 || submitting}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition disabled:opacity-50 text-sm"
            >
              {submitting ? 'Menyimpan...' : 'Simpan Transaksi'}
            </button>
          </div>

          {/* Need Restock */}
          {lowStock.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
              <h2 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                Perlu Restock Segera
                <span className="ml-auto px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full font-bold">
                  {lowStock.length}
                </span>
              </h2>
              <div className="space-y-2">
                {lowStock.map((p: any) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg"
                  >
                    <span
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        p.stock === 0 ? 'bg-red-500' : 'bg-amber-500'
                      }`}
                    ></span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 truncate">{p.name}</p>
                      <p className="text-[10px] text-gray-600">
                        {p.stock === 0
                          ? `Stok habis · min ${p.minStock}`
                          : `Sisa ${p.stock} · min ${p.minStock}`}
                      </p>
                    </div>
                    <button
                      onClick={() => openRestockModal(p)}
                      className="px-2 py-1 text-[10px] bg-blue-600 hover:bg-blue-700 text-white rounded font-medium flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Restock
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Product Modal */}
      {showProductModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowProductModal(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Tambah Produk</h3>
              <button onClick={() => setShowProductModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Nama Produk <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={pName}
                  onChange={(e) => setPName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Contoh: Buku AHE Modul 3"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Kategori</label>
                <select
                  value={pCategory}
                  onChange={(e) => setPCategory(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="STATIONARY">Stationary</option>
                  <option value="MODULE">Modul</option>
                  <option value="UNIFORM">Seragam</option>
                  <option value="STATIONERY">Alat tulis</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Harga (Rp) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={pPrice}
                  onChange={(e) => setPPrice(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="25000"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Stok Awal</label>
                  <input
                    type="number"
                    value={pStock}
                    onChange={(e) => setPStock(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Stok Minimum</label>
                  <input
                    type="number"
                    value={pMinStock}
                    onChange={(e) => setPMinStock(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="10"
                  />
                </div>
              </div>

              {pError && <div className="text-xs text-red-600 bg-red-50 p-2 rounded">{pError}</div>}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={submitProduct}
                  disabled={pSubmitting}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition disabled:opacity-50 text-sm"
                >
                  {pSubmitting ? 'Menyimpan...' : 'Simpan'}
                </button>
                <button
                  onClick={() => setShowProductModal(false)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 rounded-lg transition text-sm"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Restock Modal */}
      {showRestockModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowRestockModal(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Restock Produk</h3>
              <button onClick={() => setShowRestockModal(null)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="font-medium text-gray-900 text-sm">{showRestockModal.name}</p>
                <p className="text-xs text-gray-600 mt-1">
                  Stok saat ini: <strong>{showRestockModal.stock}</strong> · Min: {showRestockModal.minStock}
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Jumlah Masuk <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  value={restockQty}
                  onChange={(e) => setRestockQty(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Catatan (opsional)
                </label>
                <textarea
                  value={restockNotes}
                  onChange={(e) => setRestockNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Restock dari supplier ABC..."
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={submitRestock}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition text-sm"
                >
                  Simpan Restock
                </button>
                <button
                  onClick={() => setShowRestockModal(null)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 rounded-lg transition text-sm"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
