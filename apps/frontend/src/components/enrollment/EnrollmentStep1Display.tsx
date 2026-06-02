import React from 'react'
import { Edit2 } from 'lucide-react'

interface StudentData {
  name?: string
  sureName?: string | null
  classLevel?: string | null
  birthDate?: string | null
  birthPlace?: string | null
  parentName?: string | null
  parentPhone?: string | null
  address?: string | null
  branchId?: string
}

interface EnrollmentStep1DisplayProps {
  data: Partial<StudentData>
  onEdit: () => void
}

export default function EnrollmentStep1Display({ data, onEdit }: EnrollmentStep1DisplayProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Data Siswa</h3>
        <button
          onClick={onEdit}
          className="flex items-center gap-2 text-sm text-green-600 hover:text-green-700"
        >
          <Edit2 className="w-4 h-4" />
          Edit
        </button>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500 uppercase">Nama Lengkap</p>
            <p className="text-sm font-medium text-gray-900">{data.name || '-'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase">Nama Panggilan</p>
            <p className="text-sm font-medium text-gray-900">{data.sureName || '-'}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500 uppercase">Tempat Lahir</p>
            <p className="text-sm font-medium text-gray-900">{data.birthPlace || '-'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase">Tanggal Lahir</p>
            <p className="text-sm font-medium text-gray-900">
              {data.birthDate
                ? new Date(data.birthDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
                : '-'}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500 uppercase">Kelas</p>
            <p className="text-sm font-medium text-gray-900">{data.classLevel || '-'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase">No. HP Orang Tua</p>
            <p className="text-sm font-medium text-gray-900">{data.parentPhone || '-'}</p>
          </div>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase">Nama Orang Tua</p>
          <p className="text-sm font-medium text-gray-900">{data.parentName || '-'}</p>
        </div>
        {data.address && (
          <div>
            <p className="text-xs text-gray-500 uppercase">Alamat</p>
            <p className="text-sm font-medium text-gray-900">{data.address}</p>
          </div>
        )}
      </div>
    </div>
  )
}
