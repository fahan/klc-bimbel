# Wireframe: Invoice Digital — Belum Lunas (Publik)

## Informasi Umum
- **Role**: Publik (orang tua siswa) — tanpa login
- **Platform**: Mobile (dibuka via link WhatsApp)
- **Akses**: Link `bimbelpintar.app/invoice/[token]`

---

## Karakteristik Halaman

- **Tidak memerlukan login**
- **Read-only** untuk orang tua
- Status: **Belum Lunas** — orang tua belum melakukan pembayaran apapun
- Berlaku sebagai **tagihan resmi digital**

---

## Header Halaman

Background **biru (#185FA5)**:

**Baris atas:**
- Logo bimbel (ikon dalam lingkaran semi-transparan)
- Nama bimbel (bold putih)
- Nama cabang (kecil, biru muda)

**Kanan atas:**
- Label "NO. INVOICE" (kecil, biru muda)
- Nomor invoice (font monospace, lebih kecil, contoh: INV-SPP-PWK-202605-001)

**Baris bawah:**
- Judul besar: "Tagihan SPP"
- Badge kanan: **"Belum lunas"** (merah muda, background merah muda)

---

## Informasi Tagihan (Card 1)

Header card: "Informasi tagihan"

| Label | Nilai |
|---|---|
| Nama siswa | Nama lengkap |
| Kelas | Kelas siswa |
| Cabang | Nama cabang |
| Periode | Bulan + tahun |
| Tanggal tagihan | Tanggal generate |
| Diterbitkan oleh | "Admin · [Nama Cabang]" |

---

## Rincian Tagihan (Card 2)

Header: "Rincian tagihan"

Per mata pelajaran:
- Nama mapel (bold)
- Nominal kanan (bold)
- Badge tipe: Reguler (biru) / Private (ungu)
- Info sesi: "X sesi · [Bulan] [Tahun]"

---

## Total (Card 3)

| Baris | Keterangan |
|---|---|
| Subtotal | Jumlah semua mapel |
| Sudah dibayar | Rp 0 (untuk status Belum Lunas) |
| **Total tagihan** | **Bold merah, font besar** |

---

## Banner Belum Lunas

Background merah muda, border merah:
- Ikon peringatan (lingkaran i)
- Judul: "Tagihan belum terbayar" (bold merah)
- Teks: "Mohon segera melunasi tagihan SPP [Bulan] sebesar Rp [nominal]. Hubungi admin [Nama Bimbel] untuk konfirmasi pembayaran."

---

## Cap Digital

Card abu muda:
- Lingkaran border (abu transparan, opacity rendah) berisi ikon logo
- Nama bimbel + cabang
- Teks: "Dokumen resmi · diterbitkan secara digital"

---

## Footer Note

Teks kecil abu, terpusat:
- "Invoice ini diterbitkan secara digital oleh [Nama Bimbel]."
- "Simpan halaman ini sebagai bukti tagihan Anda."

---

## Perbedaan dengan Status Lunas

| Elemen | Belum Lunas | Lunas |
|---|---|---|
| Badge header | Merah "Belum lunas" | Hijau "Lunas" |
| Banner bawah total | Merah — peringatan | Hijau — konfirmasi |
| Total tagihan | Merah | Hijau (Rp 0 sisa) |
| Cap digital | Abu transparan | Hijau solid |
| Stempel | Tidak ada | Ada stempel "LUNAS" |

---

## Keputusan Desain

- **Header biru identik** dengan laporan progress — orang tua mengenali ini dokumen resmi dari bimbel yang sama
- **Nomor invoice monospace** — terkesan resmi dan mudah dikomunikasikan ke admin saat konfirmasi bayar
- **Rincian per mapel** — orang tua bisa verifikasi apakah jumlah sesi dan mapel sudah sesuai
- **Banner merah** ajakan bayar — jelas namun sopan, menyebut nama bimbel untuk konfirmasi
- **Cap digital transparan** — memberikan kesan dokumen resmi sebelum dibayar, menjadi solid setelah lunas
