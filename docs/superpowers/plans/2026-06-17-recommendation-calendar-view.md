# Recommendation Calendar View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a toggle-able weekly calendar (grid) view to the schedule recommendation page, where proposal cards can be clicked to select/deselect, sharing selection state with the existing list view.

**Architecture:** A new self-contained presentational client component `RecommendationCalendar` renders proposals as a day×time grid. `rekomendasi/page.tsx` gains a `viewMode` toggle and a shared `toggleProposal` handler used by both the list checkboxes and the calendar cards. Frontend-only; no API/backend changes.

**Tech Stack:** Next.js 14 (App Router) + TypeScript + Tailwind CSS.

**Reference spec:** `docs/superpowers/specs/2026-06-17-recommendation-calendar-view-design.md`

**Verification note:** The frontend has no React test harness (no jest/RTL). Both tasks are verified with `cd apps/frontend && pnpm type-check` plus a manual preview check (described in Final Verification). No fabricated tests.

---

## File Structure

- Create: `apps/frontend/src/components/RecommendationCalendar.tsx` — presentational weekly grid of proposals with click-to-toggle selection.
- Modify: `apps/frontend/src/app/(dashboard)/jadwal-sesi/rekomendasi/page.tsx` — `viewMode` state, toggle control, `toggleProposal` handler, conditional list/calendar render.

---

## Task 1: `RecommendationCalendar` component

**Files:**
- Create: `apps/frontend/src/components/RecommendationCalendar.tsx`

- [ ] **Step 1: Create the component**

Create `apps/frontend/src/components/RecommendationCalendar.tsx` with exactly this content:

```tsx
'use client'

const DAY_ORDER = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU', 'MINGGU']

export interface CalendarProposal {
  tempId: string
  subjectName: string
  type: 'REGULAR' | 'PRIVATE'
  teacherName: string
  dayOfWeek: string
  startTime: string
  durationMinutes: number
  studentNames: string[]
}

interface RecommendationCalendarProps {
  proposals: CalendarProposal[]
  selected: Record<string, boolean>
  onToggle: (tempId: string) => void
}

function buildCalendarGrid(proposals: CalendarProposal[]) {
  const daySet = new Set(proposals.map((p) => p.dayOfWeek))
  const days = DAY_ORDER.filter((d) => daySet.has(d))
  const times = Array.from(new Set(proposals.map((p) => p.startTime))).sort()
  const cells: Record<string, Record<string, CalendarProposal[]>> = {}
  for (const d of days) {
    cells[d] = {}
    for (const t of times) cells[d][t] = []
  }
  for (const p of proposals) {
    if (cells[p.dayOfWeek] && cells[p.dayOfWeek][p.startTime]) {
      cells[p.dayOfWeek][p.startTime].push(p)
    }
  }
  return { days, times, cells }
}

export default function RecommendationCalendar({ proposals, selected, onToggle }: RecommendationCalendarProps) {
  if (proposals.length === 0) {
    return <div className="bg-white rounded-lg border p-3 text-sm text-gray-500">Tidak ada usulan.</div>
  }

  const { days, times, cells } = buildCalendarGrid(proposals)

  return (
    <div className="bg-white rounded-lg border overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="p-2 text-left text-gray-500 font-medium border-b w-16">Jam</th>
            {days.map((d) => (
              <th key={d} className="p-2 text-left text-gray-700 font-medium border-b">{d}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {times.map((t) => (
            <tr key={t} className="align-top">
              <td className="p-2 text-gray-500 border-b whitespace-nowrap">{t}</td>
              {days.map((d) => (
                <td key={d} className="p-2 border-b">
                  <div className="flex flex-col gap-1">
                    {cells[d][t].map((p) => {
                      const isSel = !!selected[p.tempId]
                      return (
                        <button
                          key={p.tempId}
                          type="button"
                          onClick={() => onToggle(p.tempId)}
                          aria-pressed={isSel}
                          className={`text-left rounded px-2 py-1 border text-xs transition ${
                            isSel
                              ? 'bg-orange-500 text-white border-orange-500'
                              : 'bg-white text-gray-500 border-gray-200 opacity-70 hover:opacity-100'
                          }`}
                        >
                          <div className="font-medium">{p.subjectName} ({p.type})</div>
                          <div>{p.teacherName} · {p.studentNames.length} siswa</div>
                          <div>{p.startTime} · {p.durationMinutes} mnt</div>
                        </button>
                      )
                    })}
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `cd apps/frontend && pnpm type-check`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/components/RecommendationCalendar.tsx
git commit -m "feat(frontend): add RecommendationCalendar grid component"
```

---

## Task 2: Wire calendar into the recommendation page

**Files:**
- Modify: `apps/frontend/src/app/(dashboard)/jadwal-sesi/rekomendasi/page.tsx`

- [ ] **Step 1: Import the component**

At the top of `page.tsx`, after the existing import line `import { useBranch, useApiBranchId } from '@/lib/branch-context'`, add:

```tsx
import RecommendationCalendar from '@/components/RecommendationCalendar'
```

- [ ] **Step 2: Add `viewMode` state**

Find this line (around line 40):

```tsx
  const [applyResult, setApplyResult] = useState<any>(null)
```

Add directly after it:

```tsx
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')
```

- [ ] **Step 3: Add the `toggleProposal` handler**

Find this existing handler (around line 95):

```tsx
  const toggleDay = (d: string) =>
    setActiveDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]))
```

Add directly after it:

```tsx
  const toggleProposal = (tempId: string) =>
    setSelected((s) => ({ ...s, [tempId]: !s[tempId] }))
```

- [ ] **Step 4: Replace the Proposals block with a toggle + conditional render**

Find this exact block (the `{/* Proposals */}` section, around lines 182–195):

```tsx
          {/* Proposals */}
          <div className="bg-white rounded-lg border divide-y">
            {result.proposals.map((p: Proposal) => (
              <label key={p.tempId} className="flex items-center gap-3 p-3 cursor-pointer">
                <input type="checkbox" checked={!!selected[p.tempId]}
                  onChange={(e) => setSelected((s) => ({ ...s, [p.tempId]: e.target.checked }))} />
                <div className="text-sm">
                  <div className="font-medium">{p.subjectName} ({p.type}) — {p.teacherName}</div>
                  <div className="text-gray-600">{p.dayOfWeek} {p.startTime} · {p.durationMinutes} mnt · {p.studentNames.join(', ')}</div>
                </div>
              </label>
            ))}
            {result.proposals.length === 0 && <div className="p-3 text-sm text-gray-500">Tidak ada usulan.</div>}
          </div>
```

Replace it ENTIRELY with:

```tsx
          {/* View toggle */}
          <div className="flex gap-1">
            <button type="button" onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded border text-sm ${viewMode === 'list' ? 'bg-orange-500 text-white border-orange-500' : 'bg-white'}`}>
              Daftar
            </button>
            <button type="button" onClick={() => setViewMode('calendar')}
              className={`px-3 py-1.5 rounded border text-sm ${viewMode === 'calendar' ? 'bg-orange-500 text-white border-orange-500' : 'bg-white'}`}>
              Kalender
            </button>
          </div>

          {/* Proposals */}
          {viewMode === 'list' ? (
            <div className="bg-white rounded-lg border divide-y">
              {result.proposals.map((p: Proposal) => (
                <label key={p.tempId} className="flex items-center gap-3 p-3 cursor-pointer">
                  <input type="checkbox" checked={!!selected[p.tempId]}
                    onChange={() => toggleProposal(p.tempId)} />
                  <div className="text-sm">
                    <div className="font-medium">{p.subjectName} ({p.type}) — {p.teacherName}</div>
                    <div className="text-gray-600">{p.dayOfWeek} {p.startTime} · {p.durationMinutes} mnt · {p.studentNames.join(', ')}</div>
                  </div>
                </label>
              ))}
              {result.proposals.length === 0 && <div className="p-3 text-sm text-gray-500">Tidak ada usulan.</div>}
            </div>
          ) : (
            <RecommendationCalendar
              proposals={result.proposals}
              selected={selected}
              onToggle={toggleProposal}
            />
          )}
```

- [ ] **Step 5: Type-check**

Run: `cd apps/frontend && pnpm type-check`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add "apps/frontend/src/app/(dashboard)/jadwal-sesi/rekomendasi/page.tsx"
git commit -m "feat(frontend): add list/calendar toggle to recommendation page"
```

---

## Final Verification

- [ ] `cd apps/frontend && pnpm type-check` → clean.
- [ ] **Manual / preview check** (backend + frontend running):
  - Generate proposals on a branch with data.
  - Confirm the **Daftar/Kalender** toggle appears; default is Daftar (existing list).
  - Switch to **Kalender**: grid renders with day columns (only days that have proposals) and time rows; each cell shows proposal card(s).
  - Click a card: its highlight flips (solid orange ↔ dimmed); switch back to Daftar and confirm that proposal's checkbox matches the new state (shared selection).
  - Deselect some, click **Terapkan Terpilih**, confirm only selected proposals are applied.
  - Generate a scenario with zero proposals → calendar shows "Tidak ada usulan."

---

## Notes / Out of Scope (spec §5)

- Calendar shows only proposals (not existing/applied sessions).
- No drag-drop / inline editing.
- View mode is not persisted.
- No refactor of the inline grid in `jadwal-sesi/page.tsx`.
