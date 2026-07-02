'use client'

import Link from 'next/link'
import { ArrowLeft, CheckSquare, Calendar, TrendingUp } from 'lucide-react'
import PhoneMockup from '@/components/panduan/PhoneMockup'
import GuideStep from '@/components/panduan/GuideStep'

export default function PanduanDashboardPage() {
  return (
    <div className="px-4 py-4 space-y-4 mb-20">
      <Link href="/guru/panduan" className="flex items-center gap-2 text-blue-600 text-sm font-medium">
        <ArrowLeft className="w-4 h-4" />
        Kembali ke Panduan
      </Link>

      <div>
        <h1 className="text-xl font-bold text-gray-900">Panduan: Dashboard</h1>
        <p className="text-sm text-gray-600 mt-0.5">Halaman pertama yang Anda lihat setelah login</p>
      </div>

      <GuideStep
        number={1}
        title="Sapaan & tanggal hari ini"
        description="Di bagian atas dashboard, Anda akan melihat sapaan dan tanggal hari ini."
      >
        <PhoneMockup>
          <div className="ring-2 ring-blue-500 rounded-lg p-2 -m-2">
            <h1 className="text-base font-bold text-gray-900">Selamat datang! 👋</h1>
            <p className="text-xs text-gray-600 mt-0.5">Senin, 1 Juli 2026</p>
          </div>
        </PhoneMockup>
      </GuideStep>

      <GuideStep
        number={2}
        title='Card "Sesi Hari Ini"'
        description="Menampilkan berapa banyak sesi mengajar Anda hari ini, dan status masing-masing (Selesai / Mendatang)."
      >
        <PhoneMockup>
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-3 ring-2 ring-blue-500">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold text-gray-900 text-sm">Sesi Hari Ini</h2>
              <span className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">
                2 sesi
              </span>
            </div>
            <div className="space-y-1.5">
              <div className="p-2 bg-gray-50 rounded-lg flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-900">Matematika</p>
                  <p className="text-[10px] text-gray-600">08:00 (60m) · 3 siswa</p>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                  Selesai
                </span>
              </div>
              <div className="p-2 bg-gray-50 rounded-lg flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-900">Bahasa Inggris</p>
                  <p className="text-[10px] text-gray-600">15:00 (60m) · 2 siswa</p>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                  Mendatang
                </span>
              </div>
            </div>
          </div>
        </PhoneMockup>
      </GuideStep>

      <GuideStep
        number={3}
        title="Tap sesi untuk input presensi"
        description="Ketuk salah satu sesi di daftar untuk langsung masuk ke halaman presensi sesi tersebut."
      >
        <PhoneMockup>
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold text-gray-900 text-sm">Sesi Hari Ini</h2>
              <span className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">
                2 sesi
              </span>
            </div>
            <div className="space-y-1.5">
              <div className="p-2 bg-gray-50 rounded-lg flex items-center justify-between opacity-50">
                <div>
                  <p className="text-xs font-medium text-gray-900">Matematika</p>
                  <p className="text-[10px] text-gray-600">08:00 (60m) · 3 siswa</p>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                  Selesai
                </span>
              </div>
              <div className="relative p-2 bg-gray-50 rounded-lg flex items-center justify-between ring-2 ring-blue-500">
                <span className="absolute -top-2 -left-2 w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold">
                  👆
                </span>
                <div>
                  <p className="text-xs font-medium text-gray-900">Bahasa Inggris</p>
                  <p className="text-[10px] text-gray-600">15:00 (60m) · 2 siswa</p>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                  Mendatang
                </span>
              </div>
            </div>
          </div>
        </PhoneMockup>
      </GuideStep>

      <GuideStep
        number={4}
        title="Tombol pintasan"
        description="Di bawah daftar sesi, ada 3 tombol pintasan untuk langsung menuju Presensi, Jadwal, atau Komisi."
      >
        <PhoneMockup>
          <div className="grid grid-cols-3 gap-2 ring-2 ring-blue-500 rounded-lg p-2 -m-2">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-center">
              <CheckSquare className="w-5 h-5 text-blue-600 mx-auto mb-1" />
              <p className="text-[10px] font-medium text-blue-900">Presensi</p>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-2 text-center">
              <Calendar className="w-5 h-5 text-purple-600 mx-auto mb-1" />
              <p className="text-[10px] font-medium text-purple-900">Jadwal</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-2 text-center">
              <TrendingUp className="w-5 h-5 text-green-600 mx-auto mb-1" />
              <p className="text-[10px] font-medium text-green-900">Komisi</p>
            </div>
          </div>
        </PhoneMockup>
      </GuideStep>
    </div>
  )
}
