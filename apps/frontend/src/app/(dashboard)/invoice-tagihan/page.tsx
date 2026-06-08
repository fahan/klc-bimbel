'use client'

import React, { useState, useMemo, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { invoiceApi, paymentApi, branchApi, studentApi } from '@/lib/api/endpoints'
import {
  Plus,
  Search,
  Download,
  MessageCircle,
  Eye,
  DollarSign,
  CheckCircle,
  AlertCircle,
  Clock,
  Copy,
  X,
  ChevronDown,
  Trash2,
} from 'lucide-react'
import { LoadingState, EmptyState } from '@/components/ui/States'

const MONTHS = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
]

function formatRupiah(amount: number | string) {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return 'Rp ' + num.toLocaleString('id-ID', { maximumFractionDigits: 0 })
}

export default function InvoiceTagihanPage() {
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [filterType, setFilterType] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null)

  // Generate form state
  const today = new Date()
  const [formType, setFormType] = useState<'SPP' | 'REGISTRATION'>('SPP')
  const [formStudentId, setFormStudentId] = useState('')
  const [formMonth, setFormMonth] = useState(today.getMonth() + 1)
  const [formYear, setFormYear] = useState(today.getFullYear())
  const [formAdditionalDiscount, setFormAdditionalDiscount] = useState('')
  const [formDiscountNote, setFormDiscountNote] = useState('')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')

  // Searchable student dropdown state
  const [studentSearch, setStudentSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [studentDropdownOpen, setStudentDropdownOpen] = useState(false)
  const [selectedStudentObj, setSelectedStudentObj] = useState<any>(null)
  const studentDropdownRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Payment modal state
  const [paymentInvoice, setPaymentInvoice] = useState<any>(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'TRANSFER' | 'OTHER'>('TRANSFER')
  const [recordingPayment, setRecordingPayment] = useState(false)

  // Delete confirmation state
  const [deleteInvoice, setDeleteInvoice] = useState<any>(null)
  const [deleting, setDeleting] = useState(false)

  // Data queries
  const { data: invoicesData, isLoading, refetch } = useQuery({
    queryKey: ['invoices', filterStatus, filterType],
    queryFn: () =>
      invoiceApi.getAll({
        status: filterStatus || undefined,
        type: filterType || undefined,
      }),
  })

  const { data: metricsData } = useQuery({
    queryKey: ['invoice-metrics', today.getMonth() + 1, today.getFullYear()],
    queryFn: () =>
      invoiceApi.getMetrics({ month: today.getMonth() + 1, year: today.getFullYear() }),
  })

  // Server-side student search — only runs when dropdown is open
  const { data: studentsData, isFetching: studentsLoading } = useQuery({
    queryKey: ['students-search', debouncedSearch],
    queryFn: () => studentApi.getAll(1, 20, undefined, debouncedSearch || undefined),
    enabled: studentDropdownOpen,
    staleTime: 30_000,
  })

  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchApi.getAll(),
  })

  const invoices = invoicesData?.data?.data || []
  const metrics = metricsData?.data?.data
  const studentResults: any[] = studentsData?.data?.data || []
  const branches = branchesData?.data?.data || []

  // Debounce student search input
  const handleStudentSearchChange = (value: string) => {
    setStudentSearch(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedSearch(value), 350)
  }

  // Close student dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (studentDropdownRef.current && !studentDropdownRef.current.contains(e.target as Node)) {
        setStudentDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredInvoices = useMemo(
    () =>
      invoices.filter(
        (inv: any) =>
          !searchTerm ||
          inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          inv.studentName.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    [invoices, searchTerm],
  )

  const selectedInvoice = invoices.find((inv: any) => inv.id === selectedInvoiceId)

  // Generate Preview Data
  const previewData = useMemo(() => {
    if (!selectedStudentObj) return null

    if (formType === 'REGISTRATION') {
      return {
        type: 'REGISTRATION',
        items: [{ name: 'Biaya Pendaftaran', amount: 250000, discount: 0 }],
        subtotal: 250000,
        enrollmentDiscount: 0,
        additionalDiscount: 0,
        total: 250000,
      }
    }

    const items =
      selectedStudentObj.subjects?.map((s: any) => {
        const spp = parseFloat(s.sppAmount || '0')
        const disc = parseFloat(s.discountAmount || '0')
        return {
          name: s.subjectName,
          type: s.type,
          sessionCount: s.type === 'REGULAR' ? 12 : 8,
          sppAmount: spp,
          discount: disc,
          discountNote: s.discountNote || null,
          amount: Math.max(0, spp - disc),
        }
      }) || []
    const subtotal = items.reduce((sum: number, i: any) => sum + i.sppAmount, 0)
    const enrollmentDiscount = items.reduce((sum: number, i: any) => sum + i.discount, 0)
    const additionalDiscount = parseFloat(formAdditionalDiscount || '0') || 0
    const total = Math.max(0, subtotal - enrollmentDiscount - additionalDiscount)
    return { type: 'SPP', items, subtotal, enrollmentDiscount, additionalDiscount, total }
  }, [selectedStudentObj, formType, formAdditionalDiscount])

  const handleGenerate = async () => {
    if (!formStudentId) {
      setError('Pilih siswa')
      return
    }
    try {
      setGenerating(true)
      setError('')

      const payload: any = { studentId: formStudentId, type: formType }
      if (formType === 'SPP') {
        payload.month = formMonth
        payload.year = formYear
      }
      const additionalDiscount = parseFloat(formAdditionalDiscount || '0')
      if (additionalDiscount > 0) {
        payload.additionalDiscountAmount = additionalDiscount
      }
      if (formDiscountNote.trim()) {
        payload.discountNote = formDiscountNote.trim()
      }

      await invoiceApi.create(payload)
      setFormStudentId('')
      setSelectedStudentObj(null)
      setStudentSearch('')
      setDebouncedSearch('')
      setFormAdditionalDiscount('')
      setFormDiscountNote('')
      refetch()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal generate invoice')
    } finally {
      setGenerating(false)
    }
  }

  const handleRecordPayment = async () => {
    if (!paymentInvoice || !paymentAmount) return
    try {
      setRecordingPayment(true)
      await paymentApi.record({
        invoiceId: paymentInvoice.id,
        amount: parseFloat(paymentAmount),
        method: paymentMethod,
      })
      setPaymentInvoice(null)
      setPaymentAmount('')
      refetch()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal catat pembayaran')
    } finally {
      setRecordingPayment(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteInvoice) return
    try {
      setDeleting(true)
      await invoiceApi.delete(deleteInvoice.id)
      setDeleteInvoice(null)
      if (selectedInvoiceId === deleteInvoice.id) setSelectedInvoiceId(null)
      refetch()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal menghapus invoice')
    } finally {
      setDeleting(false)
    }
  }

  const getPublicUrl = (token: string) => {
    if (typeof window === 'undefined') return `/invoice/${token}`
    return `${window.location.origin}/invoice/${token}`
  }

  const buildWAMessage = (inv: any) => {
    const url = getPublicUrl(inv.publicToken)
    const periode = inv.month && inv.year ? `${MONTHS[inv.month - 1]} ${inv.year}` : ''
    return `Assalamu'alaikum Bpk/Ibu orang tua ${inv.studentName} 🙏

Berikut tagihan ${inv.type === 'SPP' ? 'SPP' : 'pendaftaran'} ${periode} di
KLC Bimbel Cab. ${inv.branchName}:

🔗 ${url}

Total: ${formatRupiah(inv.totalAmount)}
Mohon segera dilunasi. Terima kasih 🙏`
  }

  const handleSendWA = (inv: any) => {
    const message = buildWAMessage(inv)
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`
    window.open(url, '_blank')
  }

  const handleCopyLink = (token: string) => {
    navigator.clipboard.writeText(getPublicUrl(token))
    alert('Link disalin!')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Invoice Tagihan</h1>
          <p className="text-gray-600 mt-1">Generate, kirim, dan pantau status pembayaran</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium">
          <Download className="w-5 h-5" />
          Export
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm font-medium text-gray-700">Status:</span>
          {[
            { v: '', l: 'Semua', c: 'bg-gray-100 text-gray-700' },
            { v: 'UNPAID', l: 'Belum lunas', c: 'bg-red-100 text-red-700' },
            { v: 'PARTIAL', l: 'Sebagian', c: 'bg-amber-100 text-amber-700' },
            { v: 'PAID', l: 'Lunas', c: 'bg-green-100 text-green-700' },
          ].map((s) => (
            <button
              key={s.v}
              onClick={() => setFilterStatus(s.v)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                filterStatus === s.v ? s.c + ' ring-2 ring-offset-1 ring-gray-300' : s.c + ' opacity-70 hover:opacity-100'
              }`}
            >
              {s.l}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm font-medium text-gray-700">Tipe:</span>
          {[
            { v: '', l: 'Semua', c: 'bg-gray-100 text-gray-700' },
            { v: 'SPP', l: 'SPP', c: 'bg-blue-100 text-blue-700' },
            { v: 'REGISTRATION', l: 'Registrasi', c: 'bg-purple-100 text-purple-700' },
          ].map((s) => (
            <button
              key={s.v}
              onClick={() => setFilterType(s.v)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                filterType === s.v ? s.c + ' ring-2 ring-offset-1 ring-gray-300' : s.c + ' opacity-70 hover:opacity-100'
              }`}
            >
              {s.l}
            </button>
          ))}
          <div className="flex-1 ml-auto max-w-md relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cari nama siswa / nomor invoice..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Metrics */}
          {metrics && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                <p className="text-xs text-gray-600 font-medium">Total Invoice Bulan Ini</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{metrics.totalInvoices}</p>
                <p className="text-xs text-gray-500 mt-1">{formatRupiah(metrics.totalAmount)}</p>
              </div>
              <div className="bg-white rounded-lg border border-red-200 p-4 shadow-sm">
                <p className="text-xs text-red-600 font-medium">Belum Lunas</p>
                <p className="text-2xl font-bold text-red-700 mt-1">{metrics.unpaidCount}</p>
                <p className="text-xs text-red-500 mt-1">{formatRupiah(metrics.unpaidAmount)}</p>
              </div>
              <div className="bg-white rounded-lg border border-amber-200 p-4 shadow-sm">
                <p className="text-xs text-amber-600 font-medium">Sebagian</p>
                <p className="text-2xl font-bold text-amber-700 mt-1">{metrics.partialCount}</p>
                <p className="text-xs text-amber-500 mt-1">
                  Sisa {formatRupiah(metrics.partialRemainingAmount)}
                </p>
              </div>
              <div className="bg-white rounded-lg border border-green-200 p-4 shadow-sm">
                <p className="text-xs text-green-600 font-medium">Lunas</p>
                <p className="text-2xl font-bold text-green-700 mt-1">{metrics.paidCount}</p>
                <p className="text-xs text-green-500 mt-1">{formatRupiah(metrics.paidAmount)}</p>
              </div>
            </div>
          )}

          {/* Invoices Table */}
          {isLoading ? (
            <LoadingState />
          ) : invoices.length === 0 ? (
            <EmptyState
              title="Belum ada invoice"
              description="Generate invoice baru di panel kanan untuk memulai"
            />
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">No. Invoice</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Siswa</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Tipe</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">Total</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredInvoices.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                          Tidak ada invoice yang sesuai dengan pencarian
                        </td>
                      </tr>
                    ) : (
                      filteredInvoices.map((inv: any) => {
                        const isSelected = selectedInvoiceId === inv.id
                        return (
                          <tr
                            key={inv.id}
                            onClick={() => setSelectedInvoiceId(inv.id)}
                            className={`cursor-pointer transition ${
                              isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                            }`}
                          >
                            <td className="px-4 py-3 text-xs font-mono text-gray-700">
                              {inv.invoiceNumber}
                            </td>
                            <td className="px-4 py-3">
                              <p className="text-sm font-medium text-gray-900">{inv.studentName}</p>
                              <p className="text-xs text-gray-500">
                                {inv.month && inv.year
                                  ? `${MONTHS[inv.month - 1]} ${inv.year}`
                                  : 'Pendaftaran'}{' '}
                                · {inv.items?.length || 0} mapel
                              </p>
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                  inv.type === 'SPP'
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-purple-100 text-purple-700'
                                }`}
                              >
                                {inv.type === 'SPP' ? 'SPP' : 'Registrasi'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                              {formatRupiah(inv.totalAmount)}
                            </td>
                            <td className="px-4 py-3">
                              {inv.status === 'PAID' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                  <CheckCircle className="w-3 h-3" /> Lunas
                                </span>
                              ) : inv.status === 'PARTIAL' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                                  <Clock className="w-3 h-3" /> Sebagian
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                                  <AlertCircle className="w-3 h-3" /> Belum lunas
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex gap-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleSendWA(inv)
                                  }}
                                  className="p-1.5 hover:bg-green-50 text-green-700 rounded transition"
                                  title="Kirim via WhatsApp"
                                >
                                  <MessageCircle className="w-4 h-4" />
                                </button>
                                {inv.status !== 'PAID' && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setPaymentInvoice(inv)
                                      setPaymentAmount(inv.remainingAmount)
                                    }}
                                    className="p-1.5 hover:bg-blue-50 text-blue-700 rounded transition"
                                    title="Catat pembayaran"
                                  >
                                    <DollarSign className="w-4 h-4" />
                                  </button>
                                )}
                                <a
                                  href={`/invoice/${inv.publicToken}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="p-1.5 hover:bg-gray-100 text-gray-700 rounded transition"
                                  title="Lihat invoice publik"
                                >
                                  <Eye className="w-4 h-4" />
                                </a>
                                {parseFloat(inv.paidAmount || '0') === 0 && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setDeleteInvoice(inv)
                                    }}
                                    className="p-1.5 hover:bg-red-50 text-red-500 rounded transition"
                                    title="Hapus invoice"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Generate Form */}
        <div className="space-y-6">
          {/* Generate Invoice Card */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-blue-600" />
              Generate Invoice
            </h2>

            {/* Type Toggle */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <button
                onClick={() => setFormType('SPP')}
                className={`py-2 rounded-lg text-sm font-medium transition border-2 ${
                  formType === 'SPP'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                SPP Bulanan
              </button>
              <button
                onClick={() => setFormType('REGISTRATION')}
                className={`py-2 rounded-lg text-sm font-medium transition border-2 ${
                  formType === 'REGISTRATION'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                Registrasi
              </button>
            </div>

            {/* Student Searchable Select */}
            <div className="mb-3" ref={studentDropdownRef}>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Siswa <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setStudentDropdownOpen((o) => !o)}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-left"
                >
                  <span className={formStudentId ? 'text-gray-900' : 'text-gray-400'}>
                    {selectedStudentObj?.name || '-- Pilih siswa --'}
                  </span>
                  <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                </button>

                {studentDropdownOpen && (
                  <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg">
                    <div className="p-2 border-b border-gray-100">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-gray-400" />
                        <input
                          type="text"
                          autoFocus
                          placeholder="Ketik nama siswa..."
                          value={studentSearch}
                          onChange={(e) => handleStudentSearchChange(e.target.value)}
                          className="w-full pl-7 pr-3 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <ul className="max-h-48 overflow-y-auto py-1">
                      {studentsLoading ? (
                        <li className="px-3 py-3 text-xs text-gray-500 text-center">
                          Mencari siswa...
                        </li>
                      ) : studentResults.length === 0 ? (
                        <li className="px-3 py-2 text-xs text-gray-500 text-center">
                          {debouncedSearch ? 'Siswa tidak ditemukan' : 'Ketik nama untuk mencari'}
                        </li>
                      ) : (
                        studentResults.map((s: any) => (
                          <li
                            key={s.id}
                            onClick={() => {
                              setFormStudentId(s.id)
                              setSelectedStudentObj(s)
                              setStudentSearch('')
                              setDebouncedSearch('')
                              setStudentDropdownOpen(false)
                            }}
                            className={`px-3 py-2 text-sm cursor-pointer transition ${
                              formStudentId === s.id
                                ? 'bg-blue-50 text-blue-700 font-medium'
                                : 'text-gray-800 hover:bg-gray-50'
                            }`}
                          >
                            {s.name}
                            {s.branchName && (
                              <span className="ml-1 text-xs text-gray-400">· {s.branchName}</span>
                            )}
                          </li>
                        ))
                      )}
                    </ul>
                    {formStudentId && (
                      <div className="border-t border-gray-100 p-1">
                        <button
                          onClick={() => {
                            setFormStudentId('')
                            setSelectedStudentObj(null)
                            setStudentSearch('')
                            setDebouncedSearch('')
                            setStudentDropdownOpen(false)
                          }}
                          className="w-full text-xs text-gray-500 hover:text-red-600 py-1 rounded hover:bg-red-50 transition"
                        >
                          Hapus pilihan
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Period Select (SPP only) */}
            {formType === 'SPP' && (
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Bulan</label>
                  <select
                    value={formMonth}
                    onChange={(e) => setFormMonth(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {MONTHS.map((m, i) => (
                      <option key={i} value={i + 1}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Tahun</label>
                  <input
                    type="number"
                    value={formYear}
                    onChange={(e) => setFormYear(parseInt(e.target.value, 10))}
                    min={2024}
                    max={2030}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}

            {/* Preview */}
            {previewData && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden mb-3">
                <div className="bg-blue-600 text-white px-3 py-2 flex items-center justify-between">
                  <div className="text-xs font-medium">KLC Bimbel</div>
                  <div className="text-[10px] font-mono opacity-90">PREVIEW</div>
                </div>
                <div className="p-3">
                  <p className="text-sm font-semibold text-gray-900">{selectedStudentObj?.name}</p>
                  {formType === 'SPP' && (
                    <p className="text-xs text-gray-500">
                      {MONTHS[formMonth - 1]} {formYear}
                    </p>
                  )}
                  <div className="border-t border-gray-200 my-2"></div>
                  <div className="space-y-1.5">
                    {previewData.items.map((it: any, idx: number) => (
                      <div key={idx} className="text-xs">
                        <div className="flex justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{it.name}</p>
                            {it.sessionCount > 0 && (
                              <p className="text-[10px] text-gray-500">
                                {it.sessionCount} sesi · {it.type || ''}
                              </p>
                            )}
                          </div>
                          <p className={`font-semibold ${it.discount > 0 ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                            {formatRupiah(it.sppAmount ?? it.amount)}
                          </p>
                        </div>
                        {it.discount > 0 && (
                          <div className="flex justify-between text-[10px] text-green-700 mt-0.5">
                            <span>Diskon{it.discountNote ? ` (${it.discountNote})` : ''}</span>
                            <span>- {formatRupiah(it.discount)}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {(previewData.enrollmentDiscount > 0 || previewData.additionalDiscount > 0) && (
                    <div className="border-t border-gray-200 mt-2 pt-2 space-y-1">
                      <div className="flex justify-between text-xs text-gray-600">
                        <span>Subtotal</span>
                        <span>{formatRupiah(previewData.subtotal)}</span>
                      </div>
                      {previewData.enrollmentDiscount > 0 && (
                        <div className="flex justify-between text-xs text-green-700">
                          <span>Diskon Enrollment</span>
                          <span>- {formatRupiah(previewData.enrollmentDiscount)}</span>
                        </div>
                      )}
                      {previewData.additionalDiscount > 0 && (
                        <div className="flex justify-between text-xs text-green-700">
                          <span>Diskon Tambahan{formDiscountNote ? ` (${formDiscountNote})` : ''}</span>
                          <span>- {formatRupiah(previewData.additionalDiscount)}</span>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="border-t border-gray-200 mt-2 pt-2 flex justify-between items-center">
                    <p className="text-xs font-semibold">Total</p>
                    <p className="text-base font-bold text-gray-900">
                      {formatRupiah(previewData.total)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Diskon Tambahan (SPP only) */}
            {formType === 'SPP' && (
              <div className="space-y-2 mb-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Diskon Tambahan (Rp)
                  </label>
                  <input
                    type="number"
                    placeholder="0"
                    min={0}
                    value={formAdditionalDiscount}
                    onChange={(e) => setFormAdditionalDiscount(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                {parseFloat(formAdditionalDiscount || '0') > 0 && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Keterangan Diskon
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Diskon event khusus"
                      value={formDiscountNote}
                      onChange={(e) => setFormDiscountNote(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="text-xs text-red-600 bg-red-50 p-2 rounded mb-2">{error}</div>
            )}

            <button
              onClick={handleGenerate}
              disabled={!formStudentId || generating}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {generating ? 'Generating...' : 'Generate & Lanjut Kirim'}
            </button>
          </div>

          {/* WhatsApp Preview Card */}
          {selectedInvoice && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-green-50 border-b border-green-100 px-4 py-3">
                <h3 className="text-sm font-semibold text-green-900 flex items-center gap-2">
                  <MessageCircle className="w-4 h-4" />
                  Preview Pesan WhatsApp
                </h3>
              </div>
              <div className="p-4">
                <pre className="text-xs text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded font-sans border border-gray-200">
                  {buildWAMessage(selectedInvoice)}
                </pre>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <button
                    onClick={() => handleSendWA(selectedInvoice)}
                    className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 rounded-lg text-sm transition flex items-center justify-center gap-2"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Buka WhatsApp
                  </button>
                  <button
                    onClick={() => handleCopyLink(selectedInvoice.publicToken)}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 rounded-lg text-sm transition flex items-center justify-center gap-2"
                  >
                    <Copy className="w-4 h-4" />
                    Salin Link
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {paymentInvoice && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setPaymentInvoice(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Catat Pembayaran</h3>
              <button
                onClick={() => setPaymentInvoice(null)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="bg-gray-50 p-3 rounded-lg text-sm">
                <p className="font-mono text-xs text-gray-600">{paymentInvoice.invoiceNumber}</p>
                <p className="font-medium text-gray-900 mt-1">{paymentInvoice.studentName}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Total: {formatRupiah(paymentInvoice.totalAmount)} · Sudah dibayar:{' '}
                  {formatRupiah(paymentInvoice.paidAmount)} · Sisa:{' '}
                  <strong className="text-red-700">
                    {formatRupiah(paymentInvoice.remainingAmount)}
                  </strong>
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Jumlah Pembayaran <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Metode</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="TRANSFER">Transfer</option>
                  <option value="CASH">Tunai</option>
                  <option value="OTHER">Lainnya</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleRecordPayment}
                  disabled={recordingPayment}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition disabled:opacity-50 text-sm"
                >
                  {recordingPayment ? 'Menyimpan...' : 'Simpan'}
                </button>
                <button
                  onClick={() => setPaymentInvoice(null)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 rounded-lg transition text-sm"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteInvoice && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setDeleteInvoice(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-full">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Hapus Invoice?</h3>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm space-y-1">
              <p className="font-mono text-xs text-gray-500">{deleteInvoice.invoiceNumber}</p>
              <p className="font-medium text-gray-900">{deleteInvoice.studentName}</p>
              <p className="text-gray-600">{formatRupiah(deleteInvoice.totalAmount)}</p>
            </div>
            <p className="text-sm text-gray-600 mb-5">
              Invoice ini akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 rounded-lg transition disabled:opacity-50 text-sm"
              >
                {deleting ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
              <button
                onClick={() => setDeleteInvoice(null)}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 rounded-lg transition text-sm"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
