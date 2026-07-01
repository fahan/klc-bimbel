'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import PhoneMockup from '@/components/panduan/PhoneMockup'
import GuideStep from '@/components/panduan/GuideStep'

export default function PanduanKomisiPage() {
  return (
    <div className="px-4 py-4 space-y-4 mb-20">
      <Link href="/guru/panduan" className="flex items-center gap-2 text-blue-600 text-sm font-medium">
        <ArrowLeft className="w-4 h-4" />
        Kembali ke Panduan
      </Link>

      <div>
        <h1 className="text-xl font-bold text-gray-900">Panduan: Komisi</h1>
        <p className="text-sm text-gray-600 mt-0.5">Melihat riwayat dan cara hitung komisi mengajar Anda</p>
      </div>

      <GuideStep
        number={1}
        title="Pilih tahun"
        description="Gunakan tombol tahun (tahun lalu / ini / depan) untuk melihat riwayat komisi tahun tertentu."
      >
        <PhoneMockup>
          <div className="flex gap-1.5 ring-2 ring-blue-500 rounded-lg p-1.5 -m-1.5">
            {[2025, 2026, 2027].map((y) => (
              <div
                key={y}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-medium text-center ${
                  y === 2026 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                {y}
              </div>
            ))}
          </div>
        </PhoneMockup>
      </GuideStep>

      <GuideStep
        number={2}
        title="Ringkasan komisi"
        description="Dua card menampilkan total Komisi Diterima (sudah disetujui admin) dan Komisi Pending (masih estimasi/belum disetujui). Card Bonus muncul jika Anda punya bonus tahun itu."
      >
        <PhoneMockup>
          <div className="grid grid-cols-2 gap-2 ring-2 ring-blue-500 rounded-lg p-2 -m-2">
            <div className="bg-white rounded-lg border border-green-200 p-2">
              <p className="text-[9px] text-gray-600 font-medium">Komisi Diterima</p>
              <p className="text-xs font-bold text-green-700 mt-1">Rp 850.000</p>
            </div>
            <div className="bg-white rounded-lg border border-amber-200 p-2">
              <p className="text-[9px] text-gray-600 font-medium">Komisi Pending</p>
              <p className="text-xs font-bold text-amber-700 mt-1">Rp 320.000</p>
            </div>
          </div>
        </PhoneMockup>
      </GuideStep>

      <GuideStep
        number={3}
        title="Riwayat bulanan"
        description="Daftar komisi per bulan dengan status: Estimasi (belum final), Final (sudah dihitung), atau Disetujui (sudah di-approve admin)."
      >
        <PhoneMockup>
          <div className="space-y-1.5 ring-2 ring-blue-500 rounded-lg p-2 -m-2">
            <div className="bg-white border border-green-200 rounded-lg p-2 flex items-center justify-between">
              <p className="text-[10px] font-semibold text-gray-900">Juni 2026</p>
              <span className="text-[8px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">
                Disetujui
              </span>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-2 flex items-center justify-between">
              <p className="text-[10px] font-semibold text-gray-900">Juli 2026</p>
              <span className="text-[8px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium">
                Estimasi
              </span>
            </div>
          </div>
        </PhoneMockup>
      </GuideStep>

      <GuideStep
        number={4}
        title="Riwayat bonus"
        description="Jika admin memberikan bonus (misalnya karena siswa lulus ujian), riwayatnya muncul di bagian ini dengan status Disetujui atau Menunggu."
      >
        <PhoneMockup>
          <div className="bg-white border border-purple-200 rounded-lg p-2.5 ring-2 ring-blue-500">
            <p className="text-[10px] font-medium text-gray-900">Bonus siswa lulus ujian</p>
            <div className="flex items-center justify-between mt-1">
              <p className="text-[9px] text-gray-500">Juni 2026</p>
              <span className="text-[8px] px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded-full font-medium">
                Disetujui
              </span>
            </div>
          </div>
        </PhoneMockup>
      </GuideStep>

      <GuideStep
        number={5}
        title="Cara hitung komisi"
        description="Di bagian paling bawah ada catatan formula default. Formula bisa berbeda per mata pelajaran atau jenis sesi sesuai pengaturan admin."
        tip="Contoh: SPP Rp 300.000, 12 sesi/bulan, komisi 40%, hadir 10 sesi → 300.000 ÷ 12 × 40% × 10 = Rp 100.000"
      >
        <PhoneMockup>
          <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-2.5 ring-2 ring-blue-500">
            <p className="text-[10px] text-blue-800 leading-relaxed">
              💡 SPP ÷ 12 × % komisi × sesi terlaksana
            </p>
          </div>
        </PhoneMockup>
      </GuideStep>
    </div>
  )
}
