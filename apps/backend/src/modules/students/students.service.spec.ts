import { Test } from '@nestjs/testing'
import { BadRequestException } from '@nestjs/common'
import { PrismaService } from '@/prisma/prisma.service'
import { StudentsService } from './students.service'

describe('StudentsService.enrollStudent', () => {
  let service: StudentsService
  let prisma: {
    student: { findUnique: jest.Mock }
    subject: { findMany: jest.Mock }
    session: { findMany: jest.Mock }
    sppRate: { findMany: jest.Mock }
    studentSubject: { createMany: jest.Mock }
    sessionStudent: { createMany: jest.Mock }
    $transaction: jest.Mock
  }

  beforeEach(async () => {
    prisma = {
      student: { findUnique: jest.fn() },
      subject: { findMany: jest.fn() },
      session: { findMany: jest.fn() },
      sppRate: { findMany: jest.fn() },
      studentSubject: { createMany: jest.fn() },
      sessionStudent: { createMany: jest.fn() },
      $transaction: jest.fn(),
    }

    const moduleRef = await Test.createTestingModule({
      providers: [StudentsService, { provide: PrismaService, useValue: prisma }],
    }).compile()

    service = moduleRef.get(StudentsService)

    prisma.student.findUnique.mockResolvedValue({ id: 'student-1', name: 'Budi', branchId: 'branch-1' })
    prisma.subject.findMany.mockResolvedValue([{ id: 'subject-1', name: 'Matematika' }])
    prisma.session.findMany.mockResolvedValue([])
    // Validation is now batched: rates are keyed by subject|type|billingType in JS.
    prisma.sppRate.findMany.mockResolvedValue([
      {
        id: 'rate-1',
        subjectId: 'subject-1',
        type: 'REGULAR',
        billingType: 'FLAT_MONTHLY',
        amount: '300000',
        effectiveFrom: new Date('2020-01-01'),
        effectiveUntil: null,
      },
    ])
    // Run the transaction callback against the same mock (which exposes createMany).
    prisma.$transaction.mockImplementation(async (cb: any) => cb(prisma))
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
    // No sessionId → no session lookup and no SessionStudent rows.
    expect(prisma.session.findMany).not.toHaveBeenCalled()
    expect(prisma.sessionStudent.createMany).not.toHaveBeenCalled()
    expect(prisma.studentSubject.createMany).toHaveBeenCalledTimes(1)
  })

  it('enrolls a subject with a session and links it via SessionStudent', async () => {
    prisma.session.findMany.mockResolvedValue([
      {
        id: 'session-1',
        subjectId: 'subject-1',
        branchId: 'branch-1',
        dayOfWeek: 'SENIN',
        startTime: '15:00:00',
        durationMinutes: 90,
        teacher: { name: 'Pak Andi' },
      },
    ])

    const result = await service.enrollStudent('student-1', {
      subjects: [{ subjectId: 'subject-1', type: 'REGULAR', sessionId: 'session-1' } as any],
    } as any)

    expect(result.data!.enrolledSubjects[0]).toMatchObject({
      sessionDay: 'SENIN',
      teacherName: 'Pak Andi',
    })
    expect(prisma.sessionStudent.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ sessionId: 'session-1', studentId: 'student-1' }),
        ]),
      }),
    )
  })

  it('rejects an unknown sessionId instead of silently skipping it', async () => {
    prisma.session.findMany.mockResolvedValue([]) // requested session not found

    await expect(
      service.enrollStudent('student-1', {
        subjects: [{ subjectId: 'subject-1', type: 'REGULAR', sessionId: 'missing-session' } as any],
      } as any),
    ).rejects.toThrow(BadRequestException)
  })
})
