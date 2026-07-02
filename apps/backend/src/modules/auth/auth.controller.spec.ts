import { INestApplication } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { Test } from '@nestjs/testing'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import request from 'supertest'
import { THROTTLER_CONFIG } from '@/common/config/throttler.config'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'

describe('POST /auth/login rate limit', () => {
  let app: INestApplication

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot(THROTTLER_CONFIG)],
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: { login: jest.fn().mockResolvedValue({ success: true, data: {} }) } },
        { provide: APP_GUARD, useClass: ThrottlerGuard },
      ],
    }).compile()

    app = moduleRef.createNestApplication()
    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  it('allows 5 attempts per minute per IP then blocks the 6th with 429', async () => {
    const body = { email: 'test@example.com', password: 'password123' }

    for (let i = 0; i < 5; i++) {
      await request(app.getHttpServer()).post('/auth/login').send(body).expect(201)
    }

    await request(app.getHttpServer()).post('/auth/login').send(body).expect(429)
  }, 10000)
})
