# Guru User Guide Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an in-app, step-by-step user guide for the GURU role covering all 4 guru menus (Dashboard, Presensi, Jadwal, Komisi), with illustrative mockups per step, accessed via a help icon in the guru top bar.

**Architecture:** New static (client-side, no API calls) pages under the existing `(guru)` route group at `/guru/panduan` (index) and `/guru/panduan/{dashboard,jadwal,komisi,presensi}` (sub-pages). Three small shared presentational components (`PhoneMockup`, `GuideStep`, `GuideIndexCard`) keep the per-step markup DRY. A help icon added to `(guru)/layout.tsx` top bar links to the index.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, `lucide-react` icons. No test framework exists for the frontend (per `CLAUDE.md` TODO list), and this feature has no business logic — it is static illustrative content. Verification per task uses `cd apps/frontend && pnpm type-check`; a final task does manual visual verification with the browser preview tools (dev server + screenshot/snapshot), matching the project's "test UI changes in a browser" convention.

**Design spec:** `docs/superpowers/specs/2026-07-01-guru-user-guide-design.md`

---

## Task 1: `PhoneMockup` component

**Files:**
- Create: `apps/frontend/src/components/panduan/PhoneMockup.tsx`

- [ ] **Step 1: Write the component**

```tsx
export default function PhoneMockup({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-[280px] mx-auto rounded-2xl border border-gray-300 shadow-md overflow-hidden bg-white">
      <div className="h-3 bg-blue-600" />
      <div className="p-3">{children}</div>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `cd apps/frontend && pnpm type-check`
Expected: no errors related to `PhoneMockup.tsx`

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/components/panduan/PhoneMockup.tsx
git commit -m "feat(frontend): add PhoneMockup illustration frame for guru guide"
```

---

## Task 2: `GuideStep` component

**Files:**
- Create: `apps/frontend/src/components/panduan/GuideStep.tsx`

- [ ] **Step 1: Write the component**

```tsx
interface GuideStepProps {
  number: number
  title: string
  description: string
  children: React.ReactNode
  tip?: string
}

export default function GuideStep({ number, title, description, children, tip }: GuideStepProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-7 h-7 flex-shrink-0 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
          {number}
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
          <p className="text-sm text-gray-600 mt-0.5">{description}</p>
        </div>
      </div>
      {children}
      {tip && (
        <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-3">
          <p className="text-xs text-blue-800">{tip}</p>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `cd apps/frontend && pnpm type-check`
Expected: no errors related to `GuideStep.tsx`

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/components/panduan/GuideStep.tsx
git commit -m "feat(frontend): add GuideStep component for guru guide"
```

---

## Task 3: `GuideIndexCard` component

**Files:**
- Create: `apps/frontend/src/components/panduan/GuideIndexCard.tsx`

- [ ] **Step 1: Write the component**

```tsx
import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'

export type GuideColor = 'blue' | 'purple' | 'green' | 'orange'

const COLOR_STYLES: Record<
  GuideColor,
  { bg: string; border: string; hoverBg: string; iconText: string; titleText: string }
> = {
  blue: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    hoverBg: 'hover:bg-blue-100',
    iconText: 'text-blue-600',
    titleText: 'text-blue-900',
  },
  purple: {
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    hoverBg: 'hover:bg-purple-100',
    iconText: 'text-purple-600',
    titleText: 'text-purple-900',
  },
  green: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    hoverBg: 'hover:bg-green-100',
    iconText: 'text-green-600',
    titleText: 'text-green-900',
  },
  orange: {
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    hoverBg: 'hover:bg-orange-100',
    iconText: 'text-orange-600',
    titleText: 'text-orange-900',
  },
}

interface GuideIndexCardProps {
  href: string
  icon: LucideIcon
  color: GuideColor
  title: string
  description: string
}

export default function GuideIndexCard({ href, icon: Icon, color, title, description }: GuideIndexCardProps) {
  const styles = COLOR_STYLES[color]
  return (
    <Link
      href={href}
      className={`block ${styles.bg} ${styles.hoverBg} border ${styles.border} rounded-lg p-4 transition`}
    >
      <div className="flex items-start gap-3">
        <Icon className={`w-6 h-6 flex-shrink-0 ${styles.iconText}`} />
        <div>
          <p className={`font-semibold text-sm ${styles.titleText}`}>{title}</p>
          <p className="text-xs text-gray-600 mt-0.5">{description}</p>
        </div>
      </div>
    </Link>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `cd apps/frontend && pnpm type-check`
Expected: no errors related to `GuideIndexCard.tsx`

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/components/panduan/GuideIndexCard.tsx
git commit -m "feat(frontend): add GuideIndexCard component for guru guide"
```

---

## Task 4: Help icon in guru top bar

**Files:**
- Modify: `apps/frontend/src/app/(guru)/layout.tsx`

- [ ] **Step 1: Add `HelpCircle` to the lucide-react import**

Find this line (line 6):

```tsx
import { LayoutDashboard, CheckSquare, Calendar, TrendingUp, LogOut, Monitor } from 'lucide-react'
```

Replace with:

```tsx
import { LayoutDashboard, CheckSquare, Calendar, TrendingUp, LogOut, Monitor, HelpCircle } from 'lucide-react'
```

- [ ] **Step 2: Add a handler next to `handleSwitchToAdmin`**

Find (around line 41-43):

```tsx
  const handleSwitchToAdmin = () => {
    router.push('/dashboard')
  }
```

Replace with:

```tsx
  const handleSwitchToAdmin = () => {
    router.push('/dashboard')
  }

  const handleOpenPanduan = () => {
    router.push('/guru/panduan')
  }
```

- [ ] **Step 3: Render the help button before the admin-switch button**

Find (around line 74-91):

```tsx
          <div className="flex items-center gap-1">
            {hasAdminRole && (
              <button
                onClick={handleSwitchToAdmin}
                className="p-2 hover:bg-white/10 rounded-full transition"
                title="Beralih ke Tampilan Admin"
              >
                <Monitor className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-white/10 rounded-full transition"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
```

Replace with:

```tsx
          <div className="flex items-center gap-1">
            <button
              onClick={handleOpenPanduan}
              className="p-2 hover:bg-white/10 rounded-full transition"
              title="Panduan Penggunaan"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
            {hasAdminRole && (
              <button
                onClick={handleSwitchToAdmin}
                className="p-2 hover:bg-white/10 rounded-full transition"
                title="Beralih ke Tampilan Admin"
              >
                <Monitor className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-white/10 rounded-full transition"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
```

- [ ] **Step 4: Type-check**

Run: `cd apps/frontend && pnpm type-check`
Expected: no errors related to `layout.tsx`

- [ ] **Step 5: Commit**

```bash
git add "apps/frontend/src/app/(guru)/layout.tsx"
git commit -m "feat(frontend): add help icon to guru top bar linking to panduan"
```

---

## Task 5: Dashboard guide sub-page

**Files:**
- Create: `apps/frontend/src/app/(guru)/guru/panduan/dashboard/page.tsx`

- [ ] **Step 1: Write the page**

```tsx
'use client'

import Link from 'next/link'
import { ArrowLeft, CheckSquare, Calendar, TrendingUp } from 'lucide-react'
import PhoneMockup from '@/components/panduan/PhoneMockup'
import GuideStep from '@/components/panduan/GuideStep'

export default function PanduanDashboardPage() {
  return (
    <div className="px-4 py-4 space-y-4 mb-20">
      <Link href="/guru/panduan" className="flex items-center gap-2 text-blue-600 text-sm font-medium">
        <ArrowLeft className="w-4 h-4" />
        Kembali ke Panduan
      </Link>

      <div>
        <h1 className="text-xl font-bold text-gray-900">Panduan: Dashboard</h1>
        <p className="text-sm text-gray-600 mt-0.5">Halaman pertama yang Anda lihat setelah login</p>
      </div>

      <GuideStep
        number={1}
        title="Sapaan & tanggal hari ini"
        description="Di bagian atas dashboard, Anda akan melihat sapaan dan tanggal hari ini."
      >
        <PhoneMockup>
          <div className="ring-2 ring-blue-500 rounded-lg p-2 -m-2">
            <h1 className="text-base font-bold text-gray-900">Selamat datang! 👋</h1>
            <p className="text-xs text-gray-600 mt-0.5">Senin, 1 Juli 2026</p>
          </div>
        </PhoneMockup>
      </GuideStep>

      <GuideStep
        number={2}
        title='Card "Sesi Hari Ini"'
        description="Menampilkan berapa banyak sesi mengajar Anda hari ini, dan status masing-masing (Selesai / Mendatang)."
      >
        <PhoneMockup>
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-3 ring-2 ring-blue-500">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold text-gray-900 text-sm">Sesi Hari Ini</h2>
              <span className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">
                2 sesi
              </span>
            </div>
            <div className="space-y-1.5">
              <div className="p-2 bg-gray-50 rounded-lg flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-900">Matematika</p>
                  <p className="text-[10px] text-gray-600">08:00 (60m) · 3 siswa</p>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                  Selesai
                </span>
              </div>
              <div className="p-2 bg-gray-50 rounded-lg flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-900">Bahasa Inggris</p>
                  <p className="text-[10px] text-gray-600">15:00 (60m) · 2 siswa</p>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                  Mendatang
                </span>
              </div>
            </div>
          </div>
        </PhoneMockup>
      </GuideStep>

      <GuideStep
        number={3}
        title="Tap sesi untuk input presensi"
        description="Ketuk salah satu sesi di daftar untuk langsung masuk ke halaman presensi sesi tersebut."
      >
        <PhoneMockup>
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold text-gray-900 text-sm">Sesi Hari Ini</h2>
              <span className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">
                2 sesi
              </span>
            </div>
            <div className="space-y-1.5">
              <div className="p-2 bg-gray-50 rounded-lg flex items-center justify-between opacity-50">
                <div>
                  <p className="text-xs font-medium text-gray-900">Matematika</p>
                  <p className="text-[10px] text-gray-600">08:00 (60m) · 3 siswa</p>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                  Selesai
                </span>
              </div>
              <div className="relative p-2 bg-gray-50 rounded-lg flex items-center justify-between ring-2 ring-blue-500">
                <span className="absolute -top-2 -left-2 w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold">
                  👆
                </span>
                <div>
                  <p className="text-xs font-medium text-gray-900">Bahasa Inggris</p>
                  <p className="text-[10px] text-gray-600">15:00 (60m) · 2 siswa</p>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                  Mendatang
                </span>
              </div>
            </div>
          </div>
        </PhoneMockup>
      </GuideStep>

      <GuideStep
        number={4}
        title="Tombol pintasan"
        description="Di bawah daftar sesi, ada 3 tombol pintasan untuk langsung menuju Presensi, Jadwal, atau Komisi."
      >
        <PhoneMockup>
          <div className="grid grid-cols-3 gap-2 ring-2 ring-blue-500 rounded-lg p-2 -m-2">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-center">
              <CheckSquare className="w-5 h-5 text-blue-600 mx-auto mb-1" />
              <p className="text-[10px] font-medium text-blue-900">Presensi</p>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-2 text-center">
              <Calendar className="w-5 h-5 text-purple-600 mx-auto mb-1" />
              <p className="text-[10px] font-medium text-purple-900">Jadwal</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-2 text-center">
              <TrendingUp className="w-5 h-5 text-green-600 mx-auto mb-1" />
              <p className="text-[10px] font-medium text-green-900">Komisi</p>
            </div>
          </div>
        </PhoneMockup>
      </GuideStep>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `cd apps/frontend && pnpm type-check`
Expected: no errors related to `panduan/dashboard/page.tsx`

- [ ] **Step 3: Commit**

```bash
git add "apps/frontend/src/app/(guru)/guru/panduan/dashboard/page.tsx"
git commit -m "feat(frontend): add guru guide sub-page for Dashboard menu"
```

---

## Task 6: Jadwal guide sub-page

**Files:**
- Create: `apps/frontend/src/app/(guru)/guru/panduan/jadwal/page.tsx`

- [ ] **Step 1: Write the page**

```tsx
'use client'

import Link from 'next/link'
import { ArrowLeft, Clock, Users, MapPin } from 'lucide-react'
import PhoneMockup from '@/components/panduan/PhoneMockup'
import GuideStep from '@/components/panduan/GuideStep'

export default function PanduanJadwalPage() {
  const days = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']

  return (
    <div className="px-4 py-4 space-y-4 mb-20">
      <Link href="/guru/panduan" className="flex items-center gap-2 text-blue-600 text-sm font-medium">
        <ArrowLeft className="w-4 h-4" />
        Kembali ke Panduan
      </Link>

      <div>
        <h1 className="text-xl font-bold text-gray-900">Panduan: Jadwal</h1>
        <p className="text-sm text-gray-600 mt-0.5">Melihat jadwal mengajar mingguan Anda</p>
      </div>

      <GuideStep
        number={1}
        title="Pilih hari"
        description="Ketuk salah satu hari di deretan 7 hari. Angka kecil di bawah nama hari menunjukkan jumlah sesi hari itu."
      >
        <PhoneMockup>
          <div className="bg-white rounded-lg border border-gray-200 p-1.5 ring-2 ring-blue-500">
            <div className="grid grid-cols-7 gap-0.5">
              {days.map((d, i) => (
                <div
                  key={d}
                  className={`flex flex-col items-center py-1.5 rounded-md ${
                    i === 0 ? 'bg-blue-600 text-white' : 'text-gray-700'
                  }`}
                >
                  <span className="text-[9px] font-medium">{d}</span>
                  {i < 3 && (
                    <span
                      className={`mt-0.5 text-[7px] font-bold px-1 rounded-full ${
                        i === 0 ? 'bg-white text-blue-600' : 'bg-blue-600 text-white'
                      }`}
                    >
                      {i + 1}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </PhoneMockup>
      </GuideStep>

      <GuideStep
        number={2}
        title="Detail sesi"
        description="Setiap sesi menampilkan jam & durasi, jumlah siswa/kapasitas, cabang, dan daftar nama siswa terdaftar."
      >
        <PhoneMockup>
          <div className="bg-white border border-blue-300 rounded-lg p-2.5 ring-2 ring-blue-500">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-semibold text-gray-900">Matematika</p>
                <p className="text-[9px] text-gray-500">Reguler</p>
              </div>
              <span className="text-[8px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">
                Hari ini
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 mt-2 text-[9px] text-gray-700">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-gray-400" />
                08:00 (60m)
              </div>
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3 text-gray-400" />
                3/5 siswa
              </div>
              <div className="col-span-2 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-gray-400" />
                Cabang Purwakarta
              </div>
            </div>
          </div>
        </PhoneMockup>
      </GuideStep>

      <GuideStep
        number={3}
        title="Input presensi langsung dari jadwal"
        description="Untuk sesi hari ini, ada tombol 'Input Presensi' di bagian bawah card — tidak perlu berpindah ke menu Presensi dulu."
      >
        <PhoneMockup>
          <div className="bg-white border border-blue-300 rounded-lg p-2.5">
            <p className="text-xs font-semibold text-gray-900 mb-2">Matematika</p>
            <div className="ring-2 ring-blue-500 rounded-lg">
              <div className="block w-full bg-blue-600 text-white text-[11px] font-medium py-2 rounded-lg text-center">
                Input Presensi
              </div>
            </div>
          </div>
        </PhoneMockup>
      </GuideStep>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `cd apps/frontend && pnpm type-check`
Expected: no errors related to `panduan/jadwal/page.tsx`

- [ ] **Step 3: Commit**

```bash
git add "apps/frontend/src/app/(guru)/guru/panduan/jadwal/page.tsx"
git commit -m "feat(frontend): add guru guide sub-page for Jadwal menu"
```

---

## Task 7: Komisi guide sub-page

**Files:**
- Create: `apps/frontend/src/app/(guru)/guru/panduan/komisi/page.tsx`

- [ ] **Step 1: Write the page**

```tsx
'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import PhoneMockup from '@/components/panduan/PhoneMockup'
import GuideStep from '@/components/panduan/GuideStep'

export default function PanduanKomisiPage() {
  return (
    <div className="px-4 py-4 space-y-4 mb-20">
      <Link href="/guru/panduan" className="flex items-center gap-2 text-blue-600 text-sm font-medium">
        <ArrowLeft className="w-4 h-4" />
        Kembali ke Panduan
      </Link>

      <div>
        <h1 className="text-xl font-bold text-gray-900">Panduan: Komisi</h1>
        <p className="text-sm text-gray-600 mt-0.5">Melihat riwayat dan cara hitung komisi mengajar Anda</p>
      </div>

      <GuideStep
        number={1}
        title="Pilih tahun"
        description="Gunakan tombol tahun (tahun lalu / ini / depan) untuk melihat riwayat komisi tahun tertentu."
      >
        <PhoneMockup>
          <div className="flex gap-1.5 ring-2 ring-blue-500 rounded-lg p-1.5 -m-1.5">
            {[2025, 2026, 2027].map((y) => (
              <div
                key={y}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-medium text-center ${
                  y === 2026 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                {y}
              </div>
            ))}
          </div>
        </PhoneMockup>
      </GuideStep>

      <GuideStep
        number={2}
        title="Ringkasan komisi"
        description="Dua card menampilkan total Komisi Diterima (sudah disetujui admin) dan Komisi Pending (masih estimasi/belum disetujui). Card Bonus muncul jika Anda punya bonus tahun itu."
      >
        <PhoneMockup>
          <div className="grid grid-cols-2 gap-2 ring-2 ring-blue-500 rounded-lg p-2 -m-2">
            <div className="bg-white rounded-lg border border-green-200 p-2">
              <p className="text-[9px] text-gray-600 font-medium">Komisi Diterima</p>
              <p className="text-xs font-bold text-green-700 mt-1">Rp 850.000</p>
            </div>
            <div className="bg-white rounded-lg border border-amber-200 p-2">
              <p className="text-[9px] text-gray-600 font-medium">Komisi Pending</p>
              <p className="text-xs font-bold text-amber-700 mt-1">Rp 320.000</p>
            </div>
          </div>
        </PhoneMockup>
      </GuideStep>

      <GuideStep
        number={3}
        title="Riwayat bulanan"
        description="Daftar komisi per bulan dengan status: Estimasi (belum final), Final (sudah dihitung), atau Disetujui (sudah di-approve admin)."
      >
        <PhoneMockup>
          <div className="space-y-1.5 ring-2 ring-blue-500 rounded-lg p-2 -m-2">
            <div className="bg-white border border-green-200 rounded-lg p-2 flex items-center justify-between">
              <p className="text-[10px] font-semibold text-gray-900">Juni 2026</p>
              <span className="text-[8px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">
                Disetujui
              </span>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-2 flex items-center justify-between">
              <p className="text-[10px] font-semibold text-gray-900">Juli 2026</p>
              <span className="text-[8px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium">
                Estimasi
              </span>
            </div>
          </div>
        </PhoneMockup>
      </GuideStep>

      <GuideStep
        number={4}
        title="Riwayat bonus"
        description="Jika admin memberikan bonus (misalnya karena siswa lulus ujian), riwayatnya muncul di bagian ini dengan status Disetujui atau Menunggu."
      >
        <PhoneMockup>
          <div className="bg-white border border-purple-200 rounded-lg p-2.5 ring-2 ring-blue-500">
            <p className="text-[10px] font-medium text-gray-900">Bonus siswa lulus ujian</p>
            <div className="flex items-center justify-between mt-1">
              <p className="text-[9px] text-gray-500">Juni 2026</p>
              <span className="text-[8px] px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded-full font-medium">
                Disetujui
              </span>
            </div>
          </div>
        </PhoneMockup>
      </GuideStep>

      <GuideStep
        number={5}
        title="Cara hitung komisi"
        description="Di bagian paling bawah ada catatan formula default. Formula bisa berbeda per mata pelajaran atau jenis sesi sesuai pengaturan admin."
        tip="Contoh: SPP Rp 300.000, 12 sesi/bulan, komisi 40%, hadir 10 sesi → 300.000 ÷ 12 × 40% × 10 = Rp 100.000"
      >
        <PhoneMockup>
          <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-2.5 ring-2 ring-blue-500">
            <p className="text-[10px] text-blue-800 leading-relaxed">
              💡 SPP ÷ 12 × % komisi × sesi terlaksana
            </p>
          </div>
        </PhoneMockup>
      </GuideStep>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `cd apps/frontend && pnpm type-check`
Expected: no errors related to `panduan/komisi/page.tsx`

- [ ] **Step 3: Commit**

```bash
git add "apps/frontend/src/app/(guru)/guru/panduan/komisi/page.tsx"
git commit -m "feat(frontend): add guru guide sub-page for Komisi menu"
```

---

## Task 8: Presensi guide sub-page

**Files:**
- Create: `apps/frontend/src/app/(guru)/guru/panduan/presensi/page.tsx`

- [ ] **Step 1: Write the page**

```tsx
'use client'

import Link from 'next/link'
import { ArrowLeft, CheckCircle } from 'lucide-react'
import PhoneMockup from '@/components/panduan/PhoneMockup'
import GuideStep from '@/components/panduan/GuideStep'

export default function PanduanPresensiPage() {
  return (
    <div className="px-4 py-4 space-y-4 mb-20">
      <Link href="/guru/panduan" className="flex items-center gap-2 text-blue-600 text-sm font-medium">
        <ArrowLeft className="w-4 h-4" />
        Kembali ke Panduan
      </Link>

      <div>
        <h1 className="text-xl font-bold text-gray-900">Panduan: Presensi & Progress</h1>
        <p className="text-sm text-gray-600 mt-0.5">
          Cara isi presensi siswa, progress belajar, gantikan sesi, dan sesi darurat
        </p>
      </div>

      <GuideStep
        number={1}
        title="Buka daftar sesi hari ini"
        description="Menu Presensi menampilkan semua sesi mengajar Anda hari ini dengan status: Mendatang, Aktif, Selesai, atau Lewat."
      >
        <PhoneMockup>
          <div className="ring-2 ring-blue-500 rounded-lg p-2 -m-2 space-y-2">
            <p className="text-xs font-bold text-gray-900">📌 Sesi Saya</p>
            <div className="bg-blue-50 rounded-lg border-2 border-blue-300 p-2">
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500 mt-1"></div>
                <div className="flex-1">
                  <p className="text-[10px] font-semibold text-gray-900">Matematika</p>
                  <p className="text-[9px] text-gray-600">08:00 (60m) · 3 siswa</p>
                </div>
                <span className="text-[8px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">
                  Aktif
                </span>
              </div>
            </div>
          </div>
        </PhoneMockup>
      </GuideStep>

      <GuideStep
        number={2}
        title="Isi presensi tiap siswa"
        description="Ketuk sesi, lalu tandai status tiap siswa: Hadir, Absen, Izin, atau Sakit. Anda juga bisa menambahkan catatan (misalnya topik yang diajarkan)."
      >
        <PhoneMockup>
          <div className="bg-white border border-gray-200 rounded-lg p-2.5 ring-2 ring-blue-500">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-[9px]">
                AH
              </div>
              <p className="text-[10px] font-medium text-gray-900">Ahmad</p>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <div className="py-1.5 rounded-lg text-[9px] font-medium bg-green-600 text-white text-center">
                ✓ Hadir
              </div>
              <div className="py-1.5 rounded-lg text-[9px] font-medium bg-gray-100 text-gray-700 text-center">
                ✕ Absen
              </div>
            </div>
          </div>
        </PhoneMockup>
      </GuideStep>

      <GuideStep
        number={3}
        title="Submit presensi"
        description="Tekan tombol 'Submit Presensi & Lanjut' di bagian bawah layar. Anda akan otomatis diarahkan ke langkah input progress."
      >
        <PhoneMockup>
          <div className="ring-2 ring-blue-500 rounded-lg p-1">
            <div className="w-full bg-blue-600 text-white text-[11px] font-semibold py-2 rounded-lg text-center">
              Submit Presensi & Lanjut
            </div>
          </div>
        </PhoneMockup>
      </GuideStep>

      <GuideStep
        number={4}
        title="Isi progress belajar"
        description="Untuk mapel berbasis modul: pilih modul dan rentang bab yang diajarkan, lalu pilih predikat jika modul selesai. Untuk mapel materi bebas: isi 1 topik untuk semua siswa, lalu predikat per siswa."
        tip="Progress hanya diisi untuk siswa yang berstatus Hadir."
      >
        <PhoneMockup>
          <div className="bg-white border border-gray-200 rounded-lg p-2.5 ring-2 ring-blue-500 space-y-2">
            <p className="text-[9px] font-medium text-gray-700">Pilih Modul</p>
            <div className="border border-gray-300 rounded-lg px-2 py-1.5 text-[9px] text-gray-600 bg-gray-50">
              Modul 3: Pecahan (5 bab)
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div className="bg-blue-500 rounded-full h-1.5" style={{ width: '60%' }}></div>
            </div>
            <p className="text-[8px] text-gray-500">3/5 bab</p>
          </div>
        </PhoneMockup>
      </GuideStep>

      <GuideStep
        number={5}
        title="Halaman berhasil"
        description="Setelah progress tersimpan, Anda akan melihat halaman konfirmasi. Pilih 'Sesi Lainnya' untuk lanjut ke sesi berikutnya, atau 'Dashboard' untuk kembali."
      >
        <PhoneMockup>
          <div className="flex flex-col items-center py-3 ring-2 ring-blue-500 rounded-lg">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-2">
              <CheckCircle className="w-7 h-7 text-green-600" />
            </div>
            <p className="text-xs font-bold text-gray-900">Berhasil! 🎉</p>
            <p className="text-[9px] text-gray-600">Presensi & progress tersimpan</p>
          </div>
        </PhoneMockup>
      </GuideStep>

      <GuideStep
        number={6}
        title="Gantikan sesi guru lain"
        description="Di bagian bawah daftar sesi, Anda bisa mencari sesi guru atau siswa lain untuk menggantikan presensi (misalnya guru terjadwal berhalangan). Komisi sesi akan tercatat atas nama Anda sebagai guru pengganti."
      >
        <PhoneMockup>
          <div className="ring-2 ring-blue-500 rounded-lg p-2 -m-2 space-y-2">
            <p className="text-[10px] font-bold text-gray-900">🔍 Gantikan Sesi Guru Lain</p>
            <div className="flex gap-1.5">
              <div className="flex-1 py-1.5 rounded-lg text-[9px] font-semibold text-center bg-blue-600 text-white">
                👨‍🏫 Cari Guru
              </div>
              <div className="flex-1 py-1.5 rounded-lg text-[9px] font-semibold text-center bg-gray-100 text-gray-700">
                👨‍🎓 Cari Siswa
              </div>
            </div>
            <div className="border border-gray-300 rounded-lg px-2 py-1.5 text-[9px] text-gray-400 bg-white">
              Ketik nama guru...
            </div>
          </div>
        </PhoneMockup>
      </GuideStep>

      <GuideStep
        number={7}
        title="Sesi darurat"
        description="Untuk sesi di luar jadwal reguler (jadwal berubah mendadak, sesi tambahan, dll), gunakan tombol 'Sesi Darurat'. Isi cabang, mapel, tanggal, jam, dan siswa (bisa tambah siswa manual)."
        tip="Presensi sesi darurat akan menunggu persetujuan admin sebelum dihitung ke komisi."
      >
        <PhoneMockup>
          <div className="ring-2 ring-orange-500 rounded-lg p-2 -m-2 space-y-2">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-2">
              <p className="text-[9px] font-bold text-orange-800">⚠️ Sesi Darurat</p>
              <p className="text-[8px] text-orange-700 mt-0.5">Menunggu persetujuan admin</p>
            </div>
            <div className="border border-gray-300 rounded-lg px-2 py-1.5 text-[9px] text-gray-600 bg-white">
              Cabang: Purwakarta
            </div>
            <div className="border border-gray-300 rounded-lg px-2 py-1.5 text-[9px] text-gray-600 bg-white">
              Mapel: Matematika
            </div>
            <div className="w-full bg-orange-500 text-white text-[10px] font-semibold py-2 rounded-lg text-center">
              📋 Submit Sesi Darurat
            </div>
          </div>
        </PhoneMockup>
      </GuideStep>

      <GuideStep
        number={8}
        title="Riwayat sesi darurat"
        description="Lihat status pengajuan sesi darurat sebelumnya: Menunggu (belum diperiksa admin) atau Disetujui."
      >
        <PhoneMockup>
          <div className="space-y-1.5 ring-2 ring-blue-500 rounded-lg p-2 -m-2">
            <div className="bg-white border border-gray-200 rounded-lg p-2 flex items-center justify-between">
              <div>
                <p className="text-[9px] font-semibold text-gray-900">Matematika</p>
                <p className="text-[8px] text-gray-500">28 Jun 2026</p>
              </div>
              <span className="text-[8px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium">
                Menunggu
              </span>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-2 flex items-center justify-between">
              <div>
                <p className="text-[9px] font-semibold text-gray-900">IPA</p>
                <p className="text-[8px] text-gray-500">20 Jun 2026</p>
              </div>
              <span className="text-[8px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">
                Disetujui
              </span>
            </div>
          </div>
        </PhoneMockup>
      </GuideStep>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `cd apps/frontend && pnpm type-check`
Expected: no errors related to `panduan/presensi/page.tsx`

- [ ] **Step 3: Commit**

```bash
git add "apps/frontend/src/app/(guru)/guru/panduan/presensi/page.tsx"
git commit -m "feat(frontend): add guru guide sub-page for Presensi & Progress menu"
```

---

## Task 9: Panduan index page

**Files:**
- Create: `apps/frontend/src/app/(guru)/guru/panduan/page.tsx`

- [ ] **Step 1: Write the page**

```tsx
'use client'

import Link from 'next/link'
import { ArrowLeft, LayoutDashboard, CheckSquare, Calendar, TrendingUp } from 'lucide-react'
import GuideIndexCard from '@/components/panduan/GuideIndexCard'

export default function PanduanIndexPage() {
  return (
    <div className="px-4 py-4 space-y-4 mb-20">
      <Link href="/guru" className="flex items-center gap-2 text-blue-600 text-sm font-medium">
        <ArrowLeft className="w-4 h-4" />
        Kembali ke Dashboard
      </Link>

      <div>
        <h1 className="text-xl font-bold text-gray-900">Panduan Penggunaan</h1>
        <p className="text-sm text-gray-600 mt-0.5">
          Pilih menu di bawah untuk melihat cara pakainya langkah demi langkah
        </p>
      </div>

      <div className="space-y-3">
        <GuideIndexCard
          href="/guru/panduan/dashboard"
          icon={LayoutDashboard}
          color="blue"
          title="Dashboard"
          description="Melihat ringkasan sesi hari ini dan tombol pintasan"
        />
        <GuideIndexCard
          href="/guru/panduan/presensi"
          icon={CheckSquare}
          color="orange"
          title="Presensi & Progress"
          description="Cara isi presensi siswa, progress belajar, gantikan sesi, dan sesi darurat"
        />
        <GuideIndexCard
          href="/guru/panduan/jadwal"
          icon={Calendar}
          color="purple"
          title="Jadwal"
          description="Melihat jadwal mengajar mingguan per hari"
        />
        <GuideIndexCard
          href="/guru/panduan/komisi"
          icon={TrendingUp}
          color="green"
          title="Komisi"
          description="Melihat riwayat dan cara hitung komisi mengajar"
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `cd apps/frontend && pnpm type-check`
Expected: no errors related to `panduan/page.tsx`

- [ ] **Step 3: Commit**

```bash
git add "apps/frontend/src/app/(guru)/guru/panduan/page.tsx"
git commit -m "feat(frontend): add guru guide index page"
```

---

## Task 10: Manual visual verification

**Files:** none (verification only)

- [ ] **Step 1: Start the frontend dev server**

Use the `preview_start` tool with `name: "frontend"` (defined in `.claude/launch.json`, runs on port 3002).

- [ ] **Step 2: Verify no login redirect blocks the guide pages**

Use `preview_eval` to run `localStorage.clear()` so no `userRole` is set (the `GuruLayout` redirect only fires when a role is present and it isn't `GURU`, so an empty localStorage renders the guru layout without redirecting).

- [ ] **Step 3: Check the top bar help icon**

Navigate to `/guru` with `preview_eval` (`window.location.href = '/guru'`), then use `preview_snapshot` to confirm a help icon button (title "Panduan Penggunaan") is present in the top bar next to the logout icon.

- [ ] **Step 4: Walk through every guide route**

For each of `/guru/panduan`, `/guru/panduan/dashboard`, `/guru/panduan/jadwal`, `/guru/panduan/komisi`, `/guru/panduan/presensi`:
- Navigate with `preview_eval` (`window.location.href = '<path>'`)
- Use `preview_console_logs` with `level: "error"` and confirm no errors
- Use `preview_snapshot` to confirm the expected step titles render (e.g. for `/guru/panduan/presensi`, confirm all 8 step titles from Task 8 are present)

- [ ] **Step 5: Check mobile viewport**

Use `preview_resize` with `preset: "mobile"`, then `preview_screenshot` on `/guru/panduan/presensi` (the longest page) to confirm the mockups and step cards stay within the `max-w-md` container without horizontal overflow.

- [ ] **Step 6: Check navigation links**

Use `preview_click` on a `GuideIndexCard` from `/guru/panduan` to confirm it navigates to the right sub-page, and `preview_click` on a "Kembali ke Panduan" link from a sub-page to confirm it returns to the index.

- [ ] **Step 7: Fix any issues found**

If any step's mockup overflows, renders incorrectly, or a link is broken, edit the relevant file from Tasks 1-9 and re-run the check from Step 4.

- [ ] **Step 8: Restore localStorage state**

Use `preview_eval` to reload the page (`window.location.reload()`) — no further cleanup needed since `localStorage.clear()` only affected the preview browser's dev session.

No commit for this task (verification only, no file changes expected unless Step 7 triggers a fix — in that case, commit the fix with a message describing what was wrong).
