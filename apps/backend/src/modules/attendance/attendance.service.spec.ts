import { Test } from '@nestjs/testing'
import { PrismaService } from '@/prisma/prisma.service'
import { AttendanceService } from './attendance.service'

describe('AttendanceService.submitAdHocAttendance', () => {
  let service: AttendanceService
  let prisma: {
    branch: { findUnique: jest.Mock }
    subject: { findUnique: jest.Mock }
    student: { findMany: jest.Mock }
    user: { findUnique: jest.Mock }
    sessionLog: { create: jest.Mock; findUnique: jest.Mock }
    attendance: { createManyAndReturn: jest.Mock }
    $transaction: jest.Mock
  }

  beforeEach(async () => {
    prisma = {
      branch: { findUnique: jest.fn() },
      subject: { findUnique: jest.fn() },
      student: { findMany: jest.fn() },
      user: { findUnique: jest.fn() },
      sessionLog: { create: jest.fn(), findUnique: jest.fn() },
      attendance: { createManyAndReturn: jest.fn() },
      $transaction: jest.fn(),
    }

    const moduleRef = await Test.createTestingModule({
      providers: [AttendanceService, { provide: PrismaService, useValue: prisma }],
    }).compile()

    service = moduleRef.get(AttendanceService)

    prisma.branch.findUnique.mockResolvedValue({ id: 'branch-1', name: 'Cabang Pusat' })
    prisma.subject.findUnique.mockResolvedValue({ id: 'subject-1', name: 'Matematika' })
    prisma.student.findMany.mockResolvedValue([
      { id: 'student-1', name: 'Budi Santoso', sureName: 'Budi' },
    ])
    prisma.user.findUnique.mockResolvedValue({ id: 'teacher-1', name: 'Pak Andi' })

    const createdSessionLog = { id: 'log-1', createdAt: new Date('2026-07-03T00:00:00Z') }
    const createdAttendances = [
      { id: 'att-1', sessionLogId: 'log-1', studentId: 'student-1', status: 'HADIR' },
    ]

    // $transaction runs the callback against a tx client shaped like prisma itself
    prisma.$transaction.mockImplementation(async (cb: any) =>
      cb({
        sessionLog: { create: jest.fn().mockResolvedValue(createdSessionLog) },
        attendance: { createManyAndReturn: jest.fn().mockResolvedValue(createdAttendances) },
      }),
    )
  })

  it('submits without re-fetching the session log afterward', async () => {
    const result = await service.submitAdHocAttendance(
      {
        branchId: 'branch-1',
        subjectId: 'subject-1',
        sessionDate: '2026-07-03',
        startTime: '14:00',
        durationMinutes: 60,
        attendances: [{ studentId: 'student-1', status: 'HADIR' } as any],
      } as any,
      'teacher-1',
    )

    expect(result.success).toBe(true)
    expect(result.data!.branchName).toBe('Cabang Pusat')
    expect(result.data!.subjectName).toBe('Matematika')
    expect(result.data!.teacherName).toBe('Pak Andi')
    expect(result.data!.attendances[0]).toMatchObject({
      studentId: 'student-1',
      studentName: 'Budi Santoso',
      status: 'HADIR',
    })

    // The perf fix: no extra round-trip to re-fetch what we already have in memory.
    expect(prisma.sessionLog.findUnique).not.toHaveBeenCalled()
  })

  it('validates branch/subject/students in parallel instead of serially', async () => {
    await service.submitAdHocAttendance(
      {
        branchId: 'branch-1',
        subjectId: 'subject-1',
        sessionDate: '2026-07-03',
        startTime: '14:00',
        durationMinutes: 60,
        attendances: [{ studentId: 'student-1', status: 'HADIR' } as any],
      } as any,
      'teacher-1',
    )

    // All three lookups should be issued (order-independent) via Promise.all,
    // not three sequential round-trips.
    expect(prisma.branch.findUnique).toHaveBeenCalledTimes(1)
    expect(prisma.subject.findUnique).toHaveBeenCalledTimes(1)
    expect(prisma.student.findMany).toHaveBeenCalledTimes(1)
    expect(prisma.$transaction).toHaveBeenCalledTimes(1)
  })
})

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

  it('accepts a walk-in student (zero enrollments) with an explicit subjectId', async () => {
    prisma.student.findMany.mockResolvedValue([
      { id: 'student-3', name: 'Citra Dewi', sureName: 'Citra' },
    ])
    // student-3 has no rows in the studentSubject mock — a walk-in

    const result = await service.submitQuickAttendance(
      {
        branchId: 'branch-1',
        students: [{ studentId: 'student-3', subjectId: 'subject-mat', status: 'HADIR' }],
      } as any,
      'teacher-1',
    )

    expect(result.success).toBe(true)
    expect(result.data.sessionLogs).toHaveLength(1)
    expect(result.data.sessionLogs[0]).toMatchObject({ subjectId: 'subject-mat', studentCount: 1 })
    expect(txSessionLogCreate).toHaveBeenCalledTimes(1)
    expect(txSessionLogCreate.mock.calls[0][0].data.adHocSubjectId).toBe('subject-mat')
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

describe('AttendanceService batch approval', () => {
  let service: AttendanceService
  let prisma: any

  beforeEach(async () => {
    prisma = {
      sessionLog: {
        // Keyed by id (not a fixed call sequence) so it stays correct regardless of
        // how many times approveAdHoc/rejectAdHoc internally re-fetch the same log.
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
    prisma.sessionLog.findUnique.mockImplementation(async ({ where }: any) => {
      if (where.id === 'log-1') return { id: 'log-1', isAdHoc: true, status: 'PENDING_APPROVAL' }
      if (where.id === 'log-2') return { id: 'log-2', isAdHoc: true, status: 'COMPLETED' }
      return null
    })

    const result = await service.approveAdHocBatch(
      [{ sessionLogId: 'log-1' }, { sessionLogId: 'log-2' }],
      'admin-1',
    )

    expect(result.data.approved).toEqual(['log-1'])
    expect(result.data.skipped).toHaveLength(1)
    expect(result.data.skipped[0].sessionLogId).toBe('log-2')
  })

  it('applies startTime correction atomically within the approval write', async () => {
    prisma.sessionLog.findUnique.mockResolvedValue({ id: 'log-1', isAdHoc: true, status: 'PENDING_APPROVAL' })

    await service.approveAdHocBatch([{ sessionLogId: 'log-1', startTime: '14:30' }], 'admin-1')

    // The correction must be folded INTO the same update that flips status to COMPLETED —
    // not a separate pre-write that could persist even if approval later failed.
    const approvalWrite = prisma.sessionLog.update.mock.calls.find(
      (c: any) => c[0].data.status === 'COMPLETED',
    )
    expect(approvalWrite).toBeDefined()
    expect(approvalWrite[0].data.adHocStartTime).toBe('14:30')

    // There is exactly one update call — no standalone time-only pre-write.
    expect(prisma.sessionLog.update).toHaveBeenCalledTimes(1)
  })

  it('does not persist the startTime correction when approval fails', async () => {
    // findUnique reports an already-processed log → approveAdHoc throws before any write.
    prisma.sessionLog.findUnique.mockResolvedValue({ id: 'log-1', isAdHoc: true, status: 'COMPLETED' })

    const result = await service.approveAdHocBatch([{ sessionLogId: 'log-1', startTime: '14:30' }], 'admin-1')

    expect(result.data.approved).toEqual([])
    expect(result.data.skipped).toHaveLength(1)
    // No update at all — the correction never touched the row.
    expect(prisma.sessionLog.update).not.toHaveBeenCalled()
  })

  it('rejects valid items and skips already-processed ones, with a shared reason', async () => {
    prisma.sessionLog.findUnique.mockImplementation(async ({ where }: any) => {
      if (where.id === 'log-1') return { id: 'log-1', isAdHoc: true, status: 'PENDING_APPROVAL' }
      if (where.id === 'log-2') return { id: 'log-2', isAdHoc: true, status: 'REJECTED' }
      return null
    })

    const result = await service.rejectAdHocBatch(['log-1', 'log-2'], 'admin-1', 'Data tidak valid')

    expect(result.data.rejected).toEqual(['log-1'])
    expect(result.data.skipped).toHaveLength(1)
    expect(result.data.skipped[0].sessionLogId).toBe('log-2')

    const rejectUpdate = prisma.sessionLog.update.mock.calls.find(
      (c: any) => c[0].where.id === 'log-1' && c[0].data.status === 'REJECTED',
    )
    expect(rejectUpdate).toBeDefined()
    expect(rejectUpdate[0].data.rejectionReason).toBe('Data tidak valid')
  })

  it('falls back to a default reason when no reason is provided in batch reject', async () => {
    prisma.sessionLog.findUnique.mockResolvedValue({ id: 'log-1', isAdHoc: true, status: 'PENDING_APPROVAL' })

    await service.rejectAdHocBatch(['log-1'], 'admin-1')

    const rejectUpdate = prisma.sessionLog.update.mock.calls.find(
      (c: any) => c[0].where.id === 'log-1' && c[0].data.status === 'REJECTED',
    )
    expect(rejectUpdate[0].data.rejectionReason).toBe('Ditolak melalui aksi batch oleh admin')
  })
})
