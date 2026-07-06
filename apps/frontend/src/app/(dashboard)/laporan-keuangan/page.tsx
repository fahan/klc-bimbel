'use client'

import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { financeApi } from '@/lib/api/endpoints'
import { useApiBranchId, useBranch } from '@/lib/branch-context'
import {
  ChevronLeft,
  ChevronRight,
  Download,
  TrendingUp,
  TrendingDown,
  Wallet,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'
import { LoadingState, ErrorState } from '@/components/ui/States'

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

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

function formatRupiah(amount: number | string) {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return 'Rp ' + Math.round(num).toLocaleString('id-ID')
}

function formatRupiahShort(amount: number | string) {
  const n = typeof amount === 'string' ? parseFloat(amount) : amount
  if (n >= 1000000) return `Rp ${(n / 1000000).toFixed(1)}jt`
  if (n >= 1000) return `Rp ${(n / 1000).toFixed(0)}rb`
  return `Rp ${n}`
}

const TX_TYPE_BADGE: Record<string, string> = {
  SPP: 'bg-green-100 text-green-700',
  REGISTRATION: 'bg-blue-100 text-blue-700',
  COMMISSION: 'bg-red-100 text-red-700',
  SALE: 'bg-amber-100 text-amber-700',
}

const TX_TYPE_LABEL: Record<string, string> = {
  SPP: 'SPP',
  REGISTRATION: 'Registrasi',
  COMMISSION: 'Komisi',
  SALE: 'Penjualan',
}

export default function LaporanKeuanganPage() {
  const today = new Date()
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [year, setYear] = useState(today.getFullYear())
  const branchId = useApiBranchId()
  const { selectedBranch, canViewAllBranches } = useBranch()

  const { data: overviewData, isLoading, error, refetch } = useQuery({
    queryKey: ['finance-overview', month, year, branchId],
    queryFn: () => financeApi.getOverview(month, year, branchId),
    networkMode: 'always',
  })

  const { data: txData } = useQuery({
    queryKey: ['finance-transactions', branchId],
    queryFn: () => financeApi.getTransactions(branchId, 20),
  })

  const overview = overviewData?.data?.data
  const transactions = txData?.data?.data || []

  const isCurrentMonth = month === today.getMonth() + 1 && year === today.getFullYear()
  const monthLabel = `${MONTHS[month - 1]} ${year}`

  const navigatePrev = () => {
    if (month === 1) {
      setMonth(12)
      setYear(year - 1)
    } else {
      setMonth(month - 1)
    }
  }

  const navigateNext = () => {
    if (isCurrentMonth) return
    if (month === 12) {
      setMonth(1)
      setYear(year + 1)
    } else {
      setMonth(month + 1)
    }
  }

  if (error) {
    return (
      <ErrorState
        title="Gagal memuat data"
        description="Terjadi kesalahan saat memuat data. Silakan coba lagi."
        action={{ label: 'Coba Lagi', onClick: refetch }}
      />
    )
  }

  if (isLoading) return <LoadingState />

  if (!overview) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Data keuangan belum tersedia</p>
      </div>
    )
  }

  const { metrics, breakdown, trend } = overview
  const totalIncome = parseFloat(metrics.totalIncome)
  const totalExpense = parseFloat(metrics.totalExpense)
  const netBalance = parseFloat(metrics.netBalance)
  const surplus = totalIncome > 0 ? ((netBalance / totalIncome) * 100).toFixed(0) : '0'

  // Compute previous month income for trend %
  const prevMonth = trend[trend.length - 2]
  const incomeChange =
    prevMonth && prevMonth.income > 0
      ? ((totalIncome - prevMonth.income) / prevMonth.income) * 100
      : 0

  // Compute max for chart scaling
  const maxValue = Math.max(...trend.map((t: any) => Math.max(t.income, t.expense)))

  // Income breakdown percentages
  const incomeTotal = breakdown.income.spp + breakdown.income.registration + breakdown.income.store
  const incomeBreakdown = [
    { label: 'SPP bulanan', value: breakdown.income.spp, color: 'bg-green-500' },
    { label: 'Biaya registrasi', value: breakdown.income.registration, color: 'bg-blue-500' },
    { label: 'Penjualan toko', value: breakdown.income.store, color: 'bg-amber-500' },
  ]

  const expenseTotal = breakdown.expense.commission + breakdown.expense.stock + (breakdown.expense.operational || 0) + (breakdown.expense.asset || 0)
  const expenseBreakdown = [
    { label: 'Komisi guru', value: breakdown.expense.commission, color: 'bg-red-500' },
    { label: 'Pembelian stok', value: breakdown.expense.stock, color: 'bg-orange-500' },
    { label: 'Operasional', value: breakdown.expense.operational || 0, color: 'bg-blue-500' },
    { label: 'Aset', value: breakdown.expense.asset || 0, color: 'bg-purple-500' },
  ]

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold text-gray-900">Laporan Keuangan</h1>
          <p className="text-gray-600 mt-1 text-sm hidden sm:block">
            {selectedBranch
              ? `${selectedBranch.name} · `
              : canViewAllBranches
              ? 'Semua Cabang (Konsolidasi) · '
              : ''}
            Pemasukan, pengeluaran, dan saldo bersih
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1 px-2 py-1 border border-gray-300 rounded-lg bg-white">
            <button onClick={navigatePrev} className="p-1 hover:bg-gray-100 rounded">
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            </button>
            <span className="text-sm font-medium text-gray-700 px-2 min-w-[120px] text-center">
              {monthLabel}
            </span>
            <button
              onClick={navigateNext}
              disabled={isCurrentMonth}
              className="p-1 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </button>
          </div>
          <button className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-lg border border-green-200 p-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-600 font-medium">Total Pemasukan</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatRupiah(totalIncome)}</p>
            </div>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          {prevMonth && (
            <p
              className={`text-xs mt-2 font-medium flex items-center gap-1 ${
                incomeChange >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {incomeChange >= 0 ? (
                <ArrowUpRight className="w-3 h-3" />
              ) : (
                <ArrowDownRight className="w-3 h-3" />
              )}
              {Math.abs(incomeChange).toFixed(1)}% vs bulan lalu
            </p>
          )}
        </div>

        <div className="bg-white rounded-lg border border-red-200 p-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-600 font-medium">Total Pengeluaran</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatRupiah(totalExpense)}
              </p>
            </div>
            <TrendingDown className="w-5 h-5 text-red-600" />
          </div>
          <p className="text-xs text-gray-500 mt-2">Komisi guru + stok</p>
        </div>

        <div className="bg-white rounded-lg border border-blue-200 p-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-600 font-medium">Saldo Bersih</p>
              <p
                className={`text-2xl font-bold mt-1 ${
                  netBalance >= 0 ? 'text-blue-700' : 'text-red-700'
                }`}
              >
                {formatRupiah(netBalance)}
              </p>
            </div>
            <Wallet className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {netBalance >= 0 ? `Surplus ${surplus}%` : 'Defisit'}
          </p>
        </div>

        <div className="bg-white rounded-lg border border-amber-200 p-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-600 font-medium">SPP Belum Terbayar</p>
              <p className="text-2xl font-bold text-red-700 mt-1">
                {formatRupiah(metrics.unpaidSppAmount)}
              </p>
            </div>
            <AlertCircle className="w-5 h-5 text-amber-600" />
          </div>
          <p className="text-xs text-red-500 mt-2">{metrics.unpaidStudentsCount} siswa menunggak</p>
        </div>
      </div>

      {/* Net Bar */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
          <div>
            <p className="text-xs text-gray-600">SPP terkumpul</p>
            <p className="font-bold text-green-700">{formatRupiah(breakdown.income.spp)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Biaya registrasi</p>
            <p className="font-bold text-green-700">
              {formatRupiah(breakdown.income.registration)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Komisi guru</p>
            <p className="font-bold text-red-700">
              −{formatRupiah(breakdown.expense.commission)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Pembelian stok</p>
            <p className="font-bold text-red-700">−{formatRupiah(breakdown.expense.stock)}</p>
          </div>
          {(breakdown.expense.operational || 0) > 0 && (
            <div>
              <p className="text-xs text-gray-600">Operasional</p>
              <p className="font-bold text-red-700">−{formatRupiah(breakdown.expense.operational || 0)}</p>
            </div>
          )}
          {(breakdown.expense.asset || 0) > 0 && (
            <div>
              <p className="text-xs text-gray-600">Aset</p>
              <p className="font-bold text-red-700">−{formatRupiah(breakdown.expense.asset || 0)}</p>
            </div>
          )}
        </div>
        <div className="border-t border-blue-200 mt-3 pt-3 flex items-center justify-between">
          <p className="text-sm text-gray-700">
            Saldo bersih <strong>{monthLabel}</strong>
          </p>
          <div className="flex items-center gap-2">
            <p
              className={`text-2xl font-bold ${
                netBalance >= 0 ? 'text-blue-700' : 'text-red-700'
              }`}
            >
              {formatRupiah(netBalance)}
            </p>
            <span
              className={`text-xs px-2 py-1 rounded-full font-medium ${
                netBalance >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}
            >
              {netBalance >= 0 ? `Surplus ${surplus}%` : 'Defisit'}
            </span>
          </div>
        </div>
      </div>

      {/* Two Column: Trend Chart + Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend Chart */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">Tren 6 Bulan Terakhir</h2>
          </div>
          <div className="flex items-center gap-4 mb-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 bg-green-300 rounded"></span>
              <span className="text-gray-600">Pemasukan</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 bg-red-300 rounded"></span>
              <span className="text-gray-600">Pengeluaran</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-1 bg-blue-600 rounded"></span>
              <span className="text-gray-600">Saldo bersih</span>
            </div>
          </div>

          {/* Simple bar chart */}
          <div className="space-y-3">
            {trend.map((t: any) => {
              const incPercent = maxValue > 0 ? (t.income / maxValue) * 100 : 0
              const expPercent = maxValue > 0 ? (t.expense / maxValue) * 100 : 0
              const isCurrent = t.month === month && t.year === year

              return (
                <div key={`${t.year}-${t.month}`} className={isCurrent ? 'opacity-100' : 'opacity-80'}>
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="font-medium text-gray-700">
                      {MONTH_SHORT[t.month - 1]} {String(t.year).slice(-2)}
                      {isCurrent && <span className="text-blue-600 ml-1">●</span>}
                    </span>
                    <span className="text-gray-500">
                      Net <strong className={t.net >= 0 ? 'text-blue-700' : 'text-red-700'}>
                        {formatRupiahShort(t.net)}
                      </strong>
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-16 text-[10px] text-green-700 text-right">
                        {formatRupiahShort(t.income)}
                      </div>
                      <div className="flex-1 bg-gray-100 rounded-full h-3 relative">
                        <div
                          className="bg-green-300 h-3 rounded-full"
                          style={{ width: `${incPercent}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-16 text-[10px] text-red-700 text-right">
                        {formatRupiahShort(t.expense)}
                      </div>
                      <div className="flex-1 bg-gray-100 rounded-full h-3 relative">
                        <div
                          className="bg-red-300 h-3 rounded-full"
                          style={{ width: `${expPercent}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Breakdown */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5 space-y-5">
          <h2 className="text-base font-semibold text-gray-900">Sumber Pemasukan & Pengeluaran</h2>

          {/* Income */}
          <div>
            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3">
              Pemasukan
            </p>
            <div className="space-y-2.5">
              {incomeBreakdown.map((item) => {
                const pct = incomeTotal > 0 ? (item.value / incomeTotal) * 100 : 0
                return (
                  <div key={item.label}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-gray-700 font-medium">{item.label}</span>
                      <span className="text-gray-900 font-semibold">
                        {formatRupiah(item.value)}{' '}
                        <span className="text-gray-500 font-normal ml-1">{pct.toFixed(0)}%</span>
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className={`${item.color} h-2 rounded-full`} style={{ width: `${pct}%` }}></div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="border-t border-gray-200"></div>

          {/* Expense */}
          <div>
            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3">
              Pengeluaran
            </p>
            <div className="space-y-2.5">
              {expenseBreakdown.map((item) => {
                const pct = expenseTotal > 0 ? (item.value / expenseTotal) * 100 : 0
                return (
                  <div key={item.label}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-gray-700 font-medium">{item.label}</span>
                      <span className="text-gray-900 font-semibold">
                        {formatRupiah(item.value)}{' '}
                        <span className="text-gray-500 font-normal ml-1">{pct.toFixed(0)}%</span>
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className={`${item.color} h-2 rounded-full`} style={{ width: `${pct}%` }}></div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Transaksi Terbaru</h2>
          <span className="text-xs text-gray-500">{transactions.length} transaksi</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Tanggal</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Jenis</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">
                  Keterangan
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">
                  Dicatat oleh
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">Jumlah</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-500">
                    Belum ada transaksi
                  </td>
                </tr>
              ) : (
                transactions.map((tx: any) => (
                  <tr key={`${tx.type}-${tx.id}`} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {new Date(tx.date).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${TX_TYPE_BADGE[tx.type]}`}
                      >
                        {TX_TYPE_LABEL[tx.type]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{tx.description}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">{tx.recordedByName || '-'}</td>
                    <td className="px-4 py-3 text-right text-sm font-semibold whitespace-nowrap">
                      <span className={tx.direction === 'IN' ? 'text-green-700' : 'text-red-700'}>
                        {tx.direction === 'IN' ? '+' : '−'}
                        {formatRupiah(tx.amount)}
                      </span>
                    </td>
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
