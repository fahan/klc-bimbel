# Enrollment Form: Admin Cabang Branch Lock + Optional Scheduling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the student enrollment form so the branch field auto-locks for ADMIN_CABANG users, and make the "Pilih jadwal" (scheduling) step in Step 3 optional so students can be registered without an assigned session and scheduled later.

**Architecture:** Frontend `EnrollmentStep1` switches its branch source from an unfiltered `branchApi.getAll()` query to the existing `BranchContext` (already used by `Topbar` to lock/filter branches per role) and renders a locked, non-editable field when the user is a single-branch ADMIN_CABANG. `EnrollmentStep3` gets a second "skip" action alongside the existing "select all then continue" flow. On the backend, `EnrollSubjectDto.sessionId` becomes optional and `StudentsService.enrollStudent()` conditionally skips session lookup/validation and `SessionStudent` creation when no session was chosen — mirroring the same optional-session pattern already used by `updateSubjectEnrollment()` for editing subjects after enrollment.

**Tech Stack:** NestJS 10 + Prisma 5 (backend), Next.js 14 + React Hook Form + TanStack Query (frontend), Jest for backend unit tests (no frontend test framework exists — frontend changes are verified manually in the browser per project convention).

**Spec:** `docs/superpowers/specs/2026-07-02-enrollment-form-admin-cabang-optional-schedule-design.md`

---

### Task 1: Backend — make `sessionId` optional in enrollment DTOs

**Files:**
- Modify: `apps/backend/src/modules/students/dto/enrollment.dto.ts:24-27` (`EnrollSubjectDto.sessionId`)
- Modify: `apps/backend/src/modules/students/dto/enrollment.dto.ts:59-66` (`EnrolledSubjectSummaryDto` session fields)

- [ ] **Step 1: Make `EnrollSubjectDto.sessionId` optional**

In `apps/backend/src/modules/students/dto/enrollment.dto.ts`, replace:

```ts
  @ApiProperty({ example: 'session_id_123' })
  @IsString()
  sessionId!: string
```

with:

```ts
  @ApiProperty({
    example: 'session_id_123',
    required: false,
    description: 'ID sesi jadwal. Kosongkan untuk mendaftarkan tanpa jadwal (bisa dijadwalkan nanti dari halaman Detail Siswa).',
  })
  @IsOptional()
  @IsString()
  sessionId?: string
```

- [ ] **Step 2: Make `EnrolledSubjectSummaryDto` session fields nullable**

In the same file, replace:

```ts
  @ApiProperty()
  sessionDay!: string

  @ApiProperty()
  sessionTime!: string

  @ApiProperty()
  teacherName!: string
```

with:

```ts
  @ApiProperty({ required: false, nullable: true, description: 'Null jika mata pelajaran ini belum dijadwalkan.' })
  sessionDay!: string | null

  @ApiProperty({ required: false, nullable: true })
  sessionTime!: string | null

  @ApiProperty({ required: false, nullable: true })
  teacherName!: string | null
```

- [ ] **Step 3: Type-check the backend**

Run: `pnpm -F apps-backend type-check`
Expected: exits with no errors (the DTO change is backward compatible — nothing currently reads `sessionId` as guaranteed non-optional at the type level outside this file).

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/modules/students/dto/enrollment.dto.ts
git commit -m "feat(backend): allow enrollment without a session (schedule later)"
```

---

### Task 2: Backend — `enrollStudent()` skips session logic when `sessionId` is omitted (TDD)

**Files:**
- Modify: `apps/backend/src/modules/students/students.service.ts:214-317`
- Test: `apps/backend/src/modules/students/students.service.spec.ts` (new file)

- [ ] **Step 1: Write the failing tests**

Create `apps/backend/src/modules/students/students.service.spec.ts`:

```ts
import { Test } from '@nestjs/testing'
import { BadRequestException } from '@nestjs/common'
import { PrismaService } from '@/prisma/prisma.service'
import { StudentsService } from './students.service'

describe('StudentsService.enrollStudent', () => {
  let service: StudentsService
  let prisma: {
    student: { findUnique: jest.Mock }
    subject: { findUnique: jest.Mock }
    session: { findUnique: jest.Mock }
    sppRate: { findFirst: jest.Mock }
    studentSubject: { create: jest.Mock }
    sessionStudent: { create: jest.Mock }
  }

  beforeEach(async () => {
    prisma = {
      student: { findUnique: jest.fn() },
      subject: { findUnique: jest.fn() },
      session: { findUnique: jest.fn() },
      sppRate: { findFirst: jest.fn() },
      studentSubject: { create: jest.fn() },
      sessionStudent: { create: jest.fn() },
    }

    const moduleRef = await Test.createTestingModule({
      providers: [StudentsService, { provide: PrismaService, useValue: prisma }],
    }).compile()

    service = moduleRef.get(StudentsService)

    prisma.student.findUnique.mockResolvedValue({ id: 'student-1', name: 'Budi', branchId: 'branch-1' })
    prisma.subject.findUnique.mockResolvedValue({ id: 'subject-1', name: 'Matematika' })
    prisma.sppRate.findFirst.mockResolvedValue({
      id: 'rate-1',
      amount: '300000',
      effectiveFrom: new Date('2020-01-01'),
      effectiveUntil: null,
    })
    prisma.studentSubject.create.mockResolvedValue({ id: 'studentSubject-1' })
    prisma.sessionStudent.create.mockResolvedValue({ id: 'sessionStudent-1' })
  })

  it('enrolls a subject without a session when sessionId is omitted', async () => {
    const result = await service.enrollStudent('student-1', {
      subjects: [{ subjectId: 'subject-1', type: 'REGULAR' } as any],
    } as any)

    expect(result.success).toBe(true)
    expect(result.data!.enrolledSubjects[0]).toMatchObject({
      subjectId: 'subject-1',
      sessionDay: null,
      sessionTime: null,
      teacherName: null,
    })
    expect(prisma.session.findUnique).not.toHaveBeenCalled()
    expect(prisma.sessionStudent.create).not.toHaveBeenCalled()
    expect(prisma.studentSubject.create).toHaveBeenCalledTimes(1)
  })

  it('enrolls a subject with a session and links it via SessionStudent', async () => {
    prisma.session.findUnique.mockResolvedValue({
      id: 'session-1',
      subjectId: 'subject-1',
      branchId: 'branch-1',
      dayOfWeek: 'SENIN',
      startTime: '15:00:00',
      durationMinutes: 90,
      teacher: { name: 'Pak Andi' },
    })

    const result = await service.enrollStudent('student-1', {
      subjects: [{ subjectId: 'subject-1', type: 'REGULAR', sessionId: 'session-1' } as any],
    } as any)

    expect(result.data!.enrolledSubjects[0]).toMatchObject({
      sessionDay: 'SENIN',
      teacherName: 'Pak Andi',
    })
    expect(prisma.sessionStudent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ sessionId: 'session-1', studentId: 'student-1' }),
      }),
    )
  })

  it('rejects an unknown sessionId instead of silently skipping it', async () => {
    prisma.session.findUnique.mockResolvedValue(null)

    await expect(
      service.enrollStudent('student-1', {
        subjects: [{ subjectId: 'subject-1', type: 'REGULAR', sessionId: 'missing-session' } as any],
      } as any),
    ).rejects.toThrow(BadRequestException)
  })
})
```

- [ ] **Step 2: Run tests to verify the first one fails**

Run: `pnpm -F apps-backend test -- students.service.spec.ts`
Expected: `enrolls a subject without a session when sessionId is omitted` **FAILS** with a `BadRequestException: Session undefined not found` (current code always looks up a session even when `sessionId` is undefined). The other two tests should already **PASS** since they match today's behavior.

- [ ] **Step 3: Implement — make session handling conditional**

In `apps/backend/src/modules/students/students.service.ts`, replace the subject/session validation loop (currently lines 214-268):

```ts
    for (const subjectEnroll of enrollmentRequestDto.subjects) {
      // Get subject
      const subject = await this.prisma.subject.findUnique({
        where: { id: subjectEnroll.subjectId },
      })
      if (!subject) {
        throw new BadRequestException(`Subject ${subjectEnroll.subjectId} not found`)
      }

      // Get session
      const session = await this.prisma.session.findUnique({
        relationLoadStrategy: 'join',
        where: { id: subjectEnroll.sessionId },
        include: { teacher: true },
      })
      if (!session) {
        throw new BadRequestException(`Session ${subjectEnroll.sessionId} not found`)
      }

      // Verify session belongs to correct subject and branch
      if (session.subjectId !== subjectEnroll.subjectId || session.branchId !== student.branchId) {
        throw new BadRequestException('Session does not match subject or branch')
      }

      // Get SPP rate at enrollment date (supports historical data entry)
```

with:

```ts
    for (const subjectEnroll of enrollmentRequestDto.subjects) {
      // Get subject
      const subject = await this.prisma.subject.findUnique({
        where: { id: subjectEnroll.subjectId },
      })
      if (!subject) {
        throw new BadRequestException(`Subject ${subjectEnroll.subjectId} not found`)
      }

      // Get session (optional — scheduling can be done later from the student detail page)
      let session: any = null
      if (subjectEnroll.sessionId) {
        session = await this.prisma.session.findUnique({
          relationLoadStrategy: 'join',
          where: { id: subjectEnroll.sessionId },
          include: { teacher: true },
        })
        if (!session) {
          throw new BadRequestException(`Session ${subjectEnroll.sessionId} not found`)
        }

        // Verify session belongs to correct subject and branch
        if (session.subjectId !== subjectEnroll.subjectId || session.branchId !== student.branchId) {
          throw new BadRequestException('Session does not match subject or branch')
        }
      }

      // Get SPP rate at enrollment date (supports historical data entry)
```

The rest of the loop body (SPP rate lookup and `enrollmentData.push(...)`) stays unchanged — `session` is now `null` instead of a Prisma record when no schedule was picked, and `sessionId: subjectEnroll.sessionId` in the pushed object will be `undefined` in that case.

- [ ] **Step 4: Implement — only create `SessionStudent` rows for scheduled subjects**

In the same file, replace (currently lines 290-302):

```ts
    // Create session_students entries
    await Promise.all(
      enrollmentData.map(data =>
        this.prisma.sessionStudent.create({
          data: {
            sessionId: data.sessionId,
            studentId,
            joinedAt: new Date(),
            isActive: true,
          },
        } as any),
      ),
    )
```

with:

```ts
    // Create session_students entries (only for subjects that were assigned a session)
    await Promise.all(
      enrollmentData
        .filter(data => data.session)
        .map(data =>
          this.prisma.sessionStudent.create({
            data: {
              sessionId: data.sessionId,
              studentId,
              joinedAt: new Date(),
              isActive: true,
            },
          } as any),
        ),
    )
```

- [ ] **Step 5: Implement — null-safe summary formatting**

In the same file, replace (currently lines 309-317):

```ts
    const enrollmentSummary = enrollmentData.map(data => ({
      subjectId: data.subject.id,
      subjectName: data.subject.name,
      type: data.type,
      sppAmount: data.sppRate.amount.toString(),
      sessionDay: data.session.dayOfWeek,
      sessionTime: `${data.session.startTime.toString().substring(0, 5)} (${data.session.durationMinutes} min)`,
      teacherName: data.session.teacher.name,
    }))
```

with:

```ts
    const enrollmentSummary = enrollmentData.map(data => ({
      subjectId: data.subject.id,
      subjectName: data.subject.name,
      type: data.type,
      sppAmount: data.sppRate.amount.toString(),
      sessionDay: data.session ? data.session.dayOfWeek : null,
      sessionTime: data.session
        ? `${data.session.startTime.toString().substring(0, 5)} (${data.session.durationMinutes} min)`
        : null,
      teacherName: data.session ? data.session.teacher.name : null,
    }))
```

- [ ] **Step 6: Run tests to verify all pass**

Run: `pnpm -F apps-backend test -- students.service.spec.ts`
Expected: all 3 tests **PASS**.

- [ ] **Step 7: Type-check the backend**

Run: `pnpm -F apps-backend type-check`
Expected: exits with no errors.

- [ ] **Step 8: Commit**

```bash
git add apps/backend/src/modules/students/students.service.ts apps/backend/src/modules/students/students.service.spec.ts
git commit -m "feat(backend): make session assignment optional when enrolling a student"
```

---

### Task 3: Frontend — lock the branch field for ADMIN_CABANG in Step 1

**Files:**
- Modify: `apps/frontend/src/components/enrollment/EnrollmentStep1.tsx`

- [ ] **Step 1: Switch the branch source to `BranchContext` and lock the field for single-branch ADMIN_CABANG**

In `apps/frontend/src/components/enrollment/EnrollmentStep1.tsx`, replace the imports:

```tsx
import React, { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { branchApi } from '@/lib/api/endpoints'
import { useForm } from 'react-hook-form'
```

with:

```tsx
import React, { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Lock } from 'lucide-react'
import { useBranch } from '@/lib/branch-context'
```

Replace the branch query and the `reset` effect:

```tsx
  useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name || '',
        sureName: initialData.sureName || '',
        classLevel: initialData.classLevel || '',
        birthDate: initialData.birthDate || '',
        birthPlace: initialData.birthPlace || '',
        parentName: initialData.parentName || '',
        parentPhone: initialData.parentPhone || '',
        address: initialData.address || '',
        branchId: initialData.branchId || '',
        enrolledAt: initialData.enrolledAt || '',
      })
    }
  }, [initialData, reset])

  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchApi.getAll(),
  })

  const branches = branchesData?.data?.data || []
```

with:

```tsx
  const { branches, isRestrictedToBranch } = useBranch()
  const lockedBranch = isRestrictedToBranch ? branches[0] : null

  useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name || '',
        sureName: initialData.sureName || '',
        classLevel: initialData.classLevel || '',
        birthDate: initialData.birthDate || '',
        birthPlace: initialData.birthPlace || '',
        parentName: initialData.parentName || '',
        parentPhone: initialData.parentPhone || '',
        address: initialData.address || '',
        branchId: lockedBranch ? lockedBranch.id : (initialData.branchId || ''),
        enrolledAt: initialData.enrolledAt || '',
      })
    }
  }, [initialData, reset, lockedBranch])
```

Note: `lockedBranch` is recomputed from `branches`/`isRestrictedToBranch` on every render, so this effect re-fires and re-applies the lock as soon as `BranchContext` resolves the user's branch — even if it resolves after `initialData` (e.g. after the landing-page prefill in `create/page.tsx` already set a different `branchId`). This closes the race without needing a second effect.

- [ ] **Step 2: Render a locked, read-only field for ADMIN_CABANG; keep the dropdown for everyone else**

Replace the "Cabang" block:

```tsx
        {/* Cabang */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Cabang <span className="text-red-500">*</span>
          </label>
          <select
            {...register('branchId', { required: 'Cabang wajib dipilih' })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Pilih cabang...</option>
            {branches.map((branch: any) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
          {errors.branchId && (
            <p className="text-red-500 text-xs mt-1">{errors.branchId.message}</p>
          )}
        </div>
```

with:

```tsx
        {/* Cabang */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Cabang <span className="text-red-500">*</span>
          </label>
          {lockedBranch ? (
            <div
              className="w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-lg flex items-center justify-between text-gray-700"
              title="Anda terbatas pada cabang ini"
            >
              <span>{lockedBranch.name}</span>
              <Lock className="w-3.5 h-3.5 text-gray-400" />
            </div>
          ) : (
            <select
              {...register('branchId', { required: 'Cabang wajib dipilih' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Pilih cabang...</option>
              {branches.map((branch: any) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          )}
          {errors.branchId && (
            <p className="text-red-500 text-xs mt-1">{errors.branchId.message}</p>
          )}
        </div>
```

This reuses the exact `isRestrictedToBranch` flag and `Lock` icon/wording (`"Anda terbatas pada cabang ini"`) that `Topbar.tsx` already uses, so the behavior matches the rest of the app: single-branch ADMIN_CABANG gets a locked field, multi-branch ADMIN_CABANG gets a dropdown pre-filtered to their assigned branches (because `branches` from `useBranch()` is already scoped), and OWNER/ADMIN_GLOBAL keep the full dropdown.

- [ ] **Step 3: Type-check the frontend**

Run: `pnpm -F apps-frontend type-check`
Expected: exits with no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/components/enrollment/EnrollmentStep1.tsx
git commit -m "fix(frontend): lock branch field for admin cabang in student enrollment form"
```

---

### Task 4: Frontend — add "Lewati, jadwalkan nanti" skip button to Step 3

**Files:**
- Modify: `apps/frontend/src/components/enrollment/EnrollmentStep3.tsx:207-213`

- [ ] **Step 1: Add the skip button next to the existing submit button**

In `apps/frontend/src/components/enrollment/EnrollmentStep3.tsx`, replace:

```tsx
      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
      >
        Lanjut ke Konfirmasi →
      </button>
    </div>
  )
}
```

with:

```tsx
      {/* Submit / Skip Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => onComplete && onComplete([])}
          className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
        >
          Lewati, jadwalkan nanti →
        </button>
        <button
          onClick={handleSubmit}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
        >
          Lanjut ke Konfirmasi →
        </button>
      </div>
    </div>
  )
}
```

The "Lewati, jadwalkan nanti" button bypasses `handleSubmit`'s per-subject validation entirely and calls `onComplete([])` directly, discarding any partial session selections the admin may have made — matching the approved design ("jadwalkan semua sekarang, atau lewati semua", no partial skip). The existing "Lanjut ke Konfirmasi" button and its validation (`selectedSessions.length !== subjects.length`) are untouched.

- [ ] **Step 2: Type-check the frontend**

Run: `pnpm -F apps-frontend type-check`
Expected: exits with no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/components/enrollment/EnrollmentStep3.tsx
git commit -m "feat(frontend): allow skipping schedule selection during student enrollment"
```

---

### Task 5: Frontend — warn on the confirmation step when no schedule was picked

**Files:**
- Modify: `apps/frontend/src/components/enrollment/EnrollmentStep4.tsx`
- Modify: `apps/frontend/src/app/(dashboard)/master-data/students/create/page.tsx:255-257`

- [ ] **Step 1: Add an optional warning banner to `EnrollmentStep4`**

Replace the full contents of `apps/frontend/src/components/enrollment/EnrollmentStep4.tsx`:

```tsx
import React from 'react'
import { AlertCircle } from 'lucide-react'

interface EnrollmentStep4Props {
  onConfirm: () => Promise<void> | void
  loading?: boolean
  hasUnscheduledSubjects?: boolean
}

export default function EnrollmentStep4({ onConfirm, loading, hasUnscheduledSubjects }: EnrollmentStep4Props) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Konfirmasi Pendaftaran</h3>

      <div className="space-y-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">Ringkasan Data</h4>
          <p className="text-sm text-blue-800">
            Mohon periksa kembali semua data yang telah diisi. Klik tombol "Daftarkan Siswa" untuk
            menyelesaikan proses pendaftaran.
          </p>
        </div>

        {hasUnscheduledSubjects && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-900">Belum ada jadwal dipilih</p>
              <p className="text-xs text-amber-800 mt-1">
                Siswa akan didaftarkan tanpa jadwal sesi. Anda bisa menambahkan jadwal nanti dari
                halaman Detail Siswa.
              </p>
            </div>
          </div>
        )}

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-900">Perhatian: SPP Di-lock</p>
            <p className="text-xs text-amber-800 mt-1">
              Tarif SPP di-lock sesuai harga hari ini. Jika tarif naik di masa mendatang, SPP siswa
              ini tidak berubah.
            </p>
          </div>
        </div>
      </div>

      <button
        onClick={onConfirm}
        disabled={loading}
        className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Menyimpan...' : 'Daftarkan Siswa'}
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Compute and pass `hasUnscheduledSubjects` from the create page**

In `apps/frontend/src/app/(dashboard)/master-data/students/create/page.tsx`, replace:

```tsx
            {currentStep === 4 && (
              <EnrollmentStep4 onConfirm={handleStep4Submit} loading={loading} />
            )}
```

with:

```tsx
            {currentStep === 4 && (
              <EnrollmentStep4
                onConfirm={handleStep4Submit}
                loading={loading}
                hasUnscheduledSubjects={selectedSubjects.length > 0 && selectedSessions.length === 0}
              />
            )}
```

No other changes are needed in `create/page.tsx`: `handleStep4Submit` (lines 107-157) already builds `sessionId: session?.sessionId` per subject (line 139), which becomes `undefined` when no session was picked — and `axios`'s `JSON.stringify` drops `undefined` object keys, so the request body correctly omits `sessionId` for those subjects, matching the now-optional backend DTO from Task 1.

- [ ] **Step 3: Type-check the frontend**

Run: `pnpm -F apps-frontend type-check`
Expected: exits with no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/components/enrollment/EnrollmentStep4.tsx "apps/frontend/src/app/(dashboard)/master-data/students/create/page.tsx"
git commit -m "feat(frontend): warn when confirming enrollment with no schedule picked"
```

---

### Task 6: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full backend test suite**

Run: `pnpm -F apps-backend test`
Expected: all suites pass, including the 3 new tests from Task 2 and the pre-existing rate-limit suites.

- [ ] **Step 2: Type-check both apps**

Run: `pnpm type-check`
Expected: exits with no errors for both `apps-backend` and `apps-frontend`.

- [ ] **Step 3: Start both dev servers**

Run: `pnpm dev` (or `pnpm dev:backend` and `pnpm dev:frontend` in separate terminals)
Expected: backend on `http://localhost:3000` (Swagger at `/api`), frontend on `http://localhost:3001`.

- [ ] **Step 4: Manually verify the branch lock as ADMIN_CABANG**

Log in as an OWNER/ADMIN_GLOBAL account (or mint a dev JWT per `CLAUDE.md` §12), then in the browser devtools console on the frontend origin simulate an ADMIN_CABANG session so `BranchContext` locks the branch (this only affects the frontend's own role-derived UI state, not what the backend accepts):

```js
localStorage.setItem('userRole', 'ADMIN_CABANG')
localStorage.setItem('userRoles', JSON.stringify(['ADMIN_CABANG']))
localStorage.setItem('userBranchIds', JSON.stringify(['<a real branch id from GET /branches>']))
localStorage.setItem('primaryBranchId', '<same branch id>')
location.reload()
```

Navigate to `/master-data/students/create`. Expected: the "Cabang" field on Step 1 shows the branch name with a 🔒 lock icon, not an open dropdown, and cannot be changed. Revert with `localStorage.clear()` and reload before continuing.

- [ ] **Step 5: Manually verify the branch dropdown still works for OWNER/ADMIN_GLOBAL**

Log in normally as the OWNER account. Navigate to `/master-data/students/create`. Expected: the "Cabang" field on Step 1 is still an open dropdown listing all branches, unchanged from before.

- [ ] **Step 6: Manually verify the skip-scheduling flow end to end**

As OWNER, fill Step 1 (any test student data) and Step 2 (select at least one subject with an active SPP rate). On Step 3, click **"Lewati, jadwalkan nanti →"**. Expected: immediately advances to Step 4 showing the amber "Belum ada jadwal dipilih" banner. Click "Daftarkan Siswa". Expected: student is created successfully and redirects to the students list with a success message — no validation error about missing session.

- [ ] **Step 7: Manually verify scheduling later still works**

From the students list, open the newly created student's detail page. Expected: the enrolled subject appears with no schedule shown. Click "Ubah Mata Pelajaran" on that subject, and in the modal select a session from the "Jadwal Sesi" dropdown, then save. Expected: the subject is now linked to that session (reflected on reload / in `GET /students/enrollment/sessions/:subjectId` no longer showing that student's slot as free, if capacity was 1).

- [ ] **Step 8: Manually verify the normal (fully scheduled) flow has no regression**

Repeat Step 1-2 of the enrollment form with a new test student, but this time in Step 3 pick a session for every subject and click "Lanjut ke Konfirmasi →" (the original button). Expected: Step 4 shows **no** amber "Belum ada jadwal dipilih" banner (only the existing SPP-lock banner), and submitting creates the student with the session(s) attached as before.
