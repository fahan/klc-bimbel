'use client'

import Link from 'next/link'
import { ArrowLeft, Clock, Users, MapPin } from 'lucide-react'
import PhoneMockup from '@/components/panduan/PhoneMockup'
import GuideStep from '@/components/panduan/GuideStep'

export default function PanduanJadwalPage() {
  const days = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']

  return (
    <div className="px-4 py-4 space-y-4 mb-20">
      <Link href="/guru/panduan" className="flex items-center gap-2 text-blue-600 text-sm font-medium">
        <ArrowLeft className="w-4 h-4" />
        Kembali ke Panduan
      </Link>

      <div>
        <h1 className="text-xl font-bold text-gray-900">Panduan: Jadwal</h1>
        <p className="text-sm text-gray-600 mt-0.5">Melihat jadwal mengajar mingguan Anda</p>
      </div>

      <GuideStep
        number={1}
        title="Pilih hari"
        description="Ketuk salah satu hari di deretan 7 hari. Angka kecil di bawah nama hari menunjukkan jumlah sesi hari itu."
      >
        <PhoneMockup>
          <div className="bg-white rounded-lg border border-gray-200 p-1.5 ring-2 ring-blue-500">
            <div className="grid grid-cols-7 gap-0.5">
              {days.map((d, i) => (
                <div
                  key={d}
                  className={`flex flex-col items-center py-1.5 rounded-md ${
                    i === 0 ? 'bg-blue-600 text-white' : 'text-gray-700'
                  }`}
                >
                  <span className="text-[9px] font-medium">{d}</span>
                  {i < 3 && (
                    <span
                      className={`mt-0.5 text-[7px] font-bold px-1 rounded-full ${
                        i === 0 ? 'bg-white text-blue-600' : 'bg-blue-600 text-white'
                      }`}
                    >
                      {i + 1}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </PhoneMockup>
      </GuideStep>

      <GuideStep
        number={2}
        title="Detail sesi"
        description="Setiap sesi menampilkan jam & durasi, jumlah siswa/kapasitas, cabang, dan daftar nama siswa terdaftar."
      >
        <PhoneMockup>
          <div className="bg-white border border-blue-300 rounded-lg p-2.5 ring-2 ring-blue-500">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-semibold text-gray-900">Matematika</p>
                <p className="text-[9px] text-gray-500">Reguler</p>
              </div>
              <span className="text-[8px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">
                Hari ini
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 mt-2 text-[9px] text-gray-700">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-gray-400" />
                08:00 (60m)
              </div>
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3 text-gray-400" />
                3/5 siswa
              </div>
              <div className="col-span-2 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-gray-400" />
                Cabang Purwakarta
              </div>
            </div>
          </div>
        </PhoneMockup>
      </GuideStep>

      <GuideStep
        number={3}
        title="Input presensi langsung dari jadwal"
        description="Untuk sesi hari ini, ada tombol 'Input Presensi' di bagian bawah card — tidak perlu berpindah ke menu Presensi dulu."
      >
        <PhoneMockup>
          <div className="bg-white border border-blue-300 rounded-lg p-2.5">
            <p className="text-xs font-semibold text-gray-900 mb-2">Matematika</p>
            <div className="ring-2 ring-blue-500 rounded-lg">
              <div className="block w-full bg-blue-600 text-white text-[11px] font-medium py-2 rounded-lg text-center">
                Input Presensi
              </div>
            </div>
          </div>
        </PhoneMockup>
      </GuideStep>
    </div>
  )
}
