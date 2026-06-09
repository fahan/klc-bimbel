'use client'

import React, { useState } from 'react'
import { X, AlertCircle, Info } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { studentApi, sppRateApi } from '@/lib/api/endpoints'

interface EditSubjectModalProps {
  studentId: string
  subjectId: string
  branchId: string
  subjectName: string
  currentType: 'REGULAR' | 'PRIVATE'
  currentBillingType?: 'FLAT_MONTHLY' | 'PER_SESSION'
  currentSessionId?: string
  onClose: () => void
  onSuccess: () => void
}

export default function EditSubjectModal({
  studentId,
  subjectId,
  branchId,
  subjectName,
  currentType,
  currentBillingType = 'FLAT_MONTHLY',
  currentSessionId,
  onClose,
  onSuccess,
}: EditSubjectModalProps) {
  const [selectedType, setSelectedType] = useState<'REGULAR' | 'PRIVATE'>(currentType)
  const [selectedBillingType, setSelectedBillingType] = useState<'FLAT_MONTHLY' | 'PER_SESSION'>(currentBillingType)
  const [selectedSessionId, setSelectedSessionId] = useState<string>(currentSessionId || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: sessionsData } = useQuery({
    queryKey: ['available-sessions', subjectId, branchId, selectedType],
    queryFn: () => studentApi.getAvailableSessions(subjectId, branchId, selectedType),
  })

  // Query the SPP rate for (selectedType, selectedBillingType) — used to preview & lock when either changes
  const { data: sppRateData } = useQuery({
    queryKey: ['spp-rate-edit', subjectId, selectedType, selectedBillingType],
    queryFn: () => sppRateApi.getActiveRate(subjectId, selectedType, selectedBillingType),
  })

  const sessions = sessionsData?.data?.data || []

  const typeChanged = selectedType !== currentType
  const billingTypeChanged = selectedBillingType !== currentBillingType
  const sessionChanged = !!selectedSessionId && selectedSessionId !== currentSessionId
  const isModified = typeChanged || billingTypeChanged || sessionChanged

  const previewRate = sppRateData?.data?.data
  const showRatePreview = (typeChanged || billingTypeChanged) && previewRate

  const handleSubmit = async () => {
    const noChanges = !typeChanged && !billingTypeChanged && !sessionChanged
    if (noChanges) {
      setError('Tidak ada perubahan untuk disimpan')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Step 1: update session type and/or session assignment
      const updateData: any = {}
      if (typeChanged) updateData.type = selectedType
      if (sessionChanged) updateData.sessionId = selectedSessionId

      if (Object.keys(updateData).length > 0) {
        await studentApi.updateSubject(studentId, subjectId, updateData)
      }

      // Step 2: update billing type → lock the correct SPP rate
      if (billingTypeChanged) {
        if (!previewRate) {
          setError(
            `Tidak ada tarif SPP aktif untuk ${selectedBillingType === 'PER_SESSION' ? 'Per Pertemuan' : 'Flat Bulanan'}. ` +
            `Tambahkan tarif terlebih dahulu di Master Data → Tarif SPP.`
          )
          setLoading(false)
          return
        }
        await studentApi.updateSubjectSppRate(studentId, subjectId, { sppRateId: previewRate.id })
      }

      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal memperbarui mata pelajaran')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Ubah Mata Pelajaran</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Subject Info */}
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600">Mata Pelajaran</p>
          <p className="text-sm font-semibold text-gray-900">{subjectName}</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Tipe Sesi */}
        <div className="space-y-2 mb-4">
          <label className="block text-sm font-medium text-gray-700">Tipe Sesi</label>
          <div className="flex gap-2">
            {(['REGULAR', 'PRIVATE'] as const).map(type => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`flex-1 px-3 py-2 rounded-lg font-medium transition text-sm ${
                  selectedType === type
                    ? 'bg-blue-100 text-blue-700 border border-blue-300'
                    : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200'
                }`}
              >
                {type === 'REGULAR' ? 'Reguler' : 'Private'}
                {type === currentType && selectedType !== type ? '' : ''}
              </button>
            ))}
          </div>
        </div>

        {/* Tipe Billing */}
        <div className="space-y-2 mb-4">
          <label className="block text-sm font-medium text-gray-700">Tipe Billing SPP</label>
          <div className="flex gap-2">
            {([
              { value: 'FLAT_MONTHLY', label: 'Flat Bulanan', desc: 'Bayar jumlah tetap per bulan' },
              { value: 'PER_SESSION', label: 'Per Pertemuan', desc: 'Bayar per sesi hadir' },
            ] as const).map(bt => (
              <button
                key={bt.value}
                onClick={() => setSelectedBillingType(bt.value)}
                className={`flex-1 px-3 py-2 rounded-lg font-medium transition text-sm text-left ${
                  selectedBillingType === bt.value
                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                    : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200'
                }`}
              >
                <div className="font-medium">{bt.label}</div>
                <div className="text-[10px] font-normal opacity-70 mt-0.5">{bt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* SPP Rate Preview */}
        {showRatePreview && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-xs text-yellow-800 font-medium mb-1 flex items-center gap-1">
              <Info className="w-3.5 h-3.5" />
              Tarif SPP yang akan dikunci:
            </p>
            <p className="text-sm text-yellow-900 font-semibold">
              Rp {parseFloat(previewRate.amount).toLocaleString('id-ID')}
              {selectedBillingType === 'PER_SESSION' ? '/sesi' : '/bulan'}
            </p>
            <p className="text-xs text-yellow-700 mt-1">Tarif baru akan berlaku mulai hari ini</p>
          </div>
        )}

        {/* Tidak ada rate warning */}
        {(typeChanged || billingTypeChanged) && !previewRate && (
          <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <p className="text-xs text-orange-800 font-medium flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              Tidak ada tarif aktif untuk kombinasi ini
            </p>
            <p className="text-xs text-orange-700 mt-1">
              Tambahkan tarif SPP terlebih dahulu di Master Data → Tarif SPP
            </p>
          </div>
        )}

        {/* Jadwal Sesi */}
        <div className="space-y-2 mb-4">
          <label className="block text-sm font-medium text-gray-700">Jadwal Sesi <span className="text-gray-400 font-normal">(Opsional)</span></label>
          <select
            value={selectedSessionId}
            onChange={e => setSelectedSessionId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="">-- Belum dipilih --</option>
            {sessions.map((session: any) => (
              <option key={session.id} value={session.id}>
                {session.day} {session.time} ({session.teacher}) - {session.capacity.current}/{session.capacity.max} siswa
              </option>
            ))}
          </select>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isModified || loading || ((typeChanged || billingTypeChanged) && !previewRate)}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </div>
    </div>
  )
}
