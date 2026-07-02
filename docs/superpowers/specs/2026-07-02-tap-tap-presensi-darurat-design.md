# Desain: Presensi "Tap-Tap" via Sesi Darurat sebagai Alur Utama

**Tanggal:** 2026-07-02
**Status:** Disetujui, menunggu review akhir pengguna

## 1. Latar Belakang & Masalah

Operasional presensi saat ini berjalan **hanya** lewat sesi darurat (ad-hoc), bukan lewat jadwal mingguan tetap (`Session`). Dua alasan bisnis:

1. Jadwal berubah terlalu sering — mengedit `Session` (guru+mapel+hari+jam+siswa tetap) setiap kali ada perubahan terlalu merepotkan.
2. Siswa bertemu guru secara acak, tidak selalu dengan guru yang sama — pola jadwal tetap tidak merepresentasikan kenyataan operasional.

Investigasi kode menunjukkan **sesi darurat bukan workaround** — ini fitur first-class yang cukup matang (`SessionLog.isAdHoc`, status `PENDING_APPROVAL`/`REJECTED`, alur approval admin, opsi generate jadwal dari sesi darurat yang disetujui). Masalahnya: fitur ini didesain sebagai jalur pengecualian (form panjang: cabang, mapel, tanggal, jam mulai, durasi, catatan, lalu cari siswa yang sudah difilter per mapel), sehingga terasa berat dipakai sebagai jalur utama harian oleh semua guru.

**Kebutuhan bisnis:**
- Guru bisa input presensi cukup tap-tap (minim langkah/field).
- Progress belajar siswa tetap terekam dengan jelas per mapel.
- Orang tua mendapat laporan yang mudah dibaca.

## 2. Tujuan & Batasan Scope

**Tujuan:**
- Streamline form sesi darurat menjadi alur tap-tap sebagai jalur presensi harian utama.
- Approval admin tetap wajib (kontrol anti-kecurangan komisi) tapi disederhanakan jadi batch.
- Tambah ringkasan visual di laporan progress orang tua.

**Non-goals (secara eksplisit TIDAK diubah):**
- Model data `Session` (jadwal mingguan tetap) tidak dihapus atau diubah strukturnya — tetap dipertahankan untuk kelas yang memang stabil dan untuk perencanaan kapasitas/kalender.
- Alur presensi berbasis `Session` tetap (termasuk "Gantikan Sesi Guru Lain") tidak diubah.
- Tidak ada migrasi skema database — seluruh desain ini murni perubahan service layer + UI di atas struktur `SessionLog` yang sudah ada (`isAdHoc`, `adHocSubjectId`, `adHocStartTime`, `adHocDuration`, `PENDING_APPROVAL`, dll).
- Formula komisi (`SPP ÷ total sesi × 40% × hadir`) tidak berubah.

## 3. Desain Backend

### 3.1 Prinsip

Guru hanya mengirim **daftar siswa + status kehadiran**. Backend yang menentukan mapel (dari data enrollment siswa), waktu (dari waktu submit), dan durasi (default tetap). Kalau satu batch berisi siswa dari mapel berbeda, backend **otomatis memecah menjadi beberapa `SessionLog`** (satu per mapel) di dalam satu transaction — guru tidak perlu sadar proses ini terjadi.

### 3.2 Alur `submitAdHocAttendance` (revisi)

Input: `{ branchId, students: [{ studentId, subjectId?, status }] }`

1. Untuk tiap `studentId`, resolve mapel:
   - Jika siswa punya tepat 1 `StudentSubject` aktif di cabang tsb → pakai itu, abaikan `subjectId` dari payload.
   - Jika siswa punya >1 `StudentSubject` aktif → `subjectId` **wajib** ada di payload (FE sudah menampilkan chip pemilihan mapel untuk siswa ini, lihat 4.1). Validasi: `subjectId` yang dikirim harus salah satu dari mapel aktif siswa tsb.
   - Jika siswa tidak punya `StudentSubject` aktif sama sekali (walk-in/belum terdaftar) → tetap didukung: butuh `subjectId` eksplisit di payload (FE minta guru pilih dari semua mapel cabang), tandai attendance ini sebagai siswa non-enrolled seperti perilaku sekarang.
2. Kelompokkan siswa berdasarkan `subjectId` hasil resolve.
3. Dalam satu `$transaction`, untuk tiap grup buat:
   - `SessionLog` baru: `sessionId: null`, `isAdHoc: true`, `adHocBranchId: branchId`, `adHocSubjectId: <subjectId grup>`, `sessionDate: <tanggal hari ini>`, `adHocStartTime: <waktu submit, format HH:mm>`, `adHocDuration: 30` (default tetap, tidak dikirim dari FE), `status: PENDING_APPROVAL`.
   - `Attendance` per siswa dalam grup dengan status yang dikirim.
4. Return: array `SessionLog` (satu entri per grup mapel) beserta info mapel & siswa masing-masing — dipakai FE untuk mengarahkan ke layar progress berurutan.

### 3.3 Endpoint

| Endpoint | Perubahan |
|---|---|
| `GET /students/active-by-branch?branchId=` | **Baru.** Cari siswa aktif di cabang (query nama/panggilan). Tiap hasil menyertakan `{ studentId, name, nickname, activeSubjects: [{subjectId, subjectName}] }`. Menggantikan pemakaian `getEligibleStudents(branchId, subjectId)` untuk kasus ini (endpoint lama tetap ada, dipakai fitur lain). |
| `POST /attendance/adhoc` | **Diubah.** Payload & logic sesuai 3.2. Endpoint lama menerima `subjectId, startTime, durationMinutes` di top level — field-field ini dihapus dari kontrak, diganti derivasi otomatis. |
| `POST /attendance/adhoc/approve-batch` | **Baru.** `{ sessionLogIds: string[] }`. Approve banyak `SessionLog` sekaligus dalam satu transaction; tiap item melalui logic yang sama seperti `approveAdHoc()` existing (termasuk opsi generate jadwal per-item jika diminta). Return ringkasan sukses/gagal per id. |
| `POST /attendance/adhoc/reject-batch` | **Baru.** Sama pola dengan approve-batch, untuk reject massal (dengan alasan yang sama untuk semua item yang dipilih, atau alasan generik "ditolak batch"). |
| `GET /attendance/adhoc/pending` | **Disesuaikan.** Tambah filter `branchId`, `teacherId`, `dateFrom/dateTo` agar bisa dipakai layar approval batch admin (lihat 4.2). |

### 3.4 Dampak ke Progress & Komisi

Tidak ada perubahan logic — karena tiap grup mapel tetap menghasilkan satu `SessionLog` dengan satu `adHocSubjectId`, `submitProgress()` dan perhitungan komisi (yang pivot di `SessionLog`/`Attendance`, bukan `Session`) berjalan tanpa modifikasi.

## 4. Desain Frontend

### 4.1 Guru — Presensi Darurat (`presensi/darurat/page.tsx`, rombak total)

Field yang **dihapus dari layar guru**: tanggal, jam mulai, durasi (semua otomatis di backend).

Layout:

1. **Cabang** — dropdown, perilaku tidak berubah (auto-select kalau guru hanya 1 cabang; dropdown aktif kalau >1).
2. **Cari & tambah siswa** — search bar by nama/panggilan, hasil dari `GET /students/active-by-branch`. Tap hasil pencarian untuk menambah ke daftar sesi.
3. **Daftar siswa yang ditambahkan** — tiap siswa jadi 1 card:
   - Nama siswa.
   - **Chip mapel** — render HANYA jika siswa punya >1 mapel aktif (ambil dari `activeSubjects`). Chip per mapel, tap untuk pilih (selected = filled, lainnya outline). Kalau siswa hanya 1 mapel aktif, baris ini tidak muncul sama sekali (mapel otomatis).
   - Kalau siswa walk-in (tidak ada `activeSubjects`) — chip mapel WAJIB muncul, isinya semua mapel aktif di cabang tsb, guru harus pilih salah satu sebelum bisa submit.
   - **Chip kehadiran** — 4 chip (`HADIR`, `ABSEN`, `IZIN`, `SAKIT`), default `HADIR` ter-highlight saat siswa ditambahkan ke daftar, tap chip lain untuk ubah.
4. **Submit** — satu tombol untuk seluruh daftar (`Submit Presensi (N)`). Disabled kalau ada siswa walk-in yang belum pilih mapel.

Setelah submit sukses → backend mengembalikan array `SessionLog` (satu per grup mapel) → guru diarahkan berurutan ke layar progress per grup (4.3), lalu ke halaman "Selesai" (tidak berubah dari sekarang).

### 4.2 Admin — Approval Batch (halaman baru, atau rombak halaman pending existing)

- Filter di atas: Cabang (`Semua Cabang` default utk OWNER/ADMIN_GLOBAL, terkunci ke cabang sendiri utk ADMIN_CABANG), Tanggal (default hari ini), Guru (`Semua` default).
- Daftar baris pending, satu baris = satu `SessionLog` (= satu grup mapel), dengan checkbox. Tampilkan: nama siswa-siswa dalam grup, mapel, guru, jam submit.
- "Pilih semua" di atas daftar (mengikuti filter aktif).
- Tombol `Setujui yang Dipilih (N)` → panggil `approve-batch`.
- Tombol `Tolak yang Dipilih` → modal minta alasan (opsional, generic default) → panggil `reject-batch`.
- Baris individual tetap bisa diklik untuk approve/reject satuan (termasuk opsi "generate jadwal") — batch adalah tambahan jalur cepat, bukan pengganti approval satuan untuk kasus yang perlu ditinjau (misal ada siswa walk-in atau catatan).

### 4.3 Progress Input (perubahan minimal)

Struktur form progress (module-based / free-material) **tidak berubah**. Yang berubah: kalau satu submit presensi menghasilkan beberapa `SessionLog` (beberapa mapel), guru diarahkan **berurutan** — satu layar progress ringkas per `SessionLog`/grup-mapel, bukan satu layar campur semua mapel. Setelah grup terakhir selesai, baru ke halaman "Selesai".

### 4.4 Laporan Orang Tua — Ringkasan Visual (`laporan/[token]/page.tsx`)

Tambah section ringkasan di **atas** detail per-sesi yang sudah ada:

- **Kehadiran bulan ini:** `hadir/total sesi (persentase)` — dihitung dari `Attendance` bulan berjalan untuk siswa tsb, lintas semua mapel yang dilaporkan.
- **Per mapel** (untuk tiap `subjectId` dalam `subjectIds` link):
  - `MODULE_BASED`: progress bar/persentase dari `StudentModuleProgress` terkini (modul selesai / total modul kurikulum).
  - `FREE_MATERIAL`: tampilkan topik & jumlah sesi tercatat bulan ini (tidak ada bar modul karena tidak ada urutan modul).
  - Predikat terakhir dari `ProgressLog` terbaru mapel tsb.

Backend `progress-reports.service.ts` (`buildSubjectReports`) perlu tambahan agregasi untuk hitung angka-angka ini; tidak perlu tabel baru, hanya query tambahan di atas data yang sudah ada.

## 5. Edge Cases

| Kasus | Perlakuan |
|---|---|
| Siswa dipilih guru tapi ternyata tidak enroll mapel apapun (walk-in) | Chip mapel wajib diisi manual dari semua mapel aktif cabang; ditandai non-enrolled di `Attendance` (perilaku sama seperti sekarang). |
| Siswa dengan >1 mapel aktif tapi guru lupa pilih chip mapel | Tombol submit disabled untuk baris tsb sampai dipilih (validasi FE), backend tetap validasi ulang (`subjectId wajib` kalau siswa >1 mapel aktif). |
| Guru submit 5 siswa, 3 mapel berbeda | Backend membuat 3 `SessionLog` (bukan 1) dalam satu transaction; kalau salah satu gagal (mis. constraint), seluruh transaction rollback — guru diminta submit ulang, tidak ada partial state. |
| Admin approve-batch, salah satu item ternyata sudah di-reject/approve manual oleh admin lain sebelumnya | Skip item tsb, laporkan di response summary (`skipped: [...]`), sisanya tetap diproses. |
| Guru submit presensi lalu app crash sebelum sampai ke layar progress | Guru bisa akses ulang lewat riwayat sesi darurat, lanjutkan input progress dari `SessionLog` yang sudah ada berstatus `PENDING_APPROVAL` (pola sudah ada di `riwayat` sekarang). |

## 6. Rollout & Kompatibilitas

- Karena tidak ada perubahan skema, deploy backend & frontend bisa berurutan tanpa migrasi data.
- `presensi/darurat` versi lama diganti (bukan ditambah sebagai varian baru) — tidak ada kebutuhan feature flag karena ini sudah jadi satu-satunya jalur operasional yang dipakai bisnis.
- Endpoint lama (`getEligibleStudents`, `approveAdHoc` satuan) tetap dipertahankan (dipakai fitur "Gantikan Sesi Guru Lain" dan approval satuan di 4.2) — tidak ada breaking removal.

## 7. Testing

- Unit test backend: resolusi mapel (1 mapel/​>1 mapel/​walk-in), split-per-mapel jadi multiple `SessionLog`, rollback transaction saat salah satu grup gagal, `approve-batch`/`reject-batch` dengan campuran item valid & sudah-diproses.
- Manual test frontend: alur guru tap-tap end-to-end (cabang → cari siswa → chip mapel muncul/tidak sesuai jumlah mapel aktif → chip kehadiran → submit → progress berurutan per mapel → selesai); alur admin batch approval dengan filter & pilih sebagian.
- Verifikasi komisi tidak berubah untuk siswa yang sebelumnya lewat sesi darurat single-mapel (regression check terhadap formula existing).
