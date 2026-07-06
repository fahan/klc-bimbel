# Error State for `usePagination` Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface a real error state (instead of a silent, misleading "no data" empty state) on all 5 admin pages that use the `usePagination` hook, when the underlying list query fails.

**Architecture:** `usePagination` already returns `error` and `refetch` from React Query — nothing there needs to change. Each of the 5 consuming pages destructures `error`, and adds it as the FIRST condition in its loading/empty/table render ternary, rendering the existing `ErrorState` component (`apps/frontend/src/components/ui/States.tsx`) with a "Coba Lagi" (retry) button wired to `refetch`.

**Tech Stack:** Next.js 14, React Query v5 (via `usePagination`), no test framework for the frontend in this repo (verification is type-check + manual browser check, consistent with how this project already works).

**Spec:** `docs/superpowers/specs/2026-07-06-pagination-error-state-design.md`

---

### Task 1: `presensi/page.tsx`

**Files:**
- Modify: `apps/frontend/src/app/(dashboard)/presensi/page.tsx:17` (import), `:84-99` (destructuring), `:630-636` (render)

- [ ] **Step 1: Add `ErrorState` to the import**

In `apps/frontend/src/app/(dashboard)/presensi/page.tsx`, change line 17 from:

```typescript
import { LoadingState, EmptyState } from '@/components/ui/States'
```

to:

```typescript
import { LoadingState, EmptyState, ErrorState } from '@/components/ui/States'
```

- [ ] **Step 2: Destructure `error` from `usePagination`**

Change the destructuring (currently lines 84-93) from:

```typescript
  const {
    items: sessions,
    page,
    limit,
    setPage,
    setLimit,
    pagination,
    isLoading: sessionsLoading,
    refetch: refetchSessions,
  } = usePagination({
```

to:

```typescript
  const {
    items: sessions,
    page,
    limit,
    setPage,
    setLimit,
    pagination,
    isLoading: sessionsLoading,
    error: sessionsError,
    refetch: refetchSessions,
  } = usePagination({
```

- [ ] **Step 3: Render `ErrorState` as the first condition**

Change the render block (currently lines 630-636) from:

```tsx
      {sessionsLoading ? (
        <LoadingState />
      ) : filteredSessions.length === 0 ? (
        <EmptyState
          title="Belum ada data presensi"
          description="Tidak ada sesi yang sesuai dengan filter yang dipilih"
        />
      ) : (
```

to:

```tsx
      {sessionsError ? (
        <ErrorState
          title="Gagal memuat data"
          description="Terjadi kesalahan saat memuat data. Silakan coba lagi."
          action={{ label: 'Coba Lagi', onClick: refetchSessions }}
        />
      ) : sessionsLoading ? (
        <LoadingState />
      ) : filteredSessions.length === 0 ? (
        <EmptyState
          title="Belum ada data presensi"
          description="Tidak ada sesi yang sesuai dengan filter yang dipilih"
        />
      ) : (
```

(Only the opening condition changes — the rest of the ternary chain, including the closing `)}` far below, is untouched.)

- [ ] **Step 4: Type-check**

Run: `cd apps/frontend && pnpm type-check`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add "apps/frontend/src/app/(dashboard)/presensi/page.tsx"
git commit -m "feat(frontend): show error state on presensi page when session list fails to load"
```

---

### Task 2: `master-data/teachers/page.tsx`

**Files:**
- Modify: `apps/frontend/src/app/(dashboard)/master-data/teachers/page.tsx:10` (import), `:22` (destructuring), `:186-197` (render)

This file already uses the `LoadingState`/`EmptyState` ternary pattern (same shape as Task 1) and has no local `error` state to worry about — no aliasing needed.

- [ ] **Step 1: Add `ErrorState` to the import**

Change line 10 from:

```typescript
import { EmptyState, LoadingState } from '@/components/ui/States'
```

to:

```typescript
import { EmptyState, LoadingState, ErrorState } from '@/components/ui/States'
```

- [ ] **Step 2: Destructure `error` from `usePagination`**

Change line 22 from:

```typescript
  const { items: teachers, page, limit, setPage, setLimit, pagination, isLoading, refetch } = usePagination({
```

to:

```typescript
  const { items: teachers, page, limit, setPage, setLimit, pagination, isLoading, error, refetch } = usePagination({
```

- [ ] **Step 3: Render `ErrorState` as the first condition**

Change the render block (currently lines 186-197) from:

```tsx
      {isLoading ? (
        <LoadingState />
      ) : teachers.length === 0 && !searchTerm ? (
        <EmptyState
          title="Belum ada guru"
          description="Mulai dengan menambahkan guru pertama ke sistem"
          action={{
            label: 'Tambah Guru Pertama',
            onClick: () => router.push('/master-data/teachers/create'),
          }}
        />
      ) : (
```

to:

```tsx
      {error ? (
        <ErrorState
          title="Gagal memuat data"
          description="Terjadi kesalahan saat memuat data. Silakan coba lagi."
          action={{ label: 'Coba Lagi', onClick: refetch }}
        />
      ) : isLoading ? (
        <LoadingState />
      ) : teachers.length === 0 && !searchTerm ? (
        <EmptyState
          title="Belum ada guru"
          description="Mulai dengan menambahkan guru pertama ke sistem"
          action={{
            label: 'Tambah Guru Pertama',
            onClick: () => router.push('/master-data/teachers/create'),
          }}
        />
      ) : (
```

- [ ] **Step 4: Type-check**

Run: `cd apps/frontend && pnpm type-check`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add "apps/frontend/src/app/(dashboard)/master-data/teachers/page.tsx"
git commit -m "feat(frontend): show error state on teachers page when list fails to load"
```

---

### Task 3: `master-data/spp-rates/page.tsx`

**Files:**
- Modify: `apps/frontend/src/app/(dashboard)/master-data/spp-rates/page.tsx:7` (import), `:26` (destructuring), `:108-116` (render)

This file does NOT use `LoadingState`/`EmptyState` — it has its own inline loading/empty markup, and already has a LOCAL `error` state (line 25, `const [error, setError] = useState('')`, used for a separate subject-fetch failure banner). The query error must be destructured under a DIFFERENT name (`queryError`) to avoid colliding with that existing local state.

- [ ] **Step 1: Add `ErrorState` to the import**

Change line 7 from:

```typescript
import { Pagination } from '@/components/ui/Pagination'
```

to:

```typescript
import { Pagination } from '@/components/ui/Pagination'
import { ErrorState } from '@/components/ui/States'
```

- [ ] **Step 2: Destructure the query error under an aliased name**

Change line 26 from:

```typescript
  const { items: rates, page, limit, setPage, setLimit, pagination, isLoading, refetch } = usePagination({
```

to:

```typescript
  const { items: rates, page, limit, setPage, setLimit, pagination, isLoading, error: queryError, refetch } = usePagination({
```

- [ ] **Step 3: Render `ErrorState` as the first condition, keep the existing local-error banner and loading/table blocks intact**

Change the render block (currently lines 108-116) from:

```tsx
      {/* Loading State */}
      {isLoading && (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <p className="text-gray-600">Loading SPP rates...</p>
        </div>
      )}

      {/* SPP Rates Table */}
      {!isLoading && (
```

to:

```tsx
      {/* Query Error State */}
      {queryError ? (
        <ErrorState
          title="Gagal memuat data"
          description="Terjadi kesalahan saat memuat data. Silakan coba lagi."
          action={{ label: 'Coba Lagi', onClick: refetch }}
        />
      ) : isLoading ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <p className="text-gray-600">Loading SPP rates...</p>
        </div>
      ) : (
```

Note: this changes the two separate `{isLoading && (...)} {!isLoading && (...)}` blocks into a single three-way ternary. The content that was inside `{!isLoading && ( ... )}` (the whole "SPP Rates Table" div, currently starting right after what you just replaced and running through its matching closing `)}`) stays exactly as-is — you're only changing the OPENING of that block from `{!isLoading && (` to `) : (` (i.e., removing the old opening line and the block's own closing `)}` becomes the ternary's final `)}`). Do not touch anything inside that block's contents.

- [ ] **Step 4: Type-check**

Run: `cd apps/frontend && pnpm type-check`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add "apps/frontend/src/app/(dashboard)/master-data/spp-rates/page.tsx"
git commit -m "feat(frontend): show error state on SPP rates page when list fails to load"
```

---

### Task 4: `master-data/subjects/page.tsx`

**Files:**
- Modify: `apps/frontend/src/app/(dashboard)/master-data/subjects/page.tsx:7` (import), `:21` (destructuring), `:62-70` (render)

Same shape as Task 3 (local `error` state at line 20, needs `queryError` alias).

- [ ] **Step 1: Add `ErrorState` to the import**

Change line 7 from:

```typescript
import { Pagination } from '@/components/ui/Pagination'
```

to:

```typescript
import { Pagination } from '@/components/ui/Pagination'
import { ErrorState } from '@/components/ui/States'
```

- [ ] **Step 2: Destructure the query error under an aliased name**

Change line 21 from:

```typescript
  const { items: subjects, page, limit, setPage, setLimit, pagination, isLoading, refetch } = usePagination({
```

to:

```typescript
  const { items: subjects, page, limit, setPage, setLimit, pagination, isLoading, error: queryError, refetch } = usePagination({
```

- [ ] **Step 3: Render `ErrorState` as the first condition**

Change the render block (currently lines 62-70) from:

```tsx
      {/* Loading State */}
      {isLoading && (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <p className="text-gray-600">Loading subjects...</p>
        </div>
      )}

      {/* Subjects Table */}
      {!isLoading && (
```

to:

```tsx
      {/* Query Error State */}
      {queryError ? (
        <ErrorState
          title="Gagal memuat data"
          description="Terjadi kesalahan saat memuat data. Silakan coba lagi."
          action={{ label: 'Coba Lagi', onClick: refetch }}
        />
      ) : isLoading ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <p className="text-gray-600">Loading subjects...</p>
        </div>
      ) : (
```

Same note as Task 3 Step 3: the content previously inside `{!isLoading && ( ... )}` is untouched, only the opening changes.

- [ ] **Step 4: Type-check**

Run: `cd apps/frontend && pnpm type-check`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add "apps/frontend/src/app/(dashboard)/master-data/subjects/page.tsx"
git commit -m "feat(frontend): show error state on subjects page when list fails to load"
```

---

### Task 5: `master-data/branches/page.tsx`

**Files:**
- Modify: `apps/frontend/src/app/(dashboard)/master-data/branches/page.tsx:7` (import), `:21` (destructuring), `:58-66` (render)

Same shape as Tasks 3-4 (local `error` state at line 20, needs `queryError` alias).

- [ ] **Step 1: Add `ErrorState` to the import**

Change line 7 from:

```typescript
import { Pagination } from '@/components/ui/Pagination'
```

to:

```typescript
import { Pagination } from '@/components/ui/Pagination'
import { ErrorState } from '@/components/ui/States'
```

- [ ] **Step 2: Destructure the query error under an aliased name**

Change line 21 from:

```typescript
  const { items: branches, page, limit, setPage, setLimit, pagination, isLoading, refetch } = usePagination({
```

to:

```typescript
  const { items: branches, page, limit, setPage, setLimit, pagination, isLoading, error: queryError, refetch } = usePagination({
```

- [ ] **Step 3: Render `ErrorState` as the first condition**

Change the render block (currently lines 58-66) from:

```tsx
      {/* Loading State */}
      {isLoading && (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <p className="text-gray-600">Loading branches...</p>
        </div>
      )}

      {/* Branches Table */}
      {!isLoading && (
```

to:

```tsx
      {/* Query Error State */}
      {queryError ? (
        <ErrorState
          title="Gagal memuat data"
          description="Terjadi kesalahan saat memuat data. Silakan coba lagi."
          action={{ label: 'Coba Lagi', onClick: refetch }}
        />
      ) : isLoading ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <p className="text-gray-600">Loading branches...</p>
        </div>
      ) : (
```

Same note as Task 3 Step 3: the content previously inside `{!isLoading && ( ... )}` is untouched, only the opening changes.

- [ ] **Step 4: Type-check**

Run: `cd apps/frontend && pnpm type-check`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add "apps/frontend/src/app/(dashboard)/master-data/branches/page.tsx"
git commit -m "feat(frontend): show error state on branches page when list fails to load"
```

---

### Task 6: Manual verification across all 5 pages

**Files:** none (verification only)

There is no frontend test framework in this repo (per `CLAUDE.md` TODO #10 and this plan's spec) — verification is manual, using a real backend forced to fail.

- [ ] **Step 1: Type-check the whole monorepo**

Run (from repo root): `pnpm type-check`
Expected: no errors in `apps/backend` or `apps/frontend`.

- [ ] **Step 2: Boot the frontend against a deliberately unreachable backend**

Start only the frontend dev server (do NOT start the backend, or stop it if already running) so every API call fails with a network error:

```bash
cd apps/frontend
pnpm dev
```

(Or use the Claude Preview MCP tools' `preview_start` with the `"frontend"` config from `.claude/launch.json` if using tool-driven browser verification — do NOT start the `"backend"` config for this check.)

- [ ] **Step 3: Visit each of the 5 pages and confirm the error state renders**

For each of these 5 routes, load the page (minting a dev JWT and injecting it into `localStorage` first, per `CLAUDE.md` section 12, since there's no backend to log in against anyway — any role that can reach these admin pages, e.g. `OWNER`, works for all 5):

- `/presensi`
- `/master-data/teachers`
- `/master-data/spp-rates`
- `/master-data/subjects`
- `/master-data/branches`

For each page, confirm:
1. A red-icon `ErrorState` card renders with the title "Gagal memuat data" and a "Coba Lagi" button — NOT the empty-list message, NOT a blank/broken page.
2. Clicking "Coba Lagi" triggers a new network request (visible in DevTools Network tab) — it will still fail since the backend is down, but confirm the button is wired and doesn't throw a JS error (check the browser console for errors after clicking).

- [ ] **Step 4: Confirm the fix by starting the backend and re-checking one page**

Start the backend (`pnpm dev:backend` in a separate terminal, or `preview_start` with the `"backend"` config), then click "Coba Lagi" again on whichever page is still open — confirm the error state disappears and the real data/table renders normally. This proves the retry action actually recovers once the underlying problem is gone, not just that it re-fires a request.

- [ ] **Step 5: Stop any dev servers you started for this verification**

If you used `pnpm dev`/`pnpm dev:backend` directly, stop them (Ctrl+C). If you used Claude Preview `preview_start`, call `preview_stop` on every serverId you started.

---

## Self-Review Notes

- **Spec coverage:** all 5 pages covered (Tasks 1-5), `ErrorState` reused as-is with no new component (per spec's non-goals), `usePagination.ts` itself untouched, local `error` state in the 3 master-data files preserved and not collided with (aliased to `queryError`), manual verification covers both the failure AND recovery path (Task 6).
- **Type consistency:** `error`/`queryError`/`sessionsError` naming is intentionally different per file to avoid local-state collisions — each task's Step 2 and Step 3 use the SAME name consistently within that file.
- **Non-goals respected:** no changes to `usePagination.ts`, no new shared component created, no changes to the 4 local `error` states' existing usage (form/CRUD error banners in spp-rates/subjects/branches are untouched, still render from their own `error` state).
