# Error State untuk Halaman List Admin (raw useQuery) — Design Spec

Date: 2026-07-06

## Latar Belakang

Follow-up dari [docs/superpowers/specs/2026-07-06-pagination-error-state-design.md](2026-07-06-pagination-error-state-design.md), yang menangani 5 halaman admin yang memakai hook `usePagination`. Ternyata ada **42 file** di frontend yang memakai `useQuery` React Query secara langsung (bukan lewat `usePagination`), dan sebagian besar juga tidak menangani `error` — kalau query gagal, halaman diam-diam jatuh ke tampilan "belum ada data" alih-alih menunjukkan error yang sebenarnya.

Dari 42 file itu, audit menyaring ke **14 halaman list/tabel admin** yang polanya sama persis dengan yang sudah diperbaiki sebelumnya (fetch satu daftar utama, render tabel, tidak ada error handling untuk request yang gagal). File lain (dashboard ringkasan, halaman detail/edit, modal, wizard enrollment, halaman mobile guru, `branch-context.tsx`, landing page publik) sengaja dikeluarkan dari scope — bentuknya berbeda dan butuh pertimbangan desain tersendiri (lihat Non-Goals).

## Keputusan Desain

Pola **identik** dengan spec sebelumnya — tidak ada keputusan baru yang perlu diambil ulang, murni penerapan pola yang sudah disetujui ke halaman lain:

- Komponen `ErrorState` yang sudah ada (`apps/frontend/src/components/ui/States.tsx`) dipakai apa adanya, tidak ada komponen baru.
- Copy sama: title "Gagal memuat data", description "Terjadi kesalahan saat memuat data. Silakan coba lagi.", action label "Coba Lagi" → `refetch`.
- `error` dari `useQuery` dicek PALING DULU dalam percabangan render, sebelum `isLoading` dan sebelum empty-check.
- Kalau ada local state bernama persis `error` untuk keperluan lain (form/mutation), alias jadi `queryError` (pola sama seperti `spp-rates`/`subjects`/`branches` di batch sebelumnya).
- **Beda dari batch sebelumnya:** kemarin `networkMode: 'always'` cukup ditambahkan SEKALI di `usePagination.ts` karena kelima halaman berbagi hook yang sama. Kali ini, 14 halaman ini masing-masing memanggil `useQuery` LANGSUNG (bukan lewat hook bersama) — jadi `networkMode: 'always'` perlu ditambahkan di **setiap** panggilan `useQuery` yang diberi `ErrorState` (14 titik terpisah), bukan satu titik pusat. Ini konsisten dengan temuan sebelumnya: tanpa ini, `error` tidak akan pernah ter-set untuk kegagalan network murni (backend down total), membuat `ErrorState` percuma untuk skenario itu.

## 14 Halaman dalam Scope

Catatan tambahan hasil verifikasi ulang: `invoice-tagihan/page.tsx` awalnya dikira sudah beres, tapi ternyata query utamanya (`invoicesData`, baris ~101) TIDAK men-destructure `error` sama sekali — cuma `data`, `isLoading`, `refetch`. Halaman ini juga punya local `error` state (baris 78) untuk pesan error di modal aksi (baris 910-911) — jadi masuk scope dengan alias `queryError`, bukan dikecualikan.


| # | File | UI saat ini | Perlu alias `queryError`? |
|---|------|-------------|---------------------------|
| 1 | `apps/frontend/src/app/(dashboard)/formula-komisi/page.tsx` | Inline | Tidak |
| 2 | `apps/frontend/src/app/(dashboard)/komisi-guru/page.tsx` | `LoadingState`/`EmptyState` | Tidak |
| 3 | `apps/frontend/src/app/(dashboard)/laporan-keuangan/page.tsx` | Inline | Tidak |
| 4 | `apps/frontend/src/app/(dashboard)/laporan-presensi/page.tsx` | `LoadingState`/`EmptyState` | Tidak |
| 5 | `apps/frontend/src/app/(dashboard)/laporan-progress/components/ManageLinksTab.tsx` | `LoadingState`/`EmptyState` | Ya — ada local `error` untuk form submission |
| 6 | `apps/frontend/src/app/(dashboard)/laporan-progress/components/ViewProgressTab.tsx` | `LoadingState`/`EmptyState` | Cek saat implementasi — local state bernama `reportError` (beda nama, kemungkinan aman pakai `error` polos, tapi verifikasi dulu sebelum asumsi) |
| 7 | `apps/frontend/src/app/(dashboard)/manajemen-user/page.tsx` | `LoadingState`/`EmptyState`/`SkeletonCard` | Cek saat implementasi — dipakai `toast` state (beda nama, kemungkinan aman pakai `error` polos) |
| 8 | `apps/frontend/src/app/(dashboard)/master-data/students/page.tsx` | `LoadingState`/`EmptyState` | Tidak |
| 9 | `apps/frontend/src/app/(dashboard)/pembayaran-spp/page.tsx` | Inline | Cek saat implementasi — dipakai `paymentError` (beda nama, kemungkinan aman pakai `error` polos) |
| 10 | `apps/frontend/src/app/(dashboard)/pengeluaran/page.tsx` | Inline | **Ya** — ada local `error` state persis sama nama |
| 11 | `apps/frontend/src/app/(dashboard)/toko-stok/page.tsx` | `LoadingState`/`EmptyState` | Cek saat implementasi — dipakai `pError`/`saleError` (beda nama, kemungkinan aman pakai `error` polos) |
| 12 | `apps/frontend/src/app/(dashboard)/transfer-stok/page.tsx` | Inline | **Ya** — ada local `error` state persis sama nama |
| 13 | `apps/frontend/src/app/(dashboard)/jadwal-sesi/page.tsx` | `LoadingState`/`EmptyState` | Tidak |
| 14 | `apps/frontend/src/app/(dashboard)/invoice-tagihan/page.tsx` | `LoadingState`/`EmptyState` | **Ya** — ada local `error` state persis sama nama (dipakai untuk pesan error di modal aksi) |

Catatan: kolom "perlu alias" untuk baris 6, 7, 9, 11 ditandai "cek saat implementasi" karena nama local state-nya SUDAH berbeda dari `error` (`reportError`, `toast`, `paymentError`, `pError`/`saleError`) — kemungkinan besar tidak ada collision sama sekali dan bisa pakai `error` polos, tapi implementer WAJIB membaca file aktual dan konfirmasi tidak ada variabel lain bernama persis `error` sebelum memutuskan, bukan asumsi buta dari tabel ini.

## Perubahan (pola per file)

1. Tambah `error` (atau alias `queryError` sesuai tabel) ke destructuring `useQuery(...)` untuk query utama halaman tersebut.
2. Tambah `networkMode: 'always'` ke opsi `useQuery` yang sama.
3. Import `ErrorState` dari `@/components/ui/States` kalau belum ada.
4. Untuk halaman yang sudah pakai `LoadingState`/`EmptyState`: tambah `error ? <ErrorState .../> :` sebagai kondisi pertama dalam ternary yang sudah ada — pola identik dengan batch sebelumnya.
5. Untuk halaman yang masih inline (`{isLoading && (...)} {!isLoading && (...)}` atau sejenisnya): gabung jadi ternary tiga arah dengan `ErrorState` di depan — pola identik dengan `spp-rates`/`subjects`/`branches` di batch sebelumnya, isi block yang sudah ada tidak diubah, cuma bagian pembuka kondisinya.

## Non-Goals

- Halaman dashboard ringkasan (`dashboard/page.tsx`, `DashboardAdminCabang.tsx`) — bukan halaman list/tabel, pakai kartu metrik & skeleton, di luar scope.
- `landing-content/page.tsx` — bukan halaman list utama (form/tab konten landing page), di luar scope.
- Halaman detail/edit (`master-data/students/[id]`, `master-data/teachers/[id]`, `jadwal-sesi/[id]`, dll.) — fetch satu entity, bukan list, kegagalannya lebih pas ditangani lewat redirect/notFound daripada kartu `ErrorState`, butuh desain terpisah.
- Modal & wizard enrollment (`AddSubjectModal`, `EditSubjectModal`, `EnrollmentStep2/3`) — UI dialog, `ErrorState` (kartu penuh halaman) tidak cocok secara visual.
- Halaman mobile guru (`(guru)/guru/*`) — pola UI berbeda dari desktop admin, perlu treatment terpisah.
- `branch-context.tsx` — context provider inti yang memengaruhi seluruh app, perubahan di sini berisiko lebih luas, butuh pertimbangan arsitektur tersendiri.
- `app/page.tsx` (landing page publik) — tidak ada auth, audiens berbeda (calon customer, bukan admin), di luar scope.
- `AttendanceDetailModal.tsx`, halaman guru presensi — sudah jadi non-goal eksplisit di spec sebelumnya, tetap di luar scope.

## Testing

- Tidak ada infrastruktur test frontend (konsisten dengan proyek ini) — verifikasi manual per halaman + type-check monorepo.
- Minimal 2-3 halaman representatif (satu yang sudah pakai shared components, satu yang inline, satu yang butuh alias `queryError`) diverifikasi lewat browser sungguhan (backend dimatikan → `ErrorState` muncul; backend dinyalakan lagi + klik "Coba Lagi" → recovery) — mengikuti teknik yang sudah terbukti di batch sebelumnya (dev JWT + Claude Preview, hindari `preview_start` yang selalu root ke repo utama, pakai checkout manual file dari branch worktree ke repo utama untuk testing sementara).
- Sisanya cukup diverifikasi lewat pembacaan kode + type-check, mengingat pola sudah terbukti identik dan sudah diverifikasi hati-hati di 5 halaman pertama.
