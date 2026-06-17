import {
  ApplyPlan,
  ApplyPlanInput,
  ApplyProposal,
  BusySlot,
  CandidateSlot,
  DemandItem,
  EngineDayOfWeek,
  EngineInput,
  EngineOutput,
  EngineSessionType,
  ProposalItem,
  StudentBusySlot,
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
  const sessionsPerWeek = Math.max(1, input.sessionsPerWeek ?? 1)
  const studentBusyInput = input.studentBusySlots ?? []

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

  // Per-student busy intervals across all subjects, seeded from existing commitments.
  const studentBusy = new Map<string, { dayOfWeek: EngineDayOfWeek; start: number; end: number }[]>()
  const addStudentBusy = (studentId: string, dayOfWeek: EngineDayOfWeek, start: number, end: number) => {
    const list = studentBusy.get(studentId) ?? []
    list.push({ dayOfWeek, start, end })
    studentBusy.set(studentId, list)
  }
  for (const sb of studentBusyInput) {
    addStudentBusy(sb.studentId, sb.dayOfWeek, sb.startMinutes, sb.endMinutes)
  }
  const areStudentsFree = (ids: string[], day: EngineDayOfWeek, start: number, end: number): boolean =>
    ids.every((id) => {
      const list = studentBusy.get(id)
      return !list || !list.some((iv) => iv.dayOfWeek === day && overlaps(start, end, iv.start, iv.end))
    })

  const proposals: ProposalItem[] = []
  const unassigned: UnassignedItem[] = []
  let counter = 0

  for (const group of groups) {
    const batches = chunk(group.students, group.capacity)
    for (const batch of batches) {
      const studentIds = batch.map((s) => s.studentId)
      const studentNames = batch.map((s) => s.studentName)
      const placedDays = new Set<EngineDayOfWeek>()

      for (let i = 0; i < sessionsPerWeek; i++) {
        const candidates = [...states].sort(
          (a, b) => a.load - b.load || a.teacherId.localeCompare(b.teacherId),
        )
        let assigned = false
        for (const teacher of candidates) {
          const slot = slots.find((s) => {
            const start = s.startMinutes
            const end = start + durationMinutes
            return (
              !placedDays.has(s.dayOfWeek) &&
              isTeacherFree(teacher, s.dayOfWeek, start, end) &&
              areStudentsFree(studentIds, s.dayOfWeek, start, end)
            )
          })
          if (!slot) continue
          const start = slot.startMinutes
          const end = start + durationMinutes
          teacher.intervals.push({ dayOfWeek: slot.dayOfWeek, start, end })
          teacher.load += 1
          for (const id of studentIds) addStudentBusy(id, slot.dayOfWeek, start, end)
          placedDays.add(slot.dayOfWeek)
          counter += 1
          proposals.push({
            tempId: `p${counter}`,
            subjectId: group.subjectId,
            subjectName: group.subjectName,
            type: group.type,
            teacherId: teacher.teacherId,
            teacherName: teacher.name,
            dayOfWeek: slot.dayOfWeek,
            startTime: minutesToTime(start),
            durationMinutes,
            studentIds,
            studentNames,
          })
          assigned = true
          break
        }
        if (!assigned) {
          unassigned.push({
            subjectId: group.subjectId,
            subjectName: group.subjectName,
            type: group.type,
            studentIds,
            studentNames,
            reason:
              teachers.length === 0
                ? 'Tidak ada guru di cabang'
                : i > 0
                  ? 'Tidak ada slot/guru tersedia untuk sesi tambahan'
                  : 'Tidak ada guru yang tersedia di slot jam aktif',
          })
          break
        }
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

export function planApply(input: ApplyPlanInput): ApplyPlan {
  const { proposals, activeTeacherIds, activeStudentIds, subjectCapacity, busySlots } = input
  const studentBusyInput = input.studentBusySlots ?? []
  const teacherSet = new Set(activeTeacherIds)
  const studentSet = new Set(activeStudentIds)

  const running: BusySlot[] = busySlots.map((b) => ({ ...b }))
  const studentRunning = new Map<string, { dayOfWeek: EngineDayOfWeek; start: number; end: number }[]>()
  for (const sb of studentBusyInput) {
    const list = studentRunning.get(sb.studentId) ?? []
    list.push({ dayOfWeek: sb.dayOfWeek, start: sb.startMinutes, end: sb.endMinutes })
    studentRunning.set(sb.studentId, list)
  }

  const toCreate: ApplyProposal[] = []
  const skipped: { tempId: string; reason: string }[] = []

  for (const p of proposals) {
    if (!teacherSet.has(p.teacherId)) {
      skipped.push({ tempId: p.tempId, reason: 'Guru sudah tidak aktif' })
      continue
    }
    const missingStudent = p.studentIds.some((id) => !studentSet.has(id))
    if (missingStudent || p.studentIds.length === 0) {
      skipped.push({ tempId: p.tempId, reason: 'Ada siswa yang sudah tidak aktif' })
      continue
    }
    const caps = subjectCapacity[p.subjectId]
    const max = caps ? (p.type === 'REGULAR' ? caps.maxCapacityRegular : caps.maxCapacityPrivate) : 0
    if (max <= 0 || p.studentIds.length > max) {
      skipped.push({ tempId: p.tempId, reason: `Melebihi kapasitas mata pelajaran (${max})` })
      continue
    }
    const start = timeToMinutes(p.startTime)
    const end = start + p.durationMinutes
    const teacherConflict = running.some(
      (b) =>
        b.teacherId === p.teacherId &&
        b.dayOfWeek === p.dayOfWeek &&
        overlaps(start, end, b.startMinutes, b.endMinutes),
    )
    if (teacherConflict) {
      skipped.push({ tempId: p.tempId, reason: 'Guru bentrok dengan sesi lain' })
      continue
    }
    const studentConflict = p.studentIds.some((id) => {
      const list = studentRunning.get(id)
      return !!list && list.some((iv) => iv.dayOfWeek === p.dayOfWeek && overlaps(start, end, iv.start, iv.end))
    })
    if (studentConflict) {
      skipped.push({ tempId: p.tempId, reason: 'Bentrok jadwal siswa' })
      continue
    }
    running.push({
      teacherId: p.teacherId,
      dayOfWeek: p.dayOfWeek,
      startMinutes: start,
      endMinutes: end,
    })
    for (const id of p.studentIds) {
      const list = studentRunning.get(id) ?? []
      list.push({ dayOfWeek: p.dayOfWeek, start, end })
      studentRunning.set(id, list)
    }
    toCreate.push(p)
  }

  return { toCreate, skipped }
}
