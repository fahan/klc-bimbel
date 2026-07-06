'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { invoiceApi, paymentApi, branchApi, studentApi } from '@/lib/api/endpoints'
import { useApiBranchId, useBranch } from '@/lib/branch-context'
import {
  Plus,
  Search,
  DollarSign,
  Clock,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Eye,
  Calendar,
  CreditCard,
  TrendingUp,
  X,
} from 'lucide-react'
import { LoadingState, EmptyState, ErrorState } from '@/components/ui/States'

const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

function formatRupiah(amount: number | string) {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  if (!num || isNaN(num)) return 'Rp 0'
  return 'Rp ' + Math.round(num).toLocaleString('id-ID')
}

function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

interface Invoice {
  id: string
  invoiceNumber: string
  studentId: string
  studentName: string
  type: string
  totalAmount: string
  paidAmount: string
  status: 'UNPAID' | 'PARTIAL' | 'PAID'
  branchId: string
  createdAt: string
}

interface Payment {
  id: string
  invoiceId: string
  amount: string
  method: string
  paidAt: string
  recordedByName: string
  createdAt: string
}

export default function PembayaranSPPPage() {
  const branchId = useApiBranchId()
  const { selectedBranchId } = useBranch()

  // Filters
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [filterStudentId, setFilterStudentId] = useState<string>('')
  const [filterMonth, setFilterMonth] = useState<number>(new Date().getMonth() + 1)
  const [filterYear, setFilterYear] = useState<number>(new Date().getFullYear())
  const [searchTerm, setSearchTerm] = useState('')

  // UI state
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showPaymentHistory, setShowPaymentHistory] = useState<string | null>(null)

  // Form state
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'TRANSFER'>('CASH')
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [paymentError, setPaymentError] = useState('')
  const [paymentLoading, setPaymentLoading] = useState(false)

  // Queries
  const { data: invoicesData, isLoading: invoicesLoading, error: invoicesError, refetch: refetchInvoices } = useQuery({
    queryKey: ['invoices-payment', branchId, filterMonth, filterYear],
    queryFn: () => invoiceApi.getAll({
      branchId,
      status: filterStatus || undefined,
      month: filterMonth,
      year: filterYear,
      studentId: filterStudentId || undefined,
    }),
    networkMode: 'always',
  })

  const { data: studentsData } = useQuery({
    queryKey: ['students-payment', branchId],
    queryFn: () => studentApi.getAll(1, 100, branchId),
  })

  const { data: paymentsData, refetch: refetchPayments } = useQuery({
    queryKey: ['recent-payments', branchId],
    queryFn: () => paymentApi.getRecent(branchId, 50),
  })

  const { data: selectedInvoicePayments, refetch: refetchInvoicePayments } = useQuery({
    queryKey: ['invoice-payments', selectedInvoiceId],
    queryFn: () => selectedInvoiceId ? paymentApi.getInvoicePayments(selectedInvoiceId) : Promise.resolve(null),
    enabled: !!selectedInvoiceId,
  })

  const invoices: Invoice[] = useMemo(() => {
    return invoicesData?.data?.data?.data || []
  }, [invoicesData])

  const students = useMemo(() => {
    return studentsData?.data?.data || []
  }, [studentsData])

  const recentPayments: Payment[] = useMemo(() => {
    return paymentsData?.data?.data || []
  }, [paymentsData])

  const invoicePayments: Payment[] = useMemo(() => {
    return selectedInvoicePayments?.data?.data || []
  }, [selectedInvoicePayments])

  // Filter invoices by search term
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv =>
      inv.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [invoices, searchTerm])

  // Summary cards
  const summaryData = useMemo(() => {
    const unpaid = invoices.filter(i => i.status === 'UNPAID').length
    const partial = invoices.filter(i => i.status === 'PARTIAL').length
    const paid = invoices.filter(i => i.status === 'PAID').length
    const totalUnpaid = invoices
      .filter(i => i.status === 'UNPAID' || i.status === 'PARTIAL')
      .reduce((sum, i) => sum + (parseFloat(i.totalAmount) - parseFloat(i.paidAmount)), 0)
    const totalPaid = invoices
      .reduce((sum, i) => sum + parseFloat(i.paidAmount), 0)

    return { unpaid, partial, paid, totalUnpaid, totalPaid }
  }, [invoices])

  // Get selected invoice details
  const selectedInvoice = invoices.find(i => i.id === selectedInvoiceId)
  const selectedInvoiceRemaining = selectedInvoice
    ? parseFloat(selectedInvoice.totalAmount) - parseFloat(selectedInvoice.paidAmount)
    : 0

  // Record payment mutation
  const recordPaymentMutation = useMutation({
    mutationFn: async () => {
      if (!selectedInvoiceId) throw new Error('No invoice selected')
      const amount = parseFloat(paymentAmount)
      if (!amount || amount <= 0) throw new Error('Amount must be greater than 0')
      if (amount > selectedInvoiceRemaining) {
        throw new Error(`Amount exceeds remaining balance (${formatRupiah(selectedInvoiceRemaining)})`)
      }

      return paymentApi.record({
        invoiceId: selectedInvoiceId,
        amount,
        method: paymentMethod,
        paidAt: paymentDate,
      })
    },
    onSuccess: async () => {
      setPaymentAmount('')
      setPaymentError('')
      setShowPaymentModal(false)
      await refetchInvoices()
      await refetchPayments()
      if (selectedInvoiceId) {
        await refetchInvoicePayments()
      }
    },
    onError: (error: any) => {
      setPaymentError(error.response?.data?.message || error.message || 'Failed to record payment')
    },
  })

  // Delete payment mutation
  const deletePaymentMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      return paymentApi.delete(paymentId)
    },
    onSuccess: async () => {
      await refetchInvoices()
      await refetchPayments()
      if (selectedInvoiceId) {
        await refetchInvoicePayments()
      }
    },
  })

  const handleRecordPayment = async () => {
    setPaymentError('')
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      setPaymentError('Masukkan jumlah pembayaran yang valid')
      return
    }
    setPaymentLoading(true)
    try {
      await recordPaymentMutation.mutateAsync()
    } finally {
      setPaymentLoading(false)
    }
  }

  const statusColor = (status: string) => {
    switch (status) {
      case 'PAID': return 'bg-green-100 text-green-700'
      case 'PARTIAL': return 'bg-yellow-100 text-yellow-700'
      case 'UNPAID': return 'bg-red-100 text-red-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const statusLabel = (status: string) => {
    switch (status) {
      case 'PAID': return 'Lunas'
      case 'PARTIAL': return 'Sebagian'
      case 'UNPAID': return 'Belum Lunas'
      default: return status
    }
  }

  if (invoicesError) {
    return (
      <ErrorState
        title="Gagal memuat data"
        description="Terjadi kesalahan saat memuat data. Silakan coba lagi."
        action={{ label: 'Coba Lagi', onClick: refetchInvoices }}
      />
    )
  }

  if (invoicesLoading) return <LoadingState />

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="hidden sm:block">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Pembayaran SPP</h1>
        <p className="text-gray-600 mt-1 text-sm">Kelola pembayaran dan konfirmasi penerimaan SPP siswa</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Belum Lunas</p>
              <p className="text-2xl font-bold text-red-600">{summaryData.unpaid}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-red-100" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Sebagian Dibayar</p>
              <p className="text-2xl font-bold text-yellow-600">{summaryData.partial}</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-100" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Lunas</p>
              <p className="text-2xl font-bold text-green-600">{summaryData.paid}</p>
            </div>
            <CheckCircle2 className="w-8 h-8 text-green-100" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Belum Lunas</p>
              <p className="text-lg font-bold text-red-600">{formatRupiah(summaryData.totalUnpaid)}</p>
            </div>
            <DollarSign className="w-8 h-8 text-red-100" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Terbayar</p>
              <p className="text-lg font-bold text-green-600">{formatRupiah(summaryData.totalPaid)}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-100" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Filter</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Cari nama siswa atau no invoice..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Status */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Semua Status</option>
            <option value="UNPAID">Belum Lunas</option>
            <option value="PARTIAL">Sebagian</option>
            <option value="PAID">Lunas</option>
          </select>

          {/* Student */}
          <select
            value={filterStudentId}
            onChange={(e) => setFilterStudentId(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Semua Siswa</option>
            {students.map((s: any) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          {/* Month/Year */}
          <div className="flex gap-2">
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(parseInt(e.target.value))}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {MONTHS.map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(parseInt(e.target.value))}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Invoice List */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        {filteredInvoices.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Invoice</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Siswa</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Jumlah</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Terbayar</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Sisa</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredInvoices.map(inv => {
                  const remaining = parseFloat(inv.totalAmount) - parseFloat(inv.paidAmount)
                  return (
                    <tr key={inv.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{inv.invoiceNumber}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{inv.studentName}</td>
                      <td className="px-6 py-4 text-sm text-right text-gray-900">{formatRupiah(inv.totalAmount)}</td>
                      <td className="px-6 py-4 text-sm text-right text-green-600 font-medium">{formatRupiah(inv.paidAmount)}</td>
                      <td className="px-6 py-4 text-sm text-right text-red-600 font-medium">{formatRupiah(remaining)}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${statusColor(inv.status)}`}>
                          {statusLabel(inv.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {inv.status !== 'PAID' && (
                            <button
                              onClick={() => {
                                setSelectedInvoiceId(inv.id)
                                setShowPaymentModal(true)
                              }}
                              className="p-2 hover:bg-blue-100 rounded-lg transition text-blue-600"
                              title="Catat Pembayaran"
                            >
                              <Plus className="w-5 h-5" />
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setSelectedInvoiceId(inv.id)
                              setShowPaymentHistory(inv.id)
                            }}
                            className="p-2 hover:bg-gray-100 rounded-lg transition"
                            title="Lihat Riwayat Pembayaran"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={<DollarSign className="w-12 h-12 text-gray-400" />}
            title="Tidak ada data pembayaran"
            description="Belum ada invoice untuk periode yang dipilih"
          />
        )}
      </div>

      {/* Recent Payments */}
      {recentPayments.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Pembayaran Terbaru</h2>
          <div className="space-y-3">
            {recentPayments.slice(0, 10).map(payment => (
              <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">Invoice {payment.invoiceId.slice(0, 8)}</p>
                    <p className="text-xs text-gray-500">
                      Oleh {payment.recordedByName} • {formatDate(payment.paidAt)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">{formatRupiah(payment.amount)}</p>
                  <p className="text-xs text-gray-500">{payment.method}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {showPaymentModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Catat Pembayaran</h3>
              <button
                onClick={() => {
                  setShowPaymentModal(false)
                  setPaymentAmount('')
                  setPaymentError('')
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Invoice Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-gray-600">Invoice</p>
                <p className="font-semibold text-gray-900">{selectedInvoice.invoiceNumber}</p>
                <div className="mt-2 pt-2 border-t border-blue-200 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Total:</span>
                    <span>{formatRupiah(selectedInvoice.totalAmount)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600 mt-1">
                    <span>Terbayar:</span>
                    <span className="text-green-600">{formatRupiah(selectedInvoice.paidAmount)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-gray-900 mt-1 pt-1 border-t border-blue-200">
                    <span>Sisa:</span>
                    <span className="text-red-600">{formatRupiah(selectedInvoiceRemaining)}</span>
                  </div>
                </div>
              </div>

              {/* Payment Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah Pembayaran</label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="0"
                  max={selectedInvoiceRemaining}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Max: {formatRupiah(selectedInvoiceRemaining)}</p>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Metode Pembayaran</label>
                <div className="flex gap-3">
                  {['CASH', 'TRANSFER'].map(method => (
                    <label key={method} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="method"
                        value={method}
                        checked={paymentMethod === method}
                        onChange={(e) => setPaymentMethod(e.target.value as 'CASH' | 'TRANSFER')}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-gray-700">
                        {method === 'CASH' ? 'Tunai' : 'Transfer'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Payment Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Pembayaran</label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Error Message */}
              {paymentError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{paymentError}</p>
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowPaymentModal(false)
                    setPaymentAmount('')
                    setPaymentError('')
                  }}
                  className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  onClick={handleRecordPayment}
                  disabled={paymentLoading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {paymentLoading ? 'Menyimpan...' : 'Simpan Pembayaran'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment History Modal */}
      {showPaymentHistory && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
              <h3 className="text-lg font-semibold text-gray-900">Riwayat Pembayaran</h3>
              <button
                onClick={() => setShowPaymentHistory(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              {invoicePayments.length > 0 ? (
                <div className="space-y-3">
                  {invoicePayments.map(payment => (
                    <div key={payment.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                            <CreditCard className="w-5 h-5 text-green-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{formatRupiah(payment.amount)}</p>
                            <p className="text-sm text-gray-500">
                              {payment.method} • {formatDate(payment.paidAt)}
                            </p>
                            <p className="text-xs text-gray-400">Oleh: {payment.recordedByName}</p>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => deletePaymentMutation.mutate(payment.id)}
                        className="p-2 hover:bg-red-100 rounded-lg transition text-red-600"
                        title="Hapus pembayaran"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">Belum ada pembayaran</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
