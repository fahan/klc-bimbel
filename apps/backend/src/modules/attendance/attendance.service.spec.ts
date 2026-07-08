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
