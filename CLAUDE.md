# CLAUDE.md — Project Knowledge

> Knowledge base for AI assistants working on this codebase. Read this first.

---

## 1. Project Overview

**Name:** Sistem Manajemen Bimbel Multi-Cabang (KLC Bimbel)
**Type:** Multi-branch tutoring management system
**Audience:** Indonesian tutoring centers (bimbel) with 1+ branches
**Languages:** UI in Bahasa Indonesia, code/comments in English

**Core domains:**

- Master data (cabang/branches, mata pelajaran/subjects, tarif SPP, kurikulum)
- Student enrollment & multi-subject management with locked SPP rates
- Weekly session scheduling with capacity & conflict detection
- Mobile attendance + progress tracking for teachers
- Invoice generation with shareable public links
- Auto-calculated teacher commissions (formula: `SPP ÷ total_sessions × 40% × attended`)
- Stock/POS for stationery/modules/uniforms with branch-to-branch transfers
- Public progress reports for parents (no login)

---

## 2. Tech Stack

| Layer           | Technology                                                       |
| --------------- | ---------------------------------------------------------------- |
| **Frontend**    | Next.js 14 (App Router) + TypeScript + Tailwind CSS              |
| **Backend**     | NestJS 10 + TypeScript                                           |
| **Database**    | PostgreSQL 17 (hosted on Supabase)                               |
| **ORM**         | Prisma 5.22                                                      |
| **Auth**        | JWT (custom, not Supabase Auth) — `@nestjs/jwt` + `passport-jwt` |
| **State**       | React Context + `@tanstack/react-query` v5                       |
| **Forms**       | `react-hook-form` + `zod` + `@hookform/resolvers`                |
| **HTTP**        | `axios` (frontend)                                               |
| **Icons**       | `lucide-react`                                                   |
| **Package mgr** | pnpm 8.15 (workspaces)                                           |

---

## 3. Workspace Structure

Monorepo via pnpm workspaces. Top-level layout:

```
learning-center/
├── CLAUDE.md                    ← THIS FILE
├── README.md
├── package.json                 ← root (pnpm scripts)
├── pnpm-workspace.yaml          ← packages: ['apps/*']
├── apps/
│   ├── backend/                 ← NestJS API
│   └── frontend/                ← Next.js app
├── plan/                        ← Wireframes (01–14) + business-rule.md + erd.md
├── landingpage/                 ← KLC Bimbel design handoff bundle
└── evaluate/                    ← Misc evaluation files
```

### Root scripts (run from `learning-center/`)

```bash
pnpm dev                   # Run both frontend + backend in parallel
pnpm dev:backend           # Backend only (port 3000)
pnpm dev:frontend          # Frontend only (port 3001)
pnpm prisma:generate       # Regenerate Prisma client
pnpm prisma:migrate        # Run migration in dev mode
pnpm prisma:studio         # Open Prisma Studio
pnpm type-check            # TS type check across all workspaces
```

---

## 4. Backend (`apps/backend/`)

### Tech specifics

- NestJS modular architecture
- All HTTP endpoints documented via `@nestjs/swagger` → http://localhost:3000/api
- Global validation pipe with `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`
- CORS open to `localhost:3000–3002` (configured in `main.ts`)
- Listens on `process.env.PORT || 3001` (default `.env` sets 3000)

### Folder structure

```
apps/backend/src/
├── main.ts                      ← bootstrap
├── app.module.ts                ← Root module — register all feature modules here
├── prisma/
│   ├── prisma.module.ts
│   └── prisma.service.ts        ← DI service wrapping PrismaClient
├── common/
│   ├── decorators/
│   │   ├── current-user.decorator.ts   ← @CurrentUser() param decorator
│   │   └── roles.decorator.ts          ← @Roles('OWNER', 'ADMIN_GLOBAL', ...)
│   ├── guards/
│   │   ├── jwt.guard.ts
│   │   └── roles.guard.ts
│   └── filters/
│       └── all-exceptions.filter.ts    ← Standardized error response
└── modules/
    ├── auth/                    ← JWT login + getMe
    ├── master-data/             ← Aggregator module: branches, subjects, spp-rates, curriculum-modules
    │   ├── master-data.module.ts
    │   ├── branches/
    │   ├── subjects/
    │   ├── spp-rates/
    │   └── curriculum-modules/
    ├── students/                ← + enrollment flow
    ├── teachers/                ← Users with role=GURU + UserBranch assignments
    ├── sessions/                ← Weekly schedule
    ├── attendance/              ← session_logs + attendances per session date
    ├── progress/                ← MODULE_BASED & FREE_MATERIAL tracking
    ├── invoices/                ← Public token + auto invoice number
    ├── payments/                ← Auto-update invoice status (UNPAID → PARTIAL → PAID)
    ├── commissions/             ← Per-month calculation + approval
    ├── progress-reports/        ← Public shareable reports for parents
    ├── finance/                 ← Aggregated metrics + 6-month trends
    └── store/                   ← Products, sales (POS), stock mutations, transfers
```

### Standard module pattern (every feature module)

Each module has these files:

```
modules/<feature>/
├── <feature>.module.ts          ← imports PrismaModule, exports service
├── <feature>.controller.ts      ← REST endpoints with @ApiTags, @ApiOperation
├── <feature>.service.ts         ← Business logic, formats responses
└── dto/
    ├── create-<entity>.dto.ts   ← class-validator decorators + @ApiProperty
    ├── update-<entity>.dto.ts
    └── <entity>-response.dto.ts ← Optional, for Swagger docs
```

### Conventions

#### Response format (everything)

```typescript
// Success
{ success: true, data: T | T[], message?: string }

// Error (handled by AllExceptionsFilter)
{ success: false, statusCode: number, message: string, timestamp: string, path: string }
```

Service methods always return wrapped objects, not raw entities.

#### Auth on endpoints

```typescript
@UseGuards(JwtAuthGuard)              // Just authenticated
@UseGuards(JwtAuthGuard, RolesGuard)  // Authenticated + role check
@Roles('OWNER', 'ADMIN_GLOBAL', 'ADMIN_CABANG')  // ABCDE permissions
@ApiBearerAuth()                       // For Swagger
```

Public endpoints (no auth): used for invoice & progress report public tokens. Path convention: `/<feature>/public/:token`.

#### `@CurrentUser()` payload

```typescript
async create(@Body() dto, @CurrentUser() user: any) {
  // user = { id: string, email: string, role: 'OWNER' | ... }
  return this.service.create(dto, user.id)
}
```

#### Soft delete pattern

Most entities use `isActive: boolean` flag instead of hard delete. `DELETE /endpoint/:id` typically updates `isActive: false`. Hard delete only when no FK constraints would be violated AND business rules allow (e.g., invoice with no payments).

#### Transactions

Use `this.prisma.$transaction(async tx => { ... })` whenever multiple writes need atomicity. Examples: payment recording (creates Payment + updates Invoice), stock transfer (4 ops), enrollment.

### Roles & authorization matrix

| Action                           | OWNER | ADMIN_GLOBAL | ADMIN_CABANG    | GURU              |
| -------------------------------- | ----- | ------------ | --------------- | ----------------- |
| Master data CRUD                 | ✅    | ✅           | ✅ (own branch) | ❌                |
| Delete branch / teacher          | ✅    | ✅           | ❌              | ❌                |
| Generate invoice                 | ✅    | ✅           | ✅              | ❌                |
| Record payment                   | ✅    | ✅           | ✅              | ❌                |
| Calculate commission             | ✅    | ✅           | ✅              | ❌                |
| Approve commission               | ✅    | ✅           | ❌              | ❌                |
| Stock transfer between branches  | ✅    | ✅           | ❌              | ❌                |
| Submit attendance / progress     | ✅    | ✅           | ✅              | ✅ (own sessions) |
| View consolidated (Semua Cabang) | ✅    | ✅           | ❌              | —                 |

Multi-branch isolation for `ADMIN_CABANG` is currently enforced at frontend (BranchContext locks to first branch) — backend filtering by branchId is mostly opt-in via query params. Hardening for production should add server-side enforcement.

---

## 5. Frontend (`apps/frontend/`)

### Folder structure

```
apps/frontend/src/
├── app/
│   ├── layout.tsx                          ← Root layout, loads Google Fonts
│   ├── page.tsx                            ← / → KLC Bimbel landing page (public)
│   ├── landing.css                         ← Landing page styles (cream/orange/sage)
│   ├── globals.css                         ← Tailwind base
│   ├── (auth)/login/page.tsx               ← /login
│   ├── (dashboard)/                        ← Admin desktop UI
│   │   ├── layout.tsx                      ← Sidebar + Topbar wrapper
│   │   ├── dashboard/page.tsx              ← /dashboard (post-login admin landing)
│   │   ├── master-data/
│   │   │   ├── page.tsx                    ← /master-data (overview)
│   │   │   ├── branches/                   ← list, create, [id]
│   │   │   ├── subjects/                   ← list, create, [id]
│   │   │   ├── spp-rates/                  ← list, create, [id]
│   │   │   ├── curriculum-modules/         ← list, create, [id]
│   │   │   ├── students/                   ← list, create (4-step enrollment), [id]
│   │   │   └── teachers/                   ← list, create, [id]
│   │   ├── jadwal-sesi/                    ← list (weekly grid), create, [id]
│   │   ├── invoice-tagihan/page.tsx        ← /invoice-tagihan
│   │   ├── komisi-guru/page.tsx
│   │   ├── laporan-progress/page.tsx       ← Generate & manage report links
│   │   ├── laporan-keuangan/page.tsx
│   │   ├── toko-stok/page.tsx              ← Products + sales POS
│   │   └── transfer-stok/page.tsx          ← Owner-only branch transfer
│   ├── (guru)/                             ← Mobile-first PWA layout
│   │   └── guru/
│   │       ├── page.tsx                    ← /guru (dashboard)
│   │       ├── presensi/page.tsx           ← Today's sessions
│   │       ├── presensi/[sessionId]/       ← Mark attendance
│   │       │   ├── page.tsx
│   │       │   ├── progress/page.tsx       ← Step 2: input progress
│   │       │   └── done/page.tsx           ← Success page
│   │       ├── jadwal/page.tsx             ← Weekly schedule view
│   │       └── komisi/page.tsx             ← My commission history
│   ├── invoice/[token]/page.tsx            ← Public invoice (no auth, mobile)
│   └── laporan/[token]/page.tsx            ← Public progress report (no auth, mobile)
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx                     ← Main nav (desktop)
│   │   └── Topbar.tsx                      ← Branch switcher + user menu
│   ├── ui/
│   │   ├── Card.tsx                        ← Card, MetricCard, SectionCard
│   │   ├── Badge.tsx                       ← StatusBadge, SessionStatusBadge
│   │   └── States.tsx                      ← LoadingState, EmptyState, SkeletonCard
│   └── enrollment/                         ← Student enrollment stepper components
└── lib/
    ├── providers.tsx                       ← QueryClientProvider + BranchProvider wrapper
    ├── branch-context.tsx                  ← Global branch selection context
    └── api/
        ├── client.ts                       ← Axios instance with JWT interceptor
        └── endpoints.ts                    ← All API helpers (branchApi, studentApi, ...)
```

### Route groups

| Group         | Layout            | Purpose                                             |
| ------------- | ----------------- | --------------------------------------------------- |
| `(auth)`      | login layout      | `/login` only                                       |
| `(dashboard)` | Sidebar + Topbar  | All admin desktop pages                             |
| `(guru)`      | Mobile bottom-nav | All teacher mobile pages                            |
| (no group)    | Root layout only  | `/` landing, `/invoice/[token]`, `/laporan/[token]` |

**Important:** `/dashboard` (post-login admin home) lives at `app/(dashboard)/dashboard/page.tsx`. The root `app/page.tsx` is the **public landing page**. Don't confuse the two.

### Login & redirect logic

- `/login` → after success: GURU → `/guru/presensi`, others → `/dashboard`
- `(guru)/layout.tsx` → if logged-in user is non-GURU, redirect to `/dashboard`
- `app/page.tsx` (landing) → "Masuk" button: if logged in → `/dashboard`, else → `/login`

### Auth state (frontend)

JWT stored in `localStorage`:

- `token` — JWT
- `userRole` — `OWNER` | `ADMIN_GLOBAL` | `ADMIN_CABANG` | `GURU`
- `userId` — user ID
- `userName` — display name
- `selectedBranchId` — active branch (managed by BranchContext)

Logout clears all of the above and pushes to `/login`.

### API client (`lib/api/client.ts`)

Axios instance:

- baseURL: `process.env.NEXT_PUBLIC_API_URL` (default `http://localhost:3001`, but our backend runs on `3000` — verify env)
- Request interceptor adds `Authorization: Bearer {token}` from localStorage
- Response interceptor: on 401 → clear token + redirect to `/login`

### API endpoints helper (`lib/api/endpoints.ts`)

Each domain exports a typed API object:

```typescript
(branchApi, subjectApi, sppRateApi, curriculumModuleApi);
(studentApi, teacherApi);
(sessionApi, attendanceApi, progressApi);
(invoiceApi, paymentApi, commissionApi);
(progressReportApi, financeApi, storeApi);
```

Pattern: `getAll(filters?)`, `getOne(id)`, `create(data)`, `update(id, data)`, `delete(id)`. Some have specialized methods like `sessionApi.getTodayForMe()`, `invoiceApi.getByToken(token)`.

For **public endpoints** (no auth required), still call via `apiClient` — it will just send a meaningless token. The backend ignores it for public routes.

### BranchContext (`lib/branch-context.tsx`)

**Single source of truth for "which branch am I viewing?"**

```typescript
import { useBranch, useApiBranchId } from '@/lib/branch-context'

const { selectedBranchId, selectedBranch, branches, canViewAllBranches, ... } = useBranch()

// In API calls — undefined means "all branches" / consolidated
const branchId = useApiBranchId()
const { data } = useQuery({
  queryKey: ['some-data', branchId],
  queryFn: () => someApi.getAll({ branchId }),
})
```

Behavior by role:

- `OWNER` / `ADMIN_GLOBAL` → can pick any branch OR "Semua Cabang" (empty string → backend returns consolidated)
- `ADMIN_CABANG` → locked to their branch (auto-selects first branch, switcher disabled with 🔒 icon)
- `GURU` → context not active (guru layout doesn't render Topbar)

Persisted to localStorage as `selectedBranchId`. Cleared on logout.

**Pages that need a SPECIFIC branch** (like `/komisi-guru`, `/toko-stok`) show a "pilih cabang dulu" notice with quick-select buttons when `branchId` is empty.

### React Query patterns

- **staleTime:** 5 minutes (default in providers.tsx)
- **gcTime:** 10 minutes
- queryKey convention: `[domain, ...filters]` — include `branchId` in key when filtering
- Always handle loading + empty + error states explicitly
- After mutations (create/update/delete), call `refetch()` from the relevant query

### Component conventions

- All interactive pages use `'use client'`
- Forms always use `react-hook-form` + `zod` + `zodResolver`
- Validation messages in Bahasa Indonesia
- Modals: simple `fixed inset-0 bg-black/50 z-50` overlay (no library)
- For repeated lists/grids → use `useMemo` to derive data
- Icons from `lucide-react` only (no emoji icons in production UI except landing page)

---

## 6. Database (Prisma + Supabase)

### Schema location

`apps/backend/prisma/schema.prisma` — single source of truth (24 tables).

### Categories (per ERD)

1. **Auth (2)** — `users`, `user_branches`
2. **Master data (3)** — `branches`, `subjects`, `spp_rates`, `curriculum_modules`
3. **Students (3)** — `students`, `student_subjects`, `student_module_progress`
4. **Sessions (3)** — `sessions`, `session_students`, `session_logs`
5. **Attendance & progress (2)** — `attendances`, `progress_logs`
6. **Reports (1)** — `progress_report_links`
7. **Commission (2)** — `commissions`, `commission_details`
8. **Invoice (3)** — `invoices`, `invoice_items`, `payments`
9. **Store (4)** — `products`, `stock_mutations`, `sales`, `sale_items`

### Key enums

```prisma
enum Role { OWNER, ADMIN_GLOBAL, ADMIN_CABANG, GURU }
enum SubjectTrackingType { MODULE_BASED, FREE_MATERIAL }
enum SessionType { REGULAR, PRIVATE }
enum DayOfWeek { SENIN..MINGGU }
enum SessionLogStatus { SCHEDULED, COMPLETED, CANCELLED }
enum AttendanceStatus { HADIR, ABSEN, IZIN, SAKIT }
enum Predicate { PERLU_BIMBINGAN, CUKUP, BAIK, BAIK_SEKALI, MEMUASKAN }
enum ModuleStatus { NOT_STARTED, IN_PROGRESS, COMPLETED }
enum CommissionStatus { DRAFT, CALCULATED, APPROVED }
enum InvoiceType { SPP, REGISTRATION }
enum InvoiceStatus { UNPAID, PARTIAL, PAID }
enum PaymentMethod { CASH, TRANSFER, OTHER }
enum ProductCategory { STATIONARY, MODULE, UNIFORM, STATIONERY }
enum StockMutationType { IN, OUT, TRANSFER_IN, TRANSFER_OUT, ADJUSTMENT }
```

### Important model gotchas

- `CurriculumModule` does **NOT** have `isActive` field. Don't add `isActive: true` to where clauses.
- `User` is the table for both admins AND teachers. Teachers = users with `role = GURU`.
- `UserBranch` is the m:n join table letting one user belong to multiple branches (with `isPrimary` flag).
- `Session` uses `startTime: String` in `HH:mm` format (NOT a DateTime).
- `SessionLog` is created **per session per date** (so a weekly Senin session has multiple session logs over time).
- Invoice number format: `INV-{TYPE_CODE}-{BRANCH_CODE}-{YYYYMM}-{SEQ}` (e.g., `INV-SPP-PWK-202604-001`).
- Invoice `publicToken` = 16-byte random hex (32 chars), unique constraint.
- `ProgressReportLink.subjectIds: String[]` is a Postgres array column (not relation).

### Migrations & connection

**Backend `.env` MUST have BOTH:**

```env
DATABASE_URL="postgresql://postgres.{REF}:{PASSWORD}@aws-1-{REGION}.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres.{REF}:{PASSWORD}@aws-1-{REGION}.pooler.supabase.com:5432/postgres"
```

**Critical:** Use the **pooler** hostname (`aws-1-...pooler.supabase.com`), NOT the direct host (`db.{REF}.supabase.co`). Direct connection is IPv6-only and won't work on most IPv4 networks (especially Indonesian ISPs / Windows machines without IPv6).

For projects created **after Supabase's pooler migration** (Apr 2026+), use `aws-1-` prefix. Older projects use `aws-0-`.

`schema.prisma` datasource:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")  // ← Required for migrations
}
```

### Supabase project info (current)

- **Project ref:** `dntpsrsvvyqjjwvyhdhf`
- **Region:** `ap-northeast-2` (Seoul)
- **Pooler host:** `aws-1-ap-northeast-2.pooler.supabase.com`
- **Database host (direct, IPv6):** `db.dntpsrsvvyqjjwvyhdhf.supabase.co`
- **API URL:** `https://dntpsrsvvyqjjwvyhdhf.supabase.co`
- **RLS:** Disabled on all tables (auth handled at app layer via JWT) — re-enable for production

### Prisma operations

```bash
cd apps/backend
pnpm prisma generate              # After schema change
pnpm prisma migrate dev           # Create + apply migration in dev
pnpm prisma migrate deploy        # Apply pending migrations (prod)
pnpm prisma studio                # GUI browser
pnpm prisma db push               # Push schema without migration (dev only)
```

---

## 7. Environment Files

### `apps/backend/.env`

```env
DATABASE_URL="postgresql://postgres.{REF}:{PWD}@aws-1-{REGION}.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres.{REF}:{PWD}@aws-1-{REGION}.pooler.supabase.com:5432/postgres"
SUPABASE_URL="https://{REF}.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="sb_secret_..."  # use service role key, not publishable
JWT_SECRET="<long-random-string>"
JWT_EXPIRATION="7d"
NODE_ENV="development"
PORT=3000
```

### `apps/frontend/.env.local`

```env
NEXT_PUBLIC_API_URL="http://localhost:3000"
NEXT_PUBLIC_BACKEND_URL="http://localhost:3000"
NEXT_PUBLIC_SUPABASE_URL="https://{REF}.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="sb_publishable_..."
```

**Port convention in this project:**

- Backend → `3000`
- Frontend → `3001`

(Note: this is REVERSED from typical Next.js+NestJS setups. Verify on each new dev machine.)

---

## 8. Key Patterns & Workflows

### Adding a new backend feature module

1. Create folder `src/modules/<feature>/` with `controller.ts`, `service.ts`, `module.ts`, `dto/`
2. Module imports `PrismaModule`, declares controller + service, exports service
3. Register in `app.module.ts` `imports` array
4. Endpoints follow `@Controller('<feature>')` + REST pattern
5. Use `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(...)` for protected routes
6. **Always restart backend after adding new modules** — watcher sometimes doesn't pick up new folders

### Adding a new frontend page

1. Decide route group: `(dashboard)` for admin, `(guru)` for teacher mobile, no group for public
2. Create `page.tsx` (with `'use client'` if interactive)
3. Add API helper to `lib/api/endpoints.ts` if calling new endpoint
4. Add menu link to `components/layout/Sidebar.tsx` (for admin pages)
5. Add page title detection to `components/layout/Topbar.tsx` `getPageTitle()`
6. Use `useApiBranchId()` from BranchContext if filtering by branch

### Public-shareable resources (invoice, progress report)

Pattern:

1. Backend stores a unique `publicToken` (16-byte hex) per resource
2. Public endpoint at `/<feature>/public/:token` (no auth guards)
3. Frontend page at `/<feature>/[token]/page.tsx` (outside route groups)
4. Mobile-first design (since accessed via WhatsApp link)
5. Backend prevents access to expired links (e.g., `expiresAt < now`)

### Branch-aware queries

```typescript
const branchId = useApiBranchId(); // undefined = all branches

const { data } = useQuery({
  queryKey: ["key", branchId], // include in key for proper cache invalidation
  queryFn: () => api.getAll({ branchId }),
});
```

For pages requiring SPECIFIC branch (not consolidation):

```typescript
const { selectedBranchId, branches, canViewAllBranches, setSelectedBranchId } =
  useBranch();

if (!selectedBranchId && canViewAllBranches) {
  // Render "pilih cabang dulu" notice with quick-select buttons
}
```

### Form pattern (create/edit)

```typescript
const schema = z.object({
  name: z.string().min(3, 'Nama minimal 3 karakter'),
  // ...
})

const { register, handleSubmit, reset, formState: { errors } } = useForm({
  resolver: zodResolver(schema),
  defaultValues: { ... },
})

// For edit pages: re-populate when data loads
useEffect(() => {
  if (existingData) reset(existingData)
}, [existingData, reset])

const onSubmit = async (data) => {
  try {
    await api.create(data)        // or .update(id, data)
    router.push('/list?success=created')
  } catch (err) {
    setError(err.response?.data?.message)
  }
}
```

---

## 9. Known Gotchas & Past Bugs

| Issue                                      | Solution                                                                                                               |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| Prisma "Can't reach database server"       | Use pooler URL (`aws-1-{region}.pooler.supabase.com`), not direct `db.{ref}.supabase.co`                               |
| "tenant/user not found" pooler error       | Wrong cluster prefix — newer projects use `aws-1-`, older use `aws-0-`                                                 |
| `CurriculumModule isActive does not exist` | Model has no `isActive` field; remove from where clauses                                                               |
| Form not pre-filled on edit                | Pass `initialData` prop AND use `useEffect` + `reset()` (defaultValues alone doesn't update on prop change)            |
| Backend route 404 after adding module      | Restart backend (`pnpm start:dev`) — watcher misses new folder                                                         |
| Frontend can't connect to API              | Verify `NEXT_PUBLIC_API_URL` matches backend port (we use 3000, not 3001)                                              |
| Two pages at `/` route conflict            | `(dashboard)/page.tsx` + `app/page.tsx` collide. Dashboard moved to `(dashboard)/dashboard/page.tsx`. Root is landing. |

---

## 10. Project Phases (Historical)

The project was built in 6 phases:

| Phase | Scope                                                        |
| ----- | ------------------------------------------------------------ |
| **1** | Auth + Dashboard scaffold                                    |
| **2** | Master Data CRUD + Students + Teachers                       |
| **3** | Sessions, Attendance, Progress (admin desktop + guru mobile) |
| **4** | Invoices + Payments + Commissions                            |
| **+** | KLC Bimbel landing page (from Claude Design handoff)         |
| **5** | Public progress reports + Finance reports + Store/POS        |
| **6** | Multi-branch consolidation + Stock transfer                  |

All 6 phases are complete. See git log + commit history for detailed timeline.

---

## 11. References

| Doc                   | Location                                      |
| --------------------- | --------------------------------------------- |
| Business rules        | `plan/business-rule.md`                       |
| ERD (database design) | `plan/erd.md`                                 |
| Setup guide           | `plan/SETUP.md` (if exists)                   |
| Wireframes 01–14      | `plan/01-*.md` through `plan/14-*.md`         |
| Landing page source   | `landingpage/project/landing/KLC Bimbel.html` |
| Initial prompt        | `plan/INSTRUCTIONS.md`                        |

---

## 12. Test Credentials

(Configured in DB seed — verify still valid)

| Role         | Email              | Password   |
| ------------ | ------------------ | ---------- |
| Owner        | `owner@bimbel.com` | `password` |
| Admin Global | `admin@bimbel.com` | `password` |
| Guru         | `guru@bimbel.com`  | `password` |

(Auth service in current state accepts ANY non-empty password — passwords aren't bcrypt-hashed yet. **Implement bcrypt before production.**)

---

## 13. TODOs / Production Readiness

When approaching production, address:

1. **Hash passwords** — current auth accepts any non-empty string
2. **Strong JWT_SECRET** — generate cryptographically random
3. **Use service role key**, not publishable key, for `SUPABASE_SERVICE_ROLE_KEY`
4. **Enable RLS** on all Supabase tables + write policies
5. **Server-side branch isolation** — currently relies on frontend BranchContext for ADMIN_CABANG
6. **Rate limiting** — add `@nestjs/throttler` to public endpoints
7. **Error logging** — integrate Sentry or similar
8. **Database backups** — verify Supabase backup schedule meets requirements
9. **Migrate to Supabase Auth** if email verification / SSO is needed
10. **Add unit + e2e tests** — currently no test coverage

## MANDATORY: Use LeanKG First

Before ANY codebase search/navigation, use LeanKG tools:

1. mcp_status - check if ready
2. Use tool: search_code, find_function, query_file, get_impact_radius
3. Only fallback to grep/read if LeanKG fails

| Task                       | Use                          |
| -------------------------- | ---------------------------- |
| Where is X?                | search_code or find_function |
| What breaks if I change Y? | get_impact_radius            |
| What tests cover Y?        | get_tested_by                |
| How does X work?           | get_context                  |
