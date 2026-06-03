'use client'

import Link from 'next/link'
import { CheckCircle, AlertTriangle, Clock, History } from 'lucide-react'

export default function DaruratSelesaiPage() {
  return (
    <div className="px-4 py-8 flex flex-col items-center justify-center min-h-[70vh] text-center space-y-5">
      {/* Icon */}
      <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center">
        <CheckCircle className="w-10 h-10 text-orange-600" />
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-bold text-gray-900">Sesi Darurat Tercatat!</h2>
        <p className="text-sm text-gray-600 max-w-xs mx-auto">
          Presensi dan progress siswa telah disimpan.
        </p>
      </div>

      {/* Stepper — all done */}
      <div className="flex items-center justify-center gap-2 py-1">
        {['Presensi', 'Progress', 'Selesai'].map((label, idx) => (
          <div key={label} className="flex items-center gap-2">
            {idx > 0 && <div className="w-8 h-px bg-green-400" />}
            <div className="flex items-center gap-1.5">
              <div className="w-7 h-7 rounded-full bg-green-600 text-white flex items-center justify-center">
                <CheckCircle className="w-4 h-4" />
              </div>
              <span className="text-xs font-medium text-green-600">{label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Info box */}
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-left max-w-xs space-y-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-orange-600 flex-shrink-0" />
          <p className="text-xs font-semibold text-orange-900">Status: Menunggu Persetujuan Admin</p>
        </div>
        <p className="text-xs text-orange-700">
          Sesi ini belum terhitung di komisi. Admin akan mereview dan menyetujui sesi darurat Anda.
        </p>
        <div className="flex items-center gap-1.5 text-xs text-orange-700">
          <Clock className="w-3.5 h-3.5" />
          Cek status di riwayat sesi darurat
        </div>
      </div>

      {/* CTA Buttons */}
      <div className="flex flex-col gap-2 w-full max-w-xs">
        <Link
          href="/guru/presensi/darurat/riwayat"
          className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-lg transition text-sm"
        >
          <History className="w-4 h-4" />
          Lihat Riwayat Sesi Darurat
        </Link>
        <Link
          href="/guru/presensi"
          className="w-full text-center bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2.5 rounded-lg transition text-sm"
        >
          Kembali ke Presensi
        </Link>
      </div>
    </div>
  )
}
