'use client'

import Link from 'next/link'
import { CheckCircle, Calendar, Home } from 'lucide-react'

export default function DonePage() {
  return (
    <div className="px-4 py-8 flex flex-col items-center justify-center min-h-[60vh] space-y-4">
      {/* Stepper */}
      <div className="flex items-center justify-center gap-2 mb-8">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center font-bold text-sm">
            <CheckCircle className="w-4 h-4" />
          </div>
          <span className="text-xs font-medium text-green-600">Presensi</span>
        </div>
        <div className="w-8 h-px bg-green-300"></div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center font-bold text-sm">
            <CheckCircle className="w-4 h-4" />
          </div>
          <span className="text-xs font-medium text-green-600">Progress</span>
        </div>
        <div className="w-8 h-px bg-green-300"></div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center font-bold text-sm">
            <CheckCircle className="w-4 h-4" />
          </div>
          <span className="text-xs font-medium text-green-600">Selesai</span>
        </div>
      </div>

      <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center">
        <CheckCircle className="w-14 h-14 text-green-600" />
      </div>

      <div className="text-center space-y-1">
        <h1 className="text-2xl font-bold text-gray-900">Berhasil! 🎉</h1>
        <p className="text-sm text-gray-600">Presensi & progress sudah tersimpan</p>
      </div>

      <div className="w-full max-w-xs space-y-2 mt-4">
        <Link
          href="/guru/presensi"
          className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition text-center flex items-center justify-center gap-2"
        >
          <Calendar className="w-5 h-5" />
          Sesi Lainnya
        </Link>
        <Link
          href="/guru"
          className="block w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-3 rounded-lg transition text-center flex items-center justify-center gap-2"
        >
          <Home className="w-5 h-5" />
          Dashboard
        </Link>
      </div>
    </div>
  )
}
