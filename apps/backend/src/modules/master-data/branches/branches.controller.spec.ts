import { Test } from '@nestjs/testing'
import { BranchesController } from './branches.controller'
import { BranchesService } from './branches.service'

describe('BranchesController.findAll', () => {
  let controller: BranchesController
  let service: { findAll: jest.Mock }

  beforeEach(async () => {
    service = { findAll: jest.fn().mockResolvedValue({ success: true, data: [] }) }

    const moduleRef = await Test.createTestingModule({
      controllers: [BranchesController],
      providers: [{ provide: BranchesService, useValue: service }],
    }).compile()

    controller = moduleRef.get(BranchesController)
  })

  it('resolves ADMIN_CABANG branch scoping for a dual-role user whose legacy role is GURU', async () => {
    const user = { id: 'user-1', role: 'GURU', roles: ['GURU', 'ADMIN_CABANG'], branchId: 'branch-1' }

    await controller.findAll(1, 10, user)

    expect(service.findAll).toHaveBeenCalledWith(1, 10, 'user-1', 'ADMIN_CABANG', 'branch-1')
  })

  it('resolves OWNER access for a user with OWNER in their roles array even if legacy role differs', async () => {
    const user = { id: 'user-2', role: 'ADMIN_CABANG', roles: ['ADMIN_CABANG', 'OWNER'], branchId: 'branch-2' }

    await controller.findAll(1, 10, user)

    expect(service.findAll).toHaveBeenCalledWith(1, 10, 'user-2', 'OWNER', 'branch-2')
  })

  it('falls back to the legacy singular role when roles array is absent', async () => {
    const user = { id: 'user-3', role: 'ADMIN_GLOBAL', branchId: null }

    await controller.findAll(1, 10, user)

    expect(service.findAll).toHaveBeenCalledWith(1, 10, 'user-3', 'ADMIN_GLOBAL', null)
  })
})
