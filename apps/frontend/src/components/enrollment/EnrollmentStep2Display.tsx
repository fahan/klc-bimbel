import React from 'react'
import { Edit2, Check } from 'lucide-react'

interface SelectedSubject {
  id: string
  name: string
  type: 'REGULAR' | 'PRIVATE'
  sppRateId: string
  sppAmount: number
}

interface EnrollmentStep2DisplayProps {
  subjects: SelectedSubject[]
  onEdit: () => void
}

export default function EnrollmentStep2Display({ subjects, onEdit }: EnrollmentStep2DisplayProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Mata Pelajaran & Tipe</h3>
        <button
          onClick={onEdit}
          className="flex items-center gap-2 text-sm text-green-600 hover:text-green-700"
        >
          <Edit2 className="w-4 h-4" />
          Edit
        </button>
      </div>

      <div className="space-y-3">
        {subjects.map(subject => (
          <div key={subject.id} className="border border-gray-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Check className="w-4 h-4 text-green-600" />
              <span className="font-medium text-gray-900">{subject.name}</span>
            </div>
            <div className="ml-6 space-y-1 text-sm text-gray-600">
              <p>Tipe: {subject.type === 'REGULAR' ? 'Reguler' : 'Private'}</p>
              <p>SPP: Rp {subject.sppAmount.toLocaleString('id-ID')}/bulan · tarif berlaku hari ini</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
