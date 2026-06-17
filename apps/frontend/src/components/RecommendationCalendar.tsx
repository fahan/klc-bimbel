'use client'

const DAY_ORDER = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU', 'MINGGU']

export interface CalendarProposal {
  tempId: string
  subjectName: string
  type: 'REGULAR' | 'PRIVATE'
  teacherName: string
  dayOfWeek: string
  startTime: string
  durationMinutes: number
  studentNames: string[]
}

interface RecommendationCalendarProps {
  proposals: CalendarProposal[]
  selected: Record<string, boolean>
  onToggle: (tempId: string) => void
}

function buildCalendarGrid(proposals: CalendarProposal[]) {
  const daySet = new Set(proposals.map((p) => p.dayOfWeek))
  const days = DAY_ORDER.filter((d) => daySet.has(d))
  const times = Array.from(new Set(proposals.map((p) => p.startTime))).sort()
  const cells: Record<string, Record<string, CalendarProposal[]>> = {}
  for (const d of days) {
    cells[d] = {}
    for (const t of times) cells[d][t] = []
  }
  for (const p of proposals) {
    if (cells[p.dayOfWeek] && cells[p.dayOfWeek][p.startTime]) {
      cells[p.dayOfWeek][p.startTime].push(p)
    }
  }
  return { days, times, cells }
}

export default function RecommendationCalendar({ proposals, selected, onToggle }: RecommendationCalendarProps) {
  if (proposals.length === 0) {
    return <div className="bg-white rounded-lg border p-3 text-sm text-gray-500">Tidak ada usulan.</div>
  }

  const { days, times, cells } = buildCalendarGrid(proposals)

  return (
    <div className="bg-white rounded-lg border overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="p-2 text-left text-gray-500 font-medium border-b w-16">Jam</th>
            {days.map((d) => (
              <th key={d} className="p-2 text-left text-gray-700 font-medium border-b">{d}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {times.map((t) => (
            <tr key={t} className="align-top">
              <td className="p-2 text-gray-500 border-b whitespace-nowrap">{t}</td>
              {days.map((d) => (
                <td key={d} className="p-2 border-b">
                  <div className="flex flex-col gap-1">
                    {cells[d][t].map((p) => {
                      const isSel = !!selected[p.tempId]
                      return (
                        <button
                          key={p.tempId}
                          type="button"
                          onClick={() => onToggle(p.tempId)}
                          aria-pressed={isSel}
                          className={`text-left rounded px-2 py-1 border text-xs transition ${
                            isSel
                              ? 'bg-orange-500 text-white border-orange-500'
                              : 'bg-white text-gray-500 border-gray-200 opacity-70 hover:opacity-100'
                          }`}
                        >
                          <div className="font-medium">{p.subjectName} ({p.type})</div>
                          <div>{p.teacherName} · {p.studentNames.length} siswa</div>
                          <div>{p.startTime} · {p.durationMinutes} mnt</div>
                        </button>
                      )
                    })}
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
