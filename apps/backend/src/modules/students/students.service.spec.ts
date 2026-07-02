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
