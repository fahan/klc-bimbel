# Perbaikan Form Pendaftaran Siswa: Kunci Cabang Admin Cabang + Step Jadwal Opsional

**Date:** 2026-07-02
**Status:** Approved

## Background

Form pendaftaran siswa baru (`/master-data/students/create`) punya dua masalah:

1. **Field cabang tidak terkunci untuk ADMIN_CABANG.** `EnrollmentStep1.tsx` menjalankan query cabang sendiri (`branchApi.getAll()`) dan sama sekali tidak memakai `BranchContext` (`lib/branch-context.tsx`). Akibatnya field "Cabang" selalu berupa dropdown terbuka berisi semua cabang di sistem, untuk role apa pun — berbeda dari Topbar yang sudah benar mengunci cabang (ikon 🔒) untuk admin cabang murni. Ini berisiko admin cabang salah pilih cabang saat mendaftarkan siswa.
2. **Step "Pilih jadwal" (Step 3) wajib diisi penuh**, tidak bisa dilewati. `EnrollmentStep3.tsx` memblokir progres kecuali setiap mata pelajaran yang dipilih di Step 2 punya tepat 1 sesi terpilih. Backend (`EnrollSubjectDto.sessionId`) juga mewajibkan field ini tanpa `@IsOptional()`, jadi bahkan panggilan API langsung tanpa lewat UI pun akan ditolak validasi. Ini menyulitkan admin yang ingin mendaftarkan siswa dulu dan menjadwalkan sesi belakangan (mis. jadwal kelas belum fix, guru belum ditentukan).

## Scope

**In scope:**
- Mengunci/membatasi pilihan cabang di Step 1 form pendaftaran sesuai role yang login.
- Membuat assignment sesi (jadwal) di Step 3 opsional — siswa bisa didaftarkan tanpa jadwal sesi, dan dijadwalkan belakangan.

**Out of scope (keputusan eksplisit):**
- Validasi branchId sisi backend terhadap cabang milik user yang login. Backend saat ini menerima `branchId` apa pun dari client tanpa mengecek kepemilikan cabang admin cabang (`students.service.ts` `create()` L95-134, `enrollStudent()` L201). Ini sudah tercatat sebagai TODO produksi terpisah di `CLAUDE.md` (#5, "Server-side branch isolation") dan sengaja tidak digabung ke perubahan ini agar scope tetap kecil.
- Mewajibkan subject/tarif SPP jadi opsional. Step 2 (pilih mata pelajaran + tarif SPP) tetap wajib diisi seperti sekarang — hanya assignment sesi/jadwal spesifik (hari, jam) di Step 3 yang jadi opsional.
- UI baru untuk "jadwalkan nanti". Mekanisme ini sudah ada (lihat Bagian B).

## Bagian A — Kunci Cabang untuk Admin Cabang

### Kondisi saat ini

`EnrollmentStep1.tsx` (L64-69, L181-191):
```tsx
const { data: branchesData } = useQuery({
  queryKey: ['branches'],
  queryFn: () => branchApi.getAll(),
})
const branches = branchesData?.data?.data || []
// ...
<select {...register('branchId', { required: 'Cabang wajib dipilih' })}>
  <option value="">Pilih cabang...</option>
  {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
</select>
```

Tidak ada penggunaan `useBranch()`/`useApiBranchId()` di seluruh file `components/enrollment/*`. `BranchContext` sendiri sudah punya logika auto-select & restriksi untuk admin cabang murni (`branch-context.tsx` L74-119) yang dipakai Topbar, tapi form enrollment tidak memanfaatkannya sama sekali.

### Perubahan

**`EnrollmentStep1.tsx`:**
- Ganti query cabang mandiri dengan `useBranch()` dari `BranchContext` — ambil `branches`, `canViewAllBranches`, `isRestrictedToBranch`.
- Render kondisional field "Cabang":
  - **`isRestrictedToBranch` true** (admin cabang murni, 1 cabang): tampilkan sebagai teks statis + ikon 🔒 (bukan `<select>`), contoh: "Cabang Purwokerto 🔒 (terkunci ke cabang Anda)". Nilai `branchId` di-set otomatis ke `branches[0].id` via `setValue`/`reset` saat `branches` termuat, dan tidak bisa diubah user.
  - **Admin cabang dengan >1 cabang** (m:n via `UserBranch`, kasus jarang): tetap `<select>`, tapi opsinya dibatasi ke `branches` dari context (sudah terfilter ke cabang yang ditugaskan) — bukan semua cabang di sistem.
  - **OWNER/ADMIN_GLOBAL** (`canViewAllBranches` true): tidak berubah, `<select>` berisi semua cabang.
- Efek pada prefill landing page: jika ada `branchCode` dari query param (alur "Jadikan Siswa" dari landing) dan user adalah admin cabang murni yang terkunci, nilai locked branchId **menang** — prefill tidak bisa menimpa cabang admin. Ini konsisten dengan tujuan perbaikan (cegah salah tempat siswa).

**Tidak berubah:** `create/page.tsx` — logika prefill dari query params tetap ada untuk field lain (nama, no HP ortu, dst), hanya `branchId` yang sekarang dikunci di level `EnrollmentStep1`.

## Bagian B — Step Jadwal Opsional

### Kondisi saat ini & pola yang sudah ada

Step 3 (`EnrollmentStep3.tsx` L78-86) memblokir submit:
```tsx
const handleSubmit = () => {
  if (selectedSessions.length !== subjects.length) {
    alert('Pilih 1 slot jadwal untuk setiap mata pelajaran')
    return
  }
  if (onComplete) onComplete(selectedSessions)
}
```

Backend `EnrollSubjectDto.sessionId` (`enrollment.dto.ts` L24-26) wajib:
```ts
@ApiProperty({ example: 'session_id_123' })
@IsString()
sessionId!: string
```

Namun pola "sesi opsional" **sudah ada dan berfungsi** di alur lain, yang akan kita tiru:
- `AddSubjectDto` (tambah mapel ke siswa yang sudah terdaftar, `enrollment.dto.ts` L101-128) **tidak punya field sesi sama sekali**.
- `EditSubjectModal.tsx` (L198-213) sudah punya field "Jadwal Sesi (Opsional)" dengan opsi "-- Belum dipilih --", dipakai di halaman Detail Siswa untuk set/ubah jadwal kapan saja setelah siswa terdaftar.
- Backend `updateSubjectEnrollment()` (`students.service.ts` L581-697) sudah punya pola "hanya proses & buat `SessionStudent` kalau `updateData.sessionId` dikirim" (L647-683) — pola ini yang akan direplikasi ke `enrollStudent()`.

### Perubahan

**`EnrollmentStep3.tsx`:**
- Tambah tombol baru **"Lewati, jadwalkan nanti →"** di samping tombol "Lanjut ke Konfirmasi" yang sudah ada.
- Klik tombol baru → panggil `onComplete([])` langsung (mengabaikan pilihan sesi parsial yang mungkin sudah dibuat user), lanjut ke Step 4.
- Tombol "Lanjut ke Konfirmasi" yang sudah ada **tidak berubah perilakunya** — tetap mewajibkan 1 sesi per mata pelajaran sebelum bisa lanjut lewat jalur itu.
- Jadi ada 2 jalur eksplisit: jadwalkan semua sekarang (jalur lama), atau lewati semua (jalur baru). Tidak ada skip parsial per-mata-pelajaran.

**`EnrollmentStep4.tsx`:**
- Terima prop baru (mis. `hasUnscheduledSubjects: boolean`).
- Jika true, tampilkan banner kuning tambahan: "Siswa akan didaftarkan tanpa jadwal sesi. Anda bisa menambahkan jadwal nanti dari halaman Detail Siswa."

**`create/page.tsx`:**
- Hitung `hasUnscheduledSubjects = selectedSessions.length === 0 && selectedSubjects.length > 0`, teruskan ke `EnrollmentStep4`.
- `handleStep4Submit` (L107-157): tidak perlu berubah — sudah tolerant terhadap `session?.sessionId` bernilai `undefined` (L134-140), dan `JSON.stringify` (dipakai axios) otomatis membuang key dengan value `undefined`, sehingga field `sessionId` tidak terkirim sama sekali saat kosong — cocok dengan DTO yang jadi `@IsOptional()`.

**Backend `enrollment.dto.ts`:**
- `EnrollSubjectDto.sessionId`: tambah `@IsOptional()`.
- `EnrolledSubjectSummaryDto.sessionDay`, `.sessionTime`, `.teacherName`: jadi optional (`string | null`).

**Backend `students.service.ts` — `enrollStudent()` (L201-332):**
- Di loop validasi (L214-268): jika `subjectEnroll.sessionId` ada → perilaku sekarang tidak berubah (lookup session, validasi subject/branch match, simpan `sessionId` di `enrollmentData`).
- Jika `subjectEnroll.sessionId` tidak ada → skip lookup & validasi session sepenuhnya, `enrollmentData` untuk mapel itu tidak menyertakan `session`/`sessionId`.
- Pembuatan `SessionStudent` (L291-302): filter hanya entri yang punya `sessionId` sebelum `Promise.all(...create(...))` — mapel tanpa sesi tidak membuat baris `SessionStudent`.
- Response summary (L309-317): untuk mapel tanpa sesi, `sessionDay`/`sessionTime`/`teacherName` bernilai `null` alih-alih diakses dari `data.session` (yang tidak ada).

### Setelah siswa tersimpan tanpa jadwal

Tidak perlu UI baru. Admin membuka halaman Detail Siswa → tombol "Ubah Mata Pelajaran" pada mapel yang belum berjadwal → `EditSubjectModal` (sudah ada, sudah mendukung field sesi opsional) → pilih jadwal kapan saja setelah siswa aktif.

## Testing

- **Manual (browser):** login sebagai admin cabang → buka form pendaftaran siswa → verifikasi field cabang terkunci ke cabang admin tsb (bukan dropdown semua cabang) → isi Step 1-2 → di Step 3 klik "Lewati, jadwalkan nanti" → verifikasi Step 4 menampilkan banner peringatan → submit → verifikasi siswa tersimpan dengan mapel tanpa jadwal → buka Detail Siswa → verifikasi bisa set jadwal lewat "Ubah Mata Pelajaran".
- **Manual (browser):** ulangi alur normal (pilih jadwal penuh di Step 3, tombol "Lanjut" lama) → pastikan tidak ada regresi, siswa tersimpan dengan `SessionStudent` seperti sebelumnya.
- **Manual (browser):** login sebagai OWNER/ADMIN_GLOBAL → verifikasi field cabang di Step 1 masih dropdown berisi semua cabang seperti sebelumnya (tidak ada regresi).
- **Backend:** panggil `POST /students/:id/enroll` langsung tanpa `sessionId` pada salah satu subject → pastikan tidak lagi 400 validation error, dan tidak ada baris `SessionStudent` dibuat untuk subject tsb.
