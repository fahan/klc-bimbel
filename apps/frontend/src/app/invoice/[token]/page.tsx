'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { CheckCircle, AlertCircle, Building, Calendar, User, FileText } from 'lucide-react'

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

function formatDate(dateStr?: string | null) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

function formatDateTime(dateStr?: string | null) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return (
    d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) +
    ' · ' +
    d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) +
    ' WIB'
  )
}

export default function PublicInvoicePage() {
  const params = useParams()
  const token = params?.token as string
  const [invoice, setInvoice] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
        const res = await fetch(`${apiUrl}/invoices/public/${token}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        })
        if (!res.ok) {
          setError(res.status === 404 ? 'Invoice tidak ditemukan' : 'Gagal memuat invoice')
          return
        }
        const data = await res.json()
        setInvoice(data.data)
      } catch (e: any) {
        setError('Gagal terhubung ke server')
      } finally {
        setLoading(false)
      }
    }
    if (token) fetchInvoice()
  }, [token])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm text-gray-600">Memuat invoice...</p>
        </div>
      </div>
    )
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">{error || 'Invoice tidak ditemukan'}</h2>
          <p className="text-sm text-gray-600">
            Pastikan link yang Anda buka benar atau hubungi admin bimbel.
          </p>
        </div>
      </div>
    )
  }

  const isPaid = invoice.status === 'PAID'
  const isPartial = invoice.status === 'PARTIAL'
  const totalAmount = parseFloat(invoice.totalAmount)
  const paidAmount = parseFloat(invoice.paidAmount)
  const remainingAmount = totalAmount - paidAmount

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="max-w-2xl mx-auto bg-white shadow-lg">
        {/* Header (Blue background) */}
        <div className="bg-[#185FA5] text-white px-6 py-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <Building className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-base">KLC Bimbel</p>
                <p className="text-xs text-blue-100">Cabang {invoice.branchName}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider text-blue-100">No. Invoice</p>
              <p className="text-xs font-mono mt-1">{invoice.invoiceNumber}</p>
            </div>
          </div>

          <div className="flex items-center justify-between mt-4">
            <h1 className="text-2xl font-bold">
              {invoice.type === 'SPP' ? 'Tagihan SPP' : 'Tagihan Pendaftaran'}
            </h1>
            {isPaid ? (
              <span className="px-3 py-1 bg-green-200 text-green-900 text-xs font-bold rounded-full">
                Lunas
              </span>
            ) : isPartial ? (
              <span className="px-3 py-1 bg-amber-200 text-amber-900 text-xs font-bold rounded-full">
                Sebagian
              </span>
            ) : (
              <span className="px-3 py-1 bg-red-200 text-red-900 text-xs font-bold rounded-full">
                Belum lunas
              </span>
            )}
          </div>
        </div>

        {/* Banner — Paid */}
        {isPaid && (
          <div className="mx-4 mt-4 bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
            <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-green-900">Pembayaran diterima</p>
              <p className="text-xs text-green-700 mt-0.5">Terima kasih telah membayar</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-green-900 text-sm">{formatRupiah(paidAmount)}</p>
              <p className="text-xs text-green-700 mt-0.5">{formatDate(invoice.paidAt)}</p>
            </div>
          </div>
        )}

        {/* Banner — Unpaid */}
        {!isPaid && !isPartial && (
          <div className="mx-4 mt-4 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold text-red-900">Tagihan belum terbayar</p>
              <p className="text-xs text-red-700 mt-1 leading-relaxed">
                Mohon segera melunasi tagihan{' '}
                {invoice.type === 'SPP'
                  ? `SPP ${MONTHS[(invoice.month || 1) - 1]}`
                  : 'pendaftaran'}{' '}
                sebesar {formatRupiah(totalAmount)}. Hubungi admin KLC Bimbel untuk konfirmasi
                pembayaran.
              </p>
            </div>
          </div>
        )}

        {/* Banner — Partial */}
        {isPartial && (
          <div className="mx-4 mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <Calendar className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold text-amber-900">Pembayaran sebagian diterima</p>
              <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                Sudah dibayar: <strong>{formatRupiah(paidAmount)}</strong>. Sisa tagihan:{' '}
                <strong className="text-amber-900">{formatRupiah(remainingAmount)}</strong>.
              </p>
            </div>
          </div>
        )}

        {/* Information Card */}
        <div className="mx-4 mt-4 border border-gray-200 rounded-xl overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
            <p className="text-sm font-semibold text-gray-700">
              {isPaid ? 'Informasi Pembayaran' : 'Informasi Tagihan'}
            </p>
          </div>
          <div className="px-4 py-3 space-y-2.5 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Nama siswa</span>
              <span className="font-medium text-gray-900">{invoice.studentName}</span>
            </div>
            {invoice.studentClassLevel && (
              <div className="flex justify-between">
                <span className="text-gray-600">Kelas</span>
                <span className="font-medium text-gray-900">{invoice.studentClassLevel}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">Cabang</span>
              <span className="font-medium text-gray-900">{invoice.branchName}</span>
            </div>
            {invoice.month && invoice.year && (
              <div className="flex justify-between">
                <span className="text-gray-600">Periode</span>
                <span className="font-medium text-gray-900">
                  {MONTHS[invoice.month - 1]} {invoice.year}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">Tanggal tagihan</span>
              <span className="font-medium text-gray-900">{formatDate(invoice.createdAt)}</span>
            </div>
            {isPaid && invoice.paidAt && (
              <div className="flex justify-between">
                <span className="text-gray-600">Tanggal lunas</span>
                <span className="font-bold text-green-700">{formatDate(invoice.paidAt)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">Diterbitkan oleh</span>
              <span className="font-medium text-gray-900">
                Admin · {invoice.branchName}
              </span>
            </div>
          </div>
        </div>

        {/* Items Card */}
        <div className="mx-4 mt-4 border border-gray-200 rounded-xl overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
            <p className="text-sm font-semibold text-gray-700">
              {isPaid ? 'Rincian Pembayaran' : 'Rincian Tagihan'}
            </p>
          </div>
          <div className="px-4 py-3">
            <div className="space-y-3">
              {invoice.items?.map((item: any) => (
                <div key={item.id} className="border-b border-gray-100 pb-3 last:border-b-0 last:pb-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="font-bold text-gray-900 text-sm">
                        {item.subjectName || (item.type === 'REGISTRATION' ? 'Biaya Pendaftaran' : 'Item')}
                      </p>
                      {item.type === 'SPP' && item.subjectType && (
                        <span
                          className={`inline-block mt-1 px-2 py-0.5 text-[10px] font-medium rounded-full ${
                            item.sessionCount === 8
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {item.sessionCount === 8 ? 'Private' : 'Reguler'}
                        </span>
                      )}
                      {item.sessionCount > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          {item.sessionCount} sesi
                          {invoice.month && invoice.year ? ` · ${MONTHS[invoice.month - 1]} ${invoice.year}` : ''}
                        </p>
                      )}
                    </div>
                    <p className="font-bold text-gray-900 text-sm whitespace-nowrap">
                      {formatRupiah(item.amount)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Total Card */}
        <div className="mx-4 mt-4 border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 space-y-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>{formatRupiah(totalAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Sudah dibayar</span>
              <span className={isPaid ? 'text-green-700 font-medium' : 'text-gray-900'}>
                {formatRupiah(paidAmount)}
              </span>
            </div>
            <div className="border-t border-gray-200 pt-2 mt-2 flex justify-between items-center">
              <span className="font-bold text-gray-900">
                {isPaid ? 'Sisa tagihan' : 'Total tagihan'}
              </span>
              <span
                className={`text-2xl font-bold ${
                  isPaid ? 'text-green-700' : 'text-red-700'
                }`}
              >
                {isPaid ? formatRupiah(0) : formatRupiah(remainingAmount)}
              </span>
            </div>
          </div>
        </div>

        {/* LUNAS Stamp */}
        {isPaid && (
          <div className="mx-4 mt-4 relative">
            {/* Watermark */}
            <div
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
              style={{ transform: 'rotate(-20deg)', opacity: 0.07 }}
            >
              <div className="w-72 h-72 rounded-full border-8 border-green-700 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-5xl font-black text-green-700">LUNAS</p>
                  <p className="text-xs font-bold text-green-700 mt-2 tracking-widest">
                    KLC BIMBEL
                  </p>
                </div>
              </div>
            </div>

            {/* Front Stamp */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 relative">
              <p className="text-xs text-gray-500 mb-3 text-center">Bukti pembayaran resmi</p>
              <div className="border-2 border-green-600 rounded-xl p-4 text-center bg-white">
                <p className="text-3xl font-black text-green-700 tracking-[0.3em]">L U N A S</p>
                <div className="border-t border-green-200 my-3"></div>
                <p className="text-xs text-gray-500 mb-1">Dibayar pada</p>
                <p className="font-bold text-green-700 text-sm">{formatDateTime(invoice.paidAt)}</p>
                <p className="text-xs text-gray-500 mt-2">
                  KLC Bimbel · {invoice.branchName}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Digital Cap */}
        <div className="mx-4 mt-4 bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-center gap-3">
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
              isPaid
                ? 'bg-green-100 border-2 border-green-600'
                : 'bg-gray-100 border-2 border-gray-300 border-dashed'
            }`}
          >
            <Building className={`w-5 h-5 ${isPaid ? 'text-green-700' : 'text-gray-400'}`} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-900">KLC Bimbel</p>
            <p className="text-xs text-gray-600">Cabang {invoice.branchName}</p>
          </div>
          <p className="text-xs text-gray-500 italic">
            Dokumen resmi · {isPaid ? 'terverifikasi' : 'diterbitkan secara'} digital
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 py-6 mt-4 text-center">
          <p className="text-xs text-gray-500 leading-relaxed">
            {isPaid
              ? 'Simpan halaman ini sebagai bukti pembayaran resmi Anda.'
              : 'Simpan halaman ini sebagai bukti tagihan Anda.'}
            <br />
            Dokumen ini diterbitkan secara digital oleh KLC Bimbel.
          </p>
        </div>
      </div>
    </div>
  )
}
