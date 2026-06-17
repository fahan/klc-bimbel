import {
  BusySlot,
  CandidateSlot,
  DemandItem,
  EngineDayOfWeek,
  EngineInput,
  EngineOutput,
  EngineSessionType,
  ProposalItem,
  TeacherInfo,
  TeacherLoadItem,
  TimeRange,
  UnassignedItem,
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

interface TeacherBusyState {
  teacherId: string
  name: string
  load: number
  intervals: { dayOfWeek: EngineDayOfWeek; start: number; end: number }[]
}

function isTeacherFree(
  state: TeacherBusyState,
  day: EngineDayOfWeek,
  start: number,
  end: number,
): boolean {
  return !state.intervals.some(
    (iv) => iv.dayOfWeek === day && overlaps(start, end, iv.start, iv.end),
  )
}

export function buildRecommendation(input: EngineInput): EngineOutput {
  const { durationMinutes, activeDays, timeWindow, breakWindow, demand, teachers, busySlots } = input

  const slots = buildCandidateSlots({ activeDays, timeWindow, breakWindow, durationMinutes })
  const groups = groupDemand(demand)

  const states: TeacherBusyState[] = teachers.map((t) => ({
    teacherId: t.teacherId,
    name: t.name,
    load: 0,
    intervals: [],
  }))
  for (const b of busySlots) {
    const st = states.find((s) => s.teacherId === b.teacherId)
    if (st) {
      st.intervals.push({ dayOfWeek: b.dayOfWeek, start: b.startMinutes, end: b.endMinutes })
    }
  }

  const proposals: ProposalItem[] = []
  const unassigned: UnassignedItem[] = []
  let counter = 0

  for (const group of groups) {
    const batches = chunk(group.students, group.capacity)
    for (const batch of batches) {
      const candidates = [...states].sort(
        (a, b) => a.load - b.load || a.teacherId.localeCompare(b.teacherId),
      )
      let assigned = false
      for (const teacher of candidates) {
        const slot = slots.find((s) =>
          isTeacherFree(teacher, s.dayOfWeek, s.startMinutes, s.startMinutes + durationMinutes),
        )
        if (!slot) continue
        teacher.intervals.push({
          dayOfWeek: slot.dayOfWeek,
          start: slot.startMinutes,
          end: slot.startMinutes + durationMinutes,
        })
        teacher.load += 1
        counter += 1
        proposals.push({
          tempId: `p${counter}`,
          subjectId: group.subjectId,
          subjectName: group.subjectName,
          type: group.type,
          teacherId: teacher.teacherId,
          teacherName: teacher.name,
          dayOfWeek: slot.dayOfWeek,
          startTime: minutesToTime(slot.startMinutes),
          durationMinutes,
          studentIds: batch.map((s) => s.studentId),
          studentNames: batch.map((s) => s.studentName),
        })
        assigned = true
        break
      }
      if (!assigned) {
        unassigned.push({
          subjectId: group.subjectId,
          subjectName: group.subjectName,
          type: group.type,
          studentIds: batch.map((s) => s.studentId),
          studentNames: batch.map((s) => s.studentName),
          reason: teachers.length === 0
            ? 'Tidak ada guru di cabang'
            : 'Tidak ada guru yang tersedia di slot jam aktif',
        })
      }
    }
  }

  const teacherLoad: TeacherLoadItem[] = states.map((s) => ({
    teacherId: s.teacherId,
    name: s.name,
    sessionCount: s.load,
  }))

  return { proposals, unassigned, teacherLoad }
}
