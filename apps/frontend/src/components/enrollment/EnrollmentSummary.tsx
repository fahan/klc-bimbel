import React from 'react'
import { AlertCircle } from 'lucide-react'

interface StudentData {
  name?: string
  classLevel?: string | null
  parentName?: string | null
  parentPhone?: string | null
  branchId?: string
}

interface SelectedSubject {
  id: string
  name: string
  type: 'REGULAR' | 'PRIVATE'
  sppRateId: string
  sppAmount: number
}

interface EnrollmentSummaryProps {
  studentData: Partial<StudentData>
  subjects: SelectedSubject[]
  registrationFee: number
  onRegistrationFeeChange: (value: number) => void
  totalSppFirstMonth: number
  totalFirstBill: number
}

export default function EnrollmentSummary({
  studentData,
  subjects,
  registrationFee,
  onRegistrationFeeChange,
  totalSppFirstMonth,
  totalFirstBill,
}: EnrollmentSummaryProps) {
  const today = new Date().toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Ringkasan Pendaftaran</h3>

      <div className="space-y-4">
        {/* Student Name */}
        {studentData.name && (
          <div>
            <p className="text-xs text-gray-500 uppercase">Nama Siswa</p>
            <p className="font-medium text-gray-900">{studentData.name}</p>
          </div>
        )}

        {/* Subjects */}
        {subjects.length > 0 && (
          <div>
            <p className="text-xs text-gray-500 uppercase mb-2">Mata Pelajaran</p>
            <div className="space-y-2">
              {subjects.map(subject => (
                <div key={subject.id} className="text-sm text-gray-700">
                  <p className="font-medium">
                    {subject.name} ·{' '}
                    <span className="text-gray-600">
                      {subject.type === 'REGULAR' ? 'Reguler' : 'Private'}
                    </span>
                  </p>
                  <p className="text-xs text-gray-500">
                    Rp {subject.sppAmount.toLocaleString('id-ID')}/bulan
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-gray-200" />

        {/* Costs */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm gap-3">
            <span className="text-gray-700 shrink-0">Biaya Registrasi:</span>
            <div className="flex items-center gap-1">
              <span className="text-gray-500 text-xs">Rp</span>
              <input
                type="number"
                min={0}
                value={registrationFee}
                onChange={(e) => onRegistrationFeeChange(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-28 text-right text-sm font-medium text-gray-900 border border-gray-200 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-700">SPP Bulan Pertama:</span>
            <span className="font-medium text-gray-900">
              Rp {totalSppFirstMonth.toLocaleString('id-ID')}
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200" />

        {/* Total */}
        <div className="flex justify-between">
          <span className="font-semibold text-gray-900">Total Tagihan Pertama:</span>
          <span className="font-bold text-lg text-blue-600">
            Rp {totalFirstBill.toLocaleString('id-ID')}
          </span>
        </div>

        {/* SPP Lock Banner */}
        {subjects.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-3 mt-4">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-amber-900">Tarif SPP di-lock</p>
              <p className="text-xs text-amber-800 mt-1">
                Tarif SPP di-lock sesuai harga hari ini ({today}). Jika tarif naik di masa mendatang,
                SPP siswa ini tidak berubah.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
