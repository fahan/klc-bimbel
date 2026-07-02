import { INestApplication } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { Test } from '@nestjs/testing'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import request from 'supertest'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { THROTTLER_CONFIG } from './common/config/throttler.config'

describe('Global rate limit (default throttler)', () => {
  let app: INestApplication

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot(THROTTLER_CONFIG)],
      controllers: [AppController],
      providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
    }).compile()

    app = moduleRef.createNestApplication()
    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  it('allows 100 requests per minute per IP then blocks the 101st with 429', async () => {
    for (let i = 0; i < 100; i++) {
      await request(app.getHttpServer()).get('/').expect(200)
    }

    await request(app.getHttpServer()).get('/').expect(429)
  }, 20000)
})
