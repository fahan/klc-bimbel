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
