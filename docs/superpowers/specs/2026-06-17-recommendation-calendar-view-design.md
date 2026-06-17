# Recommendation Calendar View (Design)

**Date:** 2026-06-17
**Status:** Approved (brainstorming) — ready for implementation plan
**Builds on:** the schedule recommender feature (`apps/frontend/src/app/(dashboard)/jadwal-sesi/rekomendasi/page.tsx`)
**Scope:** Frontend only. No backend / API / schema changes.

---

## 1. Problem & Goal

The recommendation page currently shows generated proposals as a flat checkbox list. Admins want a **weekly calendar (grid) view** to see the proposed schedule laid out by day × time, while still being able to select which proposals to apply.

### Decisions (from brainstorming)

| Aspek | Keputusan |
|---|---|
| Penempatan | **Toggle Daftar / Kalender** di area hasil; default **Daftar** |
| Seleksi di kalender | **Bisa** — klik kartu untuk pilih/batal; state seleksi dibagi dengan mode daftar |
| Cakupan data | Hanya **proposals** (output generate). Sesi existing tidak ditampilkan (tak ada di response) |
| Interaksi lanjut | Tidak ada drag-drop / edit waktu (tetap preview → apply) |

---

## 2. Components

### New: `apps/frontend/src/components/RecommendationCalendar.tsx`

A small, presentational client component with one responsibility: render proposals as a weekly grid with toggle-able selection.

**Props:**
```ts
interface Proposal {
  tempId: string
  subjectName: string
  type: 'REGULAR' | 'PRIVATE'
  teacherName: string
  dayOfWeek: string
  startTime: string        // HH:mm
  durationMinutes: number
  studentNames: string[]
}

interface RecommendationCalendarProps {
  proposals: Proposal[]
  selected: Record<string, boolean>
  onToggle: (tempId: string) => void
}
```

**Layout:**
- **Columns = days** that appear in `proposals`, ordered `SENIN, SELASA, RABU, KAMIS, JUMAT, SABTU, MINGGU` (only days with at least one proposal are shown).
- **Rows = distinct `startTime`** values present, sorted ascending (string sort on `HH:mm` is correct for zero-padded times).
- **Cell** = all proposals at that (day, startTime); may contain more than one card (e.g. different teachers/subjects in the same slot).
- **Empty state:** if `proposals.length === 0`, render a short "Tidak ada usulan." notice.

**Card (per proposal):**
- Shows: `subjectName` · `type` · `teacherName` · `startTime` (and duration) · jumlah siswa (`studentNames.length`).
- Rendered as a `<button>` (keyboard-accessible). Click calls `onToggle(tempId)`.
- **Selected** → solid highlight (orange, matching theme, e.g. `bg-orange-500 text-white`). **Unselected** → dimmed/outline (e.g. `bg-white text-gray-500 border opacity-70`).

**Pure helper (inside the component file):** `buildCalendarGrid(proposals)` returning `{ days: string[]; times: string[]; cells: Record<day, Record<time, Proposal[]>> }`. Keeps render logic clean. (Not separately unit-tested — see §4.)

### Modified: `rekomendasi/page.tsx`

- Add state `const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')`.
- In the results section (after the summary row, before the proposals list), add a **toggle control** (two buttons: "Daftar" / "Kalender") bound to `viewMode`.
- Render the existing checkbox list when `viewMode === 'list'`; render `<RecommendationCalendar proposals={result.proposals} selected={selected} onToggle={toggleProposal} />` when `viewMode === 'calendar'`.
- Extract the existing inline selection update into a `toggleProposal(tempId: string)` handler: `setSelected((s) => ({ ...s, [tempId]: !s[tempId] }))`. Use it from both the list checkboxes and the calendar.
- The **teacher-load panel**, **unassigned panel**, and **"Terapkan Terpilih"** button remain unchanged and outside the toggle (visible in both modes).

---

## 3. Data Flow

`generate` populates `result` and initializes `selected` (all true) — unchanged. The calendar reads `result.proposals` + `selected`, and calls `toggleProposal` which mutates the same `selected` map the list uses. `apply` continues to filter `result.proposals` by `selected`. No new requests.

---

## 4. Testing & Verification

The frontend has **no React test harness** (no jest/RTL config). Per honesty, this feature is verified by:
- `cd apps/frontend && pnpm type-check` → clean.
- **Manual / preview check:** generate proposals; toggle to Kalender; confirm grid renders by day × time; click a card and confirm its highlight flips and the selected count feeding "Terapkan Terpilih" changes; toggle back to Daftar and confirm the same proposal's checkbox state matches; empty-proposals shows the notice.

No backend tests are affected.

---

## 5. Out of Scope (YAGNI)

- Showing existing/applied sessions alongside proposals (not in the generate response).
- Drag-and-drop or inline time/teacher editing.
- Persisting the chosen view mode.
- A shared reusable calendar extracted from `jadwal-sesi/page.tsx` (that grid is inline and tangled; refactoring it is unrelated to this goal).
