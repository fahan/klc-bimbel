# Error State untuk Halaman List Admin (raw useQuery) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the same `ErrorState` treatment already shipped for 5 `usePagination` pages to 13 more admin pages that fetch their main list via a raw `useQuery` call, so a failed request shows "Gagal memuat data" + retry instead of silently falling through to an empty-list message.

**Architecture:** Each of the 13 pages gets 3 changes to its main list query: (1) destructure `error` (or `queryError` if a local `error` state already exists for something else), (2) add `networkMode: 'always'` (each page owns its own `useQuery` call directly — unlike the `usePagination` batch, there's no single shared hook to patch once), (3) render `ErrorState` as the first condition in whatever loading/empty/table logic already exists for that page (ternary-in-JSX, early-return, or bespoke inline markup, matching each file's existing style).

**Tech Stack:** Next.js 14 + `@tanstack/react-query` v5 + existing `ErrorState` component from `apps/frontend/src/components/ui/States.tsx` (unchanged, reused as-is).

**Spec:** `docs/superpowers/specs/2026-07-06-list-pages-error-state-design.md`

**Note excluded from this plan:** `apps/frontend/src/app/(dashboard)/laporan-progress/components/ViewProgressTab.tsx` was in the spec's candidate list but turned out to already handle its query error correctly (a custom inline red message box at line 210-213, `isError: reportError` already destructured and used) — it just doesn't use the shared `ErrorState` component or offer a retry button. This is a minor visual inconsistency, not the "silently swallows errors" bug this plan fixes, so it's left out of scope here.

---

### Task 1: `formula-komisi/page.tsx`

**Files:** Modify `apps/frontend/src/app/(dashboard)/formula-komisi/page.tsx:161`, `:197-201`

No `LoadingState`/`EmptyState`/`ErrorState` imports exist in this file at all — it uses bespoke inline markup.

- [ ] **Step 1: Add `ErrorState` import**

Change (line 5, right after the `commissionFormulaApi` import):
```typescript
import { commissionFormulaApi } from '@/lib/api/endpoints'
import { Settings2, Save, RotateCcw, Info } from 'lucide-react'
```
to:
```typescript
import { commissionFormulaApi } from '@/lib/api/endpoints'
import { Settings2, Save, RotateCcw, Info } from 'lucide-react'
import { ErrorState } from '@/components/ui/States'
```

- [ ] **Step 2: Destructure `error` and add `networkMode`**

Change (line 161):
```typescript
  const { data, isLoading } = useQuery({
    queryKey: ['commission-formulas'],
    queryFn: () => commissionFormulaApi.getAll(),
  })
```
to:
```typescript
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['commission-formulas'],
    queryFn: () => commissionFormulaApi.getAll(),
    networkMode: 'always',
  })
```

- [ ] **Step 3: Add `ErrorState` as the first condition**

Change (lines 197-201):
```tsx
      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Memuat data...</div>
      ) : subjects.length === 0 ? (
        <div className="text-center py-12 text-gray-400">Belum ada mata pelajaran aktif</div>
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
        <div className="text-center py-12 text-gray-500">Memuat data...</div>
      ) : subjects.length === 0 ? (
        <div className="text-center py-12 text-gray-400">Belum ada mata pelajaran aktif</div>
      ) : (
```

- [ ] **Step 4: Type-check**

Run: `cd apps/frontend && pnpm type-check` — expect no errors.

- [ ] **Step 5: Commit**

```bash
git add "apps/frontend/src/app/(dashboard)/formula-komisi/page.tsx"
git commit -m "feat(frontend): show error state on formula komisi page when list fails to load"
```

---

### Task 2: `komisi-guru/page.tsx`

**Files:** Modify `apps/frontend/src/app/(dashboard)/komisi-guru/page.tsx:22`, `:65-69`, `:399-409`

Already imports `LoadingState, EmptyState` from `@/components/ui/States` (line 22). No local `error` state collision.

- [ ] **Step 1: Add `ErrorState` to the import**

Change line 22 from:
```typescript
import { LoadingState, EmptyState } from '@/components/ui/States'
```
to:
```typescript
import { LoadingState, EmptyState, ErrorState } from '@/components/ui/States'
```

- [ ] **Step 2: Destructure `error` and add `networkMode`**

Change (lines 65-69):
```typescript
  const { data: commissionsData, isLoading, refetch } = useQuery({
    queryKey: ['commissions', branchId, month, year],
    queryFn: () => commissionApi.getByMonth(branchId, month, year),
    enabled: !!branchId,
  })
```
to:
```typescript
  const { data: commissionsData, isLoading, error, refetch } = useQuery({
    queryKey: ['commissions', branchId, month, year],
    queryFn: () => commissionApi.getByMonth(branchId, month, year),
    enabled: !!branchId,
    networkMode: 'always',
  })
```

- [ ] **Step 3: Add `ErrorState` as the first condition**

Change (lines 399-409, the exact `title`/`description`/`action` inside `EmptyState` stay the same, only the opening condition changes):
```tsx
      {isLoading ? (
        <LoadingState />
      ) : commissions.length === 0 ? (
        <EmptyState
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
      ) : commissions.length === 0 ? (
        <EmptyState
```
(The rest of that `EmptyState` block and everything after is unchanged.)

- [ ] **Step 4: Type-check**

Run: `cd apps/frontend && pnpm type-check` — expect no errors.

- [ ] **Step 5: Commit**

```bash
git add "apps/frontend/src/app/(dashboard)/komisi-guru/page.tsx"
git commit -m "feat(frontend): show error state on komisi guru page when list fails to load"
```

---

### Task 3: `laporan-keuangan/page.tsx`

**Files:** Modify `apps/frontend/src/app/(dashboard)/laporan-keuangan/page.tsx:18`, `:70-73`, `:105-113`

This file uses an early-return pattern (`if (isLoading) return <LoadingState />` then `if (!overview) return <custom div>`), not a ternary-in-JSX. Only imports `LoadingState` (line 18), no `EmptyState`. No local `error` state collision.

- [ ] **Step 1: Add `ErrorState` to the import**

Change line 18 from:
```typescript
import { LoadingState } from '@/components/ui/States'
```
to:
```typescript
import { LoadingState, ErrorState } from '@/components/ui/States'
```

- [ ] **Step 2: Destructure `error` and add `networkMode`**

Change (lines 70-73):
```typescript
  const { data: overviewData, isLoading } = useQuery({
    queryKey: ['finance-overview', month, year, branchId],
    queryFn: () => financeApi.getOverview(month, year, branchId),
  })
```
to:
```typescript
  const { data: overviewData, isLoading, error, refetch } = useQuery({
    queryKey: ['finance-overview', month, year, branchId],
    queryFn: () => financeApi.getOverview(month, year, branchId),
    networkMode: 'always',
  })
```

- [ ] **Step 3: Add an early-return `ErrorState` check before the `isLoading` check**

Change (lines 105-113):
```typescript
  if (isLoading) return <LoadingState />

  if (!overview) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Data keuangan belum tersedia</p>
      </div>
    )
  }
```
to:
```typescript
  if (error) {
    return (
      <ErrorState
        title="Gagal memuat data"
        description="Terjadi kesalahan saat memuat data. Silakan coba lagi."
        action={{ label: 'Coba Lagi', onClick: refetch }}
      />
    )
  }

  if (isLoading) return <LoadingState />

  if (!overview) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Data keuangan belum tersedia</p>
      </div>
    )
  }
```

- [ ] **Step 4: Type-check**

Run: `cd apps/frontend && pnpm type-check` — expect no errors.

- [ ] **Step 5: Commit**

```bash
git add "apps/frontend/src/app/(dashboard)/laporan-keuangan/page.tsx"
git commit -m "feat(frontend): show error state on laporan keuangan page when data fails to load"
```

---

### Task 4: `laporan-presensi/page.tsx`

**Files:** Modify `apps/frontend/src/app/(dashboard)/laporan-presensi/page.tsx:17`, `:62-73`, `:332-338`

Already imports `LoadingState, EmptyState` (line 17). No local `error` state collision.

- [ ] **Step 1: Add `ErrorState` to the import**

Change line 17 from:
```typescript
import { LoadingState, EmptyState } from '@/components/ui/States'
```
to:
```typescript
import { LoadingState, EmptyState, ErrorState } from '@/components/ui/States'
```

- [ ] **Step 2: Destructure `error` and add `networkMode`**

Change (lines 62-73):
```typescript
  const { data: reportData, isLoading, refetch } = useQuery({
    queryKey: ['attendance-report', dateFrom, dateTo, branchId, teacherId, page, limit],
    queryFn: () =>
      attendanceApi.getReport({
        dateFrom,
        dateTo,
        branchId: branchId || undefined,
        teacherId: teacherId || undefined,
        page,
        limit,
      }),
  })
```
to:
```typescript
  const { data: reportData, isLoading, error, refetch } = useQuery({
    queryKey: ['attendance-report', dateFrom, dateTo, branchId, teacherId, page, limit],
    queryFn: () =>
      attendanceApi.getReport({
        dateFrom,
        dateTo,
        branchId: branchId || undefined,
        teacherId: teacherId || undefined,
        page,
        limit,
      }),
    networkMode: 'always',
  })
```

- [ ] **Step 3: Add `ErrorState` as the first condition**

Change (lines 332-338):
```tsx
      {isLoading ? (
        <LoadingState />
      ) : reportItems.length === 0 ? (
        <EmptyState
          title="Tidak ada data presensi"
          description="Ubah filter atau tanggal untuk melihat data presensi"
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
      ) : reportItems.length === 0 ? (
        <EmptyState
          title="Tidak ada data presensi"
          description="Ubah filter atau tanggal untuk melihat data presensi"
        />
      ) : (
```

- [ ] **Step 4: Type-check**

Run: `cd apps/frontend && pnpm type-check` — expect no errors.

- [ ] **Step 5: Commit**

```bash
git add "apps/frontend/src/app/(dashboard)/laporan-presensi/page.tsx"
git commit -m "feat(frontend): show error state on laporan presensi page when list fails to load"
```

---

### Task 5: `laporan-progress/components/ManageLinksTab.tsx`

**Files:** Modify `apps/frontend/src/app/(dashboard)/laporan-progress/components/ManageLinksTab.tsx:16`, `:64`, `:88-91`, `:267-273`

Already imports `LoadingState, EmptyState` (line 16). Has a LOCAL `error` state (line 64, `const [error, setError] = useState('')`) used for link-generation form errors — the query error MUST be aliased as `queryError` to avoid colliding with it.

- [ ] **Step 1: Add `ErrorState` to the import**

Change line 16 from:
```typescript
import { LoadingState, EmptyState } from '@/components/ui/States'
```
to:
```typescript
import { LoadingState, EmptyState, ErrorState } from '@/components/ui/States'
```

- [ ] **Step 2: Destructure the query error under an aliased name, add `networkMode`**

Change (lines 88-91):
```typescript
  const { data: linksData, isLoading, refetch } = useQuery({
    queryKey: ['progress-report-links', branchId, filterStatus],
    queryFn: () => progressReportApi.getAll({ branchId, status: filterStatus || undefined }),
  })
```
to:
```typescript
  const { data: linksData, isLoading, error: queryError, refetch } = useQuery({
    queryKey: ['progress-report-links', branchId, filterStatus],
    queryFn: () => progressReportApi.getAll({ branchId, status: filterStatus || undefined }),
    networkMode: 'always',
  })
```

- [ ] **Step 3: Add `ErrorState` as the first condition**

Change (lines 267-273):
```tsx
        {isLoading ? (
          <LoadingState />
        ) : links.length === 0 ? (
          <EmptyState
            title="Belum ada link laporan"
            description="Generate link baru di panel kanan untuk memulai"
          />
        ) : (
```
to:
```tsx
        {queryError ? (
          <ErrorState
            title="Gagal memuat data"
            description="Terjadi kesalahan saat memuat data. Silakan coba lagi."
            action={{ label: 'Coba Lagi', onClick: refetch }}
          />
        ) : isLoading ? (
          <LoadingState />
        ) : links.length === 0 ? (
          <EmptyState
            title="Belum ada link laporan"
            description="Generate link baru di panel kanan untuk memulai"
          />
        ) : (
```

- [ ] **Step 4: Type-check**

Run: `cd apps/frontend && pnpm type-check` — expect no errors.

- [ ] **Step 5: Commit**

```bash
git add "apps/frontend/src/app/(dashboard)/laporan-progress/components/ManageLinksTab.tsx"
git commit -m "feat(frontend): show error state on manage progress links tab when list fails to load"
```

---

### Task 6: `manajemen-user/page.tsx`

**Files:** Modify `apps/frontend/src/app/(dashboard)/manajemen-user/page.tsx:15`, `:83-92`, `:305-308`

Already imports `LoadingState, EmptyState, SkeletonCard` (line 15). Uses a `toast` state object (line 76, `{type, msg}`) for mutation feedback — NOT named `error`, so no collision; use plain `error`.

- [ ] **Step 1: Confirm `ErrorState` needs adding to the import**

Change line 15 from:
```typescript
import { LoadingState, EmptyState, SkeletonCard } from '@/components/ui/States'
```
to:
```typescript
import { LoadingState, EmptyState, SkeletonCard, ErrorState } from '@/components/ui/States'
```

- [ ] **Step 2: Destructure `error` and add `networkMode`**

Change (lines 83-92):
```typescript
  const { data: usersData, isLoading } = useQuery({
    queryKey: ['users', { page, limit, search: searchTerm, role: roleFilter }],
    queryFn: async () => {
      const res = await usersApi.getAll(page, limit, {
        search: searchTerm || undefined,
        role: roleFilter || undefined,
      })
      return res.data
    },
  })
```
to:
```typescript
  const { data: usersData, isLoading, error, refetch: refetchUsers } = useQuery({
    queryKey: ['users', { page, limit, search: searchTerm, role: roleFilter }],
    queryFn: async () => {
      const res = await usersApi.getAll(page, limit, {
        search: searchTerm || undefined,
        role: roleFilter || undefined,
      })
      return res.data
    },
    networkMode: 'always',
  })
```

- [ ] **Step 3: Add `ErrorState` as the first condition**

Change (lines 305-308):
```tsx
          {isLoading ? (
            <div className="space-y-3">{[1, 2, 3].map((i) => <SkeletonCard key={i} />)}</div>
          ) : users.length === 0 ? (
            <EmptyState icon={<User className="w-12 h-12 text-gray-400" />} title="Tidak ada pengguna" description="Tidak ada pengguna yang cocok dengan filter" />
          ) : (
```
to:
```tsx
          {error ? (
            <ErrorState
              title="Gagal memuat data"
              description="Terjadi kesalahan saat memuat data. Silakan coba lagi."
              action={{ label: 'Coba Lagi', onClick: refetchUsers }}
            />
          ) : isLoading ? (
            <div className="space-y-3">{[1, 2, 3].map((i) => <SkeletonCard key={i} />)}</div>
          ) : users.length === 0 ? (
            <EmptyState icon={<User className="w-12 h-12 text-gray-400" />} title="Tidak ada pengguna" description="Tidak ada pengguna yang cocok dengan filter" />
          ) : (
```

- [ ] **Step 4: Check `refetchUsers` doesn't collide with an existing name**

Run: `grep -n "refetchUsers" "apps/frontend/src/app/(dashboard)/manajemen-user/page.tsx"` — expect exactly the 2 occurrences you just added (the destructuring and the `onClick`). If there's a pre-existing `refetchUsers` elsewhere, STOP and report BLOCKED rather than silently overwriting it — pick a different alias (e.g. `refetchUsersList`) instead and use it consistently in both places.

- [ ] **Step 5: Type-check**

Run: `cd apps/frontend && pnpm type-check` — expect no errors.

- [ ] **Step 6: Commit**

```bash
git add "apps/frontend/src/app/(dashboard)/manajemen-user/page.tsx"
git commit -m "feat(frontend): show error state on manajemen user page when list fails to load"
```

---

### Task 7: `master-data/students/page.tsx`

**Files:** Modify `apps/frontend/src/app/(dashboard)/master-data/students/page.tsx:11`, `:47-50`, `:237-247`

Already imports `EmptyState, LoadingState` (line 11). No local `error` state collision.

- [ ] **Step 1: Add `ErrorState` to the import**

Change line 11 from:
```typescript
import { EmptyState, LoadingState } from '@/components/ui/States'
```
to:
```typescript
import { EmptyState, LoadingState, ErrorState } from '@/components/ui/States'
```

- [ ] **Step 2: Destructure `error` and add `networkMode`**

Change (lines 47-50):
```typescript
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['students', page, limit, searchTerm, branchId ?? '', statusFilter],
    queryFn: () => studentApi.getAll(page, limit, branchId, searchTerm || undefined, statusFilter),
  })
```
to:
```typescript
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['students', page, limit, searchTerm, branchId ?? '', statusFilter],
    queryFn: () => studentApi.getAll(page, limit, branchId, searchTerm || undefined, statusFilter),
    networkMode: 'always',
  })
```

- [ ] **Step 3: Add `ErrorState` as the first condition**

Change (lines 237-247, the `EmptyState`'s props stay the same, only the opening condition changes):
```tsx
      {isLoading ? (
        <LoadingState />
      ) : studentsArray.length === 0 && !searchTerm && statusFilter === 'true' && !branchId ? (
        <EmptyState
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
      ) : studentsArray.length === 0 && !searchTerm && statusFilter === 'true' && !branchId ? (
        <EmptyState
```
(The rest of the `EmptyState` block is unchanged.)

- [ ] **Step 4: Type-check**

Run: `cd apps/frontend && pnpm type-check` — expect no errors.

- [ ] **Step 5: Commit**

```bash
git add "apps/frontend/src/app/(dashboard)/master-data/students/page.tsx"
git commit -m "feat(frontend): show error state on students page when list fails to load"
```

---

### Task 8: `pembayaran-spp/page.tsx`

**Files:** Modify `apps/frontend/src/app/(dashboard)/pembayaran-spp/page.tsx:21`, `:89-98`, `:238`

Already imports `LoadingState, EmptyState` (line 21). Uses early-return (`if (invoicesLoading) return <LoadingState />`). Local error state is named `paymentError` (line 85, for the payment-recording form) — no collision with `error`.

- [ ] **Step 1: Add `ErrorState` to the import**

Change line 21 from:
```typescript
import { LoadingState, EmptyState } from '@/components/ui/States'
```
to:
```typescript
import { LoadingState, EmptyState, ErrorState } from '@/components/ui/States'
```

- [ ] **Step 2: Destructure `error` and add `networkMode`**

Change (lines 89-98):
```typescript
  const { data: invoicesData, isLoading: invoicesLoading, refetch: refetchInvoices } = useQuery({
    queryKey: ['invoices-payment', branchId, filterMonth, filterYear],
    queryFn: () => invoiceApi.getAll({
      branchId,
      status: filterStatus || undefined,
      month: filterMonth,
      year: filterYear,
      studentId: filterStudentId || undefined,
    }),
  })
```
to:
```typescript
  const { data: invoicesData, isLoading: invoicesLoading, error: invoicesError, refetch: refetchInvoices } = useQuery({
    queryKey: ['invoices-payment', branchId, filterMonth, filterYear],
    queryFn: () => invoiceApi.getAll({
      branchId,
      status: filterStatus || undefined,
      month: filterMonth,
      year: filterYear,
      studentId: filterStudentId || undefined,
    }),
    networkMode: 'always',
  })
```

- [ ] **Step 3: Add an early-return `ErrorState` check before the `invoicesLoading` check**

Change (line 238):
```typescript
  if (invoicesLoading) return <LoadingState />
```
to:
```typescript
  if (invoicesError) {
    return (
      <ErrorState
        title="Gagal memuat data"
        description="Terjadi kesalahan saat memuat data. Silakan coba lagi."
        action={{ label: 'Coba Lagi', onClick: refetchInvoices }}
      />
    )
  }

  if (invoicesLoading) return <LoadingState />
```

- [ ] **Step 4: Type-check**

Run: `cd apps/frontend && pnpm type-check` — expect no errors.

- [ ] **Step 5: Commit**

```bash
git add "apps/frontend/src/app/(dashboard)/pembayaran-spp/page.tsx"
git commit -m "feat(frontend): show error state on pembayaran SPP page when list fails to load"
```

---

### Task 9: `pengeluaran/page.tsx`

**Files:** Modify `apps/frontend/src/app/(dashboard)/pengeluaran/page.tsx:10`, `:49-60`, `:230-239`

Does NOT import any shared state component (bespoke inline markup throughout). Has a LOCAL `error` state (line 49, `const [error, setError] = useState('')`) used for create/edit form errors — the query error MUST be aliased as `queryError`.

- [ ] **Step 1: Add `ErrorState` import**

Change (line 9, right after the `useBranch`/`useApiBranchId` import):
```typescript
import { useBranch, useApiBranchId } from '@/lib/branch-context'
```
to:
```typescript
import { useBranch, useApiBranchId } from '@/lib/branch-context'
import { ErrorState } from '@/components/ui/States'
```

- [ ] **Step 2: Destructure the query error under an aliased name, add `networkMode`**

Change (lines 51-60):
```typescript
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['expenses', branchId, filterMonth, filterYear, filterCategory],
    queryFn: () =>
      expenseApi.getAll({
        branchId: branchId || undefined,
        month: filterMonth,
        year: filterYear,
        category: filterCategory || undefined,
      }),
  })
```
to:
```typescript
  const { data, isLoading, error: queryError, refetch } = useQuery({
    queryKey: ['expenses', branchId, filterMonth, filterYear, filterCategory],
    queryFn: () =>
      expenseApi.getAll({
        branchId: branchId || undefined,
        month: filterMonth,
        year: filterYear,
        category: filterCategory || undefined,
      }),
    networkMode: 'always',
  })
```

- [ ] **Step 3: Add `ErrorState` as the first condition**

Change (lines 230-239):
```tsx
        {isLoading ? (
          <div className="p-12 text-center text-gray-400 text-sm">Memuat data...</div>
        ) : expenses.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-400 text-sm">Belum ada pengeluaran untuk periode ini</p>
            <button onClick={openCreate} className="mt-3 text-blue-600 text-sm font-medium hover:underline">
              + Tambah pengeluaran pertama
            </button>
          </div>
        ) : (
```
to:
```tsx
        {queryError ? (
          <ErrorState
            title="Gagal memuat data"
            description="Terjadi kesalahan saat memuat data. Silakan coba lagi."
            action={{ label: 'Coba Lagi', onClick: refetch }}
          />
        ) : isLoading ? (
          <div className="p-12 text-center text-gray-400 text-sm">Memuat data...</div>
        ) : expenses.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-400 text-sm">Belum ada pengeluaran untuk periode ini</p>
            <button onClick={openCreate} className="mt-3 text-blue-600 text-sm font-medium hover:underline">
              + Tambah pengeluaran pertama
            </button>
          </div>
        ) : (
```

- [ ] **Step 4: Type-check**

Run: `cd apps/frontend && pnpm type-check` — expect no errors.

- [ ] **Step 5: Commit**

```bash
git add "apps/frontend/src/app/(dashboard)/pengeluaran/page.tsx"
git commit -m "feat(frontend): show error state on pengeluaran page when list fails to load"
```

---

### Task 10: `toko-stok/page.tsx`

**Files:** Modify `apps/frontend/src/app/(dashboard)/toko-stok/page.tsx:21`, `:102-115`, `:449-456`

Already imports `LoadingState, EmptyState` (line 21). Local error states are `pError`/`saleError` (different names) — no collision, use plain `error`.

- [ ] **Step 1: Add `ErrorState` to the import**

Change line 21 from:
```typescript
import { LoadingState, EmptyState } from '@/components/ui/States'
```
to:
```typescript
import { LoadingState, EmptyState, ErrorState } from '@/components/ui/States'
```

- [ ] **Step 2: Destructure `error` and add `networkMode`**

Change (lines 102-115):
```typescript
  const { data: productsData, isLoading, refetch } = useQuery({
    queryKey: ['store-products', branchId, filterCategory, filterLowStock, debouncedSearch, page],
    queryFn: () =>
      storeApi.getProducts({
        branchId: branchId || undefined,
        category: filterCategory || undefined,
        lowStock: filterLowStock,
        search: debouncedSearch || undefined,
        page,
        limit: PAGE_SIZE,
      }),
    enabled: !!branchId,
    placeholderData: (prev) => prev,
  })
```
to:
```typescript
  const { data: productsData, isLoading, error, refetch } = useQuery({
    queryKey: ['store-products', branchId, filterCategory, filterLowStock, debouncedSearch, page],
    queryFn: () =>
      storeApi.getProducts({
        branchId: branchId || undefined,
        category: filterCategory || undefined,
        lowStock: filterLowStock,
        search: debouncedSearch || undefined,
        page,
        limit: PAGE_SIZE,
      }),
    enabled: !!branchId,
    placeholderData: (prev) => prev,
    networkMode: 'always',
  })
```

- [ ] **Step 3: Add `ErrorState` as the first condition**

Change (lines 449-456):
```tsx
          {isLoading ? (
            <LoadingState />
          ) : products.length === 0 ? (
            <EmptyState
              title="Belum ada produk"
              description="Tambah produk pertama untuk mulai menjual"
              action={{ label: 'Tambah Produk', onClick: openProductModal }}
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
          ) : products.length === 0 ? (
            <EmptyState
              title="Belum ada produk"
              description="Tambah produk pertama untuk mulai menjual"
              action={{ label: 'Tambah Produk', onClick: openProductModal }}
            />
          ) : (
```

- [ ] **Step 4: Type-check**

Run: `cd apps/frontend && pnpm type-check` — expect no errors.

- [ ] **Step 5: Commit**

```bash
git add "apps/frontend/src/app/(dashboard)/toko-stok/page.tsx"
git commit -m "feat(frontend): show error state on toko stok page when list fails to load"
```

---

### Task 11: `transfer-stok/page.tsx`

**Files:** Modify `apps/frontend/src/app/(dashboard)/transfer-stok/page.tsx:8`, `:30`, `:46-50`, `:354-366`

**Special case:** this page's "list" (`history`) renders as `<tbody>` rows in a table, not a standalone section — the full-page-style `ErrorState` card doesn't fit inside a `<td>`. This task builds a small bespoke inline error row instead, matching this file's own existing style for its empty-row case (a centered icon + message inside a spanning `<td>`), reusing the `AlertCircle` icon already imported in this file (line 7) rather than importing `ErrorState`. Also has a LOCAL `error` state (line 30, used for the transfer submission form) — the query error MUST be aliased as `queryError`. This query currently has no `isLoading` tracked at all — don't add one, stay minimal and only add error handling (matches the plan's actual goal; adding a loading skeleton here is out of scope).

- [ ] **Step 1: Destructure the query error under an aliased name, add `networkMode`**

Change (lines 46-50):
```typescript
  const { data: historyData, refetch: refetchHistory } = useQuery({
    queryKey: ['transfer-history'],
    queryFn: () => storeApi.getTransferHistory(),
  })
  const history = historyData?.data?.data || []
```
to:
```typescript
  const { data: historyData, error: historyError, refetch: refetchHistory } = useQuery({
    queryKey: ['transfer-history'],
    queryFn: () => storeApi.getTransferHistory(),
    networkMode: 'always',
  })
  const history = historyData?.data?.data || []
```

- [ ] **Step 2: Add a bespoke inline error row as the first condition inside the table body**

Change (lines 354-366, only the opening condition and the new error branch are added — the existing empty-row markup and the `history.map(...)` branch are unchanged):
```tsx
              {history.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8">
                    <div className="text-center">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Package className="w-6 h-6 text-gray-400" />
                      </div>
                      <p className="text-gray-900 font-medium">Belum ada riwayat transfer</p>
                      <p className="text-sm text-gray-500 mt-1">Mulai dengan mentransfer stok antar cabang menggunakan form di atas</p>
                    </div>
                  </td>
                </tr>
              ) : (
                history.map((m: any) => (
```
to:
```tsx
              {historyError ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8">
                    <div className="text-center">
                      <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <AlertCircle className="w-6 h-6 text-red-600" />
                      </div>
                      <p className="text-gray-900 font-medium">Gagal memuat riwayat transfer</p>
                      <p className="text-sm text-gray-500 mt-1 mb-3">Terjadi kesalahan saat memuat data. Silakan coba lagi.</p>
                      <button
                        onClick={() => refetchHistory()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
                      >
                        Coba Lagi
                      </button>
                    </div>
                  </td>
                </tr>
              ) : history.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8">
                    <div className="text-center">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Package className="w-6 h-6 text-gray-400" />
                      </div>
                      <p className="text-gray-900 font-medium">Belum ada riwayat transfer</p>
                      <p className="text-sm text-gray-500 mt-1">Mulai dengan mentransfer stok antar cabang menggunakan form di atas</p>
                    </div>
                  </td>
                </tr>
              ) : (
                history.map((m: any) => (
```

- [ ] **Step 3: Confirm `AlertCircle` is already imported**

Run: `grep -n "AlertCircle" "apps/frontend/src/app/(dashboard)/transfer-stok/page.tsx"` — expect it in the `lucide-react` import line (line 7) already. If it's somehow missing, add it to that import instead of a new `ErrorState` import.

- [ ] **Step 4: Type-check**

Run: `cd apps/frontend && pnpm type-check` — expect no errors.

- [ ] **Step 5: Commit**

```bash
git add "apps/frontend/src/app/(dashboard)/transfer-stok/page.tsx"
git commit -m "feat(frontend): show error state on transfer stok history when list fails to load"
```

---

### Task 12: `jadwal-sesi/page.tsx`

**Files:** Modify `apps/frontend/src/app/(dashboard)/jadwal-sesi/page.tsx:10`, `:96-100`, `:201-203`

Already imports `LoadingState, EmptyState` (line 10). Uses early-return (`if (isLoading) return <LoadingState/>`). No local `error` state collision.

- [ ] **Step 1: Add `ErrorState` to the import**

Change line 10 from:
```typescript
import { LoadingState, EmptyState } from '@/components/ui/States'
```
to:
```typescript
import { LoadingState, EmptyState, ErrorState } from '@/components/ui/States'
```

- [ ] **Step 2: Destructure `error` and add `networkMode`**

Change (lines 96-100):
```typescript
  const { data: sessionsData, isLoading, refetch } = useQuery({
    queryKey: ['sessions', filterBranchId],
    queryFn: () =>
      sessionApi.getAll(undefined, 1000, filterBranchId ? { branchId: filterBranchId } : undefined),
  })
```
to:
```typescript
  const { data: sessionsData, isLoading, error, refetch } = useQuery({
    queryKey: ['sessions', filterBranchId],
    queryFn: () =>
      sessionApi.getAll(undefined, 1000, filterBranchId ? { branchId: filterBranchId } : undefined),
    networkMode: 'always',
  })
```

- [ ] **Step 3: Add an early-return `ErrorState` check before the `isLoading` check**

Change (lines 201-203):
```typescript
  if (isLoading) {
    return <LoadingState />
  }
```
to:
```typescript
  if (error) {
    return (
      <ErrorState
        title="Gagal memuat data"
        description="Terjadi kesalahan saat memuat data. Silakan coba lagi."
        action={{ label: 'Coba Lagi', onClick: refetch }}
      />
    )
  }

  if (isLoading) {
    return <LoadingState />
  }
```

- [ ] **Step 4: Type-check**

Run: `cd apps/frontend && pnpm type-check` — expect no errors.

- [ ] **Step 5: Commit**

```bash
git add "apps/frontend/src/app/(dashboard)/jadwal-sesi/page.tsx"
git commit -m "feat(frontend): show error state on jadwal sesi page when list fails to load"
```

---

### Task 13: `invoice-tagihan/page.tsx`

**Files:** Modify `apps/frontend/src/app/(dashboard)/invoice-tagihan/page.tsx:23`, `:78`, `:101-112`, `:420-426`

Already imports `LoadingState, EmptyState` (line 23). Has a LOCAL `error` state (line 78, used for a modal action error message) — the query error MUST be aliased as `queryError`.

- [ ] **Step 1: Add `ErrorState` to the import**

Change line 23 from:
```typescript
import { LoadingState, EmptyState } from '@/components/ui/States'
```
to:
```typescript
import { LoadingState, EmptyState, ErrorState } from '@/components/ui/States'
```

- [ ] **Step 2: Destructure the query error under an aliased name, add `networkMode`**

Change (lines 101-112):
```typescript
  const { data: invoicesData, isLoading, refetch } = useQuery({
    queryKey: ['invoices', branchId, filterStatus, filterType, debouncedSearchTerm, page],
    queryFn: () =>
      invoiceApi.getAll({
        branchId,
        status: filterStatus || undefined,
        type: filterType || undefined,
        search: debouncedSearchTerm || undefined,
        page,
        limit: LIMIT,
      }),
  })
```
to:
```typescript
  const { data: invoicesData, isLoading, error: queryError, refetch } = useQuery({
    queryKey: ['invoices', branchId, filterStatus, filterType, debouncedSearchTerm, page],
    queryFn: () =>
      invoiceApi.getAll({
        branchId,
        status: filterStatus || undefined,
        type: filterType || undefined,
        search: debouncedSearchTerm || undefined,
        page,
        limit: LIMIT,
      }),
    networkMode: 'always',
  })
```

- [ ] **Step 3: Add `ErrorState` as the first condition**

Change (lines 420-426):
```tsx
          {isLoading ? (
            <LoadingState />
          ) : invoices.length === 0 ? (
            <EmptyState
              title="Belum ada invoice"
              description="Generate invoice baru di panel kanan untuk memulai"
            />
          ) : (
```
to:
```tsx
          {queryError ? (
            <ErrorState
              title="Gagal memuat data"
              description="Terjadi kesalahan saat memuat data. Silakan coba lagi."
              action={{ label: 'Coba Lagi', onClick: refetch }}
            />
          ) : isLoading ? (
            <LoadingState />
          ) : invoices.length === 0 ? (
            <EmptyState
              title="Belum ada invoice"
              description="Generate invoice baru di panel kanan untuk memulai"
            />
          ) : (
```

- [ ] **Step 4: Type-check**

Run: `cd apps/frontend && pnpm type-check` — expect no errors.

- [ ] **Step 5: Commit**

```bash
git add "apps/frontend/src/app/(dashboard)/invoice-tagihan/page.tsx"
git commit -m "feat(frontend): show error state on invoice tagihan page when list fails to load"
```

---

### Task 14: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Type-check the whole monorepo**

Run (from repo root): `pnpm type-check` — expect no errors in `apps/backend` or `apps/frontend`.

- [ ] **Step 2: Grep-audit that every task's query actually has `networkMode: 'always'`**

Run (from repo root):
```bash
grep -c "networkMode: 'always'" \
  "apps/frontend/src/app/(dashboard)/formula-komisi/page.tsx" \
  "apps/frontend/src/app/(dashboard)/komisi-guru/page.tsx" \
  "apps/frontend/src/app/(dashboard)/laporan-keuangan/page.tsx" \
  "apps/frontend/src/app/(dashboard)/laporan-presensi/page.tsx" \
  "apps/frontend/src/app/(dashboard)/laporan-progress/components/ManageLinksTab.tsx" \
  "apps/frontend/src/app/(dashboard)/manajemen-user/page.tsx" \
  "apps/frontend/src/app/(dashboard)/master-data/students/page.tsx" \
  "apps/frontend/src/app/(dashboard)/pembayaran-spp/page.tsx" \
  "apps/frontend/src/app/(dashboard)/pengeluaran/page.tsx" \
  "apps/frontend/src/app/(dashboard)/toko-stok/page.tsx" \
  "apps/frontend/src/app/(dashboard)/transfer-stok/page.tsx" \
  "apps/frontend/src/app/(dashboard)/jadwal-sesi/page.tsx" \
  "apps/frontend/src/app/(dashboard)/invoice-tagihan/page.tsx"
```
Expected: every file reports exactly `1` (transfer-stok's is on the `historyData` query specifically).

- [ ] **Step 3: Manual browser verification of 3 representative pages**

There's no frontend test framework — verify manually, same technique already proven in the previous `usePagination` batch (kill the real backend, use a dev-minted JWT via `localStorage` per `CLAUDE.md` section 12, avoid `preview_start`'s known bug of always rooting at the main repo — either temporarily check out the worktree's committed files into the main repo's working tree for testing then revert with `git checkout HEAD -- .` afterward, or run `pnpm dev` directly from within this worktree via Bash and drive it with a real browser tool).

Verify these 3 pages (chosen to cover all 3 structural patterns used across the 13 tasks):
1. `komisi-guru` (ternary-in-JSX with shared components — represents Tasks 2, 4, 5, 6, 7, 10, 13)
2. `laporan-keuangan` (early-return pattern — represents Tasks 3, 8, 12)
3. `transfer-stok` (bespoke table-row error — the one structurally unique case, Task 11)

For each: confirm `ErrorState` (or, for `transfer-stok`, the bespoke error row) renders with backend down, confirm the retry button fires a new request with no console errors, then start the backend and confirm retry recovers to showing real data.

- [ ] **Step 4: Stop any dev servers started for verification**

Confirm ports 3000/3002 are free afterward (`netstat -ano | grep -E ":3000 |:3002 " | grep LISTENING` should show nothing), and if you used the temporary-checkout-into-main-repo technique, confirm `git status --short` in the main repo is clean afterward.

---

## Self-Review Notes

- **Spec coverage:** all 13 in-scope pages covered (Tasks 1-13), `ViewProgressTab.tsx` correctly excluded with reasoning stated up top, `networkMode: 'always'` added per-query (14 total additions across 13 files, since transfer-stok only needed it on `historyData`) since there's no shared hook this time, cross-file consistency verified (identical `ErrorState` copy in every task except the necessarily-bespoke Task 11).
- **Collision handling:** `queryError` alias used exactly where a real local `error` variable exists (ManageLinksTab, pengeluaran, transfer as `historyError`, invoice-tagihan) — confirmed by reading each file's actual local state before writing each task, not guessed from the recon table alone (which had over-cautious "maybe" flags for `toko-stok`/`pembayaran-spp`/`manajemen-user` that turned out to be non-issues once verified: those files use different names like `pError`, `saleError`, `paymentError`, `toast` — plain `error` is safe there).
- **Structural adaptation:** 3 distinct patterns handled per-file (ternary-in-JSX prepend, early-return prepend, bespoke inline table row) — none forced into a one-size-fits-all shape that wouldn't compile or render correctly.
