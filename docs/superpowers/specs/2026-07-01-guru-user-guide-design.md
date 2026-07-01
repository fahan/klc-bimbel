# Panduan Penggunaan (User Guide) untuk Role GURU — Design Spec

Date: 2026-07-01

## Latar Belakang

Guru (role `GURU`) mengakses aplikasi mobile-first di route group `(guru)` dengan 4 menu utama: Dashboard, Presensi, Jadwal, Komisi. Belum ada dokumentasi in-app yang menjelaskan cara pakai tiap menu. Tujuan fitur ini: halaman panduan step-by-step yang bisa diakses langsung oleh guru dari dalam aplikasi, lengkap dengan ilustrasi mockup tiap langkah.

## Keputusan Desain (dari sesi brainstorming)

| Pertanyaan | Keputusan |
| --- | --- |
| Format | Halaman baru di dalam app (bukan dokumen terpisah) |
| Sumber gambar | Mockup/ilustrasi buatan (bukan screenshot asli dari browser) |
| Struktur halaman | Index + sub-halaman per menu |
| Cara akses | Ikon bantuan (?) di top bar area guru |
| Gaya ilustrasi | Mockup mirip UI asli (warna, tombol, card sesuai aplikasi asli) |

## Struktur Route

```
apps/frontend/src/app/(guru)/guru/panduan/
├── page.tsx              # index: 4 card menu
├── dashboard/page.tsx    # step-by-step menu Dashboard
├── presensi/page.tsx     # step-by-step menu Presensi (paling panjang)
├── jadwal/page.tsx       # step-by-step menu Jadwal
└── komisi/page.tsx       # step-by-step menu Komisi
```

Semua halaman berada di dalam route group `(guru)` sehingga otomatis dibungkus `GuruLayout` (top bar biru + bottom nav 4 item). Halaman panduan **tidak** ditambahkan ke `navItems` bottom nav (sudah penuh 4 slot) — diakses lewat ikon bantuan di top bar dan tombol "Kembali" antar halaman.

## Komponen Baru

```
apps/frontend/src/components/panduan/
├── PhoneMockup.tsx     # bingkai ilustrasi: mini top bar biru + area konten, membungkus mockup tiap step
├── GuideStep.tsx       # 1 unit step: nomor badge, judul, deskripsi singkat (Bahasa Indonesia), slot children (mockup), tip opsional (info box biru)
└── GuideIndexCard.tsx  # card menu di halaman index: icon + warna (biru/ungu/hijau/oranye) + judul + deskripsi 1 kalimat + link
```

**`PhoneMockup`**: Props `children`. Render `<div>` dengan lebar terbatas (mirip lebar konten mobile, misal `max-w-[280px] mx-auto`), border + shadow, dan strip biru kecil di atas (meniru top bar) supaya konteks "ini tampilan di HP" jelas tanpa membuat frame ponsel penuh yang berlebihan.

**`GuideStep`**: Props `number`, `title`, `description`, `children` (mockup), `tip?` (string opsional). Layout: badge angka bulat biru + judul di baris atas, deskripsi di bawah, lalu mockup, lalu tip box (`bg-blue-50 border-l-4 border-blue-500`) jika ada — konsisten dengan gaya info banner yang sudah dipakai di halaman guru asli (lihat `guru/page.tsx` "Info Tip").

**`GuideIndexCard`**: Props `href`, `icon` (lucide component), `color` ('blue'|'purple'|'green'|'orange'), `title`, `description`. Meniru gaya "Quick Actions" grid di `guru/page.tsx` tapi ukuran card lebih besar (bukan grid-cols-3) karena berisi deskripsi.

Semua mockup di dalam `GuideStep` adalah JSX+Tailwind statis dengan data contoh (nama siswa/guru dummy seperti "Ahmad", "Matematika", dsb), bukan hasil query API — karena disepakati bukan screenshot asli.

Anotasi visual: setiap mockup punya highlight (border biru 2px + sedikit shadow) pada elemen yang jadi fokus step tersebut, ditambah badge angka kecil (misal `absolute -top-2 -left-2`) mereplikasi nomor step, supaya jelas bagian mana yang dimaksud.

## Akses dari Top Bar

Di `apps/frontend/src/app/(guru)/layout.tsx`, tambahkan ikon `HelpCircle` (lucide-react) di kelompok tombol kanan top bar (`div.flex.items-center.gap-1`), sebelum tombol switch-admin dan logout. `onClick` → `router.push('/guru/panduan')`. Ikon ini tampil di semua halaman guru termasuk halaman panduan sendiri (tidak masalah, tetap konsisten).

## Konten per Halaman

### Index (`/guru/panduan`)
- Judul "Panduan Penggunaan" + subjudul singkat.
- 4 `GuideIndexCard`: Dashboard (biru, icon `LayoutDashboard`), Presensi & Progress (biru tua/icon `CheckSquare`), Jadwal (ungu, icon `Calendar`), Komisi (hijau, icon `TrendingUp`) — warna & icon konsisten dengan bottom nav asli.

### Dashboard (`/guru/panduan/dashboard`)
1. Melihat sapaan & tanggal hari ini.
2. Melihat card "Sesi Hari Ini" (badge jumlah sesi, status Selesai/Mendatang per sesi).
3. Tap salah satu sesi untuk langsung masuk ke halaman presensi sesi tsb.
4. Menggunakan 3 tombol pintasan (Presensi/Jadwal/Komisi) di bawah.

### Presensi & Progress (`/guru/panduan/presensi`)
1. Buka menu Presensi → lihat daftar "Sesi Saya" hari ini (status: Mendatang/Aktif/Selesai/Lewat).
2. Tap sesi → isi status presensi tiap siswa: Hadir/Absen/Izin/Sakit, tambah catatan opsional.
3. Tekan "Submit Presensi & Lanjut" → otomatis lanjut ke step Progress.
4. Isi progress belajar — dua varian tergantung mapel:
   - Modul: pilih modul, isi rentang bab (dari–sampai), progress bar otomatis, jika bab terakhir tercapai → pilih predikat penyelesaian.
   - Materi bebas: isi 1 topik untuk semua siswa, lalu predikat pemahaman per siswa.
5. Halaman "Berhasil" — tombol lanjut ke sesi lain atau kembali ke dashboard.
6. Fitur "Gantikan Sesi Guru Lain": pilih cabang, cari nama guru atau siswa, submit presensi sebagai pengganti (komisi tercatat atas nama guru pengganti).
7. Fitur "Sesi Darurat" (untuk sesi di luar jadwal reguler): isi cabang, mapel, tanggal, jam, durasi, tambah siswa manual jika perlu, submit — beri catatan bahwa presensi ini menunggu persetujuan admin sebelum masuk komisi.
8. Riwayat Sesi Darurat: melihat status pengajuan sesi darurat sebelumnya.

### Jadwal (`/guru/panduan/jadwal`)
1. Pilih hari lewat selector 7 hari (badge angka = jumlah sesi hari itu).
2. Lihat detail tiap sesi: jam & durasi, jumlah siswa/kapasitas, cabang, daftar nama siswa terdaftar.
3. Untuk sesi hari ini, tombol "Input Presensi" langsung tersedia dari halaman jadwal.

### Komisi (`/guru/panduan/komisi`)
1. Pilih tahun (tahun lalu/ini/depan).
2. Lihat ringkasan Komisi Diterima vs Komisi Pending, dan Bonus jika ada.
3. Lihat riwayat komisi per bulan dengan status: Estimasi / Final / Disetujui.
4. Lihat riwayat bonus (jika ada) dengan status Disetujui/Menunggu.
5. Baca catatan cara hitung komisi (formula default: SPP ÷ 12 × % komisi × sesi terlaksana, bisa berbeda per mapel/jenis sesi).

## Non-Goals

- Tidak menggunakan screenshot asli dari browser (disepakati mockup ilustratif).
- Tidak menambah item ke bottom nav.
- Tidak membuat panduan untuk role lain (OWNER/ADMIN) — di luar scope permintaan ini.
- Tidak ada backend/API baru — halaman ini murni statis (client-side, tanpa query data).

## Testing

- Jalankan dev server frontend, buka `/guru/panduan` dan tiap sub-halaman langsung lewat browser (tidak perlu login sebagai GURU asli karena kontennya statis — cukup pastikan tidak ada guard yang memblokir; jika layout `GuruLayout` melakukan redirect untuk non-GURU, verifikasi dengan role GURU atau override sementara saat dev).
- Cek tampilan responsif mobile (viewport ~375–412px, sesuai `max-w-md` container yang dipakai layout guru).
- Pastikan ikon bantuan di top bar muncul dan navigasi index ↔ sub-halaman ↔ kembali berjalan benar.
