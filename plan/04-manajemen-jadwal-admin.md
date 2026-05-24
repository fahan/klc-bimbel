# Wireframe: Manajemen Jadwal Admin

## Informasi Umum
- **Role**: Admin Cabang, Admin Global, Owner
- **Platform**: Desktop
- **Akses**: Menu "Jadwal & sesi" di sidebar

---

## Layout

- **Topbar**: judul + navigasi minggu + toggle mode + tombol tambah sesi
- **Filter bar**: filter guru + search
- **Grid jadwal**: kalender mingguan
- **Legend warna guru**
- **Panel detail sesi**: muncul saat klik sesi

---

## Topbar

**Kiri:**
- Judul: "Jadwal & sesi"
- Sub-judul: "Kelola jadwal mingguan dan sesi per guru"

**Kanan:**
- Navigasi minggu: [← ] [28 Apr – 3 Mei 2026] [ →]
- **Toggle mode tampilan**:
  - `Grid minggu` (default)
  - `Per jam`
- Tombol `+ Tambah sesi` (biru)

---

## Filter Bar

- Label "Filter guru:"
- Pill button per guru (warna sesuai warna guru):
  - Semua guru (default aktif)
  - Bu Sari (biru)
  - Pak Budi (ungu)
  - Pak Adi (hijau)
  - Bu Rina (teal)
  - Pak Yusuf (pink)
  - + N guru lainnya
- Search input "Cari..." di kanan

---

## Mode 1 — Grid Mingguan

### Struktur grid
- Kolom header: kosong | Sen | Sel (today) | Rab | Kam | Jum | Sab
- Baris: perjam (07.00, 08.00, 10.00, 13.00, 15.00, ...)
- Hari ini diberi highlight (background biru muda, teks biru)

### Isi setiap sel
Setiap sesi ditampilkan sebagai **blok vertikal** dengan:
- Border kiri berwarna (warna guru)
- Background sesuai warna guru
- Nama mapel (bold, kecil)
- Nama guru (kecil)
- Nama siswa singkat (kecil, redup)

**Saat sesi lebih dari 2 di jam yang sama:**
- Tampilkan 2 sesi pertama secara penuh
- Sesi ke-3 dst diringkas sebagai chip **"+N sesi lagi"** (abu, bisa diklik)

### Penanda sesi aktif hari ini
- Blok sesi diberi label "· Aktif" di dalam

---

## Mode 2 — Per Jam (Sesi Paralel)

Dipicu saat admin klik chip "+N sesi lagi" di Mode 1.

### Header
- Info jam & tanggal: "Selasa, 29 Apr 2026 · 08.00"
- Badge jumlah sesi: "7 sesi berjalan"

### Tampilan kartu paralel
Semua sesi di jam tersebut ditampilkan sebagai **kartu horizontal** berderet:

Setiap kartu berisi:
- Nama mapel (bold, warna sesuai guru)
- Nama guru
- Nama siswa singkat
- **Progress bar kapasitas** (tipis, di bawah)
- **Badge kapasitas**: `2/2` (hijau = penuh), `1/3` (amber = ada slot)

Sesi ke-5 ke atas dikelompokkan di kolom terakhir sebagai daftar ringkas.

---

## Legend Warna Guru

Di bawah grid, ditampilkan legenda:
- Swatch warna + nama guru per kombinasi guru-mapel
- Warna amber khusus untuk **guru pengganti**
- Badge "· Aktif" untuk sesi berjalan hari ini

---

## Panel Detail Sesi

Muncul di bawah grid saat admin **klik salah satu sesi** atau kartu paralel.

### Header panel
- Background biru muda
- Judul: Nama mapel + tipe + hari + jam + nama guru tetap
- Sub-judul: "Klik sesi di grid atau kartu paralel untuk lihat detail"

### Isi panel (3 kolom)

**Kolom 1 — Guru tetap**
- Avatar inisial + nama + status (Hadir/Tidak hadir)

**Kolom 2 — Siswa terdaftar**
- Chip per siswa (avatar inisial + nama)
- Link "+ Tambah siswa" (jika kapasitas belum penuh)
- Keterangan kapasitas
- Jika penuh: "Kapasitas penuh — tidak bisa tambah siswa"

**Kolom 3 — Jadwal rutin**
- Hari-hari sesi rutin (misal: Senin, Rabu, Jumat)
- Jam mulai + durasi

### Aksi panel
- Tombol: `Ubah jadwal` | `Ganti guru` | `Hapus sesi` (merah)

---

## Keputusan Desain

- **Dua mode tampilan** untuk menangani kasus sesi paralel lebih dari 5 tanpa membuat grid tidak terbaca
- **Warna per guru** bukan per mapel — lebih mudah melihat beban kerja guru secara visual
- **Chip "+N sesi lagi"** alih-alih scroll horizontal — grid tetap rapi
- **Panel detail** di bawah grid alih-alih modal popup — admin bisa lihat konteks jadwal sambil melihat detail sesi
- **Tombol hapus berwarna merah** dengan jarak dari tombol lain untuk mencegah klik tidak sengaja
