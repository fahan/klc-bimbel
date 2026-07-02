import React from 'react'
import { AlertCircle } from 'lucide-react'

interface EnrollmentStep4Props {
  onConfirm: () => Promise<void> | void
  loading?: boolean
  hasUnscheduledSubjects?: boolean
}

export default function EnrollmentStep4({ onConfirm, loading, hasUnscheduledSubjects }: EnrollmentStep4Props) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Konfirmasi Pendaftaran</h3>

      <div className="space-y-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">Ringkasan Data</h4>
          <p className="text-sm text-blue-800">
            Mohon periksa kembali semua data yang telah diisi. Klik tombol "Daftarkan Siswa" untuk
            menyelesaikan proses pendaftaran.
          </p>
        </div>

        {hasUnscheduledSubjects && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-900">Belum ada jadwal dipilih</p>
              <p className="text-xs text-amber-800 mt-1">
                Siswa akan didaftarkan tanpa jadwal sesi. Anda bisa menambahkan jadwal nanti dari
                halaman Detail Siswa.
              </p>
            </div>
          </div>
        )}

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-900">Perhatian: SPP Di-lock</p>
            <p className="text-xs text-amber-800 mt-1">
              Tarif SPP di-lock sesuai harga hari ini. Jika tarif naik di masa mendatang, SPP siswa
              ini tidak berubah.
            </p>
          </div>
        </div>
      </div>

      <button
        onClick={onConfirm}
        disabled={loading}
        className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Menyimpan...' : 'Daftarkan Siswa'}
      </button>
    </div>
  )
}
