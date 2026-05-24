# Prompt untuk Claude Code — Sistem Manajemen Bimbel Multi-Cabang

Gunakan prompt ini saat memulai sesi Claude Code. Salin seluruh isi prompt ini dan paste ke Claude Code.

---

## PROMPT UTAMA

```
Saya ingin membangun aplikasi sistem manajemen bimbel multi-cabang dari awal.
Semua dokumentasi sudah tersedia di folder project ini. Tolong baca semua file
dokumentasi sebelum mulai coding.

## Dokumentasi yang tersedia

Baca file-file berikut secara berurutan:

1. business-rule.md        — seluruh business rules aplikasi
2. erd.md                  — arsitektur database (24 tabel)
3. SETUP.md                — tech stack dan setup project
4. schema.prisma           — Prisma schema lengkap siap pakai

Wireframe detail per halaman:
5.  01-dashboard-admin.md
6.  02-presensi-guru-mobile.md
7.  03-komisi-guru-mobile.md
8.  04-manajemen-jadwal-admin.md
9.  05-laporan-komisi-admin.md
10. 06-pendaftaran-siswa-baru.md
11. 07-laporan-keuangan.md
12. 08-toko-stok-admin.md
13. 09-input-progress-guru-mobile.md
14. 10-laporan-progress-publik-orangtua.md
15. 11-generate-kelola-link-laporan.md
16. 12-panel-invoice-admin.md
17. 13-invoice-digital-belum-lunas.md
18. 14-invoice-digital-lunas.md

## Tech Stack

- Frontend  : Next.js 14 (App Router) + TypeScript + Tailwind CSS
- Backend   : NestJS + TypeScript
- Database  : PostgreSQL via Supabase
- ORM       : Prisma
- Auth      : Supabase Auth
- Deploy    : Vercel (frontend) + Railway (backend)

## Yang harus dilakukan sekarang (Phase 1)

Setelah membaca semua dokumentasi, mulai dari Phase 1:

### Step 1 — Setup monorepo
Buat struktur monorepo dengan 2 folder utama:
- /apps/frontend  (Next.js)
- /apps/backend   (NestJS)

Gunakan struktur ini:
- package.json di root (workspace)
- Shared TypeScript config

### Step 2 — Setup Backend (NestJS)

1. Buat project NestJS di /apps/backend
2. Install semua dependencies:
   - @prisma/client, prisma
   - @nestjs/config
   - @supabase/supabase-js
   - class-validator, class-transformer
   - @nestjs/swagger, swagger-ui-express
   - @nestjs/jwt, @nestjs/passport, passport, passport-jwt
   - bcryptjs

3. Setup Prisma:
   - Copy schema.prisma ke /apps/backend/prisma/
   - Buat prisma.service.ts
   - Buat prisma.module.ts

4. Setup environment variables (.env):
   DATABASE_URL=
   SUPABASE_URL=
   SUPABASE_SERVICE_ROLE_KEY=
   JWT_SECRET=
   PORT=3001

5. Buat struktur modul:
   src/
     modules/
       auth/           ← priority pertama
       branches/
       users/
       subjects/
       students/
       sessions/
       attendance/
       progress/
       commissions/
       invoices/
       store/
     prisma/
     common/
       guards/
       decorators/
       filters/
       interceptors/

6. Implementasi Auth Module:
   - POST /auth/login    → email + password → return JWT
   - GET  /auth/me       → return user yang sedang login
   - Guard: JwtAuthGuard
   - Guard: RolesGuard (check role: OWNER, ADMIN_GLOBAL, ADMIN_CABANG, GURU)
   - Decorator: @Roles(...roles)
   - Decorator: @CurrentUser()

   Aturan role dari business-rule.md:
   - OWNER         → akses penuh semua fitur & semua cabang
   - ADMIN_GLOBAL  → akses penuh semua cabang seperti owner
   - ADMIN_CABANG  → akses terbatas pada cabang sendiri
   - GURU          → hanya presensi, progress, jadwal, komisi sendiri

7. Implementasi Branches Module:
   - GET    /branches          → list semua cabang (Owner, Admin Global)
   - POST   /branches          → tambah cabang baru
   - GET    /branches/:id      → detail cabang
   - PATCH  /branches/:id      → update cabang
   - GET    /branches/:id/stats → statistik cabang (siswa, guru, sesi aktif)

8. Implementasi Users Module:
   - GET    /users             → list semua user
   - POST   /users             → tambah user baru
   - GET    /users/:id         → detail user
   - PATCH  /users/:id         → update user
   - GET    /users/:id/branches → cabang-cabang yang diikuti user

### Step 3 — Setup Frontend (Next.js)

1. Buat project Next.js di /apps/frontend dengan:
   - TypeScript ✅
   - Tailwind CSS ✅
   - App Router ✅
   - src/ directory ✅

2. Install dependencies:
   - @supabase/supabase-js @supabase/ssr
   - @tanstack/react-query axios
   - react-hook-form zod @hookform/resolvers
   - lucide-react
   - recharts
   - date-fns
   - next-pwa (untuk mobile PWA guru)

3. Setup struktur folder:
   src/
     app/
       (auth)/login/         ← halaman login
       (dashboard)/          ← layout admin (sidebar + topbar)
         layout.tsx
         page.tsx            ← dashboard utama
         siswa/
         guru/
         jadwal/
         presensi/
         pembayaran/
         laporan/
         toko/
         master-data/
       (guru)/               ← layout mobile guru (bottom nav)
         presensi/
         jadwal/
         komisi/
       invoice/[token]/      ← halaman publik invoice (tanpa login)
       laporan/[token]/      ← halaman publik laporan progress (tanpa login)
     components/
       ui/                   ← komponen dasar (Button, Card, Badge, dll)
       forms/
       tables/
       charts/
       layout/               ← Sidebar, Topbar, BottomNav
     lib/
       api/                  ← axios instance + API calls
       utils/
     hooks/
     types/                  ← TypeScript types sesuai Prisma schema

4. Setup global config:
   - Tailwind config dengan warna custom:
     primary: #185FA5
     warna status: hijau (#3B6D11), amber (#854F0B), merah (#A32D2D)
   - Axios instance dengan base URL + auth token interceptor
   - React Query provider di layout root

5. Implementasi halaman Login:
   - Form: email + password
   - Validasi dengan Zod
   - Submit → POST /auth/login → simpan JWT di cookie
   - Redirect berdasarkan role:
     OWNER / ADMIN_GLOBAL / ADMIN_CABANG → /dashboard
     GURU → /guru/presensi (mobile layout)

6. Implementasi Dashboard Admin (lihat 01-dashboard-admin.md):
   - Layout sidebar + topbar
   - Sidebar: semua menu sesuai wireframe
   - Topbar: judul halaman + tanggal + notifikasi bell
   - Untuk Owner/Admin Global: tambah cabang switcher di topbar
   - 4 metric cards: siswa aktif, sesi terlaksana, SPP terkumpul, total komisi
   - 4 card menu: presensi, pembayaran, jadwal, daftar siswa
   - Panel bawah: sesi hari ini + status pembayaran SPP

## Konvensi kode yang harus diikuti

### Backend (NestJS)
- Setiap modul punya: module.ts, controller.ts, service.ts, dto/ folder
- Semua DTO pakai class-validator decorator
- Response selalu pakai format:
  { success: true, data: {...} } atau
  { success: false, message: "..." }
- Error handling terpusat di global exception filter
- Swagger decorator di setiap endpoint
- Semua query Prisma selalu include filter branchId untuk data per cabang

### Frontend (Next.js)
- Server Components untuk halaman yang tidak butuh interaktivitas
- Client Components hanya jika ada state/event handler
- Setiap halaman punya loading.tsx dan error.tsx
- Semua warna menggunakan Tailwind class (tidak hardcode hex)
- Komponen UI konsisten dengan wireframe (warna, spacing, typography)
- Mobile layout (guru) menggunakan max-w-sm mx-auto

## Prioritas implementasi setelah Phase 1

Setelah auth + dashboard selesai, lanjutkan dengan urutan ini:

Phase 2:
- Master data: cabang, mata pelajaran, tarif SPP, kurikulum modul
- Data siswa: CRUD, pendaftaran (06-pendaftaran-siswa-baru.md)
- Data guru: CRUD, assign ke cabang

Phase 3:
- Jadwal & sesi (04-manajemen-jadwal-admin.md)
- Presensi guru mobile (02-presensi-guru-mobile.md)
- Input progress guru (09-input-progress-guru-mobile.md)

Phase 4:
- Pembayaran SPP
- Invoice generate + link publik (12, 13, 14)
- Kalkulasi komisi (05-laporan-komisi-admin.md)

Phase 5:
- Laporan progress orang tua (10, 11)
- Laporan keuangan (07)
- Toko & stok (08)

Phase 6:
- Multi-cabang: cabang switcher, laporan konsolidasi
- Transfer stok antar cabang
- Komisi guru (03, 05)

## Mulai sekarang

1. Baca semua file dokumentasi
2. Konfirmasi pemahaman dengan ringkasan singkat business rule utama
3. Mulai dari Step 1: setup monorepo
4. Tanya jika ada yang tidak jelas dari dokumentasi sebelum lanjut coding

Jangan skip langkah apapun. Pastikan setiap step berjalan (npm run dev, 
npx prisma migrate dev) sebelum lanjut ke step berikutnya.
```

---

## PROMPT LANJUTAN (untuk sesi berikutnya)

Gunakan prompt ini di awal sesi Claude Code baru untuk melanjutkan dari progress sebelumnya:

```
Kita sedang membangun sistem manajemen bimbel multi-cabang. Dokumentasi
lengkap ada di folder project ini (business-rule.md, erd.md, schema.prisma,
SETUP.md, dan file wireframe 01-14).

Sesi sebelumnya sudah selesai sampai: [TULIS DI SINI PROGRESS TERAKHIR]

Contoh:
- "Phase 1 selesai: auth + dashboard admin sudah jalan"
- "Sedang di Phase 2: master data cabang & mapel"
- "Stuck di implementasi jadwal mingguan (04-manajemen-jadwal-admin.md)"

Tolong baca ulang dokumentasi yang relevan dan lanjutkan dari situ.
```

---

## PROMPT KHUSUS PER FITUR

### Untuk implementasi halaman spesifik:
```
Baca [nama-file-wireframe.md] lalu implementasikan halaman tersebut.
Pastikan:
1. Komponen sesuai dengan wireframe (layout, warna, interaksi)
2. Data terhubung ke API backend
3. Validasi form sesuai business rule di business-rule.md
4. Role access control diterapkan
```

### Untuk debugging:
```
Ada error di [nama fitur/halaman]. Konteks:
- File terkait: [nama file]
- Error: [paste error message]
- Business rule yang relevan ada di business-rule.md bagian [nomor bagian]

Tolong diagnosa dan perbaiki.
```

### Untuk implementasi kalkulasi komisi:
```
Baca business-rule.md bagian 8 (Komisi Guru) dan erd.md bagian
commission_details. Implementasikan:
1. Service kalkulasi komisi di backend
2. pg_cron job di Supabase untuk kalkulasi akhir bulan
3. Halaman laporan komisi admin (05-laporan-komisi-admin.md)
4. Halaman komisi guru mobile (03-komisi-guru-mobile.md)

Formula: (SPP ÷ total sesi bulan ini) × 40% × jumlah sesi hadir
Komisi jatuh ke actual_teacher_id di session_logs, bukan teacher_id di sessions.
```

### Untuk implementasi invoice publik:
```
Baca 12-panel-invoice-admin.md, 13-invoice-digital-belum-lunas.md,
dan 14-invoice-digital-lunas.md. Implementasikan:
1. Generate invoice dengan nomor otomatis format INV-[TIPE]-[KODE]-[YYYYMM]-[URUT]
2. Halaman publik /invoice/[token] tanpa login
3. Status otomatis update: UNPAID → PARTIAL → PAID saat ada payments baru
4. Cap digital & stempel LUNAS untuk status PAID
5. Preview pesan WhatsApp dengan link invoice
```

### Untuk implementasi laporan progress publik:
```
Baca 10-laporan-progress-publik-orangtua.md dan 11-generate-kelola-link-laporan.md.
Implementasikan:
1. Generate link unik per siswa per mapel dengan durasi yang bisa dikonfigurasi
2. Halaman publik /laporan/[token] tanpa login
3. Tampilan berbeda untuk MODULE_BASED vs FREE_MATERIAL (lihat business-rule.md bagian 7)
4. Riwayat sesi + catatan guru per siswa
5. Preview pesan WhatsApp
```
