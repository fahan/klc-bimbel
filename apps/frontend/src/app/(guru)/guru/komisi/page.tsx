'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { commissionApi } from '@/lib/api/endpoints'
import { TrendingUp, Calendar, CheckCircle, Clock } from 'lucide-react'

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

export default function KomisiGuruPage() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())

  const { data, isLoading } = useQuery({
    queryKey: ['my-commissions', year],
    queryFn: () => commissionApi.getMy(year),
  })

  const commissions = data?.data?.data || []

  // Calculate totals
  const totalApproved = commissions
    .filter((c: any) => c.status === 'APPROVED')
    .reduce((sum: number, c: any) => sum + parseFloat(c.totalAmount), 0)

  const totalPending = commissions
    .filter((c: any) => c.status !== 'APPROVED')
    .reduce((sum: number, c: any) => sum + parseFloat(c.totalAmount), 0)

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Komisi Saya</h1>
        <p className="text-sm text-gray-600 mt-0.5">Ringkasan komisi mengajar</p>
      </div>

      {/* Year Selector */}
      <div className="flex gap-2">
        {[year - 1, year, year + 1].map((y) => (
          <button
            key={y}
            onClick={() => setYear(y)}
            disabled={y > today.getFullYear()}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition disabled:opacity-30 disabled:cursor-not-allowed ${
              y === year ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {y}
          </button>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-lg border border-green-200 p-3 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-xs text-gray-600 font-medium">Sudah Diterima</p>
          </div>
          <p className="text-lg font-bold text-green-700 mt-2">{formatRupiah(totalApproved)}</p>
        </div>
        <div className="bg-white rounded-lg border border-amber-200 p-3 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-xs text-gray-600 font-medium">Pending</p>
          </div>
          <p className="text-lg font-bold text-amber-700 mt-2">{formatRupiah(totalPending)}</p>
        </div>
      </div>

      {/* Commissions List */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-lg p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
              <div className="h-3 bg-gray-100 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : commissions.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center shadow-sm">
          <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <TrendingUp className="w-7 h-7 text-blue-600" />
          </div>
          <p className="font-medium text-gray-900 mb-1">Belum ada komisi tahun ini</p>
          <p className="text-xs text-gray-500">
            Komisi otomatis dihitung tiap akhir bulan berdasarkan presensi sesi.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-700 mt-2">Riwayat Bulanan</h2>
          {commissions.map((c: any) => (
            <div
              key={c.id}
              className={`bg-white border rounded-lg p-4 shadow-sm ${
                c.status === 'APPROVED' ? 'border-green-200' : 'border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <p className="font-semibold text-gray-900 text-sm">
                      {MONTHS[c.month - 1]} {c.year}
                    </p>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{c.branchName}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900 text-base">{formatRupiah(c.totalAmount)}</p>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium mt-1 ${
                      c.status === 'APPROVED'
                        ? 'bg-green-100 text-green-700'
                        : c.status === 'CALCULATED'
                        ? 'bg-gray-200 text-gray-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {c.status === 'APPROVED'
                      ? 'Disetujui'
                      : c.status === 'CALCULATED'
                      ? 'Final'
                      : 'Estimasi'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info Banner */}
      <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-3 mt-2">
        <p className="text-xs text-blue-800 leading-relaxed">
          💡 <strong>Cara hitung komisi:</strong>
          <br />
          (SPP ÷ total sesi bulan ini) × <strong>40%</strong> × jumlah sesi yang dihadiri
        </p>
      </div>
    </div>
  )
}
