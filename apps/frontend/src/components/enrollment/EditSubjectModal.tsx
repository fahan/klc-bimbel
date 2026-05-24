'use client'

import React, { useState, useMemo } from 'react'
import { X, AlertCircle } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { studentApi, sessionApi, sppRateApi } from '@/lib/api/endpoints'

interface EditSubjectModalProps {
  studentId: string
  subjectId: string
  branchId: string
  subjectName: string
  currentType: 'REGULAR' | 'PRIVATE'
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
  currentSessionId,
  onClose,
  onSuccess,
}: EditSubjectModalProps) {
  const [selectedType, setSelectedType] = useState<'REGULAR' | 'PRIVATE'>(currentType)
  const [selectedSessionId, setSelectedSessionId] = useState<string>(currentSessionId || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: sessionsData } = useQuery({
    queryKey: ['available-sessions', subjectId, branchId, selectedType],
    queryFn: () => studentApi.getAvailableSessions(subjectId, branchId, selectedType),
  })

  const { data: sppRateData } = useQuery({
    queryKey: ['spp-rate-edit', subjectId, selectedType],
    queryFn: () => sppRateApi.getActiveRate(subjectId, selectedType),
  })

  const sessions = sessionsData?.data?.data || []
  const typeChanged = selectedType !== currentType
  const newSppAmount = typeChanged && sppRateData?.data?.data ? parseFloat(sppRateData.data.data.amount) : null

  const handleSubmit = async () => {
    setLoading(true)
    setError(null)

    try {
      const updateData: any = {}

      if (typeChanged) {
        updateData.type = selectedType
      }

      if (selectedSessionId && selectedSessionId !== currentSessionId) {
        updateData.sessionId = selectedSessionId
      }

      if (Object.keys(updateData).length === 0) {
        setError('Tidak ada perubahan untuk disimpan')
        setLoading(false)
        return
      }

      await studentApi.updateSubject(studentId, subjectId, updateData)
      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal memperbarui mata pelajaran')
    } finally {
      setLoading(false)
    }
  }

  const isModified = selectedType !== currentType || (selectedSessionId && selectedSessionId !== currentSessionId)

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

        {/* Type Selector */}
        <div className="space-y-3 mb-4">
          <label className="block text-sm font-medium text-gray-700">Tipe Sesi</label>
          <div className="flex gap-2">
            {(['REGULAR', 'PRIVATE'] as const).map(type => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`flex-1 px-3 py-2 rounded-lg font-medium transition ${
                  selectedType === type
                    ? 'bg-blue-100 text-blue-700 border border-blue-300'
                    : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200'
                }`}
              >
                {type === 'REGULAR' ? 'Reguler' : 'Private'}
              </button>
            ))}
          </div>
        </div>

        {/* SPP Rate Change Info */}
        {typeChanged && newSppAmount !== null && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-xs text-yellow-800 font-medium mb-1">Tarif SPP akan berubah:</p>
            <p className="text-sm text-yellow-900 font-semibold">Rp {newSppAmount.toLocaleString('id-ID')}/bulan</p>
            <p className="text-xs text-yellow-700 mt-1">Tarif baru akan dikunci mulai hari ini</p>
          </div>
        )}

        {/* Session Picker */}
        <div className="space-y-3 mb-4">
          <label className="block text-sm font-medium text-gray-700">Jadwal Sesi (Opsional)</label>
          <p className="text-xs text-gray-500 mb-2">Pilih jadwal atau kosongkan untuk atur nanti</p>
          <select
            value={selectedSessionId}
            onChange={e => setSelectedSessionId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            disabled={!isModified || loading}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </div>
    </div>
  )
}
