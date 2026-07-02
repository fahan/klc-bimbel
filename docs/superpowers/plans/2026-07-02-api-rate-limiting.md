# API Rate Limiting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add rate limiting to the NestJS backend — a global default of 100 requests/minute per IP on every endpoint, and a stricter 5 requests/minute override on `POST /auth/login`, `GET /invoices/public/:token`, and `GET /progress-reports/public/:token`.

**Architecture:** Use `@nestjs/throttler`'s `ThrottlerGuard` registered globally via `APP_GUARD` in `app.module.ts`, with a single named throttler (`default`, 100 req/min). The three sensitive routes override that same named throttler per-route via the `@Throttle()` decorator (5 req/min), which replaces rather than stacks with the global config. `app.set('trust proxy', 1)` is added to `main.ts` so the guard reads the real client IP behind a reverse proxy. `ThrottlerException` is a 429 `HttpException`, so it's already formatted correctly by the existing `AllExceptionsFilter` — no new exception filter needed.

**Tech Stack:** NestJS 10, `@nestjs/throttler`, Jest + `@nestjs/testing` + `supertest` (already installed as dev dependencies, not yet used anywhere in this repo — this plan introduces the first NestJS integration-style tests).

**Spec:** `docs/superpowers/specs/2026-07-02-api-rate-limiting-design.md`

---

### Task 1: Install `@nestjs/throttler`

**Files:**
- Modify: `apps/backend/package.json` (via pnpm, not manual edit)

- [ ] **Step 1: Install the package**

Run from repo root:

```bash
cd apps/backend
pnpm add @nestjs/throttler@^5.2.0
```

`^5.x` is the last major compatible with NestJS 10 (`@nestjs/common`/`@nestjs/core` `^10.2.10` in this repo) — v6 requires Nest 11.

- [ ] **Step 2: Verify it installed correctly**

Run: `node -e "console.log(require('./apps/backend/node_modules/@nestjs/throttler/package.json').version)"` (from repo root)
Expected: prints a `5.x.y` version string.

- [ ] **Step 3: Commit**

```bash
git add apps/backend/package.json apps/backend/../../pnpm-lock.yaml
git commit -m "chore(backend): add @nestjs/throttler dependency"
```

(If pnpm-lock.yaml is at repo root, adjust the path — check with `git status` first and add whichever lockfile actually changed.)

---

### Task 2: Shared throttler config + prove the limits work (global default)

This task creates the config constants both production code and every later test will reuse, and proves — via the existing unguarded `AppController` (`GET /`, no DB dependency) — that 100 requests/minute per IP is enforced and the 101st is rejected with 429.

**Files:**
- Create: `apps/backend/src/common/config/throttler.config.ts`
- Test: `apps/backend/src/app.controller.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/backend/src/app.controller.spec.ts`:

```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run (from `apps/backend`): `pnpm test -- app.controller.spec.ts`
Expected: FAIL — `Cannot find module './common/config/throttler.config'` (file doesn't exist yet).

- [ ] **Step 3: Create the shared config**

Create `apps/backend/src/common/config/throttler.config.ts`:

```typescript
import { ThrottlerModuleOptions, ThrottlerOptions } from '@nestjs/throttler'

/** Global default: 100 requests/minute per IP, applied to every route via APP_GUARD in app.module.ts. */
export const THROTTLER_CONFIG: ThrottlerModuleOptions = [{ name: 'default', ttl: 60000, limit: 100 }]

/**
 * Stricter override for brute-forceable routes (login, public share-link tokens): 5 requests/minute per IP.
 * Pass to @Throttle() — reuses the 'default' throttler name so it REPLACES the global limit for that route
 * instead of stacking a second throttler on top of it.
 */
export const STRICT_THROTTLE: Record<string, ThrottlerOptions> = { default: { limit: 5, ttl: 60000 } }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- app.controller.spec.ts`
Expected: PASS (1 test, ~1-2s — 101 sequential local HTTP calls against the in-memory test server).

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/common/config/throttler.config.ts apps/backend/src/app.controller.spec.ts
git commit -m "feat(backend): add shared throttler config, prove 100req/min global default"
```

---

### Task 3: Wire the global guard into the real app

Applies the config proven in Task 2 to the actual running application.

**Files:**
- Modify: `apps/backend/src/app.module.ts`
- Modify: `apps/backend/src/main.ts`

- [ ] **Step 1: Register `ThrottlerModule` and `ThrottlerGuard` globally**

In `apps/backend/src/app.module.ts`, add imports at the top (after the existing `@nestjs/config` import):

```typescript
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler'
import { THROTTLER_CONFIG } from './common/config/throttler.config'
```

Add `ThrottlerModule.forRoot(THROTTLER_CONFIG),` as the second entry in the `imports` array (right after `ConfigModule.forRoot({...}),`, before `PrismaModule,`).

Add a `providers` entry — change:

```typescript
  controllers: [AppController],
  providers: [AppService],
```

to:

```typescript
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
```

- [ ] **Step 2: Trust the reverse proxy for client IP**

In `apps/backend/src/main.ts`, add this line right after `const app = await NestFactory.create(AppModule)`:

```typescript
  // Trust the reverse proxy's X-Forwarded-For so ThrottlerGuard rate-limits by real client IP, not the proxy's IP
  app.set('trust proxy', 1)
```

- [ ] **Step 3: Verify the app still boots**

Run (from `apps/backend`): `pnpm start:dev`
Expected console output: `✅ Server running on http://localhost:3000` and `📚 Swagger docs: http://localhost:3000/api` with no DI resolution errors. Open `http://localhost:3000/api` in a browser and confirm the Swagger UI loads. Stop the server (Ctrl+C) once confirmed.

- [ ] **Step 4: Run the existing test suite to check for regressions**

Run (from `apps/backend`): `pnpm test`
Expected: all tests pass (the `recommendation.engine.spec.ts` suite plus the new `app.controller.spec.ts`).

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/app.module.ts apps/backend/src/main.ts
git commit -m "feat(backend): wire ThrottlerGuard globally, trust proxy for real client IP"
```

---

### Task 4: Strict rate limit on `POST /auth/login`

**Files:**
- Modify: `apps/backend/src/modules/auth/auth.controller.ts`
- Test: `apps/backend/src/modules/auth/auth.controller.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/backend/src/modules/auth/auth.controller.spec.ts`:

```typescript
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
      await request(app.getHttpServer()).post('/auth/login').send(body).expect(200)
    }

    await request(app.getHttpServer()).post('/auth/login').send(body).expect(429)
  }, 10000)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run (from `apps/backend`): `pnpm test -- auth.controller.spec.ts`
Expected: FAIL — the 6th request returns 200, not 429 (no override applied yet, still under the global 100/min limit).

- [ ] **Step 3: Add the override**

In `apps/backend/src/modules/auth/auth.controller.ts`, add the import (after the existing `@nestjs/swagger` import):

```typescript
import { Throttle } from '@nestjs/throttler'
import { STRICT_THROTTLE } from '@/common/config/throttler.config'
```

Add `@Throttle(STRICT_THROTTLE)` to the `login` method's decorator stack (order relative to the other decorators doesn't matter — this is the only line that changes in the method):

```typescript
  @Post('login')
  @Throttle(STRICT_THROTTLE)
  @ApiOperation({ summary: 'Login dengan email dan password' })
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- auth.controller.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/modules/auth/auth.controller.ts apps/backend/src/modules/auth/auth.controller.spec.ts
git commit -m "feat(backend): rate-limit POST /auth/login to 5 req/min"
```

---

### Task 5: Strict rate limit on `GET /invoices/public/:token`

**Files:**
- Modify: `apps/backend/src/modules/invoices/invoices.controller.ts`
- Test: `apps/backend/src/modules/invoices/invoices.controller.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/backend/src/modules/invoices/invoices.controller.spec.ts`:

```typescript
import { INestApplication } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { Test } from '@nestjs/testing'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import request from 'supertest'
import { THROTTLER_CONFIG } from '@/common/config/throttler.config'
import { InvoicesController } from './invoices.controller'
import { InvoicesService } from './invoices.service'

describe('GET /invoices/public/:token rate limit', () => {
  let app: INestApplication

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot(THROTTLER_CONFIG)],
      controllers: [InvoicesController],
      providers: [
        { provide: InvoicesService, useValue: { findByToken: jest.fn().mockResolvedValue({ success: true, data: {} }) } },
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
      await request(app.getHttpServer()).get('/invoices/public/some-token').expect(200)
    }

    await request(app.getHttpServer()).get('/invoices/public/some-token').expect(429)
  }, 10000)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run (from `apps/backend`): `pnpm test -- invoices.controller.spec.ts`
Expected: FAIL — the 6th request returns 200, not 429.

- [ ] **Step 3: Add the override**

In `apps/backend/src/modules/invoices/invoices.controller.ts`, add the import (after the existing `@nestjs/swagger` import):

```typescript
import { Throttle } from '@nestjs/throttler'
import { STRICT_THROTTLE } from '@/common/config/throttler.config'
```

Add `@Throttle(STRICT_THROTTLE)` to the `findByToken` method's decorator stack:

```typescript
  @Get('public/:token')
  @Throttle(STRICT_THROTTLE)
  @ApiOperation({
    summary: 'Get invoice by public token (PUBLIC, no auth)',
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- invoices.controller.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/modules/invoices/invoices.controller.ts apps/backend/src/modules/invoices/invoices.controller.spec.ts
git commit -m "feat(backend): rate-limit GET /invoices/public/:token to 5 req/min"
```

---

### Task 6: Strict rate limit on `GET /progress-reports/public/:token`

**Files:**
- Modify: `apps/backend/src/modules/progress-reports/progress-reports.controller.ts`
- Test: `apps/backend/src/modules/progress-reports/progress-reports.controller.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/backend/src/modules/progress-reports/progress-reports.controller.spec.ts`:

```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run (from `apps/backend`): `pnpm test -- progress-reports.controller.spec.ts`
Expected: FAIL — the 6th request returns 200, not 429.

- [ ] **Step 3: Add the override**

In `apps/backend/src/modules/progress-reports/progress-reports.controller.ts`, add the import (after the existing `@nestjs/swagger` import):

```typescript
import { Throttle } from '@nestjs/throttler'
import { STRICT_THROTTLE } from '@/common/config/throttler.config'
```

Add `@Throttle(STRICT_THROTTLE)` to the `findByToken` method's decorator stack:

```typescript
  @Get('public/:token')
  @Throttle(STRICT_THROTTLE)
  @ApiOperation({
    summary: 'Get progress report by token (PUBLIC)',
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- progress-reports.controller.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/modules/progress-reports/progress-reports.controller.ts apps/backend/src/modules/progress-reports/progress-reports.controller.spec.ts
git commit -m "feat(backend): rate-limit GET /progress-reports/public/:token to 5 req/min"
```

---

### Task 7: Full verification and docs update

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Run the full test suite**

Run (from `apps/backend`): `pnpm test`
Expected: all suites pass — `recommendation.engine.spec.ts`, `app.controller.spec.ts`, `auth.controller.spec.ts`, `invoices.controller.spec.ts`, `progress-reports.controller.spec.ts`.

- [ ] **Step 2: Type-check**

Run (from repo root): `pnpm type-check`
Expected: no errors.

- [ ] **Step 3: Update the production-readiness TODO list**

In `CLAUDE.md`, section "13. TODOs / Production Readiness", change:

```markdown
6. **Rate limiting** — add `@nestjs/throttler` to public endpoints
```

to:

```markdown
6. ~~**Rate limiting**~~ — ✅ done (`@nestjs/throttler`: global default 100 req/min per IP, 5 req/min override on `/auth/login` + both `public/:token` endpoints)
```

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: mark rate limiting TODO as done"
```

---

## Self-Review Notes

- **Spec coverage:** global 100/min ✅ (Task 2-3), 5/min override on all 3 sensitive routes ✅ (Task 4-6), in-memory storage (no Redis) ✅ (default `ThrottlerModule.forRoot`, no custom storage provider), trust proxy ✅ (Task 3), standard error response via existing `AllExceptionsFilter` ✅ (no new filter written, relies on `ThrottlerException` being an `HttpException`), testing ✅ (Task 2, 4, 5, 6 each assert the Nth+1 request is blocked).
- **Non-goals respected:** no Redis/distributed storage added, no changes to endpoints outside the 3 named ones beyond the global default.
