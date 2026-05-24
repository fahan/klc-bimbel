# ERD — Sistem Manajemen Bimbel Multi-Cabang

## Stack
- **Database**: PostgreSQL (Supabase)
- **ORM**: Prisma
- **Total tabel**: 24

---

## Daftar Tabel per Kelompok

| Kelompok | Tabel |
|---|---|
| 1. Organisasi | `branches`, `users`, `user_branches` |
| 2. Master Data | `subjects`, `spp_rates`, `curriculum_modules` |
| 3. Siswa | `students`, `student_subjects` |
| 4. Jadwal & Sesi | `sessions`, `session_students`, `session_logs` |
| 5. Presensi & Progress | `attendances`, `progress_logs`, `student_module_progress`, `progress_report_links` |
| 6. Keuangan | `commissions`, `commission_details`, `invoices`, `invoice_items`, `payments` |
| 7. Toko | `products`, `stock_mutations`, `sales`, `sale_items` |

---

## Kelompok 1 — Organisasi

### `branches`
| Field | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | Primary key |
| name | String | Nama cabang |
| code | String UNIQUE | Kode unik cabang (PWK, BWS, dll) |
| address | String? | Alamat cabang |
| phone | String? | Nomor telepon |
| is_active | Boolean | Status aktif |
| created_at | Timestamp | Waktu dibuat |
| updated_at | Timestamp | Waktu diupdate |

### `users`
| Field | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | Primary key |
| name | String | Nama lengkap |
| email | String UNIQUE | Email (untuk login) |
| phone | String? | Nomor HP |
| role | Enum | OWNER / ADMIN_GLOBAL / ADMIN_CABANG / GURU |
| is_active | Boolean | Status aktif |
| created_at | Timestamp | Waktu dibuat |
| updated_at | Timestamp | Waktu diupdate |

### `user_branches`
Pivot tabel — satu user bisa terdaftar di banyak cabang (guru lintas cabang).

| Field | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | Primary key |
| user_id | UUID FK | → users.id |
| branch_id | UUID FK | → branches.id |
| is_primary | Boolean | Cabang utama user |

**Unique constraint**: `[user_id, branch_id]`

---

## Kelompok 2 — Master Data

### `subjects`
| Field | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | Primary key |
| name | String | Nama mata pelajaran |
| code | String UNIQUE | Kode mapel |
| tracking_type | Enum | MODULE_BASED / FREE_MATERIAL |
| max_capacity_regular | Int | Kapasitas maks siswa reguler per sesi |
| max_capacity_private | Int | Kapasitas maks siswa private (default: 1) |
| is_active | Boolean | Status aktif |
| created_at | Timestamp | Waktu dibuat |
| updated_at | Timestamp | Waktu diupdate |

### `spp_rates`
| Field | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | Primary key |
| subject_id | UUID FK | → subjects.id |
| type | Enum | REGULAR / PRIVATE |
| amount | Decimal(12,2) | Nominal tarif SPP |
| effective_from | DateTime | Tanggal mulai berlaku |
| effective_until | DateTime? | Tanggal berakhir (null = masih berlaku) |
| created_at | Timestamp | Waktu dibuat |

**Catatan**: Tarif lama tidak dihapus saat ada tarif baru — histori tersimpan penuh.

### `curriculum_modules`
| Field | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | Primary key |
| subject_id | UUID FK | → subjects.id |
| order_number | Int | Urutan modul (1, 2, 3, ...) |
| name | String | Nama modul |
| total_chapters | Int | Total bab dalam modul |

**Unique constraint**: `[subject_id, order_number]`

---

## Kelompok 3 — Siswa

### `students`
| Field | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | Primary key |
| branch_id | UUID FK | → branches.id (cabang utama) |
| name | String | Nama siswa |
| class_level | String? | Kelas (7 SMP, 10 SMA, dll) |
| parent_name | String? | Nama orang tua |
| parent_phone | String? | HP orang tua |
| registered_at | DateTime | Tanggal daftar |
| is_active | Boolean | Status aktif |
| created_at | Timestamp | Waktu dibuat |
| updated_at | Timestamp | Waktu diupdate |

### `student_subjects`
Pivot tabel — satu siswa bisa mengambil banyak mata pelajaran. SPP di-lock saat daftar.

| Field | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | Primary key |
| student_id | UUID FK | → students.id |
| subject_id | UUID FK | → subjects.id |
| spp_rate_id | UUID FK | → spp_rates.id (**SPP di-lock saat daftar**) |
| type | Enum | REGULAR / PRIVATE |
| enrolled_at | DateTime | Tanggal mulai ikut mapel |
| is_active | Boolean | Status aktif |

**Unique constraint**: `[student_id, subject_id]`

---

## Kelompok 4 — Jadwal & Sesi

### `sessions`
Jadwal tetap mingguan (template).

| Field | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | Primary key |
| branch_id | UUID FK | → branches.id |
| subject_id | UUID FK | → subjects.id |
| teacher_id | UUID FK | → users.id (guru tetap) |
| type | Enum | REGULAR / PRIVATE |
| day_of_week | Enum | SENIN–MINGGU |
| start_time | Time | Jam mulai |
| duration_minutes | Int | Durasi (default: 60 menit) |
| is_active | Boolean | Status aktif |
| created_at | Timestamp | Waktu dibuat |
| updated_at | Timestamp | Waktu diupdate |

### `session_students`
Pivot tabel — siswa yang terdaftar di sesi tertentu.

| Field | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | Primary key |
| session_id | UUID FK | → sessions.id |
| student_id | UUID FK | → students.id |
| joined_at | DateTime | Tanggal siswa masuk sesi |
| is_active | Boolean | Status aktif |

**Unique constraint**: `[session_id, student_id]`

### `session_logs`
**Tabel kunci** — setiap sesi yang benar-benar terjadi di tanggal tertentu.

| Field | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | Primary key |
| session_id | UUID FK | → sessions.id |
| session_date | Date | Tanggal sesi berlangsung |
| actual_teacher_id | UUID FK | → users.id (siapa yang benar-benar mengajar) |
| is_replacement | Boolean | True jika guru pengganti |
| status | Enum | SCHEDULED / COMPLETED / CANCELLED |
| created_at | Timestamp | Waktu dibuat |
| updated_at | Timestamp | Waktu diupdate |

**Unique constraint**: `[session_id, session_date]`

**Catatan penting**: `actual_teacher_id` bisa berbeda dari `sessions.teacher_id` jika ada penggantian guru. Komisi dihitung dari tabel ini.

---

## Kelompok 5 — Presensi & Progress

### `attendances`
| Field | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | Primary key |
| session_log_id | UUID FK | → session_logs.id |
| student_id | UUID FK | → students.id |
| status | Enum | HADIR / ABSEN / IZIN / SAKIT |
| recorded_by | UUID FK? | → users.id (siapa yang input) |
| recorded_at | DateTime | Waktu diinput |

**Unique constraint**: `[session_log_id, student_id]`

### `progress_logs`
Satu baris per siswa per sesi. Field berbeda tergantung `tracking_type`.

| Field | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | Primary key |
| session_log_id | UUID FK | → session_logs.id |
| student_id | UUID FK | → students.id |
| subject_id | UUID FK | → subjects.id |
| tracking_type | Enum | MODULE_BASED / FREE_MATERIAL |
| topic | String? | **Untuk FREE_MATERIAL**: topik diajarkan |
| module_id | UUID FK? | **Untuk MODULE_BASED**: → curriculum_modules.id |
| chapter_from | Int? | **Untuk MODULE_BASED**: bab mulai |
| chapter_to | Int? | **Untuk MODULE_BASED**: bab selesai |
| module_completed | Boolean | True jika modul selesai di sesi ini |
| predicate | Enum? | Diisi jika `module_completed = true` |
| notes | String? | Catatan guru untuk siswa ini |
| recorded_by | UUID FK? | → users.id |
| recorded_at | DateTime | Waktu diinput |

**Enum Predicate**: PERLU_BIMBINGAN / CUKUP / BAIK / BAIK_SEKALI / MEMUASKAN

### `student_module_progress`
State terkini posisi siswa per modul — di-update setiap kali ada `progress_logs` baru.

| Field | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | Primary key |
| student_id | UUID FK | → students.id |
| module_id | UUID FK | → curriculum_modules.id |
| current_chapter | Int | Bab terakhir yang diselesaikan |
| status | Enum | NOT_STARTED / IN_PROGRESS / COMPLETED |
| predicate | Enum? | Predikat saat modul selesai |
| completed_at | DateTime? | Tanggal modul selesai |
| updated_at | Timestamp | Waktu terakhir diupdate |

**Unique constraint**: `[student_id, module_id]`

### `progress_report_links`
Link publik laporan progress untuk orang tua.

| Field | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | Primary key |
| student_id | UUID FK | → students.id |
| branch_id | UUID FK | → branches.id |
| generated_by | UUID FK | → users.id |
| token | String UNIQUE | Token unik untuk URL publik |
| subject_ids | JSON | Array UUID mapel yang ditampilkan |
| expires_at | DateTime? | Waktu kedaluwarsa (null = permanen) |
| view_count | Int | Jumlah kali dibuka |
| created_at | Timestamp | Waktu dibuat |

---

## Kelompok 6 — Keuangan

### `commissions`
Komisi per guru per bulan per cabang.

| Field | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | Primary key |
| branch_id | UUID FK | → branches.id |
| teacher_id | UUID FK | → users.id |
| month | Int | Bulan (1–12) |
| year | Int | Tahun |
| total_amount | Decimal(12,2) | Total komisi |
| status | Enum | DRAFT / CALCULATED / APPROVED |
| approved_by | UUID FK? | → users.id |
| approved_at | DateTime? | Waktu disetujui |
| calculated_at | DateTime? | Waktu dikalkulasi |
| created_at | Timestamp | Waktu dibuat |
| updated_at | Timestamp | Waktu diupdate |

**Unique constraint**: `[branch_id, teacher_id, month, year]`

### `commission_details`
Breakdown komisi per sesi per siswa — audit trail lengkap.

| Field | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | Primary key |
| commission_id | UUID FK | → commissions.id |
| session_log_id | UUID FK | → session_logs.id |
| student_id | UUID FK | → students.id |
| subject_id | UUID FK | → subjects.id |
| spp_amount | Decimal(12,2) | SPP siswa (snapshot) |
| total_sessions_in_month | Int | Total sesi terjadwal bulan itu |
| sessions_attended | Int | Jumlah sesi siswa hadir |
| commission_amount | Decimal(12,2) | Hasil kalkulasi komisi |
| is_replacement | Boolean | True jika dari menggantikan guru lain |

**Formula**: `commission_amount = (spp_amount ÷ total_sessions_in_month) × 40% × sessions_attended`

### `invoices`
| Field | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | Primary key |
| branch_id | UUID FK | → branches.id |
| student_id | UUID FK | → students.id |
| invoice_number | String UNIQUE | Format: INV-SPP-PWK-202605-001 |
| type | Enum | SPP / REGISTRATION |
| month | Int? | Bulan tagihan (null untuk registrasi) |
| year | Int? | Tahun tagihan |
| total_amount | Decimal(12,2) | Total tagihan |
| paid_amount | Decimal(12,2) | Jumlah sudah dibayar |
| status | Enum | UNPAID / PARTIAL / PAID |
| generated_by | UUID FK | → users.id |
| public_token | String UNIQUE | Token untuk URL publik |
| paid_at | DateTime? | Waktu pelunasan |
| created_at | Timestamp | Waktu dibuat |
| updated_at | Timestamp | Waktu diupdate |

### `invoice_items`
Rincian per mapel dalam satu invoice.

| Field | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | Primary key |
| invoice_id | UUID FK | → invoices.id |
| subject_id | UUID FK? | → subjects.id (null untuk registrasi) |
| type | Enum | SPP / REGISTRATION |
| spp_amount | Decimal(12,2) | Snapshot harga SPP saat invoice dibuat |
| session_count | Int | Jumlah sesi bulan tersebut |
| amount | Decimal(12,2) | Nominal item ini |

### `payments`
Setiap kali ada pembayaran masuk (bisa bertahap).

| Field | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | Primary key |
| invoice_id | UUID FK | → invoices.id |
| branch_id | UUID FK | → branches.id |
| amount | Decimal(12,2) | Jumlah pembayaran |
| method | Enum | CASH / TRANSFER / OTHER |
| recorded_by | UUID FK | → users.id |
| paid_at | DateTime | Waktu pembayaran |

---

## Kelompok 7 — Toko

### `products`
| Field | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | Primary key |
| branch_id | UUID FK | → branches.id (stok independen per cabang) |
| name | String | Nama produk |
| category | Enum | STATIONARY / MODULE / UNIFORM / STATIONERY |
| price | Decimal(12,2) | Harga jual |
| stock | Int | Stok saat ini |
| min_stock | Int | Stok minimum (trigger notifikasi) |
| is_active | Boolean | Status aktif |
| created_at | Timestamp | Waktu dibuat |
| updated_at | Timestamp | Waktu diupdate |

### `stock_mutations`
Setiap perubahan stok dicatat — audit trail penuh.

| Field | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | Primary key |
| product_id | UUID FK | → products.id |
| branch_id | UUID FK | → branches.id |
| type | Enum | IN / OUT / TRANSFER_IN / TRANSFER_OUT / ADJUSTMENT |
| quantity | Int | Jumlah (positif = masuk, negatif = keluar) |
| notes | String? | Keterangan mutasi |
| created_by | UUID FK | → users.id |
| created_at | Timestamp | Waktu dibuat |

### `sales`
| Field | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | Primary key |
| branch_id | UUID FK | → branches.id |
| student_id | UUID FK? | → students.id (nullable, bisa bukan siswa) |
| total_amount | Decimal(12,2) | Total transaksi |
| payment_method | Enum | CASH / TRANSFER / OTHER |
| created_by | UUID FK | → users.id |
| created_at | Timestamp | Waktu transaksi |

### `sale_items`
| Field | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | Primary key |
| sale_id | UUID FK | → sales.id |
| product_id | UUID FK | → products.id |
| quantity | Int | Jumlah item |
| unit_price | Decimal(12,2) | Snapshot harga saat transaksi |
| subtotal | Decimal(12,2) | `quantity × unit_price` |

---

## Relasi Antar Tabel

```
branches ──< user_branches >── users
branches ──< students
branches ──< sessions
branches ──< commissions
branches ──< invoices
branches ──< payments
branches ──< products
branches ──< stock_mutations
branches ──< sales
branches ──< progress_report_links

users ──< sessions (as teacher)
users ──< session_logs (as actual_teacher)

subjects ──< spp_rates
subjects ──< curriculum_modules
subjects ──< sessions
subjects ──< student_subjects

spp_rates ──< student_subjects (lock SPP)

students ──< student_subjects
students ──< session_students
students ──< attendances
students ──< progress_logs
students ──< student_module_progress
students ──< invoices
students ──< sales

sessions ──< session_students
sessions ──< session_logs

session_logs ──< attendances
session_logs ──< progress_logs
session_logs ──< commission_details

curriculum_modules ──< student_module_progress
curriculum_modules ──< progress_logs

commissions ──< commission_details

invoices ──< invoice_items
invoices ──< payments

products ──< stock_mutations
products ──< sale_items

sales ──< sale_items
```

---

## Enum Lengkap

```prisma
enum Role                { OWNER, ADMIN_GLOBAL, ADMIN_CABANG, GURU }
enum SubjectTrackingType { MODULE_BASED, FREE_MATERIAL }
enum SessionType         { REGULAR, PRIVATE }
enum DayOfWeek           { SENIN, SELASA, RABU, KAMIS, JUMAT, SABTU, MINGGU }
enum SessionLogStatus    { SCHEDULED, COMPLETED, CANCELLED }
enum AttendanceStatus    { HADIR, ABSEN, IZIN, SAKIT }
enum Predicate           { PERLU_BIMBINGAN, CUKUP, BAIK, BAIK_SEKALI, MEMUASKAN }
enum ModuleStatus        { NOT_STARTED, IN_PROGRESS, COMPLETED }
enum CommissionStatus    { DRAFT, CALCULATED, APPROVED }
enum InvoiceType         { SPP, REGISTRATION }
enum InvoiceStatus       { UNPAID, PARTIAL, PAID }
enum PaymentMethod       { CASH, TRANSFER, OTHER }
enum ProductCategory     { STATIONARY, MODULE, UNIFORM, STATIONERY }
enum StockMutationType   { IN, OUT, TRANSFER_IN, TRANSFER_OUT, ADJUSTMENT }
enum SppRateType         { REGULAR, PRIVATE }
```
