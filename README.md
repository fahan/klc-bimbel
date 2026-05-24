# 🎓 Bimbel Management System — Multi-Cabang

Sistem Manajemen Bimbingan Belajar (Tutoring Management System) dengan dukungan multi-cabang, berbasis web dan mobile.

## 📋 Daftar Isi

1. [Tech Stack](#tech-stack)
2. [Struktur Project](#struktur-project)
3. [Setup & Instalasi](#setup--instalasi)
4. [Environment Variables](#environment-variables)
5. [Development](#development)
6. [Phase Development](#phase-development)
7. [Dokumentasi Bisnis](#dokumentasi-bisnis)

---

## 🛠 Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: TanStack React Query
- **Form**: React Hook Form + Zod
- **HTTP Client**: Axios
- **Mobile**: Next.js PWA
- **UI Components**: Lucide React
- **Charts**: Recharts

### Backend
- **Framework**: NestJS
- **Language**: TypeScript
- **Database**: PostgreSQL (via Supabase)
- **ORM**: Prisma
- **Auth**: JWT (Passport.js)
- **API Documentation**: Swagger/OpenAPI

### Infrastructure
- **Frontend Hosting**: Vercel
- **Backend Hosting**: Railway
- **Database**: Supabase (PostgreSQL)
- **Monorepo**: Yarn Workspaces

---

## 📁 Struktur Project

```
learning-center/
├── apps/
│   ├── backend/                 # NestJS Backend
│   │   ├── src/
│   │   │   ├── modules/         # Feature modules
│   │   │   │   ├── auth/
│   │   │   │   ├── branches/
│   │   │   │   ├── users/
│   │   │   │   ├── subjects/
│   │   │   │   ├── students/
│   │   │   │   ├── sessions/
│   │   │   │   ├── attendance/
│   │   │   │   ├── progress/
│   │   │   │   ├── commissions/
│   │   │   │   ├── invoices/
│   │   │   │   └── store/
│   │   │   ├── prisma/          # Prisma service & module
│   │   │   ├── common/          # Guards, decorators, filters, etc
│   │   │   ├── app.module.ts
│   │   │   └── main.ts
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── nest-cli.json
│   │   └── .env.example
│   │
│   └── frontend/                # Next.js Frontend
│       ├── src/
│       │   ├── app/
│       │   │   ├── (auth)/
│       │   │   │   └── login/
│       │   │   ├── (dashboard)/     # Admin layout
│       │   │   │   ├── layout.tsx
│       │   │   │   ├── page.tsx
│       │   │   │   ├── siswa/
│       │   │   │   ├── guru/
│       │   │   │   ├── jadwal/
│       │   │   │   ├── presensi/
│       │   │   │   ├── pembayaran/
│       │   │   │   ├── laporan/
│       │   │   │   ├── toko/
│       │   │   │   └── master-data/
│       │   │   ├── (guru)/          # Mobile layout
│       │   │   │   ├── presensi/
│       │   │   │   ├── jadwal/
│       │   │   │   └── komisi/
│       │   │   ├── invoice/
│       │   │   ├── laporan/
│       │   │   ├── layout.tsx
│       │   │   ├── page.tsx
│       │   │   └── globals.css
│       │   ├── components/
│       │   │   ├── ui/             # Button, Card, Badge, etc
│       │   │   ├── forms/
│       │   │   ├── tables/
│       │   │   ├── charts/
│       │   │   └── layout/          # Sidebar, Topbar, BottomNav
│       │   ├── lib/
│       │   │   ├── api/             # API client & endpoints
│       │   │   └── utils/
│       │   ├── hooks/
│       │   └── types/
│       ├── public/
│       ├── package.json
│       ├── tsconfig.json
│       ├── tailwind.config.ts
│       ├── next.config.js
│       ├── postcss.config.js
│       └── .env.example
│
├── plan/                        # Dokumentasi bisnis & wireframe
│   ├── business-rule.md         # Business rules lengkap
│   ├── erd.md                   # Entity-Relationship Diagram (24 tabel)
│   ├── 01-dashboard-admin.md
│   ├── 02-presensi-guru-mobile.md
│   ├── ... (dan 11 wireframe lainnya)
│   └── INSTRUCTIONS.md
│
├── package.json                 # Root workspace (pnpm scripts)
├── pnpm-workspace.yaml          # pnpm workspace config
├── .npmrc                        # pnpm configuration
├── .gitignore
└── README.md
```

---

## 🚀 Setup & Instalasi

### Prerequisite
- Node.js >= 18
- pnpm >= 8.0
- PostgreSQL (atau Supabase account)
- Git

### 1. Install pnpm & Dependencies

```bash
# Install pnpm globally (jika belum)
npm install -g pnpm

# Install semua dependencies (backend + frontend)
pnpm install
```

### 2. Setup Backend

```bash
cd apps/backend

# Copy environment file
cp .env.example .env

# Edit .env dengan database URL Anda
nano .env  # atau gunakan editor pilihan Anda

# Setup Prisma (dari root atau dari backend directory)
pnpm prisma:generate   # atau: cd ../.. && pnpm prisma:generate
pnpm prisma:migrate    # Create database & tables

# Start backend development server
pnpm dev:backend
# Server akan berjalan di http://localhost:3001
```

### 3. Setup Frontend

```bash
cd ../frontend

# Copy environment file
cp .env.example .env.local

# Edit .env.local jika API URL berbeda
# NEXT_PUBLIC_API_URL=http://localhost:3001

# Start frontend development server
pnpm dev
# Frontend akan berjalan di http://localhost:3000
```

---

## 🔐 Environment Variables

### Backend (.env)
```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/bimbel_db"

# Supabase
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRATION="7d"

# Server
NODE_ENV="development"
PORT=3001
```

### Frontend (.env.local)
```env
# API
NEXT_PUBLIC_API_URL="http://localhost:3001"

# Supabase (jika diperlukan)
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
```

---

## 💻 Development

### Running Both Services (Parallel)

```bash
# Dari root directory - jalankan keduanya sekaligus
pnpm dev

# Atau jalankan terpisah:
# Terminal 1: Backend only
pnpm dev:backend

# Terminal 2: Frontend only (di terminal berbeda)
pnpm dev:frontend
```

### Database Management

```bash
# Dari root directory (atau cd apps/backend)

# View database in Prisma Studio
pnpm prisma:studio

# Create migration
pnpm prisma:migrate

# Generate Prisma Client
pnpm prisma:generate
```

### Other Useful Commands

```bash
# Type check semua packages
pnpm type-check

# Lint semua packages
pnpm lint

# Format semua packages
pnpm format

# Build semua packages
pnpm build

# Build hanya backend
pnpm build:backend

# Build hanya frontend
pnpm build:frontend
```

### API Documentation

Swagger docs tersedia di: `http://localhost:3001/api`

---

## 📊 Phase Development

### ✅ Phase 1: Setup & Auth (SEDANG DIKERJAKAN)
- [x] Monorepo structure
- [x] Backend setup (NestJS + Prisma)
- [x] Frontend setup (Next.js)
- [ ] Auth Module (login, JWT)
- [ ] Dashboard Admin (basic layout)

### Phase 2: Master Data
- [ ] Branches CRUD
- [ ] Subjects CRUD
- [ ] SPP Rates management
- [ ] Curriculum Modules
- [ ] Users CRUD

### Phase 3: Siswa & Jadwal
- [ ] Student registration
- [ ] Session scheduling
- [ ] Presensi (attendance)
- [ ] Progress tracking

### Phase 4: Keuangan
- [ ] Invoice generation
- [ ] Payment recording
- [ ] Commission calculation
- [ ] Financial reports

### Phase 5: Laporan & Toko
- [ ] Progress reports (parent)
- [ ] Store management
- [ ] Stock mutations
- [ ] Financial reports

### Phase 6: Multi-Cabang & Optimasi
- [ ] Branch switcher
- [ ] Consolidated reports
- [ ] Performance optimization

---

## 📚 Dokumentasi Bisnis

Dokumentasi lengkap tersedia di folder `plan/`:

1. **[business-rule.md](./plan/business-rule.md)** — Business rules lengkap
   - Organisasi & multi-cabang
   - Role & akses control
   - Master data
   - Siswa & pendaftaran
   - Jadwal & sesi
   - Presensi & progress
   - Komisi guru
   - Invoice & pembayaran
   - Laporan
   - Toko & stok

2. **[erd.md](./plan/erd.md)** — Database design
   - 24 tabel dengan relationships
   - Enums & constraints
   - Field documentation

3. **Wireframe** (01-14)
   - [01-dashboard-admin.md](./plan/01-dashboard-admin.md) — Dashboard admin
   - [02-presensi-guru-mobile.md](./plan/02-presensi-guru-mobile.md) — Attendance mobile
   - [03-komisi-guru-mobile.md](./plan/03-komisi-guru-mobile.md) — Commission mobile
   - [04-manajemen-jadwal-admin.md](./plan/04-manajemen-jadwal-admin.md) — Schedule management
   - [05-laporan-komisi-admin.md](./plan/05-laporan-komisi-admin.md) — Commission report
   - [06-pendaftaran-siswa-baru.md](./plan/06-pendaftaran-siswa-baru.md) — Student registration
   - [07-laporan-keuangan.md](./plan/07-laporan-keuangan.md) — Financial report
   - [08-toko-stok-admin.md](./plan/08-toko-stok-admin.md) — Store management
   - [09-input-progress-guru-mobile.md](./plan/09-input-progress-guru-mobile.md) — Progress input
   - [10-laporan-progress-publik-orangtua.md](./plan/10-laporan-progress-publik-orangtua.md) — Parent report
   - [11-generate-kelola-link-laporan.md](./plan/11-generate-kelola-link-laporan.md) — Report links
   - [12-panel-invoice-admin.md](./plan/12-panel-invoice-admin.md) — Invoice panel
   - [13-invoice-digital-belum-lunas.md](./plan/13-invoice-digital-belum-lunas.md) — Unpaid invoice
   - [14-invoice-digital-lunas.md](./plan/14-invoice-digital-lunas.md) — Paid invoice

---

## 📝 Konvensi Kode

### Backend
- DTO: `class-validator` decorators
- Response: `{ success, data, message }`
- Error handling: Global exception filter
- Swagger: Di setiap endpoint
- Prisma: Filter `branchId` untuk data per-cabang

### Frontend
- Server Components: Default (tanpa interaksi)
- Client Components: `'use client'` hanya jika ada state/events
- Loading & Error: `loading.tsx` & `error.tsx` per halaman
- Colors: Tailwind class (tidak hardcode)
- Mobile: `max-w-sm mx-auto`

---

## 📋 Checklist untuk Step Berikutnya

- [ ] Install pnpm globally: `npm install -g pnpm`
- [ ] Run `pnpm install` di root
- [ ] Setup `.env` di backend (DATABASE_URL, JWT_SECRET, etc)
- [ ] Setup `.env.local` di frontend
- [ ] Setup PostgreSQL/Supabase database
- [ ] Run `pnpm prisma:migrate` 
- [ ] Test backend server (`pnpm dev:backend`)
- [ ] Test frontend server (`pnpm dev:frontend`)
- [ ] Verify API Swagger docs (http://localhost:3001/api)
- [ ] Run `pnpm dev` untuk jalankan keduanya sekaligus

---

## 📞 Support

Jika ada pertanyaan atau masalah:
1. Check dokumentasi di folder `plan/`
2. Review konvensi kode di bagian ini
3. Buat issue jika ada bug

---

## 📄 License

UNLICENSED (Proprietary)

---

**Last Updated**: April 28, 2026  
**Version**: 0.0.1
