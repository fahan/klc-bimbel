import {
  CandidateSlot,
  DemandItem,
  EngineDayOfWeek,
  EngineSessionType,
  TimeRange,
} from './recommendation.types'

const DAY_ORDER: EngineDayOfWeek[] = [
  'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU', 'MINGGU',
]
const SLOT_STEP_MINUTES = 30

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export function minutesToTime(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && aEnd > bStart
}

export function buildCandidateSlots(params: {
  activeDays: EngineDayOfWeek[]
  timeWindow: TimeRange
  breakWindow?: TimeRange | null
  durationMinutes: number
}): CandidateSlot[] {
  const { activeDays, timeWindow, breakWindow, durationMinutes } = params
  const windowStart = timeToMinutes(timeWindow.start)
  const windowEnd = timeToMinutes(timeWindow.end)
  const breakStart = breakWindow ? timeToMinutes(breakWindow.start) : null
  const breakEnd = breakWindow ? timeToMinutes(breakWindow.end) : null

  const orderedDays = DAY_ORDER.filter((d) => activeDays.includes(d))
  const slots: CandidateSlot[] = []

  for (const day of orderedDays) {
    for (let start = windowStart; start + durationMinutes <= windowEnd; start += SLOT_STEP_MINUTES) {
      const end = start + durationMinutes
      if (breakStart !== null && breakEnd !== null && overlaps(start, end, breakStart, breakEnd)) {
        continue
      }
      slots.push({ dayOfWeek: day, startMinutes: start })
    }
  }
  return slots
}

export interface DemandGroup {
  subjectId: string
  subjectName: string
  type: EngineSessionType
  capacity: number
  students: { studentId: string; studentName: string; classLevel: string | null }[]
}

export function groupDemand(demand: DemandItem[]): DemandGroup[] {
  const byKey = new Map<string, DemandGroup>()
  for (const d of demand) {
    const key = `${d.subjectId}__${d.type}`
    const capacity = d.type === 'REGULAR' ? d.maxCapacityRegular : d.maxCapacityPrivate
    if (!byKey.has(key)) {
      byKey.set(key, {
        subjectId: d.subjectId,
        subjectName: d.subjectName,
        type: d.type,
        capacity: Math.max(1, capacity),
        students: [],
      })
    }
    byKey.get(key)!.students.push({
      studentId: d.studentId,
      studentName: d.studentName,
      classLevel: d.classLevel,
    })
  }

  const groups = Array.from(byKey.values())
  groups.sort((a, b) =>
    a.subjectName.localeCompare(b.subjectName) || a.type.localeCompare(b.type),
  )
  for (const g of groups) {
    g.students.sort((a, b) =>
      (a.classLevel ?? '').localeCompare(b.classLevel ?? '') ||
      a.studentName.localeCompare(b.studentName) ||
      a.studentId.localeCompare(b.studentId),
    )
  }
  return groups
}

export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size))
  }
  return out
}
