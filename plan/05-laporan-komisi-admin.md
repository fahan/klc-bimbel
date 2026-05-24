# Wireframe: Laporan Komisi Admin

## Informasi Umum
- **Role**: Admin Cabang, Admin Global, Owner
- **Platform**: Desktop
- **Akses**: Menu "Komisi guru" di sidebar → Laporan

---

## Layout

- **Topbar**: judul + navigasi bulan + tombol export & setujui semua
- **Banner status** bulan berjalan/final
- **4 Metric cards**
- **Tabel semua guru**
- **Panel detail breakdown** (klik baris guru)

---

## Topbar

**Kiri:**
- Judul: "Laporan komisi guru"
- Sub-judul: "Kalkulasi otomatis · Review & setujui sebelum dibayarkan"

**Kanan:**
- Navigasi bulan: [←] [April 2026] [→ (nonaktif jika bulan berjalan)]
- Tombol `Export`
- Tombol `Setujui semua` (biru)

---

## Banner Status

**Bulan berjalan (estimasi):**
- Background amber
- Ikon jam
- Teks: "Bulan berjalan — komisi final dihitung otomatis pada 1 [bulan berikutnya]. Data saat ini adalah estimasi berdasarkan presensi yang sudah tercatat."
- Badge tanggal hari ini di kanan

**Bulan lalu (sudah final):**
- Background hijau
- Teks: "Komisi final — siap untuk disetujui"

---

## 4 Metric Cards

| Card | Keterangan |
|---|---|
| Total estimasi komisi | Jumlah total komisi semua guru bulan ini |
| Sudah disetujui | Total nominal yang sudah di-approve + jumlah guru |
| Total sesi terlaksana | Jumlah sesi aktual vs terjadwal |
| Sesi penggantian | Jumlah sesi di mana komisi berpindah guru |

---

## Tabel Semua Guru

### Kolom
| Kolom | Keterangan |
|---|---|
| # | Nomor urut |
| Nama guru | Avatar inisial + nama + mapel yang diampu |
| Sesi hadir | Sesi dari jadwal tetap guru tersebut |
| Sesi ganti | Sesi dari menggantikan guru lain (+N) |
| Total sesi | Jumlah keduanya |
| Status | Pill: Berjalan / Final / Disetujui |
| Komisi | Total nominal (hijau) |

### Interaksi
- Klik baris → panel detail breakdown tampil di bawah
- Baris yang sedang dipilih di-highlight biru

### Status pill warna
- **Berjalan**: amber — estimasi bulan ini
- **Final**: abu — sudah dikalkulasi, belum di-approve
- **Disetujui**: biru — sudah di-approve admin/owner

---

## Panel Detail Breakdown

Muncul di bawah tabel saat admin klik baris guru.

### Header panel
- Background biru muda
- Judul: Nama guru + mapel yang diampu
- Sub-judul: total sesi + keterangan estimasi/final
- Badge status di kanan

### Isi panel — Grid per mata pelajaran (2 kolom)

Setiap card mapel berisi:
- **Header**: nama mapel + badge tipe (Reguler/Private)
- **Tabel per siswa**:
  - Nama siswa
  - Formula: `SPP ÷ total sesi × 40% × jumlah hadir`
  - Nominal komisi dari siswa tersebut
- **Sesi penggantian** (jika ada): ditandai warna amber
- **Subtotal** card mapel

### Footer panel
- Total komisi guru bulan ini (besar)
- Tombol aksi:
  - `Lihat histori` — riwayat komisi bulan-bulan sebelumnya
  - `Edit manual` — koreksi jika ada kesalahan
  - `Setujui komisi ini` (biru) — approve komisi guru ini saja

---

## Keputusan Desain

- **Kolom sesi hadir dan sesi ganti dipisah** agar admin bisa audit transparansi komisi
- **Panel detail di bawah tabel** bukan modal — admin bisa scroll tabel sambil melihat detail
- **Formula ditampilkan per siswa** — tidak hanya nominal, agar mudah diverifikasi
- **Sesi penggantian berwarna amber** di dalam breakdown untuk membedakan dari komisi tetap
- **Tombol "Setujui semua"** di topbar untuk efisiensi saat semua sudah diverifikasi
- **Tombol "Edit manual"** tersedia untuk kasus koreksi khusus sebelum approval
