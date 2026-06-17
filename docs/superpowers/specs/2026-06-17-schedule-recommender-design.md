# Schedule Recommendation Engine — Design

**Date:** 2026-06-17
**Status:** Approved (brainstorming) — ready for implementation plan
**Module:** `apps/backend/src/modules/sessions` (sub-feature), `apps/frontend/.../jadwal-sesi/rekomendasi`

---

## 1. Problem & Goal

Admin saat ini menyusun jadwal sesi mingguan secara manual. Fitur ini menambahkan **engine rekomendasi jadwal** yang otomatis memetakan siswa ↔ guru berdasarkan mata pelajaran yang dienroll siswa, menghormati batas jam aktif & hari libur, dan menyajikan usulan jadwal yang bisa **dipreview lalu diterapkan** — tanpa mengubah jadwal yang sedang berjalan sampai admin menekan "Terapkan".

### Keputusan kunci (hasil brainstorming)

| Aspek | Keputusan |
|---|---|
| Pool guru | Semua `User role=GURU` di cabang; objektif **distribusi sesi merata** antar guru |
| Mode | (a) `FULL_REGENERATE` — susun ulang penuh; (b) `FILL_UNSCHEDULED` — isi enrollment belum terjadwal |
| Jam aktif & hari libur | **Input saat generate** (tidak disimpan ke DB) |
| Durasi & slot | Durasi seragam per-run; grid kandidat tiap **30 menit** |
| Combined session | **Tidak** untuk v1 — single-subject saja |
| Arsitektur | **Stateless preview + commit** (Opsi A): `generate` nol tulisan, `apply` menulis transaksional |
| Apply parsial | Terapkan proposal yang valid, **lewati yang basi** & laporkan |

---

## 2. Architecture

Sub-fitur di dalam modul `sessions` agar reuse helper konflik/kapasitas yang sudah ada
(`timeToMinutes`, cek overlap, perhitungan `maxCapacity`).

Dua endpoint baru (`@Roles('OWNER','ADMIN_GLOBAL','ADMIN_CABANG')`):

- `POST /sessions/recommendations/generate` — **read-only**, kembalikan proposal JSON. Nol tulisan ke DB.
- `POST /sessions/recommendations/apply` — terima proposal terpilih, tulis dalam satu `$transaction`.

Logika inti diisolasi sebagai **fungsi murni** `buildRecommendation(input): Recommendation`
(tanpa Prisma) sehingga dapat diunit-test penuh. Service hanya bertugas mengambil data,
memanggil fungsi murni, dan (untuk apply) menulis hasil.

---

## 3. Generate — Input

```jsonc
{
  "branchId": "...",
  "mode": "FILL_UNSCHEDULED" | "FULL_REGENERATE",
  "durationMinutes": 60,                                  // 30–240
  "activeDays": ["SENIN","SELASA","RABU","KAMIS","JUMAT"],// hari libur = tidak dicentang
  "timeWindow": { "start": "14:00", "end": "20:00" },     // dibagi grid per 30 menit
  "breakWindow": { "start": "17:30", "end": "18:30" }     // opsional; null = tanpa istirahat
}
```

Validasi DTO (`class-validator`): `start`/`end` format `HH:mm`, `end > start`,
`activeDays` non-kosong & enum `DayOfWeek` valid, `durationMinutes` 30–240,
`mode` enum valid, `branchId` ada. `breakWindow` opsional; jika ada, format `HH:mm`,
`end > start`, dan berada di dalam `timeWindow`.

---

## 4. Algoritma (fungsi murni `buildRecommendation`)

1. **Hitung demand** dari `StudentSubject` status `ACTIVE` pada cabang:
   - `FILL_UNSCHEDULED`: hanya enrollment yang siswanya **belum** punya `SessionStudent`
     aktif untuk subject tersebut.
   - `FULL_REGENERATE`: semua enrollment aktif (jadwal lama diabaikan saat hitung,
     diganti saat apply).
2. **Kelompokkan** demand per `(subjectId, type)`:
   - `REGULER`: batch greedy hingga `subject.maxCapacityRegular`.
   - `PRIVATE`: 1 siswa per sesi.
   - *Preferensi lunak:* siswa dengan `classLevel` sama dikelompokkan lebih dulu.
3. **Bangun slot kandidat** = `activeDays` × grid 30-menit dalam `timeWindow`
   yang masih muat `durationMinutes` sebelum `end`. Jika `breakWindow` diberikan,
   buang slot yang `[startTime, startTime+durationMinutes)`-nya tumpang-tindih dengan
   rentang istirahat (sesi tidak boleh menabrak jam istirahat).
4. **Tugaskan** tiap grup ke pasangan `(slot, guru)`:
   - **Constraint keras:** guru tidak boleh overlap — aturan existing
     (guru sama + hari sama + jam tumpang-tindih). Pada mode `FILL_UNSCHEDULED`,
     sesi existing aktif ikut dihitung sebagai slot terpakai.
   - **Objektif:** pilih guru dengan **beban sesi paling sedikit** (counter beban naik
     tiap penugasan) → distribusi merata. Tie-break: slot paling pagi.
5. Grup yang tak mendapat `(slot, guru)` → masuk daftar **`unassigned`** beserta alasan
   (mis. "Semua guru penuh di jam aktif").

---

## 5. Generate — Output

```jsonc
{
  "success": true,
  "data": {
    "mode": "FULL_REGENERATE",
    "generatedAt": "2026-06-17T...",
    "summary": { "proposedSessions": 12, "studentsPlaced": 28, "teachersUsed": 5, "unassigned": 2 },
    "teacherLoad": [ { "teacherId": "...", "name": "Budi", "sessionCount": 3 } ],
    "proposals": [
      {
        "tempId": "p1",
        "subjectId": "...", "subjectName": "AHE",
        "type": "REGULER",
        "teacherId": "...", "teacherName": "Budi",
        "dayOfWeek": "SENIN", "startTime": "14:00", "durationMinutes": 60,
        "studentIds": ["...","..."], "studentNames": ["Andi","Sari"]
      }
    ],
    "unassigned": [
      { "subjectName": "Matematika", "studentNames": ["Doni"], "reason": "Semua guru penuh di jam aktif" }
    ]
  }
}
```

`teacherLoad` ditampilkan agar admin dapat menilai kemerataan sebelum apply.
Engine tidak menghasilkan combined session.

---

## 6. Apply — Behavior

Request mengirim balik `mode` + array `proposals` yang **dicentang admin** (boleh subset).
Seluruh proses dalam satu `$transaction`:

1. **Re-validasi** tiap proposal terhadap kondisi DB terkini:
   guru masih ada & aktif, siswa masih `ACTIVE` di cabang, tidak ada konflik baru
   (overlap guru/duplikat). Proposal basi **dilewati** dan dilaporkan; proposal valid
   tetap diterapkan (*apply parsial*).
2. **`FILL_UNSCHEDULED`:** untuk tiap proposal valid → `create` `Session` +
   `SessionStudent`. `StudentSubject` sudah ada (kita menjadwalkan enrollment yang ada),
   jadi tidak membuat enrollment baru. Update `currentEnrolled`.
3. **`FULL_REGENERATE`:** sebelum membuat sesi baru, **arsipkan** sesi aktif cabang
   (`isActive=false`, `status=ARCHIVED`) — **hanya** sesi yang **tidak punya** `SessionLog`
   (tanpa riwayat presensi). Sesi yang sudah punya `SessionLog` **dipertahankan** dan
   dilaporkan sebagai "dilewati (punya riwayat)". Lalu buat sesi baru dari proposal valid.

Reuse pola transaksi `create` existing (Session → SessionStudent → update `currentEnrolled`).

### Apply — Output
```jsonc
{
  "success": true,
  "data": {
    "applied": 10,
    "skipped": [
      { "tempId": "p3", "reason": "Guru kini bentrok dengan sesi lain" },
      { "tempId": "p7", "reason": "Siswa sudah tidak aktif" }
    ],
    "archivedSessions": 8,
    "preservedSessions": [ { "id": "...", "reason": "Punya riwayat presensi" } ]
  }
}
```

---

## 7. Error Handling

- Input invalid → 400 via DTO validation.
- Tidak ada guru di cabang / tidak ada demand → balikan proposal kosong + pesan informatif
  (bukan error).
- Apply gagal di tengah → seluruh `$transaction` rollback (kecuali skip basi yang memang
  by-design dilewati, bukan error).
- Mismatch antara `generate` dan kondisi DB ditangani oleh re-validasi di apply.

---

## 8. Testing

**Unit test fungsi murni `buildRecommendation` (TDD):**
- Distribusi beban merata antar guru.
- Hormati `activeDays` (tidak menjadwal di hari libur) & `timeWindow`.
- Hormati kapasitas (`maxCapacityRegular` / PRIVATE = 1).
- Hindari overlap guru (termasuk sesi existing pada mode FILL).
- Isi `unassigned` dengan alasan saat slot/guru habis.
- Grid 30-menit & durasi muat sebelum `end`.
- Hormati `breakWindow`: tidak ada slot yang menabrak jam istirahat; tanpa `breakWindow` slot beruntun penuh.

**Integration test `apply`:**
- `FILL_UNSCHEDULED`: bikin sesi baru tanpa menyentuh sesi lama.
- `FULL_REGENERATE`: arsipkan sesi tanpa riwayat; pertahankan sesi ber-`SessionLog`.
- Apply parsial: proposal basi dilewati, valid tetap dibuat.

---

## 9. Frontend

- Halaman baru: `app/(dashboard)/jadwal-sesi/rekomendasi/page.tsx` (`'use client'`).
  - Form input: mode, `timeWindow` (start/end), `breakWindow` (start/end, opsional, bisa dikosongkan), `activeDays` (checkbox hari), `durationMinutes`.
  - Hasil: grid mingguan proposal + panel **beban guru** + daftar **unassigned**.
  - Checkbox per proposal → tombol **"Terapkan Terpilih"**.
  - Branch dari `useApiBranchId()`; jika "Semua Cabang" → minta pilih cabang spesifik dulu
    (pola "pilih cabang dulu" yang sudah ada).
- `lib/api/endpoints.ts`: tambah `scheduleRecommendationApi.generate(payload)` & `.apply(payload)`.
- `components/layout/Sidebar.tsx`: tambah link sub-menu di area Jadwal & Sesi.
- `components/layout/Topbar.tsx`: tambah judul halaman di `getPageTitle()`.

---

## 10. Out of Scope (v1 / YAGNI)

- Combined session otomatis (tetap manual).
- Penyimpanan draft proposal (stateless by design).
- Penyimpanan jam operasional cabang ke schema (input per-run).
- Durasi per mata pelajaran (durasi seragam per-run).
- Ketersediaan/preferensi waktu per siswa (diasumsikan tersedia di semua jam aktif).
- Penegakan isolasi cabang sisi server (mengikuti pola existing; di luar lingkup fitur ini).
