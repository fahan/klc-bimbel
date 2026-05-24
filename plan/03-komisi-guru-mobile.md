# Wireframe: Komisi Guru (Mobile)

## Informasi Umum
- **Role**: Guru
- **Platform**: Mobile (smartphone, PWA)
- **Akses**: Menu "Komisi" di bottom navigation

---

## Layout

Full-screen mobile dengan:
- **Topbar**: judul "Komisi saya" + nama guru
- **Body**: navigasi bulan + cards
- **Bottom navigation** 4 menu

---

## Topbar

- Tombol back (←) di kiri
- Judul: "Komisi saya"
- Sub-judul: nama guru (contoh: "Pak Budi Santoso")

---

## Navigasi Bulan

Bar navigasi bulan di bagian atas:
- Tombol **← (kiri)** untuk ke bulan sebelumnya
- Label bulan + tahun di tengah (contoh: "April 2026 · Bulan berjalan")
- Tombol **→ (kanan)** — **dinonaktifkan** jika sudah di bulan berjalan (tidak bisa lihat masa depan)

---

## Banner Status

**Jika bulan berjalan:**
- Banner **kuning amber**: "Bulan berjalan — komisi dihitung otomatis akhir bulan"
- Menginformasikan bahwa angka masih estimasi

**Jika bulan lalu (sudah final):**
- Banner **hijau**: "Komisi final — sudah disetujui admin"

---

## 4 Metric Cards

| Card | Keterangan |
|---|---|
| Estimasi komisi | Total nominal komisi bulan ini (per hari ini) |
| Sesi terlaksana | Jumlah sesi yang sudah dilaksanakan dari total terjadwal |
| Siswa diajar | Jumlah siswa unik yang diajar |
| Sesi penggantian | Jumlah sesi dari menggantikan guru lain |

---

## Rincian per Mata Pelajaran

Setiap mata pelajaran yang diampu ditampilkan sebagai **card terpisah**:

### Header card mapel
- Nama mata pelajaran
- Badge tipe: Reguler (biru) / Private (ungu)

### Isi card mapel
Untuk setiap siswa di mapel tersebut:
- Avatar inisial + nama siswa
- Info: SPP siswa + jumlah sesi hadir / total sesi
- Nominal komisi (besar)
- Formula kecil di bawah: `SPP ÷ total sesi × 40% × hadir`

### Footer card mapel
- **Subtotal** mapel tersebut

---

## Total Komisi

Bar di bagian bawah konten:
- Label: "Total estimasi [Bulan] [Tahun]"
- Nominal total yang merupakan penjumlahan semua subtotal mapel

---

## Bottom Navigation

| Menu | Ikon | Status |
|---|---|---|
| Dashboard | Grid 4 kotak | Normal |
| Presensi | Centang | Normal |
| Jadwal | Kalender | Normal |
| Komisi | Grafik garis | **Aktif** |

---

## Keputusan Desain

- **Formula ditampilkan** di bawah nominal — transparansi penuh agar guru tidak perlu tanya ke admin
- **Bulan berjalan vs final** dibedakan dengan banner berbeda warna
- **Tombol navigasi bulan kanan dinonaktifkan** saat di bulan berjalan — mencegah kebingungan
- **Sesi penggantian** ditampilkan terpisah di metric card agar guru tahu berapa tambahan dari menggantikan
- Rincian **per mapel → per siswa** memudahkan guru memverifikasi kalkulasinya sendiri
