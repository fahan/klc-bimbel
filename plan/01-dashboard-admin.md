# Wireframe: Dashboard Admin

## Informasi Umum
- **Role**: Admin Cabang, Admin Global, Owner
- **Platform**: Desktop (web browser)
- **Akses**: Setelah login, halaman pertama yang muncul

---

## Layout Utama

Halaman menggunakan layout **sidebar + konten utama**:
- Sidebar navigasi di kiri (lebar 220px)
- Konten utama di kanan (flex: 1)
- Topbar di atas konten utama

---

## Sidebar Navigasi

### Header sidebar
- Logo & nama aplikasi: **BimbelApp**
- Subtitle: "Sistem manajemen bimbel"

### Grup menu navigasi

**Utama**
- Dashboard *(aktif)*
- Data siswa
- Data guru
- Jadwal & sesi

**Operasional**
- Presensi
- Pembayaran SPP

**Laporan**
- Keuangan
- Komisi guru

**Master Data**
- Mata pelajaran
- Tarif SPP

### Footer sidebar
- Avatar inisial + nama user + role ganda (contoh: "Admin · Guru")

---

## Topbar

- **Judul halaman**: Dashboard
- **Tanggal**: Selasa, 28 April 2026
- **Tombol notifikasi** (ikon lonceng) di kanan

---

## Konten Utama

### Bagian 1 — Ringkasan bulan ini (4 metric cards)

| Card | Nilai | Sub-informasi |
|---|---|---|
| Total siswa aktif | 48 | +3 bulan ini |
| Sesi terlaksana | 124 | dari 136 terjadwal |
| SPP terkumpul | Rp 7,2jt | dari Rp 8,4jt tagihan |
| Total komisi | Rp 2,8jt | 8 guru aktif |

### Bagian 2 — Menu utama (4 card menu)

| Card | Ikon | Deskripsi |
|---|---|---|
| Presensi hari ini | Biru | Input kehadiran siswa untuk sesi yang berjalan |
| Catat pembayaran | Hijau | Rekam SPP & registrasi siswa baru |
| Kelola jadwal | Amber | Lihat & ubah jadwal sesi mingguan |
| Daftarkan siswa | Ungu | Input data siswa baru & tetapkan jadwal |

### Bagian 3 — Panel bawah (2 kolom)

**Panel kiri — Sesi hari ini**
- Header: "Sesi hari ini" + link "Lihat semua"
- List sesi dengan info: jam, nama mapel, tipe, nama guru, jumlah siswa
- Badge status per sesi: Selesai (biru) / Berlangsung (hijau) / Mendatang (amber)

**Panel kanan — Status pembayaran SPP**
- Header: "Status pembayaran SPP" + link "Lihat semua"
- List siswa dengan: nama, mapel, periode, badge status
- Badge status: Lunas (hijau) / Belum lunas (merah) / Sebagian (amber)

---

## Keputusan Desain

- **Warna dominan**: putih/abu terang, aksen biru (#185FA5)
- **Card menu** menggunakan warna berbeda per fungsi untuk membedakan secara visual
- **Sesi hari ini** ditampilkan langsung di dashboard agar admin tidak perlu navigasi tambahan untuk aktivitas harian
- **Status pembayaran** ditampilkan di dashboard untuk memudahkan admin memantau tunggakan

---

## Catatan Multi-Cabang

Untuk **Owner & Admin Global**: topbar menampilkan **cabang switcher** dropdown (misal: [Semua Cabang ▾] atau [Cab. Purwokerto ▾]). Semua data & metric cards menyesuaikan pilihan cabang.

Untuk **Admin Cabang**: nama cabang tampil fixed di topbar, tidak bisa berganti.
