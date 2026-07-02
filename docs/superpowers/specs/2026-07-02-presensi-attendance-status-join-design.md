# Eliminasi N+1 Attendance Status di Halaman Presensi — Design Spec

Date: 2026-07-02

## Latar Belakang

Halaman admin `/presensi` ([apps/frontend/src/app/(dashboard)/presensi/page.tsx](../../../apps/frontend/src/app/(dashboard)/presensi/page.tsx)) memuat daftar sesi terpaginasi lewat `sessionApi.getAll()`, lalu untuk **setiap** sesi di halaman itu memanggil `attendanceApi.getSessionLog(session.id, selectedDate)` satu-satu lewat `Promise.all` — hanya untuk membaca satu field: `status`. Dengan page size default 10, satu kali buka halaman menghasilkan 1 (list) + 10 (attendance lookup) = 11 request.

Ditemukan sebagai follow-up saat code review pekerjaan API rate limiting (lihat [docs/superpowers/specs/2026-07-02-api-rate-limiting-design.md](2026-07-02-api-rate-limiting-design.md)): setelah backend membatasi 100 request/menit per IP secara global, pola N+1 ini makin dekat ke batas tersebut untuk admin yang aktif berpindah halaman/tanggal.

Backend-nya (`AttendanceService.getSessionLog`) juga over-fetch: query `findFirst` dengan `include: { actualTeacher, attendances: { include: student } }` padahal cuma `status` yang dipakai frontend di halaman ini.

## Keputusan Desain (dari sesi brainstorming)

Dua pendekatan dipertimbangkan:

1. **Endpoint batch terpisah** (`GET /attendance/sessions-status?sessionIds=...&date=...`) — mengurangi N+1 jadi 2 request total (1 list + 1 batch).
2. **JOIN langsung ke endpoint list sesi yang sudah ada** — `GET /sessions` menerima param `date` opsional dan menyertakan status attendance langsung di response list. **Dipilih.**

Alasan memilih opsi 2: `SessionsService` di file yang sama sudah punya pola persis ini di method `findTodaySessionsForTeacher` — meng-include `sessionLogs` yang difilter per tanggal dalam satu query `findMany` (dengan `relationLoadStrategy: 'join'` yang sudah dipakai project ini), lalu memetakan `sessionLog` ke tiap sesi di response. Mengikuti pola yang sama untuk `findAll` menghasilkan **1 request total** (bukan 2), tanpa endpoint baru, dan konsisten dengan prinsip performa proyek ini (kolaps N query jadi satu windowed query, bukan fetch-then-aggregate — lihat catatan performa `relationLoadStrategy: 'join'` di [CLAUDE.md](../../../CLAUDE.md) bagian Supabase project info).

## Perubahan

### Backend

**[apps/backend/src/modules/sessions/sessions.controller.ts](../../../apps/backend/src/modules/sessions/sessions.controller.ts)** — method `findAll` (endpoint `GET /sessions`):
- Tambah param `@Query('date') date?: string` dan `@ApiQuery({ name: 'date', required: false, description: 'YYYY-MM-DD, jika diisi menyertakan attendanceStatus per sesi untuk tanggal tersebut' })`.
- Teruskan `date` ke `sessionsService.findAll(page, limit, filters, date)`.

**[apps/backend/src/modules/sessions/sessions.service.ts](../../../apps/backend/src/modules/sessions/sessions.service.ts)** — method `findAll`:
- Tambah parameter opsional `date?: string`.
- Kalau `date` diberikan: normalisasi ke midnight (`new Date(date); d.setHours(0,0,0,0)`, sama seperti `AttendanceService.getSessionLog`), lalu tambahkan ke `include` yang sudah ada:
  ```typescript
  ...(date && {
    sessionLogs: {
      where: { sessionDate: normalizedDate, isAdHoc: false },
      select: { status: true },
    },
  }),
  ```
- Di hasil `.map(s => this.formatSession(s))`, kalau `date` diberikan, tambahkan field `attendanceStatus: (s as any).sessionLogs?.[0]?.status || 'SCHEDULED'` ke tiap item (pola sama seperti `findTodaySessionsForTeacher` baris 153-154). Kalau `date` tidak diberikan, field ini tidak muncul sama sekali (tidak ada perubahan untuk caller lain yang memanggil `findAll` tanpa `date`, seperti halaman `jadwal-sesi`).

Query tetap satu `findMany` — tidak menambah round-trip DB, hanya menambah satu JOIN ke query yang sudah berjalan. Index Prisma `@@index([sessionId, sessionDate])` pada `SessionLog` sudah ada, jadi filter ini efisien.

### Frontend

**[apps/frontend/src/lib/api/endpoints.ts](../../../apps/frontend/src/lib/api/endpoints.ts)** — `sessionApi.getAll`:
- Tambah `date?: string` ke tipe `filters`, di-append sebagai query param `date` (pola sama seperti field filter lain di objek ini).

**[apps/frontend/src/app/(dashboard)/presensi/page.tsx](../../../apps/frontend/src/app/(dashboard)/presensi/page.tsx)**:
- Di `queryFn` dalam `usePagination` (baris 95-126): panggil `sessionApi.getAll(page, limit, { date: selectedDate })` (menambahkan `date` ke filter object yang sudah ada, saat ini kosong `{}`).
- **Hapus total** blok `Promise.all((response.data?.data || []).map(async (session) => { ... attendanceApi.getSessionLog ... }))` (baris 100-117) — response list sudah membawa `attendanceStatus` per sesi langsung dari backend.
- Import `attendanceApi` di baris 11 kemungkinan masih dipakai di tempat lain di file ini (ad-hoc pending approvals) — jangan dihapus imports-nya, cuma hapus pemakaian `getSessionLog`.

## Non-Goals

- Tidak mengubah 3 pemakaian `attendanceApi.getSessionLog` lainnya (`AttendanceDetailModal.tsx`, halaman guru `presensi/[sessionId]/page.tsx` dan `progress/page.tsx`) — itu semua lookup satu sesi, bukan pola N+1, di luar scope.
- Tidak menambah endpoint baru di modul attendance.
- `AttendanceService.getSessionLog` (yang masih over-fetch `attendances`+`actualTeacher`) tidak diubah — masih dipakai oleh `AttendanceDetailModal` yang memang butuh detail lengkap itu, bukan cuma status.

## Testing

- Unit test `SessionsService.findAll`: saat `date` diberikan, assert `include.sessionLogs.where` berisi `sessionDate` dan `isAdHoc: false` yang benar, dan hasil map punya `attendanceStatus` sesuai `sessionLogs[0].status` (atau `'SCHEDULED'` kalau kosong).
- Unit test tambahan: saat `date` **tidak** diberikan, assert `include` tidak mengandung `sessionLogs` sama sekali dan hasil map tidak punya field `attendanceStatus` (regression guard supaya endpoint lain yang manggil `findAll` tanpa date tidak berubah).
- Manual verification: buka halaman `/presensi` di browser, cek Network tab — harus cuma satu request ke `/sessions?...&date=...`, tidak ada request berulang ke `/attendance/session/:id`.
