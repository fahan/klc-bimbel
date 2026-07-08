# Presensi Cepat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new "Presensi Cepat" tap-tap attendance flow for teachers (auto subject/time/duration, multi-subject group split), batch admin approval, and a visual summary on the parent progress report — all additive, without touching the existing sesi darurat flow.

**Architecture:** New endpoints write to the existing `SessionLog` structure (`isAdHoc: true`, `PENDING_APPROVAL`) so all downstream logic (approval, progress, commission, reports) stays unified. No schema changes. Source is tagged via an `adHocNotes` prefix constant. Spec: `docs/superpowers/specs/2026-07-02-tap-tap-presensi-darurat-design.md`.

**Tech Stack:** NestJS 10 + Prisma 5.22 (backend, port 3000), Next.js 14 App Router + TanStack Query v5 (frontend, port 3001), Jest for backend unit tests.

**Conventions reminder (from CLAUDE.md):**
- All service responses wrapped: `{ success: true, data, message? }`.
- Run backend tests: `cd apps/backend && pnpm test -- attendance.service.spec.ts`.
- Restart backend after adding new endpoints if 404 (`pnpm dev:backend`).
- UI text in Bahasa Indonesia, code/comments in English.

---

### Task 1: Backend — DTOs for quick attendance & batch approval

**Files:**
- Create: `apps/backend/src/modules/attendance/dto/submit-quick-attendance.dto.ts`

- [ ] **Step 1: Create the DTO file**

```typescript
import { IsString, IsEnum, IsOptional, IsArray, ValidateNested, ArrayMinSize } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty } from '@nestjs/swagger'

export class QuickStudentEntryDto {
  @ApiProperty({ example: 'student_id_123' })
  @IsString()
  studentId!: string

  @ApiProperty({
    required: false,
    description: 'Required when the student has 0 or >1 active subject enrollments. Ignored when exactly 1.',
  })
  @IsOptional()
  @IsString()
  subjectId?: string

  @ApiProperty({ enum: ['HADIR', 'ABSEN', 'IZIN', 'SAKIT'], example: 'HADIR' })
  @IsEnum(['HADIR', 'ABSEN', 'IZIN', 'SAKIT'])
  status!: 'HADIR' | 'ABSEN' | 'IZIN' | 'SAKIT'
}

export class SubmitQuickAttendanceDto {
  @ApiProperty({ example: 'branch_id_123' })
  @IsString()
  branchId!: string

  @ApiProperty({ type: [QuickStudentEntryDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => QuickStudentEntryDto)
  students!: QuickStudentEntryDto[]
}

export class BatchApproveItemDto {
  @ApiProperty({ example: 'session_log_id' })
  @IsString()
  sessionLogId!: string

  @ApiProperty({ required: false, description: 'Optional corrected start time (HH:mm) applied before approval' })
  @IsOptional()
  @IsString()
  startTime?: string
}

export class ApproveAdHocBatchDto {
  @ApiProperty({ type: [BatchApproveItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BatchApproveItemDto)
  items!: BatchApproveItemDto[]
}

export class RejectAdHocBatchDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  sessionLogIds!: string[]

  @ApiProperty({ required: false, description: 'Shared rejection reason; defaults to a generic one' })
  @IsOptional()
  @IsString()
  reason?: string
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm type-check`
Expected: PASS (file compiles, nothing imports it yet)

- [ ] **Step 3: Commit**

```bash
git add apps/backend/src/modules/attendance/dto/submit-quick-attendance.dto.ts
git commit -m "feat(backend): add DTOs for quick attendance and batch approval"
```

---

### Task 2: Backend — student search with active subjects

**Files:**
- Modify: `apps/backend/src/modules/students/students.service.ts` (add method at end of class)
- Modify: `apps/backend/src/modules/students/students.controller.ts` (add route BEFORE `@Get(':id')` at line 63 — NestJS matches routes in declaration order, so `active-by-branch` after `:id` would be swallowed)

- [ ] **Step 1: Add service method to `students.service.ts`**

```typescript
  /** Search active students at a branch, including their active subject enrollments.
   *  Used by the Presensi Cepat teacher flow. */
  async searchActiveByBranch(branchId: string, search?: string) {
    const students = await this.prisma.student.findMany({
      relationLoadStrategy: 'join',
      where: {
        branchId,
        isActive: true,
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' as const } },
                { sureName: { contains: search, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      },
      include: {
        studentSubjects: {
          where: { isActive: true },
          include: { subject: { select: { id: true, name: true } } },
        },
      },
      orderBy: { name: 'asc' },
      take: 20,
    })

    return {
      success: true,
      data: students.map(s => ({
        studentId: s.id,
        studentName: s.sureName?.trim() || s.name,
        fullName: s.name,
        classLevel: s.classLevel,
        activeSubjects: s.studentSubjects.map(ss => ({
          subjectId: ss.subject.id,
          subjectName: ss.subject.name,
        })),
      })),
    }
  }
```

- [ ] **Step 2: Add controller route in `students.controller.ts`, immediately BEFORE the `@Get(':id')` handler**

```typescript
  @Get('active-by-branch')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiQuery({ name: 'branchId', required: true, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiOperation({
    summary: 'Search active students at a branch with their active subject enrollments',
    description: 'Used by the Presensi Cepat teacher flow. Returns up to 20 students matching the search term.',
  })
  async searchActiveByBranch(
    @Query('branchId') branchId: string,
    @Query('search') search?: string,
  ): Promise<any> {
    return this.studentsService.searchActiveByBranch(branchId, search)
  }
```

- [ ] **Step 3: Verify manually**

Run: `pnpm type-check`, then restart backend (`pnpm dev:backend`) and check Swagger at http://localhost:3000/api shows `GET /students/active-by-branch`. Verify `GET /students/{id}` still resolves (route order not broken).

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/modules/students/students.service.ts apps/backend/src/modules/students/students.controller.ts
git commit -m "feat(backend): add GET /students/active-by-branch for Presensi Cepat"
```

---

### Task 3: Backend — submitQuickAttendance service method (TDD)

**Files:**
- Modify: `apps/backend/src/modules/attendance/attendance.service.ts`
- Test: `apps/backend/src/modules/attendance/attendance.service.spec.ts` (append new `describe` block)

- [ ] **Step 1: Write failing tests** — append to `attendance.service.spec.ts`:

```typescript
describe('AttendanceService.submitQuickAttendance', () => {
  let service: AttendanceService
  let prisma: any
  let txSessionLogCreate: jest.Mock
  let txAttendanceCreateMany: jest.Mock

  beforeEach(async () => {
    txSessionLogCreate = jest.fn().mockImplementation(async ({ data }: any) => ({
      id: `log-${data.adHocSubjectId}`,
      createdAt: new Date(),
      ...data,
    }))
    txAttendanceCreateMany = jest.fn().mockResolvedValue({ count: 1 })

    prisma = {
      branch: { findUnique: jest.fn().mockResolvedValue({ id: 'branch-1', name: 'Cabang Pusat' }) },
      user: { findUnique: jest.fn().mockResolvedValue({ id: 'teacher-1', name: 'Pak Andi' }) },
      student: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'student-1', name: 'Budi Santoso', sureName: 'Budi' },
          { id: 'student-2', name: 'Sari Ayu', sureName: 'Sari' },
        ]),
      },
      studentSubject: {
        findMany: jest.fn().mockResolvedValue([
          { studentId: 'student-1', subjectId: 'subject-mat' },
          { studentId: 'student-2', subjectId: 'subject-mat' },
          { studentId: 'student-2', subjectId: 'subject-fis' },
        ]),
      },
      subject: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'subject-mat', name: 'Matematika', trackingType: 'MODULE_BASED' },
          { id: 'subject-fis', name: 'Fisika', trackingType: 'FREE_MATERIAL' },
        ]),
      },
      attendance: { findMany: jest.fn().mockResolvedValue([]) },
      $transaction: jest.fn().mockImplementation(async (cb: any) =>
        cb({
          sessionLog: { create: txSessionLogCreate },
          attendance: { createMany: txAttendanceCreateMany },
        }),
      ),
    }

    const moduleRef = await Test.createTestingModule({
      providers: [AttendanceService, { provide: PrismaService, useValue: prisma }],
    }).compile()
    service = moduleRef.get(AttendanceService)
  })

  it('auto-resolves subject for single-enrollment student and splits groups per subject', async () => {
    const result = await service.submitQuickAttendance(
      {
        branchId: 'branch-1',
        students: [
          { studentId: 'student-1', status: 'HADIR' }, // 1 enrollment -> auto subject-mat
          { studentId: 'student-2', subjectId: 'subject-fis', status: 'HADIR' }, // 2 enrollments -> explicit
        ],
      } as any,
      'teacher-1',
    )

    expect(result.success).toBe(true)
    expect(result.data.sessionLogs).toHaveLength(2)
    expect(txSessionLogCreate).toHaveBeenCalledTimes(2)
    const subjects = txSessionLogCreate.mock.calls.map(c => c[0].data.adHocSubjectId).sort()
    expect(subjects).toEqual(['subject-fis', 'subject-mat'])
    // Every created log is a pending ad-hoc log tagged as Presensi Cepat
    for (const call of txSessionLogCreate.mock.calls) {
      expect(call[0].data).toMatchObject({
        isAdHoc: true,
        status: 'PENDING_APPROVAL',
        adHocDuration: 30,
        adHocNotes: expect.stringContaining('[PRESENSI-CEPAT]'),
      })
    }
  })

  it('rejects multi-enrollment student without explicit subjectId', async () => {
    await expect(
      service.submitQuickAttendance(
        { branchId: 'branch-1', students: [{ studentId: 'student-2', status: 'HADIR' }] } as any,
        'teacher-1',
      ),
    ).rejects.toThrow(/mata pelajaran/i)
  })

  it('flags duplicates (same student+subject+date already recorded) without blocking', async () => {
    prisma.attendance.findMany.mockResolvedValue([
      {
        studentId: 'student-1',
        sessionLog: { adHocSubjectId: 'subject-mat', session: null },
      },
    ])

    const result = await service.submitQuickAttendance(
      { branchId: 'branch-1', students: [{ studentId: 'student-1', status: 'HADIR' }] } as any,
      'teacher-1',
    )

    expect(result.success).toBe(true)
    expect(result.data.duplicateWarnings).toHaveLength(1)
    expect(result.data.duplicateWarnings[0]).toMatchObject({ studentId: 'student-1' })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/backend && pnpm test -- attendance.service.spec.ts`
Expected: FAIL — `submitQuickAttendance is not a function`

- [ ] **Step 3: Implement.** Add to `attendance.service.ts`, after `submitAdHocAttendance` (import `SubmitQuickAttendanceDto` at top):

```typescript
  /** Tag prepended to adHocNotes so admin can distinguish Presensi Cepat from Sesi Darurat. */
  static readonly QUICK_TAG = '[PRESENSI-CEPAT]'

  /**
   * Presensi Cepat: teacher submits students + statuses only. Subject is resolved
   * from active enrollments, date/time from submission time, duration fixed at 30min.
   * Students are grouped per subject; one PENDING_APPROVAL SessionLog per group.
   */
  async submitQuickAttendance(dto: SubmitQuickAttendanceDto, teacherId: string) {
    const studentIds = [...new Set(dto.students.map(s => s.studentId))]
    if (studentIds.length !== dto.students.length) {
      throw new BadRequestException('Terdapat siswa duplikat dalam satu submit')
    }

    const [branch, students, enrollments] = await Promise.all([
      this.prisma.branch.findUnique({ where: { id: dto.branchId } }),
      this.prisma.student.findMany({
        where: { id: { in: studentIds }, isActive: true },
        select: { id: true, name: true, sureName: true },
      }),
      this.prisma.studentSubject.findMany({
        where: { studentId: { in: studentIds }, isActive: true },
        select: { studentId: true, subjectId: true },
      }),
    ])
    if (!branch) throw new NotFoundException('Cabang tidak ditemukan')

    const studentById = new Map(students.map(s => [s.id, s]))
    const missing = studentIds.filter(id => !studentById.has(id))
    if (missing.length > 0) {
      throw new BadRequestException(`${missing.length} siswa tidak ditemukan atau tidak aktif.`)
    }

    const enrollmentsByStudent = new Map<string, string[]>()
    for (const e of enrollments) {
      const arr = enrollmentsByStudent.get(e.studentId) ?? []
      arr.push(e.subjectId)
      enrollmentsByStudent.set(e.studentId, arr)
    }

    // Resolve subject per student (spec 4.2)
    const resolved: { studentId: string; subjectId: string; status: string }[] = []
    for (const s of dto.students) {
      const active = enrollmentsByStudent.get(s.studentId) ?? []
      let subjectId: string
      if (active.length === 1) {
        subjectId = active[0]
      } else {
        if (!s.subjectId) {
          const name = studentById.get(s.studentId)?.name
          throw new BadRequestException(`Pilih mata pelajaran untuk siswa ${name}.`)
        }
        if (active.length > 1 && !active.includes(s.subjectId)) {
          const name = studentById.get(s.studentId)?.name
          throw new BadRequestException(`Mapel yang dipilih tidak sesuai enrollment aktif siswa ${name}.`)
        }
        subjectId = s.subjectId
      }
      resolved.push({ studentId: s.studentId, subjectId, status: s.status })
    }

    const subjectIds = [...new Set(resolved.map(r => r.subjectId))]
    const subjects = await this.prisma.subject.findMany({ where: { id: { in: subjectIds } } })
    if (subjects.length !== subjectIds.length) {
      throw new NotFoundException('Mata pelajaran tidak ditemukan')
    }
    const subjectById = new Map(subjects.map(s => [s.id, s]))

    // Date/time from submission moment (server local time)
    const now = new Date()
    const sessionDate = new Date(now)
    sessionDate.setHours(0, 0, 0, 0)
    const startTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

    // Duplicate detection: same student + subject + date, any flow (not blocking)
    const existingToday = await this.prisma.attendance.findMany({
      where: {
        studentId: { in: studentIds },
        sessionLog: { sessionDate, status: { in: ['PENDING_APPROVAL', 'COMPLETED'] } },
      },
      select: {
        studentId: true,
        sessionLog: { select: { adHocSubjectId: true, session: { select: { subjectId: true } } } },
      },
    })
    const duplicates = resolved.filter(r =>
      existingToday.some(
        d =>
          d.studentId === r.studentId &&
          (d.sessionLog.adHocSubjectId ?? d.sessionLog.session?.subjectId) === r.subjectId,
      ),
    )

    // Group per subject
    const groups = new Map<string, typeof resolved>()
    for (const r of resolved) {
      const g = groups.get(r.subjectId) ?? []
      g.push(r)
      groups.set(r.subjectId, g)
    }

    const recordedAt = new Date()
    const createdLogs = await this.prisma.$transaction(async tx => {
      const logs: { log: any; subjectId: string; members: typeof resolved }[] = []
      for (const [subjectId, members] of groups) {
        const log = await tx.sessionLog.create({
          data: {
            sessionId: null,
            sessionDate,
            scheduledTeacherId: teacherId,
            actualTeacherId: teacherId,
            isReplacement: false,
            isAdHoc: true,
            adHocBranchId: dto.branchId,
            adHocSubjectId: subjectId,
            adHocStartTime: startTime,
            adHocDuration: 30,
            adHocNotes: AttendanceService.QUICK_TAG,
            status: 'PENDING_APPROVAL',
          },
        })
        await tx.attendance.createMany({
          data: members.map(m => ({
            sessionLogId: log.id,
            studentId: m.studentId,
            status: m.status as any,
            recordedById: teacherId,
            recordedAt,
          })),
        })
        logs.push({ log, subjectId, members })
      }
      return logs
    })

    return {
      success: true,
      data: {
        sessionLogs: createdLogs.map(({ log, subjectId, members }) => ({
          id: log.id,
          subjectId,
          subjectName: subjectById.get(subjectId)!.name,
          trackingType: subjectById.get(subjectId)!.trackingType,
          studentCount: members.length,
          hadirCount: members.filter(m => m.status === 'HADIR').length,
        })),
        duplicateWarnings: duplicates.map(d => ({
          studentId: d.studentId,
          studentName: studentById.get(d.studentId)?.name,
          subjectName: subjectById.get(d.subjectId)?.name,
        })),
      },
      message: `Presensi tercatat (${createdLogs.length} sesi). Menunggu persetujuan admin.`,
    }
  }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/backend && pnpm test -- attendance.service.spec.ts`
Expected: PASS (all describe blocks, including pre-existing ones)

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/modules/attendance/attendance.service.ts apps/backend/src/modules/attendance/attendance.service.spec.ts
git commit -m "feat(backend): add submitQuickAttendance with per-subject group split"
```

---

### Task 4: Backend — POST /attendance/quick endpoint

**Files:**
- Modify: `apps/backend/src/modules/attendance/attendance.controller.ts`

- [ ] **Step 1: Add import and route.** Extend the DTO import line:

```typescript
import { SubmitQuickAttendanceDto, ApproveAdHocBatchDto, RejectAdHocBatchDto } from './dto/submit-quick-attendance.dto'
```

Add after the `submitAdHoc` handler:

```typescript
  @Post('quick')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN_GLOBAL', 'ADMIN_CABANG', 'GURU')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Submit Presensi Cepat (tap-tap attendance)',
    description:
      'Teacher submits students + statuses only. Subject resolved from enrollments, ' +
      'date/time from submission time, duration 30min. Students grouped per subject into ' +
      'separate PENDING_APPROVAL session logs. Duplicate same-day submissions are flagged, not blocked.',
  })
  @ApiResponse({ status: 201, description: 'Attendance recorded, pending admin approval' })
  async submitQuick(
    @Body() dto: SubmitQuickAttendanceDto,
    @CurrentUser() user: any,
  ): Promise<any> {
    return this.attendanceService.submitQuickAttendance(dto, user.id)
  }
```

- [ ] **Step 2: Verify**

Run: `pnpm type-check`, restart backend, confirm `POST /attendance/quick` appears in Swagger.

- [ ] **Step 3: Commit**

```bash
git add apps/backend/src/modules/attendance/attendance.controller.ts
git commit -m "feat(backend): expose POST /attendance/quick endpoint"
```

---

### Task 5: Backend — pending list filters + badges (source, walk-in, duplicate)

**Files:**
- Modify: `apps/backend/src/modules/attendance/attendance.service.ts:463-487` (replace `getAdHocPending`)
- Modify: `apps/backend/src/modules/attendance/attendance.controller.ts:121-131` (replace `getAdHocPending` route)

- [ ] **Step 1: Replace `getAdHocPending` in the service**

```typescript
  async getAdHocPending(filters: {
    branchId?: string
    teacherId?: string
    dateFrom?: string
    dateTo?: string
  } = {}) {
    const where: any = {
      isAdHoc: true,
      status: 'PENDING_APPROVAL',
    }
    if (filters.branchId) where.adHocBranchId = filters.branchId
    if (filters.teacherId) where.actualTeacherId = filters.teacherId
    if (filters.dateFrom || filters.dateTo) {
      where.sessionDate = {}
      if (filters.dateFrom) {
        const d = new Date(filters.dateFrom)
        d.setHours(0, 0, 0, 0)
        where.sessionDate.gte = d
      }
      if (filters.dateTo) {
        const d = new Date(filters.dateTo)
        d.setHours(23, 59, 59, 999)
        where.sessionDate.lte = d
      }
    }

    const logs = await this.prisma.sessionLog.findMany({
      // Single JOIN for relations instead of one query per relation.
      relationLoadStrategy: 'join',
      where,
      include: {
        actualTeacher: true,
        adHocBranch: true,
        adHocSubject: true,
        attendances: { include: { student: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Badge data: walk-in (no active enrollment for the log's subject) and
    // duplicate (same student+subject+date in another pending/completed log).
    const allStudentIds = [...new Set(logs.flatMap(l => l.attendances.map(a => a.studentId)))]
    const logSubjectIds = [...new Set(logs.map(l => l.adHocSubjectId).filter(Boolean))] as string[]

    const [activeEnrollments, sameDayAttendances] = allStudentIds.length
      ? await Promise.all([
          this.prisma.studentSubject.findMany({
            where: { studentId: { in: allStudentIds }, subjectId: { in: logSubjectIds }, isActive: true },
            select: { studentId: true, subjectId: true },
          }),
          this.prisma.attendance.findMany({
            where: {
              studentId: { in: allStudentIds },
              sessionLog: { status: { in: ['PENDING_APPROVAL', 'COMPLETED'] } },
            },
            select: {
              studentId: true,
              sessionLogId: true,
              sessionLog: {
                select: {
                  sessionDate: true,
                  adHocSubjectId: true,
                  session: { select: { subjectId: true } },
                },
              },
            },
          }),
        ])
      : [[], []]

    const enrolledSet = new Set(activeEnrollments.map(e => `${e.studentId}:${e.subjectId}`))

    return {
      success: true,
      data: logs.map(l => {
        const dateKey = l.sessionDate.toISOString().split('T')[0]
        const duplicateStudentNames = l.attendances
          .filter(att =>
            sameDayAttendances.some(
              other =>
                other.sessionLogId !== l.id &&
                other.studentId === att.studentId &&
                other.sessionLog.sessionDate.toISOString().split('T')[0] === dateKey &&
                (other.sessionLog.adHocSubjectId ?? other.sessionLog.session?.subjectId) === l.adHocSubjectId,
            ),
          )
          .map(att => att.student?.name)
        return {
          ...this.formatAdHocLog(l),
          source: l.adHocNotes?.startsWith(AttendanceService.QUICK_TAG) ? 'CEPAT' : 'DARURAT',
          hasWalkIn: l.attendances.some(att => !enrolledSet.has(`${att.studentId}:${l.adHocSubjectId}`)),
          duplicateStudentNames,
        }
      }),
    }
  }
```

- [ ] **Step 2: Replace the controller route (keeps `branchId` backward-compatible, adds filters)**

```typescript
  @Get('adhoc/pending')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN_GLOBAL', 'ADMIN_CABANG')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get pending ad-hoc sessions awaiting approval',
    description:
      'Returns ad-hoc session logs with status PENDING_APPROVAL, from both Sesi Darurat and Presensi Cepat. ' +
      'Each item carries source (CEPAT/DARURAT), hasWalkIn, and duplicateStudentNames badges. ' +
      'Optional filters: branchId, teacherId, dateFrom, dateTo.',
  })
  async getAdHocPending(
    @Query('branchId') branchId?: string,
    @Query('teacherId') teacherId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ): Promise<any> {
    return this.attendanceService.getAdHocPending({ branchId, teacherId, dateFrom, dateTo })
  }
```

- [ ] **Step 3: Verify existing tests still pass + type-check**

Run: `cd apps/backend && pnpm test -- attendance.service.spec.ts && cd ../.. && pnpm type-check`
Expected: PASS. Note: the old signature was `getAdHocPending(branchId?: string)` — the only backend caller is the controller (updated in Step 2). The frontend caller is updated in Task 7.

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/modules/attendance/attendance.service.ts apps/backend/src/modules/attendance/attendance.controller.ts
git commit -m "feat(backend): pending ad-hoc list gains filters and source/walk-in/duplicate badges"
```

---

### Task 6: Backend — batch approve / batch reject (TDD)

**Files:**
- Modify: `apps/backend/src/modules/attendance/attendance.service.ts`
- Modify: `apps/backend/src/modules/attendance/attendance.controller.ts`
- Test: `apps/backend/src/modules/attendance/attendance.service.spec.ts` (append)

- [ ] **Step 1: Write failing tests** — append to the spec file:

```typescript
describe('AttendanceService batch approval', () => {
  let service: AttendanceService
  let prisma: any

  beforeEach(async () => {
    prisma = {
      sessionLog: {
        findUnique: jest.fn(),
        update: jest.fn().mockImplementation(async ({ where }: any) => ({
          id: where.id,
          sessionDate: new Date('2026-07-08'),
          attendances: [],
        })),
      },
    }
    const moduleRef = await Test.createTestingModule({
      providers: [AttendanceService, { provide: PrismaService, useValue: prisma }],
    }).compile()
    service = moduleRef.get(AttendanceService)
  })

  it('approves valid items and skips already-processed ones', async () => {
    prisma.sessionLog.findUnique
      .mockResolvedValueOnce({ id: 'log-1', isAdHoc: true, status: 'PENDING_APPROVAL' })
      .mockResolvedValueOnce({ id: 'log-2', isAdHoc: true, status: 'COMPLETED' })

    const result = await service.approveAdHocBatch(
      [{ sessionLogId: 'log-1' }, { sessionLogId: 'log-2' }],
      'admin-1',
    )

    expect(result.data.approved).toEqual(['log-1'])
    expect(result.data.skipped).toHaveLength(1)
    expect(result.data.skipped[0].sessionLogId).toBe('log-2')
  })

  it('applies startTime correction before approving', async () => {
    prisma.sessionLog.findUnique.mockResolvedValue({ id: 'log-1', isAdHoc: true, status: 'PENDING_APPROVAL' })

    await service.approveAdHocBatch([{ sessionLogId: 'log-1', startTime: '14:30' }], 'admin-1')

    const timeUpdate = prisma.sessionLog.update.mock.calls.find(
      (c: any) => c[0].data.adHocStartTime === '14:30',
    )
    expect(timeUpdate).toBeDefined()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/backend && pnpm test -- attendance.service.spec.ts`
Expected: FAIL — `approveAdHocBatch is not a function`

- [ ] **Step 3: Implement.** Add to `attendance.service.ts` after `rejectAdHoc` (note: `approveAdHoc` in these batch loops is called WITHOUT `generateSchedule` — schedule generation stays a single-item action):

```typescript
  /** Batch approve pending ad-hoc logs. Each item is independent: failures/already-processed
   *  items are skipped and reported, the rest proceed. Optional per-item startTime correction. */
  async approveAdHocBatch(items: { sessionLogId: string; startTime?: string }[], adminId: string) {
    const approved: string[] = []
    const skipped: { sessionLogId: string; reason: string }[] = []

    for (const item of items) {
      try {
        const log = await this.prisma.sessionLog.findUnique({ where: { id: item.sessionLogId } })
        if (!log) throw new NotFoundException('Session log tidak ditemukan')
        if (!log.isAdHoc || log.status !== 'PENDING_APPROVAL') {
          throw new BadRequestException(`Status saat ini: ${log?.status}`)
        }
        if (item.startTime) {
          await this.prisma.sessionLog.update({
            where: { id: item.sessionLogId },
            data: { adHocStartTime: item.startTime },
          })
        }
        await this.approveAdHoc(item.sessionLogId, adminId)
        approved.push(item.sessionLogId)
      } catch (err: any) {
        skipped.push({ sessionLogId: item.sessionLogId, reason: err?.message ?? 'unknown error' })
      }
    }

    return {
      success: true,
      data: { approved, skipped },
      message: `${approved.length} sesi disetujui${skipped.length ? `, ${skipped.length} dilewati` : ''}.`,
    }
  }

  /** Batch reject pending ad-hoc logs with a shared reason. Same skip semantics as approveAdHocBatch. */
  async rejectAdHocBatch(sessionLogIds: string[], adminId: string, reason?: string) {
    const rejected: string[] = []
    const skipped: { sessionLogId: string; reason: string }[] = []
    const finalReason = reason?.trim() || 'Ditolak melalui aksi batch oleh admin'

    for (const id of sessionLogIds) {
      try {
        await this.rejectAdHoc(id, adminId, finalReason)
        rejected.push(id)
      } catch (err: any) {
        skipped.push({ sessionLogId: id, reason: err?.message ?? 'unknown error' })
      }
    }

    return {
      success: true,
      data: { rejected, skipped },
      message: `${rejected.length} sesi ditolak${skipped.length ? `, ${skipped.length} dilewati` : ''}.`,
    }
  }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/backend && pnpm test -- attendance.service.spec.ts`
Expected: PASS

- [ ] **Step 5: Add controller routes** after `rejectAdHoc` handler in `attendance.controller.ts`:

```typescript
  @Post('adhoc/approve-batch')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN_GLOBAL', 'ADMIN_CABANG')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Batch approve pending ad-hoc sessions',
    description:
      'Approves multiple PENDING_APPROVAL ad-hoc logs. Already-processed items are skipped and reported. ' +
      'Supports optional per-item startTime correction. Schedule generation is not available in batch mode.',
  })
  async approveAdHocBatch(
    @Body() dto: ApproveAdHocBatchDto,
    @CurrentUser() user: any,
  ): Promise<any> {
    return this.attendanceService.approveAdHocBatch(dto.items, user.id)
  }

  @Post('adhoc/reject-batch')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN_GLOBAL', 'ADMIN_CABANG')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Batch reject pending ad-hoc sessions with a shared reason' })
  async rejectAdHocBatch(
    @Body() dto: RejectAdHocBatchDto,
    @CurrentUser() user: any,
  ): Promise<any> {
    return this.attendanceService.rejectAdHocBatch(dto.sessionLogIds, user.id, dto.reason)
  }
```

- [ ] **Step 6: Verify + commit**

Run: `pnpm type-check`, restart backend, confirm both routes in Swagger.

```bash
git add apps/backend/src/modules/attendance
git commit -m "feat(backend): add batch approve/reject for ad-hoc sessions with time correction"
```

---

### Task 7: Frontend — API helpers

**Files:**
- Modify: `apps/frontend/src/lib/api/endpoints.ts` (attendanceApi block, lines ~175-226; studentApi block ~451)

- [ ] **Step 1: Replace `getAdHocPending` and add new helpers inside `attendanceApi`:**

Replace:
```typescript
  getAdHocPending: (branchId?: string) => {
    const qs = branchId ? `?branchId=${branchId}` : ''
    return apiClient.get(`/attendance/adhoc/pending${qs}`)
  },
```
with:
```typescript
  getAdHocPending: (filters?: { branchId?: string; teacherId?: string; dateFrom?: string; dateTo?: string }) => {
    const params = new URLSearchParams()
    if (filters?.branchId) params.append('branchId', filters.branchId)
    if (filters?.teacherId) params.append('teacherId', filters.teacherId)
    if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom)
    if (filters?.dateTo) params.append('dateTo', filters.dateTo)
    const qs = params.toString()
    return apiClient.get(`/attendance/adhoc/pending${qs ? `?${qs}` : ''}`)
  },

  submitQuick: (data: {
    branchId: string
    students: Array<{ studentId: string; subjectId?: string; status: string }>
  }) => apiClient.post('/attendance/quick', data),

  approveAdHocBatch: (items: Array<{ sessionLogId: string; startTime?: string }>) =>
    apiClient.post('/attendance/adhoc/approve-batch', { items }),

  rejectAdHocBatch: (sessionLogIds: string[], reason?: string) =>
    apiClient.post('/attendance/adhoc/reject-batch', { sessionLogIds, reason }),
```

- [ ] **Step 2: Add to `studentApi`:**

```typescript
  getActiveByBranch: (branchId: string, search?: string) => {
    const params = new URLSearchParams({ branchId })
    if (search) params.append('search', search)
    return apiClient.get(`/students/active-by-branch?${params.toString()}`)
  },
```

- [ ] **Step 3: Fix the existing caller of `getAdHocPending`** in `apps/frontend/src/app/(dashboard)/presensi/page.tsx:140` — change `attendanceApi.getAdHocPending(filters.branchId || undefined)` to `attendanceApi.getAdHocPending({ branchId: filters.branchId || undefined })` (full admin UI rework happens in Task 11; this keeps the page compiling now).

- [ ] **Step 4: Verify + commit**

Run: `pnpm type-check`
Expected: PASS

```bash
git add apps/frontend/src/lib/api/endpoints.ts "apps/frontend/src/app/(dashboard)/presensi/page.tsx"
git commit -m "feat(frontend): add API helpers for presensi cepat and batch approval"
```

---

### Task 8: Frontend — guru Presensi Cepat page

**Files:**
- Create: `apps/frontend/src/app/(guru)/guru/presensi/cepat/page.tsx`

Follows the style of the existing darurat page (Tailwind mobile-first, fixed bottom submit). Chips (not dropdowns) for subject and status. Subject chips render only when a student has ≠1 active subject.

- [ ] **Step 1: Create the page**

```tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { attendanceApi, branchApi, subjectApi, usersApi, studentApi } from '@/lib/api/endpoints'
import { ArrowLeft, Zap, Search, X } from 'lucide-react'

type AttendanceStatus = 'HADIR' | 'ABSEN' | 'IZIN' | 'SAKIT'

interface SelectedStudent {
  studentId: string
  studentName: string
  fullName?: string
  classLevel?: string
  activeSubjects: { subjectId: string; subjectName: string }[]
  subjectId: string   // '' = not chosen yet (required when activeSubjects.length !== 1)
  status: AttendanceStatus
}

const STATUS_STYLES: Record<AttendanceStatus, string> = {
  HADIR: 'bg-green-600 text-white',
  ABSEN: 'bg-red-600 text-white',
  IZIN: 'bg-amber-500 text-white',
  SAKIT: 'bg-purple-600 text-white',
}

export default function PresensiCepatPage() {
  const router = useRouter()

  const [branchId, setBranchId] = useState('')
  const [selected, setSelected] = useState<SelectedStudent[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const searchRef = useRef<HTMLDivElement>(null)

  const { data: userMeData } = useQuery({
    queryKey: ['user-me'],
    queryFn: () => usersApi.getMe(),
  })

  const { data: branchesData } = useQuery({
    queryKey: ['all-branches-system'],
    queryFn: () => branchApi.getAllSystem(),
  })

  // All branch subjects — only needed for walk-in students (no active enrollment)
  const { data: subjectsData } = useQuery({
    queryKey: ['subjects-all'],
    queryFn: () => subjectApi.getAll(),
  })

  const { data: searchData, isFetching: searching } = useQuery({
    queryKey: ['active-students-search', branchId, searchQuery],
    queryFn: () => studentApi.getActiveByBranch(branchId, searchQuery),
    enabled: !!branchId && searchQuery.length >= 2,
  })

  // Auto-select primary branch
  useEffect(() => {
    const primaryBranchId = userMeData?.data?.data?.primaryBranchId
    if (primaryBranchId && !branchId) setBranchId(primaryBranchId)
  }, [userMeData?.data?.data?.primaryBranchId, branchId])

  // Reset when branch changes
  useEffect(() => {
    setSelected([])
    setSearchQuery('')
  }, [branchId])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowDropdown(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const branches = branchesData?.data?.data || []
  const allSubjects = subjectsData?.data?.data || []
  const searchResults: any[] = (searchData?.data?.data || []).filter(
    (s: any) => !selected.some(sel => sel.studentId === s.studentId),
  )

  const addStudent = (s: any) => {
    setSelected(prev => [
      ...prev,
      {
        studentId: s.studentId,
        studentName: s.studentName,
        fullName: s.fullName,
        classLevel: s.classLevel,
        activeSubjects: s.activeSubjects || [],
        // Exactly 1 enrollment -> auto-set; otherwise teacher must tap a chip
        subjectId: s.activeSubjects?.length === 1 ? s.activeSubjects[0].subjectId : '',
        status: 'HADIR',
      },
    ])
    setSearchQuery('')
    setShowDropdown(false)
  }

  const removeStudent = (studentId: string) =>
    setSelected(prev => prev.filter(s => s.studentId !== studentId))

  const setSubject = (studentId: string, subjectId: string) =>
    setSelected(prev => prev.map(s => (s.studentId === studentId ? { ...s, subjectId } : s)))

  const setStatus = (studentId: string, status: AttendanceStatus) =>
    setSelected(prev => prev.map(s => (s.studentId === studentId ? { ...s, status } : s)))

  const missingSubject = selected.filter(s => s.activeSubjects.length !== 1 && !s.subjectId)
  const canSubmit = selected.length > 0 && missingSubject.length === 0 && !isSubmitting

  const handleSubmit = async () => {
    setError('')
    if (!branchId) return setError('Pilih cabang terlebih dahulu')
    if (selected.length === 0) return setError('Tambahkan minimal satu siswa')
    if (missingSubject.length > 0) {
      return setError(`Pilih mapel untuk: ${missingSubject.map(s => s.studentName).join(', ')}`)
    }

    try {
      setIsSubmitting(true)
      const result = await attendanceApi.submitQuick({
        branchId,
        students: selected.map(s => ({
          studentId: s.studentId,
          // Send explicit subjectId only when the student had a chip choice
          subjectId: s.activeSubjects.length === 1 ? undefined : s.subjectId,
          status: s.status,
        })),
      })

      const logs: any[] = result.data?.data?.sessionLogs || []
      // Sequential progress input: first log now, rest via queue param (logId:subjectId,...)
      const withPresent = logs
      if (withPresent.length === 0) {
        router.push('/guru/presensi/darurat/selesai')
        return
      }
      const [first, ...rest] = withPresent
      const queue = rest.map(l => `${l.id}:${l.subjectId}`).join(',')
      router.push(
        `/guru/presensi/darurat/progress?sessionLogId=${first.id}&subjectId=${first.subjectId}` +
          (queue ? `&queue=${queue}` : ''),
      )
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal submit presensi')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="px-4 py-4 space-y-5 pb-32">
      <Link href="/guru/presensi" className="flex items-center gap-2 text-blue-600 text-sm font-medium">
        <ArrowLeft className="w-4 h-4" />
        Kembali
      </Link>

      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Zap className="w-5 h-5 text-blue-500" />
          Presensi Cepat
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Cari siswa, tap kehadiran, submit. Mapel & waktu otomatis.
        </p>
      </div>

      {/* Branch */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          Cabang <span className="text-red-500">*</span>
        </label>
        <select
          value={branchId}
          onChange={e => setBranchId(e.target.value)}
          className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-white"
        >
          <option value="">-- Pilih Cabang --</option>
          {branches.map((b: any) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </div>

      {/* Student search */}
      {branchId && (
        <div ref={searchRef} className="relative">
          <div className="flex items-center gap-2 border border-gray-300 rounded-lg p-2.5 bg-white">
            <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="Cari nama siswa..."
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setShowDropdown(true) }}
              onFocus={() => setShowDropdown(true)}
              className="flex-1 text-sm bg-transparent outline-none placeholder-gray-400"
            />
            {searchQuery && (
              <button onClick={() => { setSearchQuery(''); setShowDropdown(false) }}>
                <X className="w-3.5 h-3.5 text-gray-400" />
              </button>
            )}
          </div>
          {showDropdown && searchQuery.length >= 2 && (
            <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-20 mt-1 max-h-56 overflow-y-auto">
              {searching ? (
                <p className="text-xs text-gray-400 text-center py-3">Mencari...</p>
              ) : searchResults.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-3">Tidak ada siswa ditemukan</p>
              ) : (
                searchResults.map((s: any) => (
                  <button
                    key={s.studentId}
                    onClick={() => addStudent(s)}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-blue-50 transition text-left"
                  >
                    <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-semibold text-xs flex-shrink-0">
                      {s.studentName?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-800">{s.studentName}</p>
                      {s.fullName && s.fullName !== s.studentName && (
                        <p className="text-xs text-gray-500 truncate">{s.fullName}</p>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-400">
                      {s.activeSubjects?.length
                        ? s.activeSubjects.map((sub: any) => sub.subjectName).join(', ')
                        : 'Belum terdaftar mapel'}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Selected students */}
      <div className="space-y-2">
        {selected.map(student => {
          const showSubjectChips = student.activeSubjects.length !== 1
          const chipSubjects = student.activeSubjects.length > 1
            ? student.activeSubjects
            : allSubjects.map((s: any) => ({ subjectId: s.id, subjectName: s.name }))
          return (
            <div key={student.studentId} className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm space-y-2">
              <div className="flex items-center gap-2">
                <p className="font-medium text-gray-900 text-sm flex-1">{student.studentName}</p>
                {student.activeSubjects.length === 0 && (
                  <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-medium">Walk-in</span>
                )}
                <button onClick={() => removeStudent(student.studentId)} className="text-gray-300 hover:text-red-400 p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {showSubjectChips && (
                <div>
                  <p className="text-[11px] text-gray-400 mb-1">
                    Mapel <span className="text-red-500">*</span>
                  </p>
                  <div className="flex gap-1.5 flex-wrap">
                    {chipSubjects.map(sub => (
                      <button
                        key={sub.subjectId}
                        onClick={() => setSubject(student.studentId, sub.subjectId)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                          student.subjectId === sub.subjectId
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-600 border border-gray-200'
                        }`}
                      >
                        {sub.subjectName}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {!showSubjectChips && (
                <p className="text-[11px] text-gray-400">{student.activeSubjects[0].subjectName}</p>
              )}

              <div className="flex gap-1.5 flex-wrap">
                {(['HADIR', 'ABSEN', 'IZIN', 'SAKIT'] as AttendanceStatus[]).map(st => (
                  <button
                    key={st}
                    onClick={() => setStatus(student.studentId, st)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                      student.status === st ? STATUS_STYLES[st] : 'bg-gray-100 text-gray-600 border border-gray-200'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          )
        })}

        {branchId && selected.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-4">
            Cari dan tambahkan siswa yang hadir sekarang.
          </p>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">{error}</div>
      )}

      {/* Fixed bottom submit */}
      <div className="fixed bottom-16 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-200 p-3 z-40">
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          {isSubmitting ? 'Menyimpan...' : `Submit Presensi (${selected.length})`}
        </button>
        <p className="text-xs text-gray-500 text-center mt-1">
          Waktu & durasi otomatis · Menunggu persetujuan admin sebelum masuk komisi
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify + commit**

Run: `pnpm type-check`
Expected: PASS

```bash
git add "apps/frontend/src/app/(guru)/guru/presensi/cepat/page.tsx"
git commit -m "feat(frontend): add Presensi Cepat tap-tap page for teachers"
```

---

### Task 9: Frontend — progress queue (sequential per-subject) + last-module pre-fill

**Files:**
- Modify: `apps/frontend/src/app/(guru)/guru/presensi/darurat/progress/page.tsx`

- [ ] **Step 1: Add queue support.** In `DaruratProgressContent`, after `const subjectId = searchParams.get('subjectId')` add:

```typescript
  const queue = searchParams.get('queue') // "logId:subjectId,logId:subjectId" — set by Presensi Cepat

  const goNext = () => {
    if (queue) {
      const [next, ...rest] = queue.split(',')
      const [nextLog, nextSubj] = next.split(':')
      router.push(
        `/guru/presensi/darurat/progress?sessionLogId=${nextLog}&subjectId=${nextSubj}` +
          (rest.length ? `&queue=${rest.join(',')}` : ''),
      )
    } else {
      router.push('/guru/presensi/darurat/selesai')
    }
  }
```

Then replace ALL THREE `router.push('/guru/presensi/darurat/selesai')` calls (in `handleSkip` at line ~93, in `handleSubmit` at line ~122, and any inline usage) with `goNext()`.

- [ ] **Step 2: Show remaining-subject indicator.** In the header `<div>` containing `<h1>{sessionLog?.subjectName}</h1>` add below the `<p>` line:

```tsx
        {queue && (
          <p className="text-xs text-blue-600 mt-1 font-medium">
            {queue.split(',').length} mapel lagi setelah ini
          </p>
        )}
```

- [ ] **Step 3: Pre-fill module/chapter from student's last position.** Add import: change `useQuery` import line to `import { useQuery, useQueries } from '@tanstack/react-query'`. After the `modulesData` query add:

```typescript
  // Pre-fill each student's module/chapter from their last recorded position (spec 5.3)
  const lastModuleQueries = useQueries({
    queries: presentStudents.map((s: any) => ({
      queryKey: ['last-module', s.studentId, subjectId],
      queryFn: () => progressApi.getStudentLastModule(s.studentId, subjectId!),
      enabled: !!subjectId && isModuleBased && presentStudents.length > 0,
      staleTime: 60_000,
    })),
  })
```

NOTE: `presentStudents` is currently declared AFTER the queries — move the `sessionLog`, `modules`, `isModuleBased`, `presentStudents` declarations (lines ~62-65) UP so they sit directly below the `logData` query and above `modulesData`, keeping declaration order valid.

Then add an effect after the existing init `useEffect`:

```typescript
  // Merge pre-fill once per student, only while their moduleId is still unset
  useEffect(() => {
    if (!isModuleBased) return
    lastModuleQueries.forEach((q, idx) => {
      const student = presentStudents[idx]
      const last = q.data?.data?.data
      if (!student || !last?.moduleId) return
      setModuleProgress(prev => {
        const current = prev[student.studentId]
        if (!current || current.moduleId) return prev
        const startChapter = Math.min((last.currentChapter ?? 0) + 1, last.totalChapters || 1)
        return {
          ...prev,
          [student.studentId]: {
            ...current,
            moduleId: last.moduleId,
            chapterFrom: startChapter,
            chapterTo: startChapter,
          },
        }
      })
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastModuleQueries.map(q => q.dataUpdatedAt).join(','), isModuleBased])
```

- [ ] **Step 4: Verify + commit**

Run: `pnpm type-check`. Then manual check: submit a quick attendance with 2 subjects via the UI (or hit the API), confirm the progress page walks both subjects then lands on selesai; confirm module fields arrive pre-filled for a student with existing `StudentModuleProgress`.

```bash
git add "apps/frontend/src/app/(guru)/guru/presensi/darurat/progress/page.tsx"
git commit -m "feat(frontend): sequential progress queue and last-module pre-fill"
```

---

### Task 10: Frontend — menu entry on guru presensi page

**Files:**
- Modify: `apps/frontend/src/app/(guru)/guru/presensi/page.tsx` (the darurat CTA is at line ~182: `href="/guru/presensi/darurat"`)

- [ ] **Step 1: Add a "Presensi Cepat" card ABOVE the existing Sesi Darurat link block.** Locate the element with `href="/guru/presensi/darurat"` and insert before its containing block:

```tsx
          <Link
            href="/guru/presensi/cepat"
            className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg p-3 hover:bg-blue-100 transition"
          >
            <div className="w-9 h-9 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-blue-900">Presensi Cepat</p>
              <p className="text-xs text-blue-700">Tap-tap: cari siswa, tandai hadir, selesai</p>
            </div>
          </Link>
```

Add `Zap` to the existing `lucide-react` import in that file. Adjust wrapper classNames to match the immediate siblings if they differ (keep visual consistency with the darurat card).

- [ ] **Step 2: Verify + commit**

Run: `pnpm type-check`; open http://localhost:3001/guru/presensi as a GURU user and confirm the card renders and routes.

```bash
git add "apps/frontend/src/app/(guru)/guru/presensi/page.tsx"
git commit -m "feat(frontend): add Presensi Cepat menu card on guru presensi page"
```

---

### Task 11: Frontend — admin batch approval UI

**Files:**
- Modify: `apps/frontend/src/app/(dashboard)/presensi/page.tsx` (pending ad-hoc section, lines ~124-330)

- [ ] **Step 1: Add batch state + handlers.** Below the existing ad-hoc state block (line ~132) add:

```typescript
  // --- Batch selection ---
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [batchLoading, setBatchLoading] = useState(false)
  const [batchRejectOpen, setBatchRejectOpen] = useState(false)
  const [batchRejectReason, setBatchRejectReason] = useState('')
  const [pendingTeacherId, setPendingTeacherId] = useState('')
  const [pendingDate, setPendingDate] = useState('') // '' = all dates

  const toggleSelected = (id: string) =>
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const toggleSelectAll = () => {
    setSelectedIds(prev =>
      prev.size === pendingAdHocLogs.length
        ? new Set()
        : new Set(pendingAdHocLogs.map((l: any) => l.id)),
    )
  }

  const handleApproveBatch = async () => {
    if (selectedIds.size === 0) return
    try {
      setBatchLoading(true)
      const res = await attendanceApi.approveAdHocBatch(
        [...selectedIds].map(id => ({ sessionLogId: id })),
      )
      const skipped = res.data?.data?.skipped || []
      if (skipped.length > 0) {
        alert(`${skipped.length} sesi dilewati (sudah diproses admin lain atau berubah status).`)
      }
      setSelectedIds(new Set())
      await refetchPendingAdHoc()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal menyetujui batch')
    } finally {
      setBatchLoading(false)
    }
  }

  const handleRejectBatch = async () => {
    if (selectedIds.size === 0) return
    try {
      setBatchLoading(true)
      await attendanceApi.rejectAdHocBatch([...selectedIds], batchRejectReason || undefined)
      setSelectedIds(new Set())
      setBatchRejectOpen(false)
      setBatchRejectReason('')
      await refetchPendingAdHoc()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal menolak batch')
    } finally {
      setBatchLoading(false)
    }
  }
```

- [ ] **Step 2: Wire filters into the pending query.** Replace the `useQuery` at line ~134-141 with:

```typescript
  const {
    data: pendingAdHocData,
    isLoading: loadingPendingAdHoc,
    refetch: refetchPendingAdHoc,
  } = useQuery({
    queryKey: ['adhoc-pending', filters.branchId, pendingTeacherId, pendingDate],
    queryFn: () =>
      attendanceApi.getAdHocPending({
        branchId: filters.branchId || undefined,
        teacherId: pendingTeacherId || undefined,
        dateFrom: pendingDate || undefined,
        dateTo: pendingDate || undefined,
      }),
  })
```

Also add an effect to clear stale selections when the list changes:

```typescript
  useEffect(() => {
    setSelectedIds(prev => {
      const valid = new Set(pendingAdHocLogs.map((l: any) => l.id))
      return new Set([...prev].filter(id => valid.has(id)))
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingAdHocData])
```

- [ ] **Step 3: Add the filter bar + select-all row.** Inside the expanded panel (`{adHocExpanded && (<div className="p-4">`), before the loading/empty branches, insert:

```tsx
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <select
                value={pendingTeacherId}
                onChange={e => setPendingTeacherId(e.target.value)}
                className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs bg-white"
              >
                <option value="">Semua Guru</option>
                {teachers.map((t: any) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <input
                type="date"
                value={pendingDate}
                onChange={e => setPendingDate(e.target.value)}
                className="border border-gray-300 rounded-lg px-2 py-1 text-xs"
              />
              {pendingDate && (
                <button onClick={() => setPendingDate('')} className="text-xs text-blue-600">Semua tanggal</button>
              )}
            </div>

            {pendingAdHocLogs.length > 0 && (
              <label className="flex items-center gap-2 pb-2 mb-2 border-b border-orange-100 text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedIds.size === pendingAdHocLogs.length && pendingAdHocLogs.length > 0}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 accent-orange-600"
                />
                Pilih semua ({pendingAdHocLogs.length})
              </label>
            )}
```

- [ ] **Step 4: Add checkbox + badges per row.** In the `pendingAdHocLogs.map((log: any) => (...))` card (line ~275), wrap the existing header content: add a checkbox as the first element of the card's top flex row:

```tsx
                      <input
                        type="checkbox"
                        checked={selectedIds.has(log.id)}
                        onChange={() => toggleSelected(log.id)}
                        className="w-4 h-4 mt-1 accent-orange-600 flex-shrink-0"
                      />
```

And next to `<p className="font-semibold text-gray-900">{log.subjectName}</p>` add the badges:

```tsx
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                          log.source === 'CEPAT' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                        }`}>
                          {log.source === 'CEPAT' ? 'Cepat' : 'Darurat'}
                        </span>
                        {log.hasWalkIn && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-red-100 text-red-700">
                            Siswa walk-in
                          </span>
                        )}
                        {log.duplicateStudentNames?.length > 0 && (
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-amber-100 text-amber-700"
                            title={`Duplikat hari ini: ${log.duplicateStudentNames.join(', ')}`}
                          >
                            Duplikat hari ini
                          </span>
                        )}
```

- [ ] **Step 5: Add the batch action bar** right after the select-all label (visible when `selectedIds.size > 0`):

```tsx
            {selectedIds.size > 0 && (
              <div className="flex gap-2 mb-3">
                <button
                  onClick={handleApproveBatch}
                  disabled={batchLoading}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition disabled:opacity-50"
                >
                  {batchLoading ? 'Memproses...' : `Setujui yang Dipilih (${selectedIds.size})`}
                </button>
                <button
                  onClick={() => setBatchRejectOpen(true)}
                  disabled={batchLoading}
                  className="flex-1 border border-red-300 text-red-600 hover:bg-red-50 text-sm font-medium px-4 py-2 rounded-lg transition disabled:opacity-50"
                >
                  Tolak yang Dipilih
                </button>
              </div>
            )}
```

- [ ] **Step 6: Add the batch reject modal** at the end of the component's JSX (same pattern as existing modals — `fixed inset-0 bg-black/50 z-50`):

```tsx
      {batchRejectOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-5 w-full max-w-sm space-y-3">
            <h3 className="font-semibold text-gray-900">Tolak {selectedIds.size} sesi terpilih?</h3>
            <textarea
              value={batchRejectReason}
              onChange={e => setBatchRejectReason(e.target.value)}
              placeholder="Alasan penolakan (opsional, berlaku untuk semua)"
              rows={3}
              className="w-full border border-gray-300 rounded-lg p-2.5 text-sm resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setBatchRejectOpen(false)}
                className="flex-1 border border-gray-300 text-gray-700 text-sm font-medium py-2 rounded-lg"
              >
                Batal
              </button>
              <button
                onClick={handleRejectBatch}
                disabled={batchLoading}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm font-medium py-2 rounded-lg disabled:opacity-50"
              >
                {batchLoading ? 'Memproses...' : 'Tolak Semua'}
              </button>
            </div>
          </div>
        </div>
      )}
```

- [ ] **Step 7: Verify + commit**

Run: `pnpm type-check`. Manual: open /presensi as admin, confirm filters, select-all, badges render; per-item approve modal (with generate-schedule option) still works untouched.

```bash
git add "apps/frontend/src/app/(dashboard)/presensi/page.tsx"
git commit -m "feat(frontend): batch approval UI with filters and source/walk-in/duplicate badges"
```

---

### Task 12: Parent report — monthly summary (backend + frontend)

**Files:**
- Modify: `apps/backend/src/modules/progress-reports/progress-reports.service.ts` (`findByToken` lines 82-135, `buildSubjectReports` lines 143+)
- Modify: `apps/frontend/src/app/laporan/[token]/page.tsx`

- [ ] **Step 1: Backend — add monthly attendance summary to `findByToken`.** After the `viewCount` update (line ~114), add:

```typescript
    // Monthly attendance summary across the reported subjects (current calendar month)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthAttendances = await this.prisma.attendance.findMany({
      where: {
        studentId: link.studentId,
        sessionLog: {
          sessionDate: { gte: monthStart },
          status: 'COMPLETED',
          OR: [
            { adHocSubjectId: { in: link.subjectIds } },
            { session: { subjectId: { in: link.subjectIds } } },
          ],
        },
      },
      select: { status: true },
    })
    const monthlySummary = {
      month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
      totalSessions: monthAttendances.length,
      hadir: monthAttendances.filter(a => a.status === 'HADIR').length,
    }
```

And include `monthlySummary,` in the returned `data` object (next to `subjectReports`).

- [ ] **Step 2: Backend — add `lastPredicate` per subject.** In `buildSubjectReports`, both branches (MODULE_BASED and FREE_MATERIAL) already fetch `recentLogs` ordered by `recordedAt desc`. In each branch's returned object add:

```typescript
            lastPredicate: recentLogs[0]?.predicate ?? null,
```

(For the FREE_MATERIAL branch, read the file at implementation time to locate its equivalent `recentLogs` variable — it follows the same shape below line 221.)

- [ ] **Step 3: Frontend — summary section.** In `apps/frontend/src/app/laporan/[token]/page.tsx`, locate where `subjectReports` starts rendering (read the file to find the render section — it maps `data.subjectReports`). Insert ABOVE it:

```tsx
      {/* Ringkasan Bulan Ini */}
      {report.monthlySummary && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <h2 className="text-sm font-bold text-gray-900">📊 Ringkasan Bulan Ini</h2>
          <p className="text-sm text-gray-700">
            Kehadiran:{' '}
            <span className="font-semibold">
              {report.monthlySummary.hadir}/{report.monthlySummary.totalSessions} sesi
              {report.monthlySummary.totalSessions > 0 &&
                ` (${Math.round((report.monthlySummary.hadir / report.monthlySummary.totalSessions) * 100)}%)`}
            </span>
          </p>
          {report.subjectReports?.map((subj: any) => (
            <div key={subj.subjectId} className="space-y-1">
              <p className="text-sm font-medium text-gray-800">{subj.subjectName}</p>
              {subj.trackingType === 'MODULE_BASED' ? (
                <>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-blue-500 rounded-full h-2 transition-all"
                      style={{
                        width: `${subj.totalModules > 0 ? Math.round((subj.completedModules / subj.totalModules) * 100) : 0}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    Modul {subj.completedModules} dari {subj.totalModules} selesai
                  </p>
                </>
              ) : (
                <p className="text-xs text-gray-500">
                  {subj.recentSessions?.length || 0} sesi terakhir tercatat
                </p>
              )}
              {subj.lastPredicate && (
                <p className="text-xs text-gray-600">
                  Predikat terakhir:{' '}
                  <span className="font-medium">
                    {String(subj.lastPredicate).replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}
                  </span>
                </p>
              )}
            </div>
          ))}
        </div>
      )}
```

Adapt the variable name (`report` vs whatever the page uses for `data.data.data`) and container classNames to the page's existing wrappers when integrating — read the surrounding code first.

- [ ] **Step 4: Verify + commit**

Run: `pnpm type-check`. Manual: open an existing `/laporan/[token]` link, confirm summary shows above per-session detail and per-session detail is unchanged.

```bash
git add apps/backend/src/modules/progress-reports/progress-reports.service.ts "apps/frontend/src/app/laporan/[token]/page.tsx"
git commit -m "feat: add monthly visual summary to parent progress report"
```

---

### Task 13: Final verification

- [ ] **Step 1: Full test suite + type-check**

Run: `cd apps/backend && pnpm test` then `cd ../.. && pnpm type-check`
Expected: all PASS

- [ ] **Step 2: End-to-end smoke test (manual, both flows)**

1. As GURU: `/guru/presensi` → "Presensi Cepat" → add 2 students with different subjects → submit → progress screen for subject 1 → "1 mapel lagi setelah ini" → progress screen for subject 2 → selesai.
2. As GURU: old `/guru/presensi/darurat` flow still works identically (regression).
3. As ADMIN: `/presensi` → pending section shows both logs with "Cepat" badges → select all → approve batch → logs become COMPLETED.
4. Submit the same student+subject again via cepat → new pending item shows "Duplikat hari ini" badge.
5. Open a `/laporan/[token]` link → summary section renders.

- [ ] **Step 3: Update spec status**

Change the spec header `**Status:**` line in `docs/superpowers/specs/2026-07-02-tap-tap-presensi-darurat-design.md` to `Implemented — see docs/superpowers/plans/2026-07-08-presensi-cepat.md`.

```bash
git add docs/superpowers/specs/2026-07-02-tap-tap-presensi-darurat-design.md
git commit -m "docs: mark presensi cepat spec as implemented"
```
