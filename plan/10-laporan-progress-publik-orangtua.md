# Wireframe: Laporan Progress Publik (Orang Tua)

## Informasi Umum
- **Role**: Publik (orang tua siswa) — tanpa login
- **Platform**: Mobile (dibuka via link WhatsApp)
- **Akses**: Link unik `bimbelpintar.app/laporan/[token]`

---

## Karakteristik Halaman

- **Tidak memerlukan login** — orang tua langsung lihat konten
- **Read-only** — tidak ada aksi apapun
- **Link berbatas waktu** — ada masa kedaluwarsa yang dikonfigurasi admin
- **Per mata pelajaran** — setiap laporan hanya untuk satu mapel

---

## Header Halaman

Background **biru (#185FA5)**, berisi:

**Baris atas:**
- Logo bimbel (ikon A dalam lingkaran semi-transparan)
- Nama bimbel (besar)
- Nama cabang (kecil, biru muda)
- Nomor tidak ditampilkan di sini

**Bagian bawah header:**
- Label kecil: "LAPORAN PROGRESS BELAJAR"
- Nama siswa (besar, putih)
- Nama bimbel + kelas (kecil, biru muda)
- 2 chip: "Digenerate [tanggal]" + "Berlaku X hari"

---

## Banner Masa Berlaku

Di bawah header:
- Background **amber**
- Ikon jam
- Teks: "Link aktif hingga"
- Tanggal kedaluwarsa di kanan

**Jika link sudah kedaluwarsa:**
- Banner merah
- Teks: "Link ini sudah tidak aktif. Hubungi admin untuk link baru."

---

## Card per Mata Pelajaran

Setiap mapel ditampilkan dalam card terpisah.

### Header card
- Ikon mapel (warna berbeda per tipe)
- Nama mapel
- Badge tipe: "Modul berjenjang" (ungu) atau "Materi bebas" (teal)

---

## Konten Tipe 1 — Modul Berjenjang (AHE, ASE, Les Ngaji)

### Overall chip
- Ikon jam
- Label: "Progres keseluruhan"
- Nilai: "X dari Y modul selesai"

### Status per modul (list)

Setiap modul ditampilkan dalam satu baris:
- Nama modul (kiri)
- Progress bar (tengah, lebar fleksibel)
- Status + predikat (kanan)

**Warna progress bar:**
- Hijau: modul selesai (100%)
- Biru: modul sedang berjalan (sebagian)
- Abu: belum dimulai

**Status label:**
- Selesai (hijau)
- X/Y bab (biru) — untuk yang sedang berjalan
- Belum (abu)

**Badge predikat** (hanya untuk modul selesai):
- Memuaskan (teal)
- Baik sekali (hijau)
- Baik (biru)
- Cukup (amber)
- Perlu bimbingan (merah)

### Riwayat sesi terbaru

List 3–5 sesi terbaru:
- Tanggal (kiri, kecil abu)
- Nama sesi: "Modul X · Bab Y–Z"
- Jika modul selesai: badge predikat
- Catatan guru (jika ada): kotak abu dengan border kiri, teks italic

---

## Konten Tipe 2 — Materi Bebas (Matematika, Fisika, dll)

### Overall chip
- Ikon centang
- Label: "Predikat rata-rata"
- Nilai + warna sesuai predikat rata-rata

### Riwayat materi

List sesi terbaru:
- Tanggal (kiri)
- Topik yang diajarkan (nama sesi, bold)
- Badge predikat siswa untuk sesi tersebut
- Catatan guru (jika ada): kotak abu italic

---

## Footer

### Cap digital
- Avatar lingkaran dengan border (hijau transparan untuk lunas, abu untuk aktif)
- Ikon logo bimbel
- Nama bimbel + cabang
- Teks: "Dokumen resmi · diterbitkan secara digital"

### Catatan kaki
- Teks kecil abu: "Laporan ini dibuat oleh [nama bimbel] dan hanya menampilkan data mata pelajaran yang dipilih admin. Link ini berlaku hingga [tanggal]."

---

## Keputusan Desain

- **Header biru** identik dengan invoice — orang tua mengenali ini dokumen resmi dari bimbel yang sama
- **Laporan terpisah per mapel** — orang tua tidak kebingungan jika anak ikut banyak mapel
- **Progress bar modul visual** — orang tua yang tidak familiar dengan sistem bisa langsung mengerti seberapa jauh progress anak
- **Catatan guru ditampilkan** — elemen paling bermakna bagi orang tua karena bersifat personal
- **Link kedaluwarsa** — mendorong komunikasi berkala antara orang tua dan admin/guru
- **Tidak ada login** — mengurangi friction bagi orang tua yang kurang tech-savvy
