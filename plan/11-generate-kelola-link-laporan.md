# Wireframe: Generate & Kelola Link Laporan Progress (Admin)

## Informasi Umum
- **Role**: Admin Cabang, Admin Global, Owner
- **Platform**: Desktop
- **Akses**: Menu "Laporan progress siswa" di sidebar

---

## Layout

- **Topbar**: judul + tombol generate baru
- **Filter bar**: filter status + search
- **Body 2 kolom**: kiri (metric + tabel link aktif), kanan (form generate + preview WA)

---

## Topbar

**Kiri:**
- Judul: "Laporan progress siswa"
- Sub-judul: "Generate & kirim link laporan ke orang tua"

**Kanan:**
- Tombol `+ Generate link baru` (biru)

---

## Filter Bar

- Label "Filter:"
- Pill: Semua | Aktif | Kedaluwarsa (merah) | Permanen (biru)
- Search: "Cari nama siswa..."

---

## Kolom Kiri

### 4 Metric Cards

| Card | Keterangan |
|---|---|
| Total link dibuat | Sejak awal |
| Link aktif | Bisa dibuka orang tua saat ini |
| Segera kedaluwarsa | Link yang akan expired dalam 7 hari |
| Sudah kedaluwarsa | Link yang sudah tidak aktif |

### Tabel Link

**Kolom:**
| Kolom | Keterangan |
|---|---|
| Siswa & mata pelajaran | Nama siswa + mapel yang dicakup link ini |
| Dibuat | Tanggal generate |
| Berlaku hingga | Tanggal expired / "Permanen" |
| Status | Pill status |
| Aksi | Tombol per baris |

**Status pill:**
- **Aktif** (hijau): link masih bisa dibuka
- **X hari lagi** (amber): akan expired dalam ≤ 7 hari (tanggal juga berwarna amber)
- **Kedaluwarsa** (merah): sudah tidak aktif, row opacity lebih rendah
- **Permanen** (biru): tidak ada tanggal expired

**Tombol aksi per status:**
- Link aktif: `WA` (hijau) + `Salin` + `Cabut`
- Link segera expired: `WA` (hijau) + `Perbarui` (biru)
- Link kedaluwarsa: `Generate ulang` (biru)

---

## Kolom Kanan

### Card — Generate Link Baru

**Field 1 — Pilih siswa**
- Dropdown search nama siswa

**Field 2 — Mata pelajaran yang ditampilkan**
- Checklist per mapel yang diikuti siswa:
  - Checkbox + nama mapel + badge tipe (Modul/Bebas)
  - Item tercentang: background biru muda
  - Bisa centang sebagian mapel saja

**Field 3 — Durasi link aktif**
- 4 tombol grid:
  - 7 hari
  - 30 hari (default, ter-highlight)
  - 3 bulan
  - Permanen
- Tombol terpilih: background biru muda + border biru

**Preview link**
- Box abu: label + URL yang akan dibuat
- Format: `bimbelpintar.app/laporan/[siswa]-[mapel]-[random]`

**Tombol `Generate & lanjut kirim`** (biru, full-width)

---

### Card — Preview Pesan WhatsApp

Muncul setelah form generate diisi.

**Header**
- Background hijau muda
- Judul: "Preview pesan WhatsApp"
- Sub-judul: "Siap dikirim setelah generate"

**Isi pesan (box hijau tua)**

```
Assalamu'alaikum Bpk/Ibu orang tua [Nama Siswa] 🙏

Berikut laporan progress belajar [Nama Siswa] di
[Nama Bimbel] untuk mata pelajaran [Mapel]:

🔗 bimbelpintar.app/laporan/[token]

Link aktif hingga [tanggal]. Hubungi kami jika ada pertanyaan.
```

**Tombol aksi:**
- `Buka WhatsApp` (hijau #25D366, full-width) — membuka WA dengan pesan terisi
- `Salin link` (secondary) — salin URL saja

---

## Keputusan Desain

- **Tabel link aktif** memberikan overview semua link yang pernah dibuat — admin bisa pantau tanpa harus generate ulang
- **Pilihan mapel per link** — admin bisa memilih mapel mana yang ingin ditampilkan, fleksibel per kebutuhan komunikasi
- **Preview URL sebelum generate** — admin bisa lihat URL yang akan dibuat, berguna untuk audit
- **Badge "X hari lagi"** dengan warna amber — pengingat proaktif sebelum link expired
- **Preview WA otomatis** — menghilangkan kebutuhan mengetik pesan manual, konsisten formatnya
- **Tombol "Cabut"** tersedia untuk mencabut akses link aktif jika diperlukan
