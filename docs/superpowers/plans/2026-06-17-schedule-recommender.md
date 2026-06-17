# Schedule Recommendation Engine — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a stateless "generate → preview → apply" schedule recommendation engine that auto-maps enrolled students to teachers, respects active-hours / break / holiday inputs, balances teacher load, and supports full-regenerate and fill-unscheduled modes — without touching running schedules until applied.

**Architecture:** Core logic lives in two **pure functions** (`buildRecommendation`, `planApply`) with no NestJS/Prisma dependencies, so they are fully unit-testable (TDD). The NestJS service only fetches data, calls the pure functions, and (for apply) writes results in a transaction. Two new endpoints under the existing `sessions` module: `generate` (read-only) and `apply` (transactional). Frontend adds one page under `jadwal-sesi/rekomendasi`.

**Tech Stack:** NestJS 10, Prisma 5.22, Jest 29 + ts-jest (config to be added), Next.js 14 App Router, React Query v5, axios.

**Reference spec:** `docs/superpowers/specs/2026-06-17-schedule-recommender-design.md`

**Enum note (match Prisma exactly):** `SessionType = REGULAR | PRIVATE` (NOT "REGULER"). `DayOfWeek = SENIN|SELASA|RABU|KAMIS|JUMAT|SABTU|MINGGU`. `SessionStatus = ACTIVE|OVERCAPACITY|CANCELLED|ARCHIVED`. `EnrollmentStatus = ACTIVE|COMPLETED|DROPPED_OUT`.

---

## File Structure

**Backend (`apps/backend/`):**
- Create: `jest.config.js` — Jest/ts-jest config (none exists yet; required to run unit tests).
- Create: `src/modules/sessions/recommendation/recommendation.types.ts` — shared pure types.
- Create: `src/modules/sessions/recommendation/recommendation.engine.ts` — pure `buildCandidateSlots`, `buildRecommendation`, `planApply` + helpers.
- Create: `src/modules/sessions/recommendation/recommendation.engine.spec.ts` — unit tests for the pure functions.
- Create: `src/modules/sessions/dto/generate-recommendation.dto.ts` — input DTO for `generate`.
- Create: `src/modules/sessions/dto/apply-recommendation.dto.ts` — input DTO for `apply`.
- Modify: `src/modules/sessions/sessions.service.ts` — add `generateRecommendation()` and `applyRecommendation()`.
- Modify: `src/modules/sessions/sessions.controller.ts` — add `POST /sessions/recommendations/generate` and `POST /sessions/recommendations/apply`.

**Frontend (`apps/frontend/`):**
- Modify: `src/lib/api/endpoints.ts` — add `scheduleRecommendationApi`.
- Create: `src/app/(dashboard)/jadwal-sesi/rekomendasi/page.tsx` — generate form + proposal preview + apply.
- Modify: `src/components/layout/Sidebar.tsx` — add nav link.
- Modify: `src/components/layout/Topbar.tsx` — add page title.

**Testing strategy note:** All branching logic (slot generation, grouping, load-balancing, unassigned reasons, apply validation/skip) is in pure functions covered by Jest unit tests (Tasks 1–4). The two Prisma-bound service methods (Tasks 6–7) are thin orchestration; they are verified with `pnpm type-check` plus a manual Swagger check (no fabricated DB tests).

---

## Task 1: Jest config + smoke test

**Files:**
- Create: `apps/backend/jest.config.js`
- Create: `apps/backend/src/modules/sessions/recommendation/smoke.spec.ts` (temporary, deleted in this task)

- [ ] **Step 1: Create the Jest config**

Create `apps/backend/jest.config.js`:

```js
/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['**/*.spec.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@modules/(.*)$': '<rootDir>/src/modules/$1',
    '^@common/(.*)$': '<rootDir>/src/common/$1',
    '^@prisma/(.*)$': '<rootDir>/src/prisma/$1',
  },
}
```

- [ ] **Step 2: Add a temporary smoke test**

Create `apps/backend/src/modules/sessions/recommendation/smoke.spec.ts`:

```ts
describe('jest setup', () => {
  it('runs typescript tests', () => {
    expect(1 + 1).toBe(2)
  })
})
```

- [ ] **Step 3: Run the smoke test**

Run: `cd apps/backend && pnpm test -- smoke`
Expected: PASS, 1 test passed.

- [ ] **Step 4: Delete the smoke test**

```bash
rm apps/backend/src/modules/sessions/recommendation/smoke.spec.ts
```

- [ ] **Step 5: Commit**

```bash
git add apps/backend/jest.config.js
git commit -m "chore(backend): add jest config for unit tests"
```

---

## Task 2: Pure types + candidate slot generation

**Files:**
- Create: `apps/backend/src/modules/sessions/recommendation/recommendation.types.ts`
- Create: `apps/backend/src/modules/sessions/recommendation/recommendation.engine.ts`
- Test: `apps/backend/src/modules/sessions/recommendation/recommendation.engine.spec.ts`

- [ ] **Step 1: Create the shared types**

Create `apps/backend/src/modules/sessions/recommendation/recommendation.types.ts`:

```ts
export type EngineDayOfWeek =
  | 'SENIN' | 'SELASA' | 'RABU' | 'KAMIS' | 'JUMAT' | 'SABTU' | 'MINGGU'

export type EngineSessionType = 'REGULAR' | 'PRIVATE'

export interface TimeRange {
  start: string // HH:mm
  end: string   // HH:mm
}

export interface CandidateSlot {
  dayOfWeek: EngineDayOfWeek
  startMinutes: number
}

export interface DemandItem {
  studentId: string
  studentName: string
  classLevel: string | null
  subjectId: string
  subjectName: string
  type: EngineSessionType
  maxCapacityRegular: number
  maxCapacityPrivate: number
}

export interface TeacherInfo {
  teacherId: string
  name: string
}

export interface BusySlot {
  teacherId: string
  dayOfWeek: EngineDayOfWeek
  startMinutes: number
  endMinutes: number
}

export interface ProposalItem {
  tempId: string
  subjectId: string
  subjectName: string
  type: EngineSessionType
  teacherId: string
  teacherName: string
  dayOfWeek: EngineDayOfWeek
  startTime: string // HH:mm
  durationMinutes: number
  studentIds: string[]
  studentNames: string[]
}

export interface UnassignedItem {
  subjectId: string
  subjectName: string
  type: EngineSessionType
  studentIds: string[]
  studentNames: string[]
  reason: string
}

export interface TeacherLoadItem {
  teacherId: string
  name: string
  sessionCount: number
}

export interface EngineInput {
  durationMinutes: number
  activeDays: EngineDayOfWeek[]
  timeWindow: TimeRange
  breakWindow?: TimeRange | null
  demand: DemandItem[]
  teachers: TeacherInfo[]
  busySlots: BusySlot[]
}

export interface EngineOutput {
  proposals: ProposalItem[]
  unassigned: UnassignedItem[]
  teacherLoad: TeacherLoadItem[]
}

// ----- Apply planning -----

export interface ApplyProposal {
  tempId: string
  subjectId: string
  type: EngineSessionType
  teacherId: string
  dayOfWeek: EngineDayOfWeek
  startTime: string // HH:mm
  durationMinutes: number
  studentIds: string[]
}

export interface ApplyPlanInput {
  proposals: ApplyProposal[]
  activeTeacherIds: string[]
  activeStudentIds: string[]
  subjectCapacity: Record<string, { maxCapacityRegular: number; maxCapacityPrivate: number }>
  busySlots: BusySlot[]
}

export interface ApplyPlan {
  toCreate: ApplyProposal[]
  skipped: { tempId: string; reason: string }[]
}
```

- [ ] **Step 2: Write the failing test for `buildCandidateSlots`**

Create `apps/backend/src/modules/sessions/recommendation/recommendation.engine.spec.ts`:

```ts
import { buildCandidateSlots } from './recommendation.engine'

describe('buildCandidateSlots', () => {
  it('builds 30-minute grid slots that fit before window end', () => {
    const slots = buildCandidateSlots({
      activeDays: ['SENIN'],
      timeWindow: { start: '14:00', end: '16:00' },
      durationMinutes: 60,
    })
    // starts allowed: 14:00, 14:30, 15:00 (15:00+60=16:00 ok); 15:30+60=16:30 too late
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
    // 16:00 (16-17 ok), 16:30 (16:30-17:30 overlaps break) excluded, 17:00/17:30 excluded, 18:00 (18-19 ok)
    expect(starts).toContain(960) // 16:00
    expect(starts).not.toContain(990) // 16:30
    expect(starts).not.toContain(1020) // 17:00
    expect(starts).toContain(1080) // 18:00
  })
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `cd apps/backend && pnpm test -- recommendation.engine`
Expected: FAIL — "Cannot find module './recommendation.engine'" / `buildCandidateSlots is not a function`.

- [ ] **Step 4: Implement `buildCandidateSlots` and helpers**

Create `apps/backend/src/modules/sessions/recommendation/recommendation.engine.ts`:

```ts
import {
  CandidateSlot,
  EngineDayOfWeek,
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
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd apps/backend && pnpm test -- recommendation.engine`
Expected: PASS — all 3 `buildCandidateSlots` tests green.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/modules/sessions/recommendation/recommendation.types.ts apps/backend/src/modules/sessions/recommendation/recommendation.engine.ts apps/backend/src/modules/sessions/recommendation/recommendation.engine.spec.ts
git commit -m "feat(sessions): add candidate slot generation for recommender"
```

---

## Task 2b: Internal helpers used by the engine

> These helpers are added in the SAME `recommendation.engine.ts` file and are exercised through `buildRecommendation` in Task 3. They are listed here so later tasks can reference them.

- [ ] **Step 1: Add grouping + chunking helpers**

Append to `apps/backend/src/modules/sessions/recommendation/recommendation.engine.ts`:

```ts
import { DemandItem, EngineSessionType } from './recommendation.types'

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
  // Deterministic order: subjectName, then type
  groups.sort((a, b) =>
    a.subjectName.localeCompare(b.subjectName) || a.type.localeCompare(b.type),
  )
  // Soft preference: same classLevel batched together
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
```

- [ ] **Step 2: Type-check compiles**

Run: `cd apps/backend && pnpm type-check`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/backend/src/modules/sessions/recommendation/recommendation.engine.ts
git commit -m "feat(sessions): add demand grouping helpers for recommender"
```

---

## Task 3: `buildRecommendation` — assignment + load balancing

**Files:**
- Modify: `apps/backend/src/modules/sessions/recommendation/recommendation.engine.ts`
- Test: `apps/backend/src/modules/sessions/recommendation/recommendation.engine.spec.ts`

- [ ] **Step 1: Write the failing tests**

Append to `apps/backend/src/modules/sessions/recommendation/recommendation.engine.spec.ts`:

```ts
import { buildRecommendation } from './recommendation.engine'
import { DemandItem, TeacherInfo } from './recommendation.types'

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
    expect(counts).toEqual([2, 2]) // 4 single-subject sessions split evenly
  })

  it('does not assign a teacher who is busy at every candidate slot', () => {
    // Single active day, single slot (14:00-15:00). Two demands, one teacher.
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd apps/backend && pnpm test -- recommendation.engine`
Expected: FAIL — `buildRecommendation is not a function`.

- [ ] **Step 3: Implement `buildRecommendation`**

Append to `apps/backend/src/modules/sessions/recommendation/recommendation.engine.ts`:

```ts
import {
  BusySlot,
  EngineInput,
  EngineOutput,
  ProposalItem,
  TeacherLoadItem,
  UnassignedItem,
} from './recommendation.types'

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
  // Seed pre-existing commitments
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
      // Pick least-loaded teacher (tie-break teacherId) who has any free slot.
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd apps/backend && pnpm test -- recommendation.engine`
Expected: PASS — all `buildRecommendation` + `buildCandidateSlots` tests green.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/modules/sessions/recommendation/recommendation.engine.ts apps/backend/src/modules/sessions/recommendation/recommendation.engine.spec.ts
git commit -m "feat(sessions): add load-balanced recommendation builder"
```

---

## Task 4: `planApply` — apply validation (pure)

**Files:**
- Modify: `apps/backend/src/modules/sessions/recommendation/recommendation.engine.ts`
- Test: `apps/backend/src/modules/sessions/recommendation/recommendation.engine.spec.ts`

- [ ] **Step 1: Write the failing tests**

Append to `apps/backend/src/modules/sessions/recommendation/recommendation.engine.spec.ts`:

```ts
import { planApply } from './recommendation.engine'
import { ApplyProposal } from './recommendation.types'

function proposal(over: Partial<ApplyProposal> = {}): ApplyProposal {
  return {
    tempId: 'p1',
    subjectId: 'subjA',
    type: 'REGULAR',
    teacherId: 't1',
    dayOfWeek: 'SENIN',
    startTime: '14:00',
    durationMinutes: 60,
    studentIds: ['s1', 's2'],
    ...over,
  }
}

const capacity = { subjA: { maxCapacityRegular: 3, maxCapacityPrivate: 1 } }

describe('planApply', () => {
  it('accepts a valid proposal', () => {
    const plan = planApply({
      proposals: [proposal()],
      activeTeacherIds: ['t1'],
      activeStudentIds: ['s1', 's2'],
      subjectCapacity: capacity,
      busySlots: [],
    })
    expect(plan.toCreate).toHaveLength(1)
    expect(plan.skipped).toHaveLength(0)
  })

  it('skips a proposal whose teacher is no longer active', () => {
    const plan = planApply({
      proposals: [proposal()],
      activeTeacherIds: [],
      activeStudentIds: ['s1', 's2'],
      subjectCapacity: capacity,
      busySlots: [],
    })
    expect(plan.toCreate).toHaveLength(0)
    expect(plan.skipped[0].reason).toMatch(/guru/i)
  })

  it('skips a proposal with an inactive student', () => {
    const plan = planApply({
      proposals: [proposal({ studentIds: ['s1', 'sX'] })],
      activeTeacherIds: ['t1'],
      activeStudentIds: ['s1'],
      subjectCapacity: capacity,
      busySlots: [],
    })
    expect(plan.skipped[0].reason).toMatch(/siswa/i)
  })

  it('skips a proposal that exceeds subject capacity', () => {
    const plan = planApply({
      proposals: [proposal({ studentIds: ['s1', 's2', 's3', 's4'] })],
      activeTeacherIds: ['t1'],
      activeStudentIds: ['s1', 's2', 's3', 's4'],
      subjectCapacity: capacity,
      busySlots: [],
    })
    expect(plan.skipped[0].reason).toMatch(/kapasitas/i)
  })

  it('skips a proposal that overlaps an existing busy slot', () => {
    const plan = planApply({
      proposals: [proposal()],
      activeTeacherIds: ['t1'],
      activeStudentIds: ['s1', 's2'],
      subjectCapacity: capacity,
      busySlots: [{ teacherId: 't1', dayOfWeek: 'SENIN', startMinutes: 840, endMinutes: 900 }],
    })
    expect(plan.skipped[0].reason).toMatch(/bentrok/i)
  })

  it('skips the second of two proposals that conflict with each other', () => {
    const plan = planApply({
      proposals: [
        proposal({ tempId: 'p1' }),
        proposal({ tempId: 'p2', studentIds: ['s3'] }),
      ],
      activeTeacherIds: ['t1'],
      activeStudentIds: ['s1', 's2', 's3'],
      subjectCapacity: capacity,
      busySlots: [],
    })
    expect(plan.toCreate.map((p) => p.tempId)).toEqual(['p1'])
    expect(plan.skipped.map((p) => p.tempId)).toEqual(['p2'])
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd apps/backend && pnpm test -- recommendation.engine`
Expected: FAIL — `planApply is not a function`.

- [ ] **Step 3: Implement `planApply`**

Append to `apps/backend/src/modules/sessions/recommendation/recommendation.engine.ts`:

```ts
import { ApplyPlan, ApplyPlanInput } from './recommendation.types'

export function planApply(input: ApplyPlanInput): ApplyPlan {
  const { proposals, activeTeacherIds, activeStudentIds, subjectCapacity, busySlots } = input
  const teacherSet = new Set(activeTeacherIds)
  const studentSet = new Set(activeStudentIds)

  // Running busy intervals, seeded with existing commitments, grows as we accept.
  const running: BusySlot[] = busySlots.map((b) => ({ ...b }))

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
    const conflict = running.some(
      (b) =>
        b.teacherId === p.teacherId &&
        b.dayOfWeek === p.dayOfWeek &&
        overlaps(start, end, b.startMinutes, b.endMinutes),
    )
    if (conflict) {
      skipped.push({ tempId: p.tempId, reason: 'Guru bentrok dengan sesi lain' })
      continue
    }
    running.push({
      teacherId: p.teacherId,
      dayOfWeek: p.dayOfWeek,
      startMinutes: start,
      endMinutes: end,
    })
    toCreate.push(p)
  }

  return { toCreate, skipped }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd apps/backend && pnpm test -- recommendation.engine`
Expected: PASS — all engine tests green (slots + recommendation + planApply).

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/modules/sessions/recommendation/recommendation.engine.ts apps/backend/src/modules/sessions/recommendation/recommendation.engine.spec.ts
git commit -m "feat(sessions): add pure apply-planning for recommender"
```

---

## Task 5: Request DTOs

**Files:**
- Create: `apps/backend/src/modules/sessions/dto/generate-recommendation.dto.ts`
- Create: `apps/backend/src/modules/sessions/dto/apply-recommendation.dto.ts`

- [ ] **Step 1: Create the generate DTO**

Create `apps/backend/src/modules/sessions/dto/generate-recommendation.dto.ts`:

```ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
  IsArray, IsEnum, IsInt, IsNotEmpty, IsObject, IsOptional, IsString, Matches, Max, Min,
} from 'class-validator'

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/

export class TimeRangeDto {
  @ApiProperty({ example: '14:00' })
  @Matches(HHMM, { message: 'start harus format HH:mm' })
  start: string

  @ApiProperty({ example: '20:00' })
  @Matches(HHMM, { message: 'end harus format HH:mm' })
  end: string
}

export class GenerateRecommendationDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  branchId: string

  @ApiProperty({ enum: ['FILL_UNSCHEDULED', 'FULL_REGENERATE'] })
  @IsEnum(['FILL_UNSCHEDULED', 'FULL_REGENERATE'] as any)
  mode: 'FILL_UNSCHEDULED' | 'FULL_REGENERATE'

  @ApiProperty({ example: 60, minimum: 30, maximum: 240 })
  @IsInt()
  @Min(30)
  @Max(240)
  durationMinutes: number

  @ApiProperty({ example: ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT'] })
  @IsArray()
  @IsEnum(
    ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU', 'MINGGU'] as any,
    { each: true },
  )
  activeDays: string[]

  @ApiProperty({ type: TimeRangeDto })
  @IsObject()
  timeWindow: TimeRangeDto

  @ApiPropertyOptional({ type: TimeRangeDto, nullable: true })
  @IsOptional()
  @IsObject()
  breakWindow?: TimeRangeDto | null
}
```

- [ ] **Step 2: Create the apply DTO**

Create `apps/backend/src/modules/sessions/dto/apply-recommendation.dto.ts`:

```ts
import { ApiProperty } from '@nestjs/swagger'
import {
  IsArray, IsEnum, IsInt, IsNotEmpty, IsString, Matches, ValidateNested,
} from 'class-validator'
import { Type } from 'class-transformer'

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/

export class ApplyProposalDto {
  @ApiProperty()
  @IsString()
  tempId: string

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  subjectId: string

  @ApiProperty({ enum: ['REGULAR', 'PRIVATE'] })
  @IsEnum(['REGULAR', 'PRIVATE'] as any)
  type: 'REGULAR' | 'PRIVATE'

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  teacherId: string

  @ApiProperty({ enum: ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU', 'MINGGU'] })
  @IsEnum(['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU', 'MINGGU'] as any)
  dayOfWeek: string

  @ApiProperty({ example: '14:00' })
  @Matches(HHMM, { message: 'startTime harus format HH:mm' })
  startTime: string

  @ApiProperty({ example: 60 })
  @IsInt()
  durationMinutes: number

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  studentIds: string[]
}

export class ApplyRecommendationDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  branchId: string

  @ApiProperty({ enum: ['FILL_UNSCHEDULED', 'FULL_REGENERATE'] })
  @IsEnum(['FILL_UNSCHEDULED', 'FULL_REGENERATE'] as any)
  mode: 'FILL_UNSCHEDULED' | 'FULL_REGENERATE'

  @ApiProperty({ type: [ApplyProposalDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApplyProposalDto)
  proposals: ApplyProposalDto[]
}
```

- [ ] **Step 3: Type-check**

Run: `cd apps/backend && pnpm type-check`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/modules/sessions/dto/generate-recommendation.dto.ts apps/backend/src/modules/sessions/dto/apply-recommendation.dto.ts
git commit -m "feat(sessions): add recommendation request DTOs"
```

---

## Task 6: Service — `generateRecommendation`

**Files:**
- Modify: `apps/backend/src/modules/sessions/sessions.service.ts`

- [ ] **Step 1: Add imports at the top of `sessions.service.ts`**

Add to the existing import block (after the existing DTO imports near line 6):

```ts
import { GenerateRecommendationDto } from './dto/generate-recommendation.dto'
import { ApplyRecommendationDto } from './dto/apply-recommendation.dto'
import {
  buildRecommendation,
  planApply,
  timeToMinutes as engineTimeToMinutes,
} from './recommendation/recommendation.engine'
import {
  BusySlot,
  DemandItem,
  EngineDayOfWeek,
  EngineSessionType,
} from './recommendation/recommendation.types'
```

- [ ] **Step 2: Add the `generateRecommendation` method**

Add this method inside the `SessionsService` class (e.g. just before the private `timeToMinutes` at the end):

```ts
async generateRecommendation(dto: GenerateRecommendationDto) {
  const branch = await this.prisma.branch.findFirst({
    where: { id: dto.branchId, isActive: true },
  })
  if (!branch) {
    throw new NotFoundException('Cabang tidak ditemukan')
  }

  // Teachers: all active GURU assigned to this branch
  const teacherUsers = await this.prisma.user.findMany({
    where: {
      role: 'GURU',
      isActive: true,
      branches: { some: { branchId: dto.branchId } },
    },
    select: { id: true, name: true },
  })
  const teachers = teacherUsers.map((t) => ({ teacherId: t.id, name: t.name }))

  // Active enrollments for active students in this branch
  const enrollments = await this.prisma.studentSubject.findMany({
    where: {
      status: 'ACTIVE',
      isActive: true,
      student: { branchId: dto.branchId, isActive: true },
    },
    include: {
      student: { select: { id: true, name: true, classLevel: true } },
      subject: {
        select: { id: true, name: true, maxCapacityRegular: true, maxCapacityPrivate: true },
      },
    },
  })

  // For FILL mode, exclude enrollments already scheduled (active SessionStudent for same subject)
  let scheduledPairs = new Set<string>()
  if (dto.mode === 'FILL_UNSCHEDULED') {
    const scheduled = await this.prisma.sessionStudent.findMany({
      where: {
        isActive: true,
        session: { isActive: true, branchId: dto.branchId },
      },
      select: { studentId: true, session: { select: { subjectId: true } } },
    })
    scheduledPairs = new Set(scheduled.map((s) => `${s.studentId}__${s.session.subjectId}`))
  }

  const demand: DemandItem[] = enrollments
    .filter((e) =>
      dto.mode === 'FULL_REGENERATE'
        ? true
        : !scheduledPairs.has(`${e.studentId}__${e.subjectId}`),
    )
    .map((e) => ({
      studentId: e.student.id,
      studentName: e.student.name,
      classLevel: e.student.classLevel ?? null,
      subjectId: e.subject.id,
      subjectName: e.subject.name,
      type: e.type as EngineSessionType,
      maxCapacityRegular: e.subject.maxCapacityRegular,
      maxCapacityPrivate: e.subject.maxCapacityPrivate,
    }))

  // Busy slots: existing active sessions occupy teachers (only relevant for FILL mode)
  let busySlots: BusySlot[] = []
  if (dto.mode === 'FILL_UNSCHEDULED') {
    const existing = await this.prisma.session.findMany({
      where: { isActive: true, branchId: dto.branchId },
      select: { teacherId: true, dayOfWeek: true, startTime: true, durationMinutes: true },
    })
    busySlots = existing.map((s) => {
      const start = engineTimeToMinutes(s.startTime)
      return {
        teacherId: s.teacherId,
        dayOfWeek: s.dayOfWeek as EngineDayOfWeek,
        startMinutes: start,
        endMinutes: start + s.durationMinutes,
      }
    })
  }

  const result = buildRecommendation({
    durationMinutes: dto.durationMinutes,
    activeDays: dto.activeDays as EngineDayOfWeek[],
    timeWindow: dto.timeWindow,
    breakWindow: dto.breakWindow ?? null,
    demand,
    teachers,
    busySlots,
  })

  return {
    success: true,
    data: {
      mode: dto.mode,
      generatedAt: new Date().toISOString(),
      summary: {
        proposedSessions: result.proposals.length,
        studentsPlaced: result.proposals.reduce((n, p) => n + p.studentIds.length, 0),
        teachersUsed: result.teacherLoad.filter((t) => t.sessionCount > 0).length,
        unassigned: result.unassigned.length,
      },
      teacherLoad: result.teacherLoad,
      proposals: result.proposals,
      unassigned: result.unassigned,
    },
  }
}
```

- [ ] **Step 3: Type-check**

Run: `cd apps/backend && pnpm type-check`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/modules/sessions/sessions.service.ts
git commit -m "feat(sessions): add generateRecommendation service method"
```

---

## Task 7: Service — `applyRecommendation`

**Files:**
- Modify: `apps/backend/src/modules/sessions/sessions.service.ts`

- [ ] **Step 1: Add the `applyRecommendation` method**

Add this method inside the `SessionsService` class (after `generateRecommendation`):

```ts
async applyRecommendation(dto: ApplyRecommendationDto) {
  const branch = await this.prisma.branch.findFirst({
    where: { id: dto.branchId, isActive: true },
  })
  if (!branch) {
    throw new NotFoundException('Cabang tidak ditemukan')
  }

  return this.prisma.$transaction(async (tx) => {
    // Snapshot of valid teachers/students for re-validation
    const teachers = await tx.user.findMany({
      where: {
        role: 'GURU',
        isActive: true,
        branches: { some: { branchId: dto.branchId } },
      },
      select: { id: true },
    })
    const students = await tx.student.findMany({
      where: { branchId: dto.branchId, isActive: true },
      select: { id: true },
    })
    const subjects = await tx.subject.findMany({
      select: { id: true, maxCapacityRegular: true, maxCapacityPrivate: true },
    })
    const subjectCapacity: Record<string, { maxCapacityRegular: number; maxCapacityPrivate: number }> = {}
    for (const s of subjects) {
      subjectCapacity[s.id] = {
        maxCapacityRegular: s.maxCapacityRegular,
        maxCapacityPrivate: s.maxCapacityPrivate,
      }
    }

    // FULL_REGENERATE: archive existing active sessions that have NO session logs.
    let archivedSessions = 0
    const preservedSessions: { id: string; reason: string }[] = []
    let remainingBusy: BusySlot[] = []

    const existing = await tx.session.findMany({
      where: { isActive: true, branchId: dto.branchId },
      select: {
        id: true, teacherId: true, dayOfWeek: true, startTime: true, durationMinutes: true,
        _count: { select: { sessionLogs: true } },
      },
    })

    if (dto.mode === 'FULL_REGENERATE') {
      for (const s of existing) {
        if (s._count.sessionLogs > 0) {
          preservedSessions.push({ id: s.id, reason: 'Punya riwayat presensi' })
          const start = engineTimeToMinutes(s.startTime)
          remainingBusy.push({
            teacherId: s.teacherId,
            dayOfWeek: s.dayOfWeek as EngineDayOfWeek,
            startMinutes: start,
            endMinutes: start + s.durationMinutes,
          })
        } else {
          await tx.session.update({
            where: { id: s.id },
            data: { isActive: false, status: 'ARCHIVED' },
          })
          archivedSessions += 1
        }
      }
    } else {
      // FILL: all existing active sessions remain and occupy teacher slots
      remainingBusy = existing.map((s) => {
        const start = engineTimeToMinutes(s.startTime)
        return {
          teacherId: s.teacherId,
          dayOfWeek: s.dayOfWeek as EngineDayOfWeek,
          startMinutes: start,
          endMinutes: start + s.durationMinutes,
        }
      })
    }

    // Decide which proposals are valid (pure)
    const plan = planApply({
      proposals: dto.proposals.map((p) => ({
        tempId: p.tempId,
        subjectId: p.subjectId,
        type: p.type as EngineSessionType,
        teacherId: p.teacherId,
        dayOfWeek: p.dayOfWeek as EngineDayOfWeek,
        startTime: p.startTime,
        durationMinutes: p.durationMinutes,
        studentIds: p.studentIds,
      })),
      activeTeacherIds: teachers.map((t) => t.id),
      activeStudentIds: students.map((s) => s.id),
      subjectCapacity,
      busySlots: remainingBusy,
    })

    // Write accepted proposals
    let applied = 0
    for (const p of plan.toCreate) {
      const capacity =
        p.type === 'REGULAR'
          ? subjectCapacity[p.subjectId].maxCapacityRegular
          : subjectCapacity[p.subjectId].maxCapacityPrivate
      const session = await tx.session.create({
        data: {
          branchId: dto.branchId,
          subjectId: p.subjectId,
          teacherId: p.teacherId,
          type: p.type as any,
          dayOfWeek: p.dayOfWeek as any,
          startTime: p.startTime,
          durationMinutes: p.durationMinutes,
          maxCapacity: capacity,
          currentEnrolled: p.studentIds.length,
          isActive: true,
        },
      })
      await Promise.all(
        p.studentIds.map((studentId) =>
          tx.sessionStudent.create({
            data: { sessionId: session.id, studentId, joinedAt: new Date(), isActive: true },
          }),
        ),
      )
      applied += 1
    }

    return {
      success: true,
      data: {
        applied,
        skipped: plan.skipped,
        archivedSessions,
        preservedSessions,
      },
    }
  })
}
```

- [ ] **Step 2: Type-check**

Run: `cd apps/backend && pnpm type-check`
Expected: no errors. (If Prisma reports `_count.sessionLogs` invalid, confirm the `SessionLog` relation name on `Session` is `sessionLogs` — it is, per schema line ~425.)

- [ ] **Step 3: Run the full backend unit suite**

Run: `cd apps/backend && pnpm test`
Expected: PASS — all engine tests still green.

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/modules/sessions/sessions.service.ts
git commit -m "feat(sessions): add applyRecommendation transactional service method"
```

---

## Task 8: Controller endpoints

**Files:**
- Modify: `apps/backend/src/modules/sessions/sessions.controller.ts`

- [ ] **Step 1: Add imports**

Add to the import block in `sessions.controller.ts` (after the existing DTO imports near line 18):

```ts
import { GenerateRecommendationDto } from './dto/generate-recommendation.dto'
import { ApplyRecommendationDto } from './dto/apply-recommendation.dto'
```

- [ ] **Step 2: Add the two endpoints**

Add these methods inside the `SessionsController` class, immediately AFTER the `createCombined` method (around line 156) and BEFORE the `@Put(':id')` method (so the literal `recommendations/...` paths are registered before the `:id` param routes):

```ts
@Post('recommendations/generate')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('OWNER', 'ADMIN_GLOBAL', 'ADMIN_CABANG')
@ApiBearerAuth()
@ApiOperation({
  summary: 'Generate schedule recommendation (preview, no writes)',
  description:
    'Auto-maps enrolled students to teachers across active hours/days (with optional break), balancing teacher load. Read-only: returns proposals to preview before applying.',
})
@ApiResponse({ status: 200, description: 'Recommendation generated' })
@ApiResponse({ status: 404, description: 'Branch not found' })
async generateRecommendation(@Body() dto: GenerateRecommendationDto): Promise<any> {
  return this.sessionsService.generateRecommendation(dto)
}

@Post('recommendations/apply')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('OWNER', 'ADMIN_GLOBAL', 'ADMIN_CABANG')
@ApiBearerAuth()
@ApiOperation({
  summary: 'Apply selected schedule recommendations',
  description:
    'Creates sessions for the selected valid proposals in one transaction. Stale/conflicting proposals are skipped and reported. FULL_REGENERATE archives existing sessions without attendance history.',
})
@ApiResponse({ status: 200, description: 'Recommendations applied' })
@ApiResponse({ status: 404, description: 'Branch not found' })
async applyRecommendation(@Body() dto: ApplyRecommendationDto): Promise<any> {
  return this.sessionsService.applyRecommendation(dto)
}
```

- [ ] **Step 3: Restart backend and verify routes in Swagger**

Run: `cd apps/backend && pnpm start:dev`
Then open http://localhost:3000/api and confirm `POST /sessions/recommendations/generate` and `POST /sessions/recommendations/apply` appear under the Sessions tag.
Expected: both endpoints listed; app boots without errors.

- [ ] **Step 4: Manual smoke test via Swagger**

In Swagger, authorize with a dev JWT, call `generate` with a real `branchId`, mode `FILL_UNSCHEDULED`, `durationMinutes: 60`, `activeDays: ["SENIN","SELASA"]`, `timeWindow: {"start":"14:00","end":"18:00"}`.
Expected: 200 with `data.proposals` array (possibly empty) and `data.teacherLoad`.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/modules/sessions/sessions.controller.ts
git commit -m "feat(sessions): expose recommendation generate/apply endpoints"
```

---

## Task 9: Frontend API helper

**Files:**
- Modify: `apps/frontend/src/lib/api/endpoints.ts`

- [ ] **Step 1: Add `scheduleRecommendationApi`**

Add immediately AFTER the `sessionApi` object (after its closing `}` near line 153) in `endpoints.ts`:

```ts
// ===== SCHEDULE RECOMMENDATION API =====
export const scheduleRecommendationApi = {
  generate: (data: {
    branchId: string
    mode: 'FILL_UNSCHEDULED' | 'FULL_REGENERATE'
    durationMinutes: number
    activeDays: string[]
    timeWindow: { start: string; end: string }
    breakWindow?: { start: string; end: string } | null
  }) => apiClient.post('/sessions/recommendations/generate', data),
  apply: (data: {
    branchId: string
    mode: 'FILL_UNSCHEDULED' | 'FULL_REGENERATE'
    proposals: any[]
  }) => apiClient.post('/sessions/recommendations/apply', data),
}
```

- [ ] **Step 2: Type-check the frontend**

Run: `cd apps/frontend && pnpm type-check`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/lib/api/endpoints.ts
git commit -m "feat(frontend): add schedule recommendation api helper"
```

---

## Task 10: Frontend recommendation page

**Files:**
- Create: `apps/frontend/src/app/(dashboard)/jadwal-sesi/rekomendasi/page.tsx`

- [ ] **Step 1: Create the page**

Create `apps/frontend/src/app/(dashboard)/jadwal-sesi/rekomendasi/page.tsx`:

```tsx
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
```

- [ ] **Step 2: Type-check the frontend**

Run: `cd apps/frontend && pnpm type-check`
Expected: no errors. (If `useBranch()` does not export `branches`/`setSelectedBranchId`/`canViewAllBranches`, open `apps/frontend/src/lib/branch-context.tsx` and use the actual exported names — the CLAUDE.md documents these as available.)

- [ ] **Step 3: Verify the page renders**

Run: `cd apps/frontend && pnpm dev` (and backend running), open http://localhost:3001/jadwal-sesi/rekomendasi
Expected: form renders; selecting a branch (if needed), filling the form, and clicking "Generate Rekomendasi" returns proposals.

- [ ] **Step 4: Commit**

```bash
git add "apps/frontend/src/app/(dashboard)/jadwal-sesi/rekomendasi/page.tsx"
git commit -m "feat(frontend): add schedule recommendation page"
```

---

## Task 11: Sidebar link + Topbar title

**Files:**
- Modify: `apps/frontend/src/components/layout/Sidebar.tsx`
- Modify: `apps/frontend/src/components/layout/Topbar.tsx`

- [ ] **Step 1: Add a nav link in Sidebar.tsx**

In `apps/frontend/src/components/layout/Sidebar.tsx`, find the OPERASIONAL section's `items` array (around line 93). Insert a new item directly after the `Jadwal & Sesi` item. The `Clock` icon is already imported in this file, so reuse it (no import change needed):

```tsx
        { label: 'Jadwal & Sesi', path: '/jadwal-sesi', icon: Clock },
        { label: 'Rekomendasi Jadwal', path: '/jadwal-sesi/rekomendasi', icon: Clock },
```

(The first line above already exists — add only the second line beneath it.)

- [ ] **Step 2: Add the page title in Topbar.tsx**

In `apps/frontend/src/components/layout/Topbar.tsx`, inside `getPageTitle()` (around line 54), add the more-specific check BEFORE the existing `/jadwal-sesi` line:

```tsx
    if (pathname === '/jadwal-sesi/rekomendasi' || pathname.startsWith('/jadwal-sesi/rekomendasi')) return 'Rekomendasi Jadwal'
    if (pathname === '/jadwal-sesi' || pathname.startsWith('/jadwal-sesi/')) return 'Jadwal & Sesi'
```

(The second line already exists — add only the first line above it so the specific path matches first.)

- [ ] **Step 3: Type-check + visual check**

Run: `cd apps/frontend && pnpm type-check`
Expected: no errors. Then in the running app, confirm the sidebar shows "Rekomendasi Jadwal" and clicking it shows the title in the topbar.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/components/layout/Sidebar.tsx apps/frontend/src/components/layout/Topbar.tsx
git commit -m "feat(frontend): add nav link and title for recommendation page"
```

---

## Final Verification

- [ ] **Backend unit tests:** `cd apps/backend && pnpm test` → all engine specs PASS.
- [ ] **Backend types:** `cd apps/backend && pnpm type-check` → clean.
- [ ] **Frontend types:** `cd apps/frontend && pnpm type-check` → clean.
- [ ] **End-to-end manual:** With both servers running — generate in FILL mode, deselect one proposal, apply, confirm new sessions appear in `/jadwal-sesi` and the deselected one was not created. Then generate in FULL_REGENERATE mode on a test branch and confirm sessions without attendance are archived while any with `SessionLog` are preserved.

---

## Notes / Out of Scope (from spec §10)

- No combined (2-subject) auto sessions.
- No persisted drafts (stateless).
- No stored branch operating hours (per-run input).
- No per-subject durations.
- No per-student availability.
- No server-side branch isolation hardening (follows existing project posture).
