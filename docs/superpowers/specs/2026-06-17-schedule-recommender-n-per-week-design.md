# Schedule Recommender — N Sessions/Week + Student-Clash Avoidance (Design)

**Date:** 2026-06-17
**Status:** Approved (brainstorming) — ready for implementation plan
**Builds on:** `docs/superpowers/specs/2026-06-17-schedule-recommender-design.md`

---

## 1. Problem & Goal

The current recommender creates exactly **one weekly session per (student, subject)**. There is no way to schedule a subject more than once per week (e.g. Matematika 2× seminggu). Additionally, the engine only avoids **teacher** clashes — it does not prevent a single student from being booked into two sessions at the same day+time across different subjects. Multiplying sessions per week makes that latent issue acute.

**Goal:** Let admins request **N sessions per week per subject** (global N for the run) and make the engine produce schedules that are valid for students by **avoiding student double-booking**.

### Decisions (from brainstorming)

| Aspek | Keputusan |
|---|---|
| Sumber N | **Input saat generate** (tidak disimpan), satu angka **global** `sessionsPerWeek` (default 1) |
| Penempatan N sesi | **Hari berbeda** per kelompok; guru **fleksibel** (tiap sesi → guru paling sedikit beban) |
| Bentrok siswa | **Dicegah** — engine melacak slot tiap siswa lintas mapel |
| Backward compat | `sessionsPerWeek` & `studentBusySlots` **opsional** (default 1 / []), sehingga perilaku & test lama tidak berubah |

---

## 2. Types (`recommendation.types.ts`)

Add to `EngineInput` (both optional for backward compatibility):

```ts
sessionsPerWeek?: number          // default 1
studentBusySlots?: StudentBusySlot[]   // default []
```

New interface:

```ts
export interface StudentBusySlot {
  studentId: string
  dayOfWeek: EngineDayOfWeek
  startMinutes: number
  endMinutes: number
}
```

Add to `ApplyPlanInput` (optional, default []):

```ts
studentBusySlots?: StudentBusySlot[]
```

---

## 3. Engine — `buildRecommendation`

Per batch (a capacity-sized group of students for one `(subject, type)`), replace the single-slot assignment with an N-times loop:

- Resolve `n = sessionsPerWeek ?? 1`.
- Maintain, across the whole run: per-teacher busy intervals + load (already exists), **and a per-student busy map** seeded from `studentBusySlots`.
- Per batch maintain `placedDays: Set<EngineDayOfWeek>`.
- For each of `n` sessions:
  - Choose the **least-loaded teacher** (tie-break teacherId) that has **some** candidate slot satisfying ALL of:
    1. slot's day NOT in `placedDays` (this batch),
    2. teacher is free at the slot interval,
    3. **every student in the batch is free** at the slot interval.
  - On success: create the proposal, mark teacher busy + load++, mark each batch student busy at that slot, `placedDays.add(day)`.
  - On failure (no teacher/slot satisfies constraints): push an `unassigned` entry (reason: `'Tidak ada slot/guru tersedia untuk sesi tambahan'`) and stop placing further sessions for this batch.
- If `n` exceeds the number of active days, the surplus sessions naturally fail the distinct-day rule and become `unassigned` — acceptable, graceful.

Helper additions (pure, same file): `areStudentsFree(studentBusy, batchStudentIds, day, start, end)` and a seed step building the per-student interval map. Reuse existing `overlaps`, `buildCandidateSlots`, `groupDemand`, `chunk`, `minutesToTime`.

Determinism preserved: groups sorted, students sorted, teachers sorted by load then id, slots in chronological order.

---

## 4. Engine — `planApply`

Add student-clash detection so apply-time re-validation matches generate:

- Seed a per-student running busy list from `studentBusySlots ?? []`.
- For each accepted proposal (after the existing teacher/active/capacity/teacher-overlap checks), also check that no student in `studentIds` is already busy at the proposal's interval. If clash → skip with reason `'Bentrok jadwal siswa'`.
- On accept: append the proposal's interval to each of its students' running busy lists (so two selected proposals sharing a student at the same slot are caught).

Order of checks per proposal: teacher active → students active → capacity → teacher overlap → **student overlap** → accept.

---

## 5. DTO (`generate-recommendation.dto.ts`)

Add to `GenerateRecommendationDto`:

```ts
@ApiPropertyOptional({ example: 1, minimum: 1, maximum: 7 })
@IsOptional()
@IsInt()
@Min(1)
@Max(7)
sessionsPerWeek?: number
```

Apply DTO unchanged (proposals are already concrete; N is not needed at apply time).

---

## 6. Service (`sessions.service.ts`)

**`generateRecommendation`:**
- Pass `sessionsPerWeek: dto.sessionsPerWeek ?? 1` into `buildRecommendation`.
- In **FILL_UNSCHEDULED** mode, build `studentBusySlots` from existing active `SessionStudent` rows joined to their active session (branch-scoped): `{ studentId, dayOfWeek, startMinutes, endMinutes }` derived from `session.startTime`/`durationMinutes`. In **FULL_REGENERATE** mode, pass `[]` (old schedule is being replaced).

**`applyRecommendation`:**
- Build `studentBusySlots` from the sessions that REMAIN as busy (the same set used for `remainingBusy` teacher slots): in FULL_REGENERATE that's the **preserved** sessions (with history); in FILL that's **all** existing active sessions. For each such session, fetch its active `SessionStudent` studentIds and emit a `StudentBusySlot` per student.
- Pass `studentBusySlots` into `planApply`.

(This means the existing `existing` session query in `applyRecommendation` must also include `studentSessions` studentIds; and the generate FILL query must join session→subject/day/time as needed.)

---

## 7. Frontend (`jadwal-sesi/rekomendasi/page.tsx`)

- Add a number input **"Sesi per minggu"** (min 1, max 7, default 1), state `sessionsPerWeek`.
- Include `sessionsPerWeek` in the `generate` payload.
- Add `sessionsPerWeek?` to `scheduleRecommendationApi.generate` payload type in `endpoints.ts`.

---

## 8. Testing

**Engine unit tests (TDD), appended to `recommendation.engine.spec.ts`:**
- `sessionsPerWeek: 2` → a batch yields 2 proposals on **different days**.
- N capped by active days: `activeDays: ['SENIN']`, `sessionsPerWeek: 2` → 1 proposal placed, 1 `unassigned`.
- **Student clash:** one student enrolled in two subjects, only one common slot available → the two subjects do NOT land on the same slot (second goes to a different slot or becomes unassigned).
- `studentBusySlots` seed respected: a student pre-occupied at a slot is not scheduled there.
- **Regression:** default (no `sessionsPerWeek`, no `studentBusySlots`) reproduces current behavior — all 15 existing tests stay green.

**planApply unit tests:**
- Skips a proposal that clashes with a seeded `studentBusySlot` (reason `/siswa/i`).
- Skips the second of two selected proposals that share a student at the same slot.

**Service:** verified via `pnpm type-check` + existing suite (no DB available).

---

## 9. Out of Scope (YAGNI)

- Per-subject or per-student N (global only this iteration).
- Persisting N or operating hours to schema.
- Preferring/serializing specific days (only "distinct day" is enforced, not "spread evenly").
- Same-teacher continuity across the N sessions (teacher is flexible by decision).
