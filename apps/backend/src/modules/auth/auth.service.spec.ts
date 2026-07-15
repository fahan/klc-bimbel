import { Test } from '@nestjs/testing'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '@/prisma/prisma.service'
import { TtlCacheService } from '@/common/cache/ttl-cache.service'
import { AuthService } from './auth.service'

describe('AuthService.validateUser', () => {
  let service: AuthService
  let prisma: { user: { findUnique: jest.Mock } }

  beforeEach(async () => {
    prisma = { user: { findUnique: jest.fn() } }

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: { sign: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        TtlCacheService,
      ],
    }).compile()

    service = moduleRef.get(AuthService)
  })

  it('returns roles (from DB) and branchId for a dual-role user with an assigned branch', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'saras@example.com',
      role: 'GURU',
      isActive: true,
      roles: [{ role: 'ADMIN_CABANG' }, { role: 'GURU' }],
      branches: [{ branchId: 'branch-1', isPrimary: true }],
    })

    const result = await service.validateUser({ id: 'user-1' })

    expect(result).toMatchObject({
      id: 'user-1',
      email: 'saras@example.com',
      role: 'GURU',
      roles: ['ADMIN_CABANG', 'GURU'],
      branchId: 'branch-1',
    })
  })

  it('uses payload.roles when provided, without requiring a DB roles lookup', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-2',
      email: 'owner@example.com',
      role: 'OWNER',
      isActive: true,
      roles: [],
      branches: [],
    })

    const result = await service.validateUser({ id: 'user-2', roles: ['OWNER'] })

    expect(result.roles).toEqual(['OWNER'])
    expect(result.branchId).toBeNull()
  })

  it('rejects an inactive user', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'user-3', isActive: false })

    await expect(service.validateUser({ id: 'user-3' })).rejects.toThrow()
  })
})
