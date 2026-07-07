# Desain: "Presensi Cepat" — Alur Tap-Tap Berdampingan dengan Sesi Darurat

**Tanggal:** 2026-07-02 (revisi 2026-07-08)
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

## 2. Keputusan Arsitektur Utama: Fitur Terpisah, Bukan Perombakan

Alur tap-tap dibangun sebagai **fitur baru bernama "Presensi Cepat"**, berdampingan dengan sesi darurat existing — **bukan menggantikannya**. Alasan:

- Risiko regresi nol: form darurat lama, endpoint `POST /attendance/adhoc` lama, dan `getEligibleStudents` tidak disentuh sama sekali.
- Perbandingan fitur nyata: guru bisa memakai keduanya, bisnis membandingkan mana yang lebih efektif.
- Output keduanya adalah struktur `SessionLog` yang identik (`isAdHoc: true`, `PENDING_APPROVAL`), sehingga seluruh hilir (approval, riwayat, progress, komisi, laporan ortu) tetap SATU jalur — tidak ada duplikasi logic hilir.

**Masa uji coba:** kedua alur dipelihara berdampingan hanya selama periode perbandingan. Jika satu alur terbukti menang, alur yang kalah dipensiunkan — bukan dipelihara dua-duanya permanen.

Penamaan & penempatan di app guru: menu baru **"Presensi Cepat"**; "Sesi Darurat" tetap dengan nama dan posisi sekarang.

## 3. Tujuan & Batasan Scope

**Tujuan:**
- Fitur baru Presensi Cepat: guru cukup pilih siswa + tap kehadiran; mapel, tanggal, jam, durasi ditentukan otomatis.
- Approval admin disederhanakan jadi batch (berlaku untuk pending dari KEDUA alur, karena strukturnya sama).
- Tambah ringkasan visual di laporan progress orang tua.

**Non-goals (secara eksplisit TIDAK diubah):**
- Model data `Session` (jadwal mingguan tetap) — tetap dipertahankan.
- Alur presensi berbasis `Session` (termasuk "Gantikan Sesi Guru Lain").
- Form sesi darurat existing beserta seluruh kontrak endpoint-nya.
- Tidak ada migrasi skema database — murni service layer + UI baru di atas struktur `SessionLog` yang sudah ada.
- Formula komisi (`SPP ÷ total sesi × 40% × hadir`) tidak berubah (lihat catatan 7.1).

## 4. Desain Backend

### 4.1 Prinsip

Guru hanya mengirim **daftar siswa + status kehadiran**. Backend yang menentukan mapel (dari enrollment siswa), waktu (dari waktu submit), dan durasi (default 30 menit). Kalau satu batch berisi siswa dari mapel berbeda, backend **otomatis memecah menjadi beberapa `SessionLog`** (satu per mapel) di dalam satu transaction — guru tidak perlu sadar proses ini terjadi.

### 4.2 Alur submit Presensi Cepat

Endpoint baru: `POST /attendance/quick`
Input: `{ branchId, students: [{ studentId, subjectId?, status }] }`

1. Untuk tiap `studentId`, resolve mapel:
   - Siswa punya tepat 1 `StudentSubject` aktif di cabang tsb → pakai itu, abaikan `subjectId` payload.
   - Siswa punya >1 `StudentSubject` aktif → `subjectId` **wajib** di payload (FE menampilkan chip pemilihan mapel, lihat 5.1). Validasi: harus salah satu dari mapel aktif siswa.
   - Siswa tanpa `StudentSubject` aktif (walk-in) → butuh `subjectId` eksplisit (FE minta pilih dari semua mapel cabang); attendance ditandai non-enrolled seperti perilaku darurat sekarang.
2. Kelompokkan siswa berdasarkan `subjectId` hasil resolve.
3. **Deteksi duplikat:** untuk tiap siswa, cek apakah sudah ada `Attendance` untuk (siswa, mapel, tanggal) yang sama hari ini (dari alur mana pun — cepat, darurat, atau sesi terjadwal). Duplikat TIDAK memblok submit, tapi ditandai di `SessionLog`/response dan di-highlight di daftar approval admin (badge "duplikat hari ini") agar admin yang memutuskan. Penanda memakai field notes/adHocNotes existing atau flag turunan saat query pending — tanpa kolom baru.
4. Dalam satu `$transaction`, untuk tiap grup buat:
   - `SessionLog`: `sessionId: null`, `isAdHoc: true`, `adHocBranchId: branchId`, `adHocSubjectId: <subjectId grup>`, `sessionDate: <hari ini>`, `adHocStartTime: <waktu submit HH:mm>`, `adHocDuration: 30`, `status: PENDING_APPROVAL`. Sumber input ditandai (mis. prefix konvensi di `adHocNotes` atau field pembeda lain yang tidak butuh migrasi) agar admin bisa membedakan "cepat" vs "darurat" untuk perbandingan fitur.
   - `Attendance` per siswa dalam grup.
5. Return: array `SessionLog` (satu per grup mapel) + info mapel & siswa — dipakai FE untuk layar progress berurutan.

Jika salah satu grup gagal, seluruh transaction rollback — tidak ada partial state.

### 4.3 Endpoint

| Endpoint | Status | Keterangan |
|---|---|---|
| `POST /attendance/quick` | **Baru** | Sesuai 4.2. Kontrak `POST /attendance/adhoc` lama TIDAK berubah. |
| `GET /students/active-by-branch?branchId=&q=` | **Baru** | Cari siswa aktif di cabang (nama/panggilan). Tiap hasil: `{ studentId, name, nickname, activeSubjects: [{subjectId, subjectName}] }`. `getEligibleStudents` lama tetap dipakai form darurat. |
| `POST /attendance/adhoc/approve-batch` | **Baru** | `{ sessionLogIds: string[], corrections?: [{sessionLogId, startTime?}] }`. Approve massal dalam satu transaction, tiap item lewat logic `approveAdHoc()` existing. Admin bisa koreksi jam per item saat approve (kasus guru input semua di akhir hari). Item yang sudah diproses admin lain di-skip dan dilaporkan di response (`skipped: [...]`). Berlaku untuk pending dari kedua alur. |
| `POST /attendance/adhoc/reject-batch` | **Baru** | Pola sama, alasan generik/seragam untuk item terpilih. |
| `GET /attendance/adhoc/pending` | **Disesuaikan** | Tambah filter `branchId`, `teacherId`, `dateFrom/dateTo`, dan penanda per item: sumber input (cepat/darurat), siswa walk-in, duplikat-hari-ini. |

### 4.4 Dampak ke Progress & Komisi

Tidak ada perubahan logic — tiap grup mapel menghasilkan satu `SessionLog` dengan satu `adHocSubjectId`, sehingga `submitProgress()` dan perhitungan komisi (pivot di `SessionLog`/`Attendance`) berjalan tanpa modifikasi.

## 5. Desain Frontend

### 5.1 Guru — Presensi Cepat (halaman baru, mis. `presensi/cepat/page.tsx`)

Menu baru di app guru; form darurat lama tidak disentuh. Field tanggal, jam mulai, durasi TIDAK ada di layar — otomatis di backend.

1. **Cabang** — dropdown, perilaku sama seperti darurat (auto-select kalau 1 cabang, dropdown aktif kalau >1).
2. **Cari & tambah siswa** — search bar (nama/panggilan) dari `GET /students/active-by-branch`, tap hasil untuk menambah ke daftar.
3. **Kartu per siswa:**
   - Nama siswa.
   - **Chip mapel** — render HANYA jika siswa punya >1 mapel aktif (selected = filled, lainnya outline). Siswa 1 mapel: baris tidak muncul. Siswa walk-in: chip berisi semua mapel aktif cabang, WAJIB dipilih sebelum submit.
   - **Chip kehadiran** — 4 chip (`HADIR`, `ABSEN`, `IZIN`, `SAKIT`), default `HADIR` saat ditambahkan, tap untuk ubah.
4. **Submit** — satu tombol (`Submit Presensi (N)`). Disabled kalau ada walk-in belum pilih mapel.

Setelah submit → guru diarahkan berurutan ke layar progress per grup mapel (5.3), lalu halaman "Selesai".

### 5.2 Admin — Approval Batch (rombak/lengkapi halaman pending)

- Filter: Cabang (default "Semua Cabang" utk OWNER/ADMIN_GLOBAL, terkunci utk ADMIN_CABANG), Tanggal (default hari ini), Guru (default semua).
- Satu baris = satu `SessionLog` (grup mapel), dengan checkbox. Tampilkan: siswa-siswa, mapel, guru, jam submit, badge sumber (cepat/darurat), badge "walk-in" dan "duplikat hari ini" bila relevan.
- "Pilih semua" mengikuti filter aktif.
- `Setujui yang Dipilih (N)` → `approve-batch`; `Tolak yang Dipilih` → modal alasan → `reject-batch`.
- Baris individual tetap bisa dibuka untuk approve/reject satuan (termasuk opsi "generate jadwal" dan koreksi jam) — batch adalah jalur cepat tambahan, bukan pengganti review satuan untuk baris ber-badge.

### 5.3 Progress Input (layar per grup mapel, konfigurasi per siswa)

Guru diarahkan **berurutan** satu layar per `SessionLog` (grup mapel) hasil submit, dengan stepper (mis. "1/2"), tombol terakhir "Selesai".

- **MODULE_BASED:** modul & rentang bab dipilih **per siswa di dalam kartu masing-masing** (BUKAN sekali untuk grup — siswa dalam mapel sama hampir pasti berada di modul/bab berbeda karena bertemu acak). Untuk tetap cepat: kartu **pre-fill otomatis dari `StudentModuleProgress` terkini** siswa (modul berjalan, bab mulai = bab terakhir + 1) — guru umumnya cukup konfirmasi. Checkbox "modul selesai" + chip predikat per siswa.
- **FREE_MATERIAL:** topik diisi sekali untuk grup, lalu chip predikat + catatan opsional per siswa.
- **Chip predikat harus 5 opsi lengkap:** Perlu bimbingan, Cukup, Baik, Baik sekali, Memuaskan.
- Struktur data & endpoint progress existing tidak berubah.

### 5.4 Laporan Orang Tua — Ringkasan Visual (`laporan/[token]/page.tsx`)

Section ringkasan di **atas** detail per-sesi existing:

- **Kehadiran bulan ini:** `hadir/total sesi (persentase)` dari `Attendance` bulan berjalan, lintas mapel yang dilaporkan.
- **Per mapel:**
  - `MODULE_BASED`: progress bar/persentase dari `StudentModuleProgress` (modul selesai / total modul kurikulum).
  - `FREE_MATERIAL`: topik & jumlah sesi tercatat bulan ini.
  - Predikat terakhir dari `ProgressLog` terbaru.

Backend `progress-reports.service.ts` (`buildSubjectReports`) mendapat agregasi tambahan — query baru di atas data existing, tanpa tabel baru.

## 6. Edge Cases

| Kasus | Perlakuan |
|---|---|
| Siswa walk-in (tanpa enrollment) | Chip mapel wajib dipilih dari semua mapel cabang; ditandai non-enrolled + badge di approval. |
| Siswa >1 mapel, guru belum pilih chip | Submit disabled (validasi FE); backend validasi ulang (`subjectId` wajib). |
| 5 siswa, 3 mapel berbeda dalam satu submit | 3 `SessionLog` dalam satu transaction; gagal satu = rollback semua. |
| Siswa sudah punya attendance mapel sama hari ini | Tidak diblok; ditandai "duplikat hari ini" di response & daftar approval — admin memutuskan. |
| Guru input semua sesi di akhir hari (jam submit ≠ jam sesi nyata) | Default tetap jam submit; admin bisa koreksi jam per item saat approve. Tidak ada field jam di layar guru. |
| Admin approve-batch, sebagian item sudah diproses admin lain | Skip + laporkan di `skipped: [...]`, sisanya diproses. |
| App crash setelah submit presensi, sebelum progress | Lanjutkan dari riwayat (pola existing: `SessionLog` `PENDING_APPROVAL` bisa diisi progress belakangan). |
| Guru pakai form darurat lama & Presensi Cepat di hari sama | Sah — keduanya menghasilkan `SessionLog` setara; deteksi duplikat (per siswa+mapel+tanggal) tetap menandai tumpang-tindih lintas alur. |

## 7. Catatan Bisnis

### 7.1 Perilaku formula komisi di dunia full ad-hoc

Formula: `SPP ÷ total sesi bulan ini × 40% × hadir`. Dengan jadwal tetap, penyebut stabil (mis. 8 sesi/bulan). Dengan full ad-hoc, penyebut = jumlah sesi yang *terjadi* — makin sering siswa datang, makin kecil nilai komisi per sesi, tetapi total agregat tetap ~40% SPP. **Ini bukan bug dan tidak diubah dalam desain ini** — dicatat agar tidak jadi kejutan di slip komisi guru.

## 8. Rollout & Kompatibilitas

- Tidak ada perubahan skema — deploy backend & frontend berurutan tanpa migrasi.
- Fitur baru bersifat aditif: menu, halaman, dan endpoint baru; tidak ada breaking change pada alur/endpoint existing mana pun.
- Approval batch memperkaya halaman pending admin existing, approval satuan tetap tersedia.

## 9. Testing

- Unit test backend: resolusi mapel (1 mapel / >1 mapel / walk-in), split-per-mapel jadi multiple `SessionLog`, rollback transaction, deteksi duplikat lintas alur, `approve-batch`/`reject-batch` (campuran valid & sudah-diproses, koreksi jam).
- Manual test FE: alur Presensi Cepat end-to-end (cabang → cari siswa → chip mapel muncul sesuai jumlah mapel aktif → chip kehadiran → submit → progress berurutan per mapel dengan pre-fill posisi terakhir → selesai); form darurat lama tetap berfungsi tanpa perubahan; approval batch dengan filter, badge, dan pilih sebagian.
- Regression check komisi: hasil perhitungan untuk sesi dari alur darurat lama tidak berubah.
