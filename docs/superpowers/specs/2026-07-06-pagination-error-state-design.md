# Error State untuk Halaman `usePagination` — Design Spec

Date: 2026-07-06

## Latar Belakang

`usePagination` ([apps/frontend/src/hooks/usePagination.ts](../../../apps/frontend/src/hooks/usePagination.ts)) sudah mengembalikan `error` dan `refetch` dari `useQuery` sejak awal (tidak pernah diubah). Namun kelima halaman yang memakainya tidak pernah men-destructure atau menampilkan `error`:

- `apps/frontend/src/app/(dashboard)/presensi/page.tsx`
- `apps/frontend/src/app/(dashboard)/master-data/spp-rates/page.tsx`
- `apps/frontend/src/app/(dashboard)/master-data/subjects/page.tsx`
- `apps/frontend/src/app/(dashboard)/master-data/branches/page.tsx`
- `apps/frontend/src/app/(dashboard)/master-data/teachers/page.tsx`

Kalau query gagal (network error, 500, dsb), `isLoading` menjadi `false` dan `items` fallback ke `[]`, sehingga UI jatuh ke `EmptyState` ("belum ada data") — padahal request-nya gagal, bukan datanya memang kosong. Ditemukan sebagai follow-up saat code review pekerjaan eliminasi N+1 di halaman presensi (lihat [docs/superpowers/specs/2026-07-02-presensi-attendance-status-join-design.md](2026-07-02-presensi-attendance-status-join-design.md)) — presensi sekarang cuma mengandalkan 1 request per load, jadi kalau request itu gagal, tidak ada fallback request lain yang bisa "menyelamatkan" tampilan.

Sudah ada komponen `ErrorState` siap pakai di [apps/frontend/src/components/ui/States.tsx:80-100](../../../apps/frontend/src/components/ui/States.tsx) (`title`, `description`, `action?: { label, onClick }`) yang belum pernah dipakai di mana pun untuk kasus ini.

## Keputusan Desain (dari sesi brainstorming)

| Pertanyaan | Keputusan |
| --- | --- |
| Scope halaman | Semua 5 halaman yang memakai `usePagination` (bukan cuma presensi) |
| Komponen UI | Pakai `ErrorState` yang sudah ada, tidak buat komponen baru |
| Isi pesan | Title: "Gagal memuat data", Description: "Terjadi kesalahan saat memuat data. Silakan coba lagi.", Action: tombol "Coba Lagi" memanggil `refetch` |
| Urutan percabangan render | `error` dicek PALING DULU, sebelum `isLoading` dan sebelum empty-check |

## Perubahan (pola identik di 5 file)

Untuk masing-masing dari 5 halaman:

1. Tambah `error` ke destructuring `usePagination({...})` — keempat halaman master-data sudah destructure `refetch` tapi bukan `error`; presensi juga belum destructure `error` (sudah destructure `refetch` sebagai `refetchSessions`).
2. Kalau file belum meng-import `ErrorState` dari `@/components/ui/States`, tambahkan ke import statement yang sudah ada di baris tersebut.
3. Ubah percabangan render dari:
   ```tsx
   {isLoading ? (
     <LoadingState />
   ) : items.length === 0 ? (
     <EmptyState ... />
   ) : (
     <table>...</table>
   )}
   ```
   menjadi:
   ```tsx
   {error ? (
     <ErrorState
       title="Gagal memuat data"
       description="Terjadi kesalahan saat memuat data. Silakan coba lagi."
       action={{ label: 'Coba Lagi', onClick: refetch }}
     />
   ) : isLoading ? (
     <LoadingState />
   ) : items.length === 0 ? (
     <EmptyState ... />
   ) : (
     <table>...</table>
   )}
   ```

### Catatan khusus per file

- **`presensi/page.tsx`**: destructuring saat ini bernama `refetch: refetchSessions` (bukan `refetch` polos) — pakai `refetchSessions` di `action.onClick`, dan tambah `error` ke daftar destructuring yang sama. Percabangan render saat ini dimulai dari `{sessionsLoading ? (...) : filteredSessions.length === 0 ? (...) : (...)}` — ganti `sessionsLoading` menjadi variabel yang konsisten (tetap pakai `sessionsLoading` untuk `isLoading`, tambahkan `error` sebagai kondisi pertama).
- **4 halaman master-data** (`spp-rates`, `subjects`, `branches`, `teachers`): masing-masing punya local `error` state string terpisah (dipakai untuk validasi form/aksi CRUD, bukan dari `usePagination`) — **jangan** ditimpa atau digabung dengan `error` dari `usePagination`. Beri nama variabel berbeda saat destructuring, misalnya `error: queryError`, supaya tidak bentrok dengan local state `error` yang sudah ada di keempat file itu.

## Non-Goals

- Tidak mengubah `usePagination.ts` sendiri — sudah benar, `error`/`refetch` sudah di-return.
- Tidak menyentuh local `error` state di 4 halaman master-data yang dipakai untuk keperluan lain (validasi/CRUD) — hanya menangani `error` dari query `usePagination`.
- Tidak membuat komponen UI baru — pakai `ErrorState` yang sudah ada apa adanya.

## Testing

- Manual verification per halaman: pakai `preview_eval`/DevTools untuk mem-block atau mem-force-fail request (misalnya matikan backend sementara, atau intercept network) dan konfirmasi `ErrorState` muncul dengan tombol "Coba Lagi" yang berfungsi (klik → refetch → kalau backend sudah hidup lagi, data muncul normal).
- Tidak ada infrastruktur test frontend di proyek ini (sesuai TODO #10 di `CLAUDE.md` — belum ada unit/e2e test coverage untuk frontend), jadi verifikasi murni manual + type-check, konsisten dengan cara kerja proyek ini sejauh ini.
