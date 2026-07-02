'use client'

import Link from 'next/link'
import { ArrowLeft, CheckCircle } from 'lucide-react'
import PhoneMockup from '@/components/panduan/PhoneMockup'
import GuideStep from '@/components/panduan/GuideStep'

export default function PanduanPresensiPage() {
  return (
    <div className="px-4 py-4 space-y-4 mb-20">
      <Link href="/guru/panduan" className="flex items-center gap-2 text-blue-600 text-sm font-medium">
        <ArrowLeft className="w-4 h-4" />
        Kembali ke Panduan
      </Link>

      <div>
        <h1 className="text-xl font-bold text-gray-900">Panduan: Presensi & Progress</h1>
        <p className="text-sm text-gray-600 mt-0.5">
          Cara isi presensi siswa, progress belajar, gantikan sesi, dan sesi darurat
        </p>
      </div>

      <GuideStep
        number={1}
        title="Buka daftar sesi hari ini"
        description="Menu Presensi menampilkan semua sesi mengajar Anda hari ini dengan status: Mendatang, Aktif, Selesai, atau Lewat."
      >
        <PhoneMockup>
          <div className="ring-2 ring-blue-500 rounded-lg p-2 -m-2 space-y-2">
            <p className="text-xs font-bold text-gray-900">📌 Sesi Saya</p>
            <div className="bg-blue-50 rounded-lg border-2 border-blue-300 p-2">
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500 mt-1"></div>
                <div className="flex-1">
                  <p className="text-[10px] font-semibold text-gray-900">Matematika</p>
                  <p className="text-[9px] text-gray-600">08:00 (60m) · 3 siswa</p>
                </div>
                <span className="text-[8px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">
                  Aktif
                </span>
              </div>
            </div>
          </div>
        </PhoneMockup>
      </GuideStep>

      <GuideStep
        number={2}
        title="Isi presensi tiap siswa"
        description="Ketuk sesi, lalu tandai status tiap siswa: Hadir, Absen, Izin, atau Sakit. Anda juga bisa menambahkan catatan (misalnya topik yang diajarkan)."
      >
        <PhoneMockup>
          <div className="bg-white border border-gray-200 rounded-lg p-2.5 ring-2 ring-blue-500">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-[9px]">
                AH
              </div>
              <p className="text-[10px] font-medium text-gray-900">Ahmad</p>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <div className="py-1.5 rounded-lg text-[9px] font-medium bg-green-600 text-white text-center">
                ✓ Hadir
              </div>
              <div className="py-1.5 rounded-lg text-[9px] font-medium bg-gray-100 text-gray-700 text-center">
                ✕ Absen
              </div>
            </div>
          </div>
        </PhoneMockup>
      </GuideStep>

      <GuideStep
        number={3}
        title="Submit presensi"
        description="Tekan tombol 'Submit Presensi & Lanjut' di bagian bawah layar. Anda akan otomatis diarahkan ke langkah input progress."
      >
        <PhoneMockup>
          <div className="ring-2 ring-blue-500 rounded-lg p-1">
            <div className="w-full bg-blue-600 text-white text-[11px] font-semibold py-2 rounded-lg text-center">
              Submit Presensi & Lanjut
            </div>
          </div>
        </PhoneMockup>
      </GuideStep>

      <GuideStep
        number={4}
        title="Isi progress belajar"
        description="Untuk mapel berbasis modul: pilih modul dan rentang bab yang diajarkan, lalu pilih predikat jika modul selesai. Untuk mapel materi bebas: isi 1 topik untuk semua siswa, lalu predikat per siswa."
        tip="Progress hanya diisi untuk siswa yang berstatus Hadir."
      >
        <PhoneMockup>
          <div className="bg-white border border-gray-200 rounded-lg p-2.5 ring-2 ring-blue-500 space-y-2">
            <p className="text-[9px] font-medium text-gray-700">Pilih Modul</p>
            <div className="border border-gray-300 rounded-lg px-2 py-1.5 text-[9px] text-gray-600 bg-gray-50">
              Modul 3: Pecahan (5 bab)
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div className="bg-blue-500 rounded-full h-1.5" style={{ width: '60%' }}></div>
            </div>
            <p className="text-[8px] text-gray-500">3/5 bab</p>
          </div>
        </PhoneMockup>
      </GuideStep>

      <GuideStep
        number={5}
        title="Halaman berhasil"
        description="Setelah progress tersimpan, Anda akan melihat halaman konfirmasi. Pilih 'Sesi Lainnya' untuk lanjut ke sesi berikutnya, atau 'Dashboard' untuk kembali."
      >
        <PhoneMockup>
          <div className="flex flex-col items-center py-3 ring-2 ring-blue-500 rounded-lg">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-2">
              <CheckCircle className="w-7 h-7 text-green-600" />
            </div>
            <p className="text-xs font-bold text-gray-900">Berhasil! 🎉</p>
            <p className="text-[9px] text-gray-600">Presensi & progress tersimpan</p>
          </div>
        </PhoneMockup>
      </GuideStep>

      <GuideStep
        number={6}
        title="Gantikan sesi guru lain"
        description="Di bagian bawah daftar sesi, Anda bisa mencari sesi guru atau siswa lain untuk menggantikan presensi (misalnya guru terjadwal berhalangan). Komisi sesi akan tercatat atas nama Anda sebagai guru pengganti."
      >
        <PhoneMockup>
          <div className="ring-2 ring-blue-500 rounded-lg p-2 -m-2 space-y-2">
            <p className="text-[10px] font-bold text-gray-900">🔍 Gantikan Sesi Guru Lain</p>
            <div className="flex gap-1.5">
              <div className="flex-1 py-1.5 rounded-lg text-[9px] font-semibold text-center bg-blue-600 text-white">
                👨‍🏫 Cari Guru
              </div>
              <div className="flex-1 py-1.5 rounded-lg text-[9px] font-semibold text-center bg-gray-100 text-gray-700">
                👨‍🎓 Cari Siswa
              </div>
            </div>
            <div className="border border-gray-300 rounded-lg px-2 py-1.5 text-[9px] text-gray-400 bg-white">
              Ketik nama guru...
            </div>
          </div>
        </PhoneMockup>
      </GuideStep>

      <GuideStep
        number={7}
        title="Sesi darurat"
        description="Untuk sesi di luar jadwal reguler (jadwal berubah mendadak, sesi tambahan, dll), gunakan tombol 'Sesi Darurat'. Isi cabang, mapel, tanggal, jam, dan siswa (bisa tambah siswa manual)."
        tip="Presensi sesi darurat akan menunggu persetujuan admin sebelum dihitung ke komisi."
      >
        <PhoneMockup>
          <div className="ring-2 ring-orange-500 rounded-lg p-2 -m-2 space-y-2">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-2">
              <p className="text-[9px] font-bold text-orange-800">⚠️ Sesi Darurat</p>
              <p className="text-[8px] text-orange-700 mt-0.5">Menunggu persetujuan admin</p>
            </div>
            <div className="border border-gray-300 rounded-lg px-2 py-1.5 text-[9px] text-gray-600 bg-white">
              Cabang: Purwakarta
            </div>
            <div className="border border-gray-300 rounded-lg px-2 py-1.5 text-[9px] text-gray-600 bg-white">
              Mapel: Matematika
            </div>
            <div className="w-full bg-orange-500 text-white text-[10px] font-semibold py-2 rounded-lg text-center">
              📋 Submit Sesi Darurat
            </div>
          </div>
        </PhoneMockup>
      </GuideStep>

      <GuideStep
        number={8}
        title="Riwayat sesi darurat"
        description="Lihat status pengajuan sesi darurat sebelumnya: Menunggu (belum diperiksa admin) atau Disetujui."
      >
        <PhoneMockup>
          <div className="space-y-1.5 ring-2 ring-blue-500 rounded-lg p-2 -m-2">
            <div className="bg-white border border-gray-200 rounded-lg p-2 flex items-center justify-between">
              <div>
                <p className="text-[9px] font-semibold text-gray-900">Matematika</p>
                <p className="text-[8px] text-gray-500">28 Jun 2026</p>
              </div>
              <span className="text-[8px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium">
                Menunggu
              </span>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-2 flex items-center justify-between">
              <div>
                <p className="text-[9px] font-semibold text-gray-900">IPA</p>
                <p className="text-[8px] text-gray-500">20 Jun 2026</p>
              </div>
              <span className="text-[8px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">
                Disetujui
              </span>
            </div>
          </div>
        </PhoneMockup>
      </GuideStep>
    </div>
  )
}
