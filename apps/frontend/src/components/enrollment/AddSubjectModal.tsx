'use client'

import React, { useState, useEffect } from 'react'
import { X, AlertCircle, Check } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { studentApi, subjectApi, sppRateApi } from '@/lib/api/endpoints'

interface AddSubjectModalProps {
  studentId: string
  enrolledSubjectIds: string[]
  onClose: () => void
  onSuccess: () => void
}

export default function AddSubjectModal({ studentId, enrolledSubjectIds, onClose, onSuccess }: AddSubjectModalProps) {
  const [selectedSubject, setSelectedSubject] = useState<string>('')
  const [selectedType, setSelectedType] = useState<'REGULAR' | 'PRIVATE'>('REGULAR')
  const [enrolledAt, setEnrolledAt] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showConfirmation, setShowConfirmation] = useState(false)

  const { data: subjectsData } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => subjectApi.getAll(),
  })

  const { data: sppRateData } = useQuery({
    queryKey: ['spp-rate', selectedSubject, selectedType],
    queryFn: () => {
      if (!selectedSubject) return null
      return sppRateApi.getActiveRate(selectedSubject, selectedType)
    },
    enabled: !!selectedSubject,
  })

  const availableSubjects = subjectsData?.data?.data || []
  const filteredSubjects = availableSubjects.filter((s: any) => !enrolledSubjectIds.includes(s.id))
  const currentSubject = availableSubjects.find((s: any) => s.id === selectedSubject)
  const sppAmount = sppRateData?.data?.data?.amount ? parseFloat(sppRateData.data.data.amount) : 0
  const registrationFee = 200000
  const totalFirstBill = registrationFee + sppAmount

  const handleSubmit = async () => {
    if (!selectedSubject) {
      setError('Pilih mata pelajaran terlebih dahulu')
      return
    }

    if (!sppAmount) {
      setError('Tidak ada tarif SPP aktif untuk kombinasi mata pelajaran dan tipe ini')
      return
    }

    setLoading(true)
    setError(null)

    try {
      await studentApi.addSubject(studentId, {
        subjectId: selectedSubject,
        type: selectedType,
        ...(enrolledAt ? { enrolledAt } : {}),
      })

      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal menambahkan mata pelajaran')
    } finally {
      setLoading(false)
      setShowConfirmation(false)
    }
  }

  return (
    <>
      {/* Modal Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Tambah Mata Pelajaran</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Subject Picker */}
          <div className="space-y-3 mb-4">
            <label className="block text-sm font-medium text-gray-700">Mata Pelajaran</label>
            <select
              value={selectedSubject}
              onChange={e => {
                setSelectedSubject(e.target.value)
                setSelectedType('REGULAR')
                setError(null)
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Pilih mata pelajaran --</option>
              {filteredSubjects.map((subject: any) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </div>

          {/* Type Selector */}
          {selectedSubject && (
            <div className="space-y-3 mb-4">
              <label className="block text-sm font-medium text-gray-700">Tipe Sesi</label>
              <div className="flex gap-2">
                {(['REGULAR', 'PRIVATE'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => {
                      setSelectedType(type)
                      setError(null)
                    }}
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
          )}

          {/* Tanggal Masuk Aktual */}
          <div className="space-y-1 mb-4">
            <label className="block text-sm font-medium text-gray-700">
              Tanggal Masuk Aktual
              <span className="ml-1 text-xs font-normal text-gray-400">(opsional)</span>
            </label>
            <input
              type="date"
              value={enrolledAt}
              onChange={e => setEnrolledAt(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400">Isi jika siswa ini sebenarnya sudah terdaftar sebelumnya (data historis).</p>
          </div>

          {/* SPP Rate Display */}
          {selectedSubject && sppAmount > 0 && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600">Tarif SPP per bulan</p>
              <p className="text-lg font-semibold text-blue-700">Rp {sppAmount.toLocaleString('id-ID')}</p>
              <p className="text-xs text-gray-500 mt-1">Tarif berlaku hari ini dan akan dikunci</p>
            </div>
          )}

          {/* Cost Summary */}
          {selectedSubject && sppAmount > 0 && (
            <div className="mb-4 p-4 bg-gray-50 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Biaya pendaftaran</span>
                <span className="font-medium text-gray-900">Rp {registrationFee.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">SPP bulan pertama</span>
                <span className="font-medium text-gray-900">Rp {sppAmount.toLocaleString('id-ID')}</span>
              </div>
              <div className="border-t border-gray-200 pt-2 flex justify-between">
                <span className="font-medium text-gray-900">Total tagihan pertama</span>
                <span className="font-semibold text-lg text-blue-700">Rp {totalFirstBill.toLocaleString('id-ID')}</span>
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
            >
              Batal
            </button>
            <button
              onClick={() => setShowConfirmation(true)}
              disabled={!selectedSubject || !sppAmount || loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Menyimpan...' : 'Lanjutkan'}
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmation && selectedSubject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowConfirmation(false)}>
          <div
            className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full mx-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mx-auto mb-4">
              <Check className="w-6 h-6 text-blue-600" />
            </div>
            <h4 className="text-lg font-semibold text-gray-900 text-center mb-2">Konfirmasi Penambahan</h4>
            <p className="text-sm text-gray-600 text-center mb-4">
              Tambahkan <strong>{currentSubject?.name}</strong> ({selectedType === 'REGULAR' ? 'Reguler' : 'Private'}) ke siswa ini? Total tagihan pertama adalah{' '}
              <strong>Rp {totalFirstBill.toLocaleString('id-ID')}</strong> (biaya pendaftaran + SPP bulan pertama).
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmation(false)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
              >
                Batal
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Menyimpan...' : 'Konfirmasi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
