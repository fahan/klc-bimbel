# Eliminasi N+1 Attendance Status di Presensi Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the N+1 per-session `attendanceApi.getSessionLog()` calls on the `/presensi` admin page with a single JOIN in the existing `GET /sessions` list endpoint, so opening the page costs 1 HTTP request instead of 1+N.

**Architecture:** `SessionsService.findAll` gains an optional `date` parameter. When present, it adds a `sessionLogs` relation filter (by date, `isAdHoc: false`) to the existing `findMany` query — the same pattern already used by `findTodaySessionsForTeacher` in the same file — and maps the result into an `attendanceStatus` field per session. The frontend passes `date` when calling the list endpoint and deletes its per-session fetch loop entirely.

**Tech Stack:** NestJS 10 + Prisma 5.22 (backend), Next.js 14 + axios + React Query (frontend), Jest + `@nestjs/testing` (backend unit test, mocked `PrismaService`).

**Spec:** `docs/superpowers/specs/2026-07-02-presensi-attendance-status-join-design.md`

---

### Task 1: Backend — JOIN attendance status into `SessionsService.findAll`

**Files:**
- Test: `apps/backend/src/modules/sessions/sessions.service.spec.ts` (new)
- Modify: `apps/backend/src/modules/sessions/sessions.service.ts:27-86`
- Modify: `apps/backend/src/modules/sessions/sessions.controller.ts:32-60`

- [ ] **Step 1: Write the failing tests**

Create `apps/backend/src/modules/sessions/sessions.service.spec.ts`:

```typescript
import { Test } from '@nestjs/testing'
import { PrismaService } from '@/prisma/prisma.service'
import { SessionsService } from './sessions.service'

describe('SessionsService.findAll — attendance status join', () => {
  let service: SessionsService
  let prisma: {
    session: { findMany: jest.Mock; count: jest.Mock }
  }

  const baseSession = {
    id: 'session-1',
    branchId: 'branch-1',
    branch: { name: 'Purwokerto', code: 'PWK' },
    subjectId: 'subject-1',
    subject: { name: 'Matematika', code: 'MTK', trackingType: 'FREE_MATERIAL', maxCapacityRegular: 8, maxCapacityPrivate: 1 },
    teacherId: 'teacher-1',
    teacher: { name: 'Bu Sari' },
    type: 'REGULAR',
    dayOfWeek: 'SENIN',
    startTime: '14:00',
    durationMinutes: 60,
    isActive: true,
    createdAt: new Date('2026-01-01'),
    studentSessions: [],
  }

  beforeEach(async () => {
    prisma = {
      session: { findMany: jest.fn(), count: jest.fn() },
    }

    const moduleRef = await Test.createTestingModule({
      providers: [SessionsService, { provide: PrismaService, useValue: prisma }],
    }).compile()

    service = moduleRef.get(SessionsService)
    prisma.session.count.mockResolvedValue(1)
  })

  it('includes attendanceStatus from the joined sessionLogs when date is provided', async () => {
    prisma.session.findMany.mockResolvedValue([
      { ...baseSession, sessionLogs: [{ status: 'COMPLETED' }] },
    ])

    const result = await service.findAll(1, 10, undefined, '2026-07-06')

    // Computed the same way the service normalizes it, so this assertion
    // doesn't depend on the test machine's timezone.
    const expectedDate = new Date('2026-07-06')
    expectedDate.setHours(0, 0, 0, 0)

    const includeArg = prisma.session.findMany.mock.calls[0][0].include
    expect(includeArg.sessionLogs).toEqual({
      where: { sessionDate: expectedDate, isAdHoc: false },
      select: { status: true },
    })
    expect(result.data[0].attendanceStatus).toBe('COMPLETED')
  })

  it('defaults attendanceStatus to SCHEDULED when no session log exists for that date', async () => {
    prisma.session.findMany.mockResolvedValue([
      { ...baseSession, sessionLogs: [] },
    ])

    const result = await service.findAll(1, 10, undefined, '2026-07-06')

    expect(result.data[0].attendanceStatus).toBe('SCHEDULED')
  })

  it('does not include sessionLogs or attendanceStatus when date is omitted', async () => {
    prisma.session.findMany.mockResolvedValue([{ ...baseSession }])

    const result = await service.findAll(1, 10)

    const includeArg = prisma.session.findMany.mock.calls[0][0].include
    expect(includeArg.sessionLogs).toBeUndefined()
    expect(result.data[0].attendanceStatus).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run (from `apps/backend`): `pnpm test -- sessions.service.spec.ts`
Expected: FAIL — `service.findAll` currently only accepts `(page, limit, filters)`, calling it with a 4th `date` argument is allowed by JS but the service ignores it, so `attendanceStatus` will be `undefined` on all 3 assertions (first two tests fail).

- [ ] **Step 3: Add the `date` parameter to `SessionsService.findAll`**

In `apps/backend/src/modules/sessions/sessions.service.ts`, replace the `findAll` method (currently lines 27-86) with:

```typescript
  async findAll(
    page: number = 1,
    limit: number = 10,
    filters?: { branchId?: string; teacherId?: string; subjectId?: string; dayOfWeek?: string },
    date?: string,
  ) {
    const skip = (page - 1) * limit

    let normalizedDate: Date | undefined
    if (date) {
      normalizedDate = new Date(date)
      normalizedDate.setHours(0, 0, 0, 0)
    }

    const [sessions, total] = await Promise.all([
      this.prisma.session.findMany({
        // Single JOIN for relations instead of one query per relation.
        relationLoadStrategy: 'join',
        where: {
          isActive: true,
          ...(filters?.branchId && { branchId: filters.branchId }),
          ...(filters?.teacherId && { teacherId: filters.teacherId }),
          ...(filters?.subjectId && { subjectId: filters.subjectId }),
          ...(filters?.dayOfWeek && { dayOfWeek: filters.dayOfWeek as any }),
        },
        include: {
          branch: true,
          subject: true,
          teacher: true,
          studentSessions: {
            where: { isActive: true },
            include: {
              student: true,
            },
          },
          ...(normalizedDate && {
            sessionLogs: {
              where: { sessionDate: normalizedDate, isAdHoc: false },
              select: { status: true },
            },
          }),
        },
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
        skip,
        take: limit,
      }),
      this.prisma.session.count({
        where: {
          isActive: true,
          ...(filters?.branchId && { branchId: filters.branchId }),
          ...(filters?.teacherId && { teacherId: filters.teacherId }),
          ...(filters?.subjectId && { subjectId: filters.subjectId }),
          ...(filters?.dayOfWeek && { dayOfWeek: filters.dayOfWeek as any }),
        },
      }),
    ])

    const totalPages = Math.ceil(total / limit)
    const pagination: PaginationMeta = {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    }

    return {
      success: true,
      data: sessions.map(s => ({
        ...this.formatSession(s),
        ...(normalizedDate && {
          attendanceStatus: (s as any).sessionLogs?.[0]?.status || 'SCHEDULED',
        }),
      })),
      pagination,
    }
  }
```

- [ ] **Step 4: Add the `date` query param to `SessionsController.findAll`**

In `apps/backend/src/modules/sessions/sessions.controller.ts`, replace the `findAll` method and its decorators (currently lines 32-60) with:

```typescript
  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List sessions (paginated)',
    description: 'Get paginated list of all active sessions. Filter by branchId, teacherId, subjectId, or dayOfWeek.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'branchId', required: false })
  @ApiQuery({ name: 'teacherId', required: false })
  @ApiQuery({ name: 'subjectId', required: false })
  @ApiQuery({ name: 'dayOfWeek', required: false })
  @ApiQuery({ name: 'date', required: false, description: 'YYYY-MM-DD — when provided, each session includes attendanceStatus for that date' })
  @ApiResponse({ status: 200, description: 'Sessions retrieved successfully', type: SessionResponseDto })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('branchId') branchId?: string,
    @Query('teacherId') teacherId?: string,
    @Query('subjectId') subjectId?: string,
    @Query('dayOfWeek') dayOfWeek?: string,
    @Query('date') date?: string,
  ): Promise<any> {
    return this.sessionsService.findAll(page || 1, limit || 10, {
      branchId,
      teacherId,
      subjectId,
      dayOfWeek,
    }, date)
  }
```

- [ ] **Step 5: Run tests to verify they pass**

Run (from `apps/backend`): `pnpm test -- sessions.service.spec.ts`
Expected: PASS (3/3 tests).

- [ ] **Step 6: Run the full backend test suite to check for regressions**

Run (from `apps/backend`): `pnpm test`
Expected: all suites pass, including the pre-existing `recommendation.engine.spec.ts` and `students.service.spec.ts`.

- [ ] **Step 7: Commit**

```bash
git add apps/backend/src/modules/sessions/sessions.service.spec.ts apps/backend/src/modules/sessions/sessions.service.ts apps/backend/src/modules/sessions/sessions.controller.ts
git commit -m "feat(backend): join attendance status into GET /sessions via optional date param"
```

---

### Task 2: Frontend — add `date` filter to `sessionApi.getAll`

**Files:**
- Modify: `apps/frontend/src/lib/api/endpoints.ts:124-135`

- [ ] **Step 1: Add `date` to the filters type and query string**

In `apps/frontend/src/lib/api/endpoints.ts`, replace the `sessionApi.getAll` method (currently lines 124-135) with:

```typescript
  getAll: (page?: number, limit?: number, filters?: { branchId?: string; teacherId?: string; subjectId?: string; dayOfWeek?: string; date?: string }) => {
    const params = new URLSearchParams()
    if (page) params.append('page', String(page))
    if (limit) params.append('limit', String(limit))
    if (filters?.branchId) params.append('branchId', filters.branchId)
    if (filters?.teacherId) params.append('teacherId', filters.teacherId)
    if (filters?.subjectId) params.append('subjectId', filters.subjectId)
    if (filters?.dayOfWeek) params.append('dayOfWeek', filters.dayOfWeek)
    if (filters?.date) params.append('date', filters.date)
    const queryString = params.toString()
    return apiClient.get(`/sessions${queryString ? `?${queryString}` : ''}`)
  },
```

- [ ] **Step 2: Type-check the frontend**

Run: `cd apps/frontend && pnpm type-check`
Expected: no errors (runs `tsc --noEmit`).

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/lib/api/endpoints.ts
git commit -m "feat(frontend): add date filter to sessionApi.getAll"
```

---

### Task 3: Frontend — use the joined attendance status on the presensi page

**Files:**
- Modify: `apps/frontend/src/app/(dashboard)/presensi/page.tsx:93-128`

- [ ] **Step 1: Replace the per-session fetch loop with the date-scoped list call**

In `apps/frontend/src/app/(dashboard)/presensi/page.tsx`, replace the `usePagination` block (currently lines 93-128) with:

```typescript
  const {
    items: sessions,
    page,
    limit,
    setPage,
    setLimit,
    pagination,
    isLoading: sessionsLoading,
    refetch: refetchSessions,
  } = usePagination({
    queryKey: ['sessions-attendance', selectedDate],
    queryFn: async (page, limit) => {
      return sessionApi.getAll(page, limit, { date: selectedDate })
    },
    initialLimit: 10,
  })
```

This removes the `Promise.all(...attendanceApi.getSessionLog(...))` block entirely — each session object returned by `sessionApi.getAll` now already has `attendanceStatus` populated by the backend join from Task 1.

- [ ] **Step 2: Verify `attendanceApi` is still used elsewhere in the file**

Run: `grep -n "attendanceApi\." "apps/frontend/src/app/(dashboard)/presensi/page.tsx"`
Expected: matches for `attendanceApi.getAdHocPending`, `attendanceApi.approveAdHoc`, `attendanceApi.rejectAdHoc` (the ad-hoc approval section) — confirms the `attendanceApi` import at the top of the file is still needed and should NOT be removed, only the `getSessionLog` call inside the pagination block is gone.

- [ ] **Step 3: Type-check the frontend**

Run: `cd apps/frontend && pnpm type-check`
Expected: no errors.

- [ ] **Step 4: Manual browser verification**

1. Start both servers: `pnpm dev` from repo root (or `pnpm dev:backend` + `pnpm dev:frontend` in separate terminals).
2. Log in and open `/presensi`.
3. Open browser DevTools → Network tab, filter by `Fetch/XHR`, clear the log.
4. Reload the page.
5. Confirm: exactly **one** request to `/sessions?...&date=...` and **zero** requests to `/attendance/session/:id`.
6. Confirm the "Status" column still shows the correct badge per session (compare against what it showed before this change, e.g. a session known to be COMPLETED for today should still show COMPLETED).
7. Change the date filter (if visible) or pick a different page — confirm status still updates correctly and still only 1 request per change.

- [ ] **Step 5: Commit**

```bash
git add "apps/frontend/src/app/(dashboard)/presensi/page.tsx"
git commit -m "fix(frontend): eliminate N+1 attendance status requests on presensi page"
```

---

### Task 4: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full backend test suite**

Run (from `apps/backend`): `pnpm test`
Expected: all suites pass, including the new `sessions.service.spec.ts`.

- [ ] **Step 2: Type-check the whole monorepo**

Run (from repo root): `pnpm type-check`
Expected: no errors in `apps/backend` or `apps/frontend`.

- [ ] **Step 3: Re-confirm the manual browser check from Task 3 Step 4 one more time on the final state**

Same steps as Task 3 Step 4 — confirms nothing regressed between Task 3's commit and the final state (should be identical since Task 4 makes no code changes, but catches anything missed).

---

## Self-Review Notes

- **Spec coverage:** backend `date` param + JOIN ✅ (Task 1), frontend `sessionApi.getAll` date filter ✅ (Task 2), presensi page loop removal ✅ (Task 3), regression guard for `date` omitted ✅ (Task 1's third test), manual network-tab verification ✅ (Task 3 Step 4 + Task 4 Step 3).
- **Non-goals respected:** no changes to `AttendanceDetailModal.tsx` or the guru-side `presensi/[sessionId]` pages (their single-session `getSessionLog` calls are untouched), no new attendance endpoint added, `AttendanceService.getSessionLog` itself unchanged.
