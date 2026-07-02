import { INestApplication } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { Test } from '@nestjs/testing'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import request from 'supertest'
import { THROTTLER_CONFIG } from '@/common/config/throttler.config'
import { ProgressReportsController } from './progress-reports.controller'
import { ProgressReportsService } from './progress-reports.service'

describe('GET /progress-reports/public/:token rate limit', () => {
  let app: INestApplication

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot(THROTTLER_CONFIG)],
      controllers: [ProgressReportsController],
      providers: [
        { provide: ProgressReportsService, useValue: { findByToken: jest.fn().mockResolvedValue({ success: true, data: {} }) } },
        { provide: APP_GUARD, useClass: ThrottlerGuard },
      ],
    }).compile()

    app = moduleRef.createNestApplication()
    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  it('allows 5 requests per minute per IP then blocks the 6th with 429', async () => {
    for (let i = 0; i < 5; i++) {
      await request(app.getHttpServer()).get('/progress-reports/public/some-token').expect(200)
    }

    await request(app.getHttpServer()).get('/progress-reports/public/some-token').expect(429)
  }, 10000)
})
