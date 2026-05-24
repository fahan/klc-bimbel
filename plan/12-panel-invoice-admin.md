# Wireframe: Panel Invoice Admin

## Informasi Umum
- **Role**: Admin Cabang, Admin Global, Owner
- **Platform**: Desktop
- **Akses**: Menu "Invoice tagihan" di sidebar

---

## Layout

- **Topbar**: judul + tombol export & generate baru
- **Filter bar**: filter status + tipe + search
- **Body 2 kolom**: kiri (metric + tabel invoice), kanan (form generate + preview WA)

---

## Topbar

**Kiri:**
- Judul: "Invoice tagihan"
- Sub-judul: "Generate, kirim, dan pantau status pembayaran"

**Kanan:**
- Tombol `Export`
- Tombol `+ Generate invoice baru` (biru)

---

## Filter Bar

**Filter Status:**
- Pill: Semua | Belum lunas (merah) | Sebagian (amber) | Lunas (hijau)

**Filter Tipe:**
- Pill: Semua | SPP (biru) | Registrasi (ungu)

**Search:**
- Input "Cari nama siswa / nomor invoice..."

---

## Kolom Kiri

### 4 Metric Cards

| Card | Keterangan |
|---|---|
| Total invoice bulan ini | Jumlah semua invoice periode aktif |
| Belum lunas | Jumlah + total rupiah |
| Sebagian terbayar | Jumlah + sisa rupiah belum dibayar |
| Lunas | Jumlah + total terkumpul (hijau) |

### Tabel Invoice

**Kolom:**
| Kolom | Keterangan |
|---|---|
| No. invoice | Format monospace: INV-SPP-PWK-202604-001 |
| Siswa | Nama + detail (periode + mapel) |
| Tipe | Badge: SPP (biru) / Registrasi (ungu) |
| Total | Nominal tagihan |
| Status | Pill status |
| Aksi | Tombol per baris |

**Status pill:**
- **Lunas** (hijau)
- **Sebagian** (amber)
- **Belum lunas** (merah)

**Tombol aksi per status:**
- Belum lunas / Sebagian: `WA` (hijau) + `Bayar` (biru)
- Lunas: `WA` (hijau) + `Lihat`

**Baris terpilih**: di-highlight biru

---

## Kolom Kanan

### Card — Generate Invoice Baru

**Toggle tipe invoice:**
- `SPP bulanan` | `Registrasi` (toggle biru aktif)

**Field Siswa:**
- Dropdown search nama siswa

**Field Periode (untuk SPP):**
- Dropdown bulan + tahun

**Preview invoice** (muncul otomatis setelah siswa & periode dipilih):

Box preview berisi:
- Header biru: nama bimbel + cabang + nomor invoice (monospace, kanan)
- Body:
  - Nama siswa
  - Periode
  - Tanggal generate
  - Divider
  - Rincian per mapel: nama + tipe + jumlah sesi + nominal
  - Divider
  - Total tagihan (bold)
  - Badge status (Belum Lunas / Lunas)

**Tombol `Generate & lanjut kirim`** (biru, full-width)

---

### Card — Preview Pesan WhatsApp

Header hijau muda + judul "Preview pesan WhatsApp"

**Isi pesan otomatis:**
```
Assalamu'alaikum Bpk/Ibu orang tua [Nama Siswa] 🙏

Berikut tagihan SPP bulan [Bulan] [Tahun] di
[Nama Bimbel] Cab. [Cabang]:

🔗 bimbelpintar.app/invoice/[token]

Total: Rp [nominal]
Mohon segera dilunasi. Terima kasih 🙏
```

**Tombol aksi:**
- `Buka WhatsApp` (hijau WA, full-width)
- `Salin link` (secondary)

---

## Keputusan Desain

- **Preview invoice sebelum generate** — admin bisa verifikasi isi sebelum dikirim ke orang tua
- **Tipe toggle SPP/Registrasi** — dua tipe invoice dalam satu form, tidak perlu halaman terpisah
- **Nomor monospace** di tabel — mudah dibaca dan dicatat secara manual
- **Tombol "Bayar"** di tabel — shortcut catat pembayaran langsung dari daftar invoice tanpa navigasi ke halaman lain
- **Preview WA otomatis** — format pesan konsisten, tidak perlu ketik ulang
- **Filter ganda** (status + tipe) bisa dikombinasikan untuk mencari invoice tertentu dengan cepat
