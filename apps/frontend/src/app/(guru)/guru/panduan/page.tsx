'use client'

import Link from 'next/link'
import { ArrowLeft, LayoutDashboard, CheckSquare, Calendar, TrendingUp } from 'lucide-react'
import GuideIndexCard from '@/components/panduan/GuideIndexCard'

export default function PanduanIndexPage() {
  return (
    <div className="px-4 py-4 space-y-4 mb-20">
      <Link href="/guru" className="flex items-center gap-2 text-blue-600 text-sm font-medium">
        <ArrowLeft className="w-4 h-4" />
        Kembali ke Dashboard
      </Link>

      <div>
        <h1 className="text-xl font-bold text-gray-900">Panduan Penggunaan</h1>
        <p className="text-sm text-gray-600 mt-0.5">
          Pilih menu di bawah untuk melihat cara pakainya langkah demi langkah
        </p>
      </div>

      <div className="space-y-3">
        <GuideIndexCard
          href="/guru/panduan/dashboard"
          icon={LayoutDashboard}
          color="blue"
          title="Dashboard"
          description="Melihat ringkasan sesi hari ini dan tombol pintasan"
        />
        <GuideIndexCard
          href="/guru/panduan/presensi"
          icon={CheckSquare}
          color="orange"
          title="Presensi & Progress"
          description="Cara isi presensi siswa, progress belajar, gantikan sesi, dan sesi darurat"
        />
        <GuideIndexCard
          href="/guru/panduan/jadwal"
          icon={Calendar}
          color="purple"
          title="Jadwal"
          description="Melihat jadwal mengajar mingguan per hari"
        />
        <GuideIndexCard
          href="/guru/panduan/komisi"
          icon={TrendingUp}
          color="green"
          title="Komisi"
          description="Melihat riwayat dan cara hitung komisi mengajar"
        />
      </div>
    </div>
  )
}
