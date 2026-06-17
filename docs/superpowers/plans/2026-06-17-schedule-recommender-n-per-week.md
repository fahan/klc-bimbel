# N Sessions/Week + Student-Clash Avoidance — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the existing schedule recommender so a global `sessionsPerWeek` (input at generate) produces N weekly sessions per student-batch on distinct days with flexible teachers, and so both `buildRecommendation` and `planApply` avoid double-booking a student across subjects.

**Architecture:** Pure functions in `recommendation.engine.ts` gain two optional inputs (`sessionsPerWeek`, `studentBusySlots`), keeping full backward compatibility (defaults 1 / []). The NestJS service supplies student busy slots from existing sessions and passes N through. TDD throughout; the existing 15 engine tests must stay green.

**Tech Stack:** NestJS 10, Prisma 5.22, Jest 29 + ts-jest, Next.js 14, React Query v5.

**Reference spec:** `docs/superpowers/specs/2026-06-17-schedule-recommender-n-per-week-design.md`

**Enum note:** `EngineSessionType = 'REGULAR' | 'PRIVATE'`; `EngineDayOfWeek = SENIN|SELASA|RABU|KAMIS|JUMAT|SABTU|MINGGU`.

---

## File Structure

- Modify: `apps/backend/src/modules/sessions/recommendation/recommendation.types.ts` — add `StudentBusySlot`, optional `sessionsPerWeek`/`studentBusySlots` on `EngineInput`, optional `studentBusySlots` on `ApplyPlanInput`.
- Modify: `apps/backend/src/modules/sessions/recommendation/recommendation.engine.ts` — rewrite `buildRecommendation` (N loop + student-clash + distinct-day); extend `planApply` (student-clash).
- Modify (test): `apps/backend/src/modules/sessions/recommendation/recommendation.engine.spec.ts` — new tests; existing stay.
- Modify: `apps/backend/src/modules/sessions/dto/generate-recommendation.dto.ts` — add `sessionsPerWeek`.
- Modify: `apps/backend/src/modules/sessions/sessions.service.ts` — generate: pass N + build student busy (FILL); apply: build remaining student busy → planApply.
- Modify: `apps/frontend/src/lib/api/endpoints.ts` — add `sessionsPerWeek?` to generate payload type.
- Modify: `apps/frontend/src/app/(dashboard)/jadwal-sesi/rekomendasi/page.tsx` — add "Sesi per minggu" input.

---

## Task 1: Types

**Files:**
- Modify: `apps/backend/src/modules/sessions/recommendation/recommendation.types.ts`

- [ ] **Step 1: Add `StudentBusySlot` and optional fields**

In `recommendation.types.ts`, add this interface immediately AFTER the existing `BusySlot` interface (after its closing `}` near line 37):

```ts
export interface StudentBusySlot {
  studentId: string
  dayOfWeek: EngineDayOfWeek
  startMinutes: number
  endMinutes: number
}
```

Then in `EngineInput`, add two optional fields after the existing `busySlots: BusySlot[]` line:

```ts
  busySlots: BusySlot[]
  sessionsPerWeek?: number          // default 1
  studentBusySlots?: StudentBusySlot[]   // default []
```

Then in `ApplyPlanInput`, add one optional field after the existing `busySlots: BusySlot[]` line:

```ts
  busySlots: BusySlot[]
  studentBusySlots?: StudentBusySlot[]   // default []
```

- [ ] **Step 2: Type-check**

Run: `cd apps/backend && pnpm type-check`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/backend/src/modules/sessions/recommendation/recommendation.types.ts
git commit -m "feat(sessions): add StudentBusySlot + N/studentBusy engine input fields"
```

---

## Task 2: `buildRecommendation` — N sessions/week + student-clash + distinct days

**Files:**
- Modify: `apps/backend/src/modules/sessions/recommendation/recommendation.engine.ts`
- Test: `apps/backend/src/modules/sessions/recommendation/recommendation.engine.spec.ts`

- [ ] **Step 1: Add the failing tests**

APPEND a new describe block to `recommendation.engine.spec.ts` (the helpers `demand`, `teacherA`, `teacherB` already exist from the existing `buildRecommendation` describe block above — reuse them; do NOT redefine them):

```ts
describe('buildRecommendation - sessionsPerWeek & student clash', () => {
  it('creates N sessions per batch on different days', () => {
    const out = buildRecommendation({
      durationMinutes: 60,
      activeDays: ['SENIN', 'SELASA', 'RABU'],
      timeWindow: { start: '14:00', end: '16:00' },
      demand: [demand({ studentId: 's1', subjectId: 'subjA', subjectName: 'AHE' })],
      teachers: [teacherA],
      busySlots: [],
      sessionsPerWeek: 2,
    })
    expect(out.proposals).toHaveLength(2)
    const days = out.proposals.map((p) => p.dayOfWeek)
    expect(new Set(days).size).toBe(2) // distinct days
    expect(out.unassigned).toHaveLength(0)
  })

  it('caps N by available days and reports the surplus as unassigned', () => {
    const out = buildRecommendation({
      durationMinutes: 60,
      activeDays: ['SENIN'],
      timeWindow: { start: '14:00', end: '16:00' },
      demand: [demand({ studentId: 's1', subjectId: 'subjA', subjectName: 'AHE' })],
      teachers: [teacherA],
      busySlots: [],
      sessionsPerWeek: 2,
    })
    expect(out.proposals).toHaveLength(1)
    expect(out.unassigned).toHaveLength(1)
    expect(out.unassigned[0].reason).toMatch(/tambahan/i)
  })

  it('does not place two subjects for the same student at the same slot', () => {
    // One student in two subjects, only one usable slot (one day, one slot).
    const out = buildRecommendation({
      durationMinutes: 60,
      activeDays: ['SENIN'],
      timeWindow: { start: '14:00', end: '15:00' },
      demand: [
        demand({ studentId: 's1', subjectId: 'subjA', subjectName: 'AHE' }),
        demand({ studentId: 's1', subjectId: 'subjB', subjectName: 'BING' }),
      ],
      teachers: [teacherA, teacherB],
      busySlots: [],
    })
    // Only one slot exists; student s1 can only be in one session there.
    expect(out.proposals).toHaveLength(1)
    expect(out.unassigned).toHaveLength(1)
  })

  it('respects seeded studentBusySlots', () => {
    const out = buildRecommendation({
      durationMinutes: 60,
      activeDays: ['SENIN'],
      timeWindow: { start: '14:00', end: '15:00' },
      demand: [demand({ studentId: 's1', subjectId: 'subjA', subjectName: 'AHE' })],
      teachers: [teacherA],
      busySlots: [],
      studentBusySlots: [
        { studentId: 's1', dayOfWeek: 'SENIN', startMinutes: 840, endMinutes: 900 },
      ],
    })
    expect(out.proposals).toHaveLength(0)
    expect(out.unassigned).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `cd apps/backend && pnpm test -- recommendation.engine`
Expected: FAIL — new tests fail (e.g. 2 proposals expected but 1, or `sessionsPerWeek` ignored). Existing 15 tests still pass.

- [ ] **Step 3: Rewrite `buildRecommendation`**

In `recommendation.engine.ts`, FIRST add `StudentBusySlot` to the top import from `./recommendation.types` (merge into the existing import list).

Then REPLACE the ENTIRE existing `buildRecommendation` function (currently lines ~135–215, from `export function buildRecommendation(input: EngineInput): EngineOutput {` through its closing `}`) with:

```ts
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
          break // stop placing remaining sessions for this batch
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
```

- [ ] **Step 4: Run to verify pass**

Run: `cd apps/backend && pnpm test -- recommendation.engine`
Expected: PASS — all existing 15 tests + 4 new tests green.

- [ ] **Step 5: Type-check**

Run: `cd apps/backend && pnpm type-check`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/modules/sessions/recommendation/recommendation.engine.ts apps/backend/src/modules/sessions/recommendation/recommendation.engine.spec.ts
git commit -m "feat(sessions): N sessions/week on distinct days + student-clash avoidance"
```

---

## Task 3: `planApply` — student-clash detection

**Files:**
- Modify: `apps/backend/src/modules/sessions/recommendation/recommendation.engine.ts`
- Test: `apps/backend/src/modules/sessions/recommendation/recommendation.engine.spec.ts`

- [ ] **Step 1: Add the failing tests**

APPEND to `recommendation.engine.spec.ts` (the `proposal` helper and `capacity` const already exist from the existing `planApply` describe block — reuse them):

```ts
describe('planApply - student clash', () => {
  it('skips a proposal that clashes with a seeded student busy slot', () => {
    const plan = planApply({
      proposals: [proposal()],
      activeTeacherIds: ['t1'],
      activeStudentIds: ['s1', 's2'],
      subjectCapacity: capacity,
      busySlots: [],
      studentBusySlots: [
        { studentId: 's1', dayOfWeek: 'SENIN', startMinutes: 840, endMinutes: 900 },
      ],
    })
    expect(plan.toCreate).toHaveLength(0)
    expect(plan.skipped[0].reason).toMatch(/siswa/i)
  })

  it('skips the second of two selected proposals that share a student at the same slot', () => {
    // Two proposals for the same student s1 at SENIN 14:00 but DIFFERENT teachers,
    // so the second is caught by the STUDENT clash check (not the teacher-overlap check).
    const plan2 = planApply({
      proposals: [
        proposal({ tempId: 'p1', subjectId: 'subjA', teacherId: 't1', studentIds: ['s1'] }),
        proposal({ tempId: 'p2', subjectId: 'subjA', teacherId: 't2', studentIds: ['s1'] }),
      ],
      activeTeacherIds: ['t1', 't2'],
      activeStudentIds: ['s1'],
      subjectCapacity: capacity,
      busySlots: [],
    })
    expect(plan2.toCreate.map((p) => p.tempId)).toEqual(['p1'])
    expect(plan2.skipped.map((p) => p.tempId)).toEqual(['p2'])
    expect(plan2.skipped[0].reason).toMatch(/siswa/i)
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `cd apps/backend && pnpm test -- recommendation.engine`
Expected: FAIL — new student-clash tests fail (proposals incorrectly accepted). Existing tests still pass.

- [ ] **Step 3: Extend `planApply`**

In `recommendation.engine.ts`, REPLACE the ENTIRE existing `planApply` function (currently the last function in the file) with:

```ts
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
```

- [ ] **Step 4: Run to verify pass**

Run: `cd apps/backend && pnpm test -- recommendation.engine`
Expected: PASS — all engine tests green (existing + Task 2 + Task 3).

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/modules/sessions/recommendation/recommendation.engine.ts apps/backend/src/modules/sessions/recommendation/recommendation.engine.spec.ts
git commit -m "feat(sessions): planApply re-validates student clashes"
```

---

## Task 4: Generate DTO — `sessionsPerWeek`

**Files:**
- Modify: `apps/backend/src/modules/sessions/dto/generate-recommendation.dto.ts`

- [ ] **Step 1: Add the field**

In `GenerateRecommendationDto`, add this AFTER the existing `breakWindow?: TimeRangeDto | null` field (the last field, before the class closing `}`):

```ts
  @ApiPropertyOptional({ example: 1, minimum: 1, maximum: 7 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(7)
  sessionsPerWeek?: number
```

(`ApiPropertyOptional`, `IsOptional`, `IsInt`, `Min`, `Max` are already imported in this file.)

- [ ] **Step 2: Type-check**

Run: `cd apps/backend && pnpm type-check`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/backend/src/modules/sessions/dto/generate-recommendation.dto.ts
git commit -m "feat(sessions): add sessionsPerWeek to generate DTO"
```

---

## Task 5: Service `generateRecommendation` — N + student busy (FILL)

**Files:**
- Modify: `apps/backend/src/modules/sessions/sessions.service.ts`

- [ ] **Step 1: Import the new type**

In `sessions.service.ts`, find the existing import block from `'./recommendation/recommendation.types'` (imports `BusySlot, DemandItem, EngineDayOfWeek, EngineSessionType`). Add `StudentBusySlot` to that list.

- [ ] **Step 2: Replace the FILL busy-slots block in `generateRecommendation`**

REPLACE this existing block (currently lines ~1449–1465):

```ts
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
```

with:

```ts
    // Busy slots: existing active sessions occupy teachers AND their students (FILL mode only)
    const busySlots: BusySlot[] = []
    const studentBusySlots: StudentBusySlot[] = []
    if (dto.mode === 'FILL_UNSCHEDULED') {
      const existing = await this.prisma.session.findMany({
        where: { isActive: true, branchId: dto.branchId },
        select: {
          teacherId: true,
          dayOfWeek: true,
          startTime: true,
          durationMinutes: true,
          studentSessions: { where: { isActive: true }, select: { studentId: true } },
        },
      })
      for (const s of existing) {
        const start = engineTimeToMinutes(s.startTime)
        const end = start + s.durationMinutes
        const dayOfWeek = s.dayOfWeek as EngineDayOfWeek
        busySlots.push({ teacherId: s.teacherId, dayOfWeek, startMinutes: start, endMinutes: end })
        for (const ss of s.studentSessions) {
          studentBusySlots.push({ studentId: ss.studentId, dayOfWeek, startMinutes: start, endMinutes: end })
        }
      }
    }
```

- [ ] **Step 3: Pass N + studentBusySlots into the engine call**

REPLACE the existing `buildRecommendation({ ... })` call in `generateRecommendation` (currently lines ~1467–1475):

```ts
    const result = buildRecommendation({
      durationMinutes: dto.durationMinutes,
      activeDays: dto.activeDays as EngineDayOfWeek[],
      timeWindow: dto.timeWindow,
      breakWindow: dto.breakWindow ?? null,
      demand,
      teachers,
      busySlots,
    })
```

with:

```ts
    const result = buildRecommendation({
      durationMinutes: dto.durationMinutes,
      activeDays: dto.activeDays as EngineDayOfWeek[],
      timeWindow: dto.timeWindow,
      breakWindow: dto.breakWindow ?? null,
      demand,
      teachers,
      busySlots,
      sessionsPerWeek: dto.sessionsPerWeek ?? 1,
      studentBusySlots,
    })
```

- [ ] **Step 4: Type-check**

Run: `cd apps/backend && pnpm type-check`
Expected: no errors. (Confirms `studentSessions` is a valid relation select on `Session` — it is; used elsewhere in this service.)

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/modules/sessions/sessions.service.ts
git commit -m "feat(sessions): generate passes sessionsPerWeek + student busy slots"
```

---

## Task 6: Service `applyRecommendation` — student busy → planApply

**Files:**
- Modify: `apps/backend/src/modules/sessions/sessions.service.ts`

- [ ] **Step 1: Replace the existing-sessions fetch + busy-building block**

In `applyRecommendation`, REPLACE this block (currently lines ~1528–1571):

```ts
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
```

with:

```ts
      // FULL_REGENERATE: archive existing active sessions that have NO session logs.
      let archivedSessions = 0
      const preservedSessions: { id: string; reason: string }[] = []
      const remainingBusy: BusySlot[] = []
      const remainingStudentBusy: StudentBusySlot[] = []

      const existing = await tx.session.findMany({
        where: { isActive: true, branchId: dto.branchId },
        select: {
          id: true, teacherId: true, dayOfWeek: true, startTime: true, durationMinutes: true,
          _count: { select: { sessionLogs: true } },
          studentSessions: { where: { isActive: true }, select: { studentId: true } },
        },
      })

      const keepAsBusy = (s: (typeof existing)[number]) => {
        const start = engineTimeToMinutes(s.startTime)
        const end = start + s.durationMinutes
        const dayOfWeek = s.dayOfWeek as EngineDayOfWeek
        remainingBusy.push({ teacherId: s.teacherId, dayOfWeek, startMinutes: start, endMinutes: end })
        for (const ss of s.studentSessions) {
          remainingStudentBusy.push({ studentId: ss.studentId, dayOfWeek, startMinutes: start, endMinutes: end })
        }
      }

      if (dto.mode === 'FULL_REGENERATE') {
        for (const s of existing) {
          if (s._count.sessionLogs > 0) {
            preservedSessions.push({ id: s.id, reason: 'Punya riwayat presensi' })
            keepAsBusy(s)
          } else {
            await tx.session.update({
              where: { id: s.id },
              data: { isActive: false, status: 'ARCHIVED' },
            })
            archivedSessions += 1
          }
        }
      } else {
        // FILL: all existing active sessions remain and occupy teacher + student slots
        for (const s of existing) keepAsBusy(s)
      }
```

- [ ] **Step 2: Pass `studentBusySlots` into `planApply`**

In the same method, find the `planApply({ ... })` call and add `studentBusySlots` after the existing `busySlots: remainingBusy,` line:

```ts
        activeTeacherIds: teachers.map((t) => t.id),
        activeStudentIds: students.map((s) => s.id),
        subjectCapacity,
        busySlots: remainingBusy,
        studentBusySlots: remainingStudentBusy,
      })
```

- [ ] **Step 3: Type-check + full test run**

Run: `cd apps/backend && pnpm type-check` (expected: clean)
Run: `cd apps/backend && pnpm test` (expected: all engine tests pass)

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/modules/sessions/sessions.service.ts
git commit -m "feat(sessions): apply re-validates student clashes from existing sessions"
```

---

## Task 7: Frontend — `sessionsPerWeek` input

**Files:**
- Modify: `apps/frontend/src/lib/api/endpoints.ts`
- Modify: `apps/frontend/src/app/(dashboard)/jadwal-sesi/rekomendasi/page.tsx`

- [ ] **Step 1: Extend the API payload type**

In `apps/frontend/src/lib/api/endpoints.ts`, in `scheduleRecommendationApi.generate`, add `sessionsPerWeek?` to the payload type (after the `breakWindow?: ...` line):

```ts
    timeWindow: { start: string; end: string }
    breakWindow?: { start: string; end: string } | null
    sessionsPerWeek?: number
  }) => apiClient.post('/sessions/recommendations/generate', data),
```

- [ ] **Step 2: Add page state**

In `page.tsx`, add a state line after the existing `const [duration, setDuration] = useState(60)` line (around line 29):

```tsx
  const [sessionsPerWeek, setSessionsPerWeek] = useState(1)
```

- [ ] **Step 3: Include it in the generate payload**

In the `generate` mutation's `scheduleRecommendationApi.generate({ ... })` call, add after the `breakWindow: ...` line (around line 50):

```tsx
        breakWindow: useBreak ? { start: breakStart, end: breakEnd } : null,
        sessionsPerWeek,
```

- [ ] **Step 4: Add the input control**

In the form grid, add this label block immediately AFTER the "Durasi sesi (menit)" label block (the one with the `duration` number input). Find:

```tsx
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Durasi sesi (menit)</span>
          <input type="number" min={30} max={240} step={30} value={duration}
            onChange={(e) => setDuration(Number(e.target.value))} className="border rounded px-2 py-1.5" />
        </label>
```

and insert directly after its closing `</label>`:

```tsx
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Sesi per minggu</span>
          <input type="number" min={1} max={7} step={1} value={sessionsPerWeek}
            onChange={(e) => setSessionsPerWeek(Number(e.target.value))} className="border rounded px-2 py-1.5" />
        </label>
```

- [ ] **Step 5: Type-check**

Run: `cd apps/frontend && pnpm type-check`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/src/lib/api/endpoints.ts "apps/frontend/src/app/(dashboard)/jadwal-sesi/rekomendasi/page.tsx"
git commit -m "feat(frontend): add sessions-per-week input to recommendation page"
```

---

## Final Verification

- [ ] `cd apps/backend && pnpm test` → all engine specs PASS (15 original + 6 new).
- [ ] `cd apps/backend && pnpm type-check` → clean.
- [ ] `cd apps/backend && pnpm build` → succeeds.
- [ ] `cd apps/frontend && pnpm type-check` → clean.
- [ ] **Manual (needs DB):** generate with `sessionsPerWeek: 2` → confirm each batch gets 2 sessions on different days; a student in 2 subjects never lands two sessions at the same day+time; apply still reports skipped/applied correctly.

---

## Notes / Out of Scope (spec §9)

- Global N only (not per-subject or per-student).
- Only "distinct day" is enforced for the N sessions — not even spreading or same-teacher continuity.
- No schema/DB changes.
