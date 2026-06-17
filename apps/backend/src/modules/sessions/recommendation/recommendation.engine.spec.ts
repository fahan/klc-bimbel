import { buildCandidateSlots, buildRecommendation } from './recommendation.engine'
import { DemandItem, TeacherInfo } from './recommendation.types'

describe('buildCandidateSlots', () => {
  it('builds 30-minute grid slots that fit before window end', () => {
    const slots = buildCandidateSlots({
      activeDays: ['SENIN'],
      timeWindow: { start: '14:00', end: '16:00' },
      durationMinutes: 60,
    })
    expect(slots.map((s) => s.startMinutes)).toEqual([840, 870, 900])
    expect(slots.every((s) => s.dayOfWeek === 'SENIN')).toBe(true)
  })

  it('expands across multiple active days', () => {
    const slots = buildCandidateSlots({
      activeDays: ['SENIN', 'SELASA'],
      timeWindow: { start: '14:00', end: '15:00' },
      durationMinutes: 60,
    })
    expect(slots).toEqual([
      { dayOfWeek: 'SENIN', startMinutes: 840 },
      { dayOfWeek: 'SELASA', startMinutes: 840 },
    ])
  })

  it('excludes slots that collide with the break window', () => {
    const slots = buildCandidateSlots({
      activeDays: ['SENIN'],
      timeWindow: { start: '14:00', end: '19:00' },
      breakWindow: { start: '17:00', end: '18:00' },
      durationMinutes: 60,
    })
    const starts = slots.map((s) => s.startMinutes)
    expect(starts).toContain(960) // 16:00
    expect(starts).not.toContain(990) // 16:30
    expect(starts).not.toContain(1020) // 17:00
    expect(starts).toContain(1080) // 18:00
  })
})

function demand(over: Partial<DemandItem> = {}): DemandItem {
  return {
    studentId: 's1',
    studentName: 'Andi',
    classLevel: '5',
    subjectId: 'subjA',
    subjectName: 'AHE',
    type: 'REGULAR',
    maxCapacityRegular: 3,
    maxCapacityPrivate: 1,
    ...over,
  }
}

const teacherA: TeacherInfo = { teacherId: 't1', name: 'Budi' }
const teacherB: TeacherInfo = { teacherId: 't2', name: 'Citra' }

describe('buildRecommendation', () => {
  const baseWindow = { start: '14:00', end: '18:00' }
  const activeDays = ['SENIN', 'SELASA'] as const

  it('groups REGULAR students into one session up to capacity', () => {
    const out = buildRecommendation({
      durationMinutes: 60,
      activeDays: [...activeDays],
      timeWindow: baseWindow,
      demand: [
        demand({ studentId: 's1', studentName: 'Andi' }),
        demand({ studentId: 's2', studentName: 'Sari' }),
        demand({ studentId: 's3', studentName: 'Tono' }),
      ],
      teachers: [teacherA, teacherB],
      busySlots: [],
    })
    expect(out.proposals).toHaveLength(1)
    expect(out.proposals[0].studentIds.sort()).toEqual(['s1', 's2', 's3'])
    expect(out.unassigned).toHaveLength(0)
  })

  it('splits into a second session when capacity exceeded', () => {
    const out = buildRecommendation({
      durationMinutes: 60,
      activeDays: [...activeDays],
      timeWindow: baseWindow,
      demand: [
        demand({ studentId: 's1' }),
        demand({ studentId: 's2' }),
        demand({ studentId: 's3' }),
        demand({ studentId: 's4' }),
      ],
      teachers: [teacherA, teacherB],
      busySlots: [],
    })
    expect(out.proposals).toHaveLength(2)
    const allStudents = out.proposals.flatMap((p) => p.studentIds).sort()
    expect(allStudents).toEqual(['s1', 's2', 's3', 's4'])
  })

  it('PRIVATE enrollments produce one session per student', () => {
    const out = buildRecommendation({
      durationMinutes: 60,
      activeDays: [...activeDays],
      timeWindow: baseWindow,
      demand: [
        demand({ studentId: 's1', type: 'PRIVATE' }),
        demand({ studentId: 's2', type: 'PRIVATE' }),
      ],
      teachers: [teacherA, teacherB],
      busySlots: [],
    })
    expect(out.proposals).toHaveLength(2)
    expect(out.proposals.every((p) => p.studentIds.length === 1)).toBe(true)
  })

  it('distributes sessions evenly across teachers (least-loaded first)', () => {
    const out = buildRecommendation({
      durationMinutes: 60,
      activeDays: [...activeDays],
      timeWindow: baseWindow,
      demand: [
        demand({ studentId: 's1', subjectId: 'subjA', subjectName: 'AHE' }),
        demand({ studentId: 's2', subjectId: 'subjB', subjectName: 'BING' }),
        demand({ studentId: 's3', subjectId: 'subjC', subjectName: 'CALC' }),
        demand({ studentId: 's4', subjectId: 'subjD', subjectName: 'DRAW' }),
      ],
      teachers: [teacherA, teacherB],
      busySlots: [],
    })
    const counts = out.teacherLoad.map((t) => t.sessionCount).sort()
    expect(counts).toEqual([2, 2])
  })

  it('does not assign a teacher who is busy at every candidate slot', () => {
    const out = buildRecommendation({
      durationMinutes: 60,
      activeDays: ['SENIN'],
      timeWindow: { start: '14:00', end: '15:00' },
      demand: [
        demand({ studentId: 's1', subjectId: 'subjA', subjectName: 'AHE' }),
        demand({ studentId: 's2', subjectId: 'subjB', subjectName: 'BING' }),
      ],
      teachers: [teacherA],
      busySlots: [],
    })
    expect(out.proposals).toHaveLength(1)
    expect(out.unassigned).toHaveLength(1)
    expect(out.unassigned[0].reason).toMatch(/tidak ada guru/i)
  })

  it('respects pre-existing busy slots from running sessions', () => {
    const out = buildRecommendation({
      durationMinutes: 60,
      activeDays: ['SENIN'],
      timeWindow: { start: '14:00', end: '15:00' },
      demand: [demand({ studentId: 's1', subjectId: 'subjA', subjectName: 'AHE' })],
      teachers: [teacherA],
      busySlots: [
        { teacherId: 't1', dayOfWeek: 'SENIN', startMinutes: 840, endMinutes: 900 },
      ],
    })
    expect(out.proposals).toHaveLength(0)
    expect(out.unassigned).toHaveLength(1)
  })
})
