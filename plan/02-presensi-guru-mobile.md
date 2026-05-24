# Wireframe: Presensi Guru (Mobile)

## Informasi Umum
- **Role**: Guru, Admin Cabang (saat merangkap guru)
- **Platform**: Mobile (smartphone, PWA)
- **Akses**: Menu "Presensi" di bottom navigation

---

## Layout

Tampilan full-screen mobile dengan:
- **Status bar** sistem di atas
- **Topbar** aplikasi (judul sesi + tombol back)
- **Body** berisi list sesi & form presensi
- **Bottom navigation** 3 menu: Dashboard, Presensi (aktif), Jadwal

---

## Topbar

- Tombol back (←) di kiri
- Judul: nama mapel + hari + jam sesi
- Sub-judul: nama guru + jumlah siswa
- Contoh: "Presensi siswa · Selasa, 28 April 2026"

---

## Alur Presensi (3 langkah)

### Langkah 1 — Pilih sesi hari ini

List sesi guru hari ini, setiap card menampilkan:
- Dot warna (biru = aktif, hijau = selesai, amber = mendatang)
- Nama mapel + tipe (Reguler/Private)
- Jam sesi + jumlah siswa
- Badge status: **Selesai** / **Aktif** / **Mendatang**

Sesi yang sedang aktif otomatis ter-highlight (border biru, background biru muda).

### Langkah 2 — Input presensi per siswa

Untuk setiap siswa di sesi yang dipilih:
- Avatar inisial + nama siswa + info SPP
- **Toggle button** Hadir / Absen (tap untuk pilih)
  - Hadir: hijau
  - Absen: merah

### Langkah 3 — Submit

Tombol **"Submit presensi"** besar di bagian bawah (biru, full-width).

---

## Kasus Khusus: Guru Pengganti

Jika guru yang membuka app **bukan guru tetap** sesi tersebut:
- Muncul **banner kuning** dengan ikon jam:
  - Teks: "Anda bukan guru tetap sesi ini. Komisi sesi ini akan tercatat atas nama Anda."
- Guru pengganti tetap bisa submit presensi
- Sistem otomatis mencatat `is_replacement = true` di `session_logs`
- Komisi sesi tersebut otomatis dialokasikan ke guru yang submit

---

## Field Tambahan

**Catatan (opsional)**
- Textarea di bawah daftar siswa
- Placeholder: "Topik yang diajarkan hari ini..."

---

## Bottom Navigation

| Menu | Ikon | Status |
|---|---|---|
| Dashboard | Grid 4 kotak | Normal |
| Presensi | Centang | **Aktif** |
| Jadwal | Kalender | Normal |
| Komisi | Grafik garis | Normal |

---

## Keputusan Desain

- **Toggle Hadir/Absen** dipilih dibanding checkbox karena lebih mudah di-tap di layar kecil
- **Sesi aktif** otomatis tersorot sehingga guru tidak bingung harus pilih yang mana
- **Banner guru pengganti** berwarna kuning agar informatif namun tidak menghalangi alur utama
- Layout **mobile-first** dengan elemen minimal untuk kecepatan penggunaan saat mengajar
