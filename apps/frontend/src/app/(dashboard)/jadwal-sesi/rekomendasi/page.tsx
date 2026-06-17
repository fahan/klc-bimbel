'use client'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { scheduleRecommendationApi } from '@/lib/api/endpoints'
import { useBranch, useApiBranchId } from '@/lib/branch-context'

const DAYS = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU', 'MINGGU']

type Proposal = {
  tempId: string
  subjectId: string
  subjectName: string
  type: 'REGULAR' | 'PRIVATE'
  teacherId: string
  teacherName: string
  dayOfWeek: string
  startTime: string
  durationMinutes: number
  studentIds: string[]
  studentNames: string[]
}

export default function RekomendasiJadwalPage() {
  const branchId = useApiBranchId()
  const { selectedBranchId, branches, canViewAllBranches, setSelectedBranchId } = useBranch()

  const [mode, setMode] = useState<'FILL_UNSCHEDULED' | 'FULL_REGENERATE'>('FILL_UNSCHEDULED')
  const [duration, setDuration] = useState(60)
  const [start, setStart] = useState('14:00')
  const [end, setEnd] = useState('20:00')
  const [useBreak, setUseBreak] = useState(false)
  const [breakStart, setBreakStart] = useState('17:30')
  const [breakEnd, setBreakEnd] = useState('18:30')
  const [activeDays, setActiveDays] = useState<string[]>(['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT'])

  const [result, setResult] = useState<any>(null)
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [error, setError] = useState<string | null>(null)
  const [applyResult, setApplyResult] = useState<any>(null)

  const generate = useMutation({
    mutationFn: () =>
      scheduleRecommendationApi.generate({
        branchId: branchId as string,
        mode,
        durationMinutes: duration,
        activeDays,
        timeWindow: { start, end },
        breakWindow: useBreak ? { start: breakStart, end: breakEnd } : null,
      }),
    onSuccess: (res) => {
      const data = res.data.data
      setResult(data)
      setApplyResult(null)
      const sel: Record<string, boolean> = {}
      data.proposals.forEach((p: Proposal) => (sel[p.tempId] = true))
      setSelected(sel)
      setError(null)
    },
    onError: (e: any) => setError(e.response?.data?.message ?? 'Gagal generate'),
  })

  const apply = useMutation({
    mutationFn: () => {
      const chosen = (result.proposals as Proposal[]).filter((p) => selected[p.tempId])
      return scheduleRecommendationApi.apply({ branchId: branchId as string, mode, proposals: chosen })
    },
    onSuccess: (res) => setApplyResult(res.data.data),
    onError: (e: any) => setError(e.response?.data?.message ?? 'Gagal terapkan'),
  })

  if (!selectedBranchId && canViewAllBranches) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold mb-4">Rekomendasi Jadwal</h1>
        <p className="mb-3 text-gray-600">Pilih cabang dulu untuk membuat rekomendasi.</p>
        <div className="flex flex-wrap gap-2">
          {branches.map((b) => (
            <button
              key={b.id}
              onClick={() => setSelectedBranchId(b.id)}
              className="px-3 py-1.5 rounded border hover:bg-gray-50"
            >
              {b.name}
            </button>
          ))}
        </div>
      </div>
    )
  }

  const toggleDay = (d: string) =>
    setActiveDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]))

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-semibold">Rekomendasi Jadwal</h1>

      {/* Form */}
      <div className="grid gap-4 md:grid-cols-2 bg-white rounded-lg border p-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Mode</span>
          <select value={mode} onChange={(e) => setMode(e.target.value as any)} className="border rounded px-2 py-1.5">
            <option value="FILL_UNSCHEDULED">Isi enrollment belum terjadwal</option>
            <option value="FULL_REGENERATE">Generate ulang seluruh jadwal</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Durasi sesi (menit)</span>
          <input type="number" min={30} max={240} step={30} value={duration}
            onChange={(e) => setDuration(Number(e.target.value))} className="border rounded px-2 py-1.5" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Jam mulai</span>
          <input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="border rounded px-2 py-1.5" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Jam selesai</span>
          <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="border rounded px-2 py-1.5" />
        </label>
        <div className="flex flex-col gap-1">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={useBreak} onChange={(e) => setUseBreak(e.target.checked)} />
            Jam istirahat
          </label>
          {useBreak && (
            <div className="flex gap-2">
              <input type="time" value={breakStart} onChange={(e) => setBreakStart(e.target.value)} className="border rounded px-2 py-1.5" />
              <input type="time" value={breakEnd} onChange={(e) => setBreakEnd(e.target.value)} className="border rounded px-2 py-1.5" />
            </div>
          )}
        </div>
        <div className="md:col-span-2">
          <span className="text-sm font-medium">Hari aktif</span>
          <div className="flex flex-wrap gap-2 mt-1">
            {DAYS.map((d) => (
              <button key={d} type="button" onClick={() => toggleDay(d)}
                className={`px-3 py-1.5 rounded border text-sm ${activeDays.includes(d) ? 'bg-orange-500 text-white border-orange-500' : 'bg-white'}`}>
                {d}
              </button>
            ))}
          </div>
        </div>
        <div className="md:col-span-2">
          <button onClick={() => generate.mutate()} disabled={generate.isPending || activeDays.length === 0}
            className="px-4 py-2 rounded bg-orange-600 text-white disabled:opacity-50">
            {generate.isPending ? 'Memproses...' : 'Generate Rekomendasi'}
          </button>
        </div>
      </div>

      {error && <div className="text-red-600 text-sm">{error}</div>}

      {/* Result */}
      {result && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-4 text-sm">
            <span>Sesi diusulkan: <b>{result.summary.proposedSessions}</b></span>
            <span>Siswa ditempatkan: <b>{result.summary.studentsPlaced}</b></span>
            <span>Guru terpakai: <b>{result.summary.teachersUsed}</b></span>
            <span>Tak tertampung: <b>{result.summary.unassigned}</b></span>
          </div>

          {/* Teacher load */}
          <div className="bg-white rounded-lg border p-4">
            <h2 className="font-medium mb-2">Beban Guru</h2>
            <div className="flex flex-wrap gap-3 text-sm">
              {result.teacherLoad.map((t: any) => (
                <span key={t.teacherId} className="px-2 py-1 rounded bg-gray-100">{t.name}: {t.sessionCount} sesi</span>
              ))}
            </div>
          </div>

          {/* Proposals */}
          <div className="bg-white rounded-lg border divide-y">
            {result.proposals.map((p: Proposal) => (
              <label key={p.tempId} className="flex items-center gap-3 p-3 cursor-pointer">
                <input type="checkbox" checked={!!selected[p.tempId]}
                  onChange={(e) => setSelected((s) => ({ ...s, [p.tempId]: e.target.checked }))} />
                <div className="text-sm">
                  <div className="font-medium">{p.subjectName} ({p.type}) — {p.teacherName}</div>
                  <div className="text-gray-600">{p.dayOfWeek} {p.startTime} · {p.durationMinutes} mnt · {p.studentNames.join(', ')}</div>
                </div>
              </label>
            ))}
            {result.proposals.length === 0 && <div className="p-3 text-sm text-gray-500">Tidak ada usulan.</div>}
          </div>

          {/* Unassigned */}
          {result.unassigned.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm">
              <h2 className="font-medium mb-2">Tidak tertampung</h2>
              {result.unassigned.map((u: any, i: number) => (
                <div key={i}>{u.subjectName}: {u.studentNames.join(', ')} — {u.reason}</div>
              ))}
            </div>
          )}

          <button onClick={() => apply.mutate()} disabled={apply.isPending || result.proposals.length === 0}
            className="px-4 py-2 rounded bg-green-600 text-white disabled:opacity-50">
            {apply.isPending ? 'Menerapkan...' : 'Terapkan Terpilih'}
          </button>
        </div>
      )}

      {/* Apply result */}
      {applyResult && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm space-y-1">
          <div>Berhasil dibuat: <b>{applyResult.applied}</b> sesi</div>
          {applyResult.archivedSessions > 0 && <div>Sesi diarsipkan: {applyResult.archivedSessions}</div>}
          {applyResult.preservedSessions?.length > 0 && <div>Sesi dipertahankan (ada riwayat): {applyResult.preservedSessions.length}</div>}
          {applyResult.skipped?.length > 0 && (
            <div>Dilewati: {applyResult.skipped.map((s: any) => `${s.tempId} (${s.reason})`).join('; ')}</div>
          )}
        </div>
      )}
    </div>
  )
}
