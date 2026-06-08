'use client'

import React, { useState, useRef } from 'react'
import { X, Plus, Check, Loader2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { subjectApi, sppRateApi } from '@/lib/api/endpoints'

interface SelectedSubject {
  id: string
  name: string
  type: 'REGULAR' | 'PRIVATE'
  sppRateId: string
  sppAmount: number
}

interface EnrollmentStep2Props {
  subjects: SelectedSubject[]
  onComplete: (subjects: SelectedSubject[]) => void
}

export default function EnrollmentStep2({ subjects, onComplete }: EnrollmentStep2Props) {
  const [selectedSubjects, setSelectedSubjects] = useState<SelectedSubject[]>(subjects)
  const [showSubjectPicker, setShowSubjectPicker] = useState(false)
  const [loadingSubjectId, setLoadingSubjectId] = useState<string | null>(null)
  // Cache rates per subjectId to avoid duplicate requests
  const ratesCache = useRef<Record<string, any[]>>({})

  const { data: subjectsData } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => subjectApi.getAll(),
  })

  const availableSubjects = subjectsData?.data?.data || []

  const fetchRatesForSubject = async (subjectId: string): Promise<any[]> => {
    if (ratesCache.current[subjectId]) return ratesCache.current[subjectId]
    const res = await sppRateApi.getBySubject(subjectId)
    const rates = res.data?.data || []
    ratesCache.current[subjectId] = rates
    return rates
  }

  const findActiveRate = (rates: any[], type: 'REGULAR' | 'PRIVATE') => {
    const now = new Date()
    return rates.find(
      (rate: any) =>
        rate.type === type &&
        new Date(rate.effectiveFrom) <= now &&
        (!rate.effectiveUntil || new Date(rate.effectiveUntil) >= now)
    )
  }

  const handleAddSubject = async (subject: any) => {
    setLoadingSubjectId(subject.id)
    try {
      const rates = await fetchRatesForSubject(subject.id)
      const regularRate = findActiveRate(rates, 'REGULAR')
      if (!regularRate) {
        alert('Tidak ada tarif SPP aktif untuk mata pelajaran ini')
        return
      }
      setSelectedSubjects(prev => [
        ...prev,
        {
          id: subject.id,
          name: subject.name,
          type: 'REGULAR',
          sppRateId: regularRate.id,
          sppAmount: parseFloat(regularRate.amount),
        },
      ])
      setShowSubjectPicker(false)
    } finally {
      setLoadingSubjectId(null)
    }
  }

  const handleRemoveSubject = (subjectId: string) => {
    setSelectedSubjects(selectedSubjects.filter(s => s.id !== subjectId))
  }

  const handleChangeType = async (subjectId: string, newType: 'REGULAR' | 'PRIVATE') => {
    const rates = await fetchRatesForSubject(subjectId)
    const newRate = findActiveRate(rates, newType)
    if (!newRate) {
      alert('Tidak ada tarif SPP aktif untuk tipe ini')
      return
    }
    setSelectedSubjects(prev =>
      prev.map(s =>
        s.id === subjectId
          ? { ...s, type: newType, sppRateId: newRate.id, sppAmount: parseFloat(newRate.amount) }
          : s
      )
    )
  }

  const handleSubmit = () => {
    if (selectedSubjects.length === 0) {
      alert('Pilih minimal 1 mata pelajaran')
      return
    }
    onComplete(selectedSubjects)
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Mata Pelajaran & Tipe</h3>

      <div className="space-y-3 mb-4">
        {selectedSubjects.map(subject => (
          <div key={subject.id} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                <span className="font-medium text-gray-900">{subject.name}</span>
              </div>
              <button
                onClick={() => handleRemoveSubject(subject.id)}
                className="text-red-500 hover:text-red-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Type Toggle */}
            <div className="ml-7 space-y-3">
              <div className="flex gap-2">
                {['REGULAR', 'PRIVATE'].map(type => (
                  <button
                    key={type}
                    onClick={() => handleChangeType(subject.id, type as 'REGULAR' | 'PRIVATE')}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition ${
                      subject.type === type
                        ? 'bg-blue-100 text-blue-700 border border-blue-300'
                        : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200'
                    }`}
                  >
                    {type === 'REGULAR' ? 'Reguler' : 'Private'}
                  </button>
                ))}
              </div>

              <p className="text-sm text-gray-600">
                Rp {subject.sppAmount.toLocaleString('id-ID')}/bulan · tarif berlaku hari ini
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Add Subject Button */}
      <button
        onClick={() => setShowSubjectPicker(true)}
        className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:text-gray-700 hover:border-gray-400 transition flex items-center justify-center gap-2"
      >
        <Plus className="w-4 h-4" />
        Tambah mata pelajaran lain
      </button>

      {/* Subject Picker Modal */}
      {showSubjectPicker && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md max-h-96 overflow-y-auto">
            <h4 className="font-semibold text-gray-900 mb-4">Pilih Mata Pelajaran</h4>
            <div className="space-y-2">
              {availableSubjects
                .filter(s => !selectedSubjects.some(ss => ss.id === s.id))
                .map((subject: any) => (
                  <button
                    key={subject.id}
                    onClick={() => handleAddSubject(subject)}
                    disabled={loadingSubjectId === subject.id}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 rounded-lg transition flex items-center justify-between disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <span>{subject.name}</span>
                    {loadingSubjectId === subject.id && (
                      <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                    )}
                  </button>
                ))}
            </div>
            <button
              onClick={() => setShowSubjectPicker(false)}
              className="w-full mt-4 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium mt-4"
      >
        Lanjut ke Pilih Jadwal →
      </button>
    </div>
  )
}
