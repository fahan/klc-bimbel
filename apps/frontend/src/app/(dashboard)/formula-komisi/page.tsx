'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { commissionFormulaApi } from '@/lib/api/endpoints'
import { Settings2, Save, RotateCcw, Info } from 'lucide-react'

type FormulaType = 'MONTHLY_RATE' | 'PER_SESSION'
type SessionType = 'REGULAR' | 'PRIVATE'

interface FormulaConfig {
  formulaType: FormulaType
  commissionPercentage: number
  isCustom: boolean
  id: string | null
}

interface SubjectFormula {
  subjectId: string
  subjectName: string
  subjectCode: string
  defaultCommissionPercentage: number
  formulas: {
    REGULAR: FormulaConfig
    PRIVATE: FormulaConfig
  }
}

const FORMULA_LABELS: Record<FormulaType, string> = {
  MONTHLY_RATE: 'SPP ÷ 12 × % × Sesi',
  PER_SESSION: 'SPP ÷ Total Sesi × % × Sesi',
}

const FORMULA_DESC: Record<FormulaType, string> = {
  MONTHLY_RATE: 'Rate SPP dibagi 12 bulan, dikali persentase komisi, dikali jumlah sesi terlaksana',
  PER_SESSION: 'Rate SPP dibagi total sesi bulan ini, dikali persentase komisi, dikali sesi terlaksana',
}

function FormulaCell({
  subjectId,
  sessionType,
  config,
  defaultPct,
  onSaved,
}: {
  subjectId: string
  sessionType: SessionType
  config: FormulaConfig
  defaultPct: number
  onSaved: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [formulaType, setFormulaType] = useState<FormulaType>(config.formulaType)
  const [pct, setPct] = useState((config.commissionPercentage * 100).toFixed(0))

  const qc = useQueryClient()

  const saveMutation = useMutation({
    mutationFn: () =>
      commissionFormulaApi.upsert(subjectId, {
        sessionType,
        formulaType,
        commissionPercentage: parseFloat(pct) / 100,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['commission-formulas'] })
      setEditing(false)
      onSaved()
    },
  })

  const resetMutation = useMutation({
    mutationFn: () => commissionFormulaApi.remove(subjectId, sessionType),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['commission-formulas'] })
      setEditing(false)
      onSaved()
    },
  })

  if (!editing) {
    return (
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-gray-800">{FORMULA_LABELS[config.formulaType]}</p>
          <p className="text-xs text-gray-500">
            {(config.commissionPercentage * 100).toFixed(0)}% komisi
            {config.isCustom && (
              <span className="ml-1 text-blue-600 font-medium">· custom</span>
            )}
          </p>
        </div>
        <button
          onClick={() => {
            setFormulaType(config.formulaType)
            setPct((config.commissionPercentage * 100).toFixed(0))
            setEditing(true)
          }}
          className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
        >
          <Settings2 className="w-4 h-4" />
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <select
        value={formulaType}
        onChange={e => setFormulaType(e.target.value as FormulaType)}
        className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="MONTHLY_RATE">SPP ÷ 12 × % × Sesi (Default)</option>
        <option value="PER_SESSION">SPP ÷ Total Sesi × % × Sesi</option>
      </select>
      <div className="flex items-center gap-1">
        <input
          type="number"
          min={0}
          max={100}
          value={pct}
          onChange={e => setPct(e.target.value)}
          className="w-16 text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <span className="text-sm text-gray-500">% komisi</span>
      </div>
      <div className="flex gap-1.5">
        <button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="flex items-center gap-1 text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          <Save className="w-3 h-3" />
          Simpan
        </button>
        {config.isCustom && (
          <button
            onClick={() => resetMutation.mutate()}
            disabled={resetMutation.isPending}
            className="flex items-center gap-1 text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded hover:bg-gray-200 disabled:opacity-50"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>
        )}
        <button
          onClick={() => setEditing(false)}
          className="text-xs text-gray-500 px-2 py-1 rounded hover:bg-gray-100"
        >
          Batal
        </button>
      </div>
    </div>
  )
}

export default function FormulaKomisiPage() {
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['commission-formulas'],
    queryFn: () => commissionFormulaApi.getAll(),
  })

  const subjects: SubjectFormula[] = data?.data?.data ?? []

  return (
    <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Formula Komisi Guru</h1>
        <p className="text-gray-500 mt-1 text-sm hidden sm:block">
          Atur formula perhitungan komisi per mata pelajaran dan jenis sesi
        </p>
      </div>

      {/* Info box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800 space-y-1.5">
          <p className="font-semibold">Jenis Formula</p>
          <div className="space-y-1">
            {Object.entries(FORMULA_DESC).map(([key, desc]) => (
              <div key={key} className="flex gap-2">
                <span className="font-medium text-blue-900 min-w-fit">{FORMULA_LABELS[key as FormulaType]}:</span>
                <span>{desc}</span>
              </div>
            ))}
          </div>
          <p className="text-blue-700 pt-1">
            Formula default untuk semua subject: <strong>SPP ÷ 12 × % × Sesi</strong>.
            Kustom formula per subject/tipe akan menimpa default.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Memuat data...</div>
      ) : subjects.length === 0 ? (
        <div className="text-center py-12 text-gray-400">Belum ada mata pelajaran aktif</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700 w-1/3">
                  Mata Pelajaran
                </th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700 w-1/3">
                  Reguler
                </th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700 w-1/3">
                  Privat
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {subjects.map(subject => (
                <tr key={subject.subjectId} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{subject.subjectName}</p>
                    <p className="text-xs text-gray-400">{subject.subjectCode}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Default: {(subject.defaultCommissionPercentage * 100).toFixed(0)}%
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <FormulaCell
                      subjectId={subject.subjectId}
                      sessionType="REGULAR"
                      config={subject.formulas.REGULAR}
                      defaultPct={subject.defaultCommissionPercentage}
                      onSaved={() => qc.invalidateQueries({ queryKey: ['commission-formulas'] })}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <FormulaCell
                      subjectId={subject.subjectId}
                      sessionType="PRIVATE"
                      config={subject.formulas.PRIVATE}
                      defaultPct={subject.defaultCommissionPercentage}
                      onSaved={() => qc.invalidateQueries({ queryKey: ['commission-formulas'] })}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  )
}
