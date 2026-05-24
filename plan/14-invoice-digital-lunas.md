# Wireframe: Invoice Digital — Lunas (Publik)

## Informasi Umum
- **Role**: Publik (orang tua siswa) — tanpa login
- **Platform**: Mobile (dibuka via link WhatsApp)
- **Akses**: Link `bimbelpintar.app/invoice/[token]`

---

## Karakteristik Halaman

- **Tidak memerlukan login**
- **Read-only**
- Status: **Lunas** — pembayaran sudah diterima penuh
- Berfungsi sebagai **bukti pembayaran resmi digital**
- Orang tua bisa screenshot atau simpan halaman ini

---

## Header Halaman

Background **biru (#185FA5)** — identik dengan versi Belum Lunas:

- Logo bimbel + nama bimbel + nama cabang
- Nomor invoice (monospace, kanan atas)
- Judul: "Tagihan SPP"
- Badge kanan: **"Lunas"** (hijau muda, teks hijau tua)

---

## Banner Pembayaran Diterima

**Elemen paling menonjol** — langsung terlihat setelah header:

- Background hijau muda, border hijau
- Ikon lingkaran hijau solid dengan centang putih (besar, 40px)
- Judul: "Pembayaran diterima" (bold hijau)
- Sub-judul: "Terima kasih telah membayar"
- Kanan: nominal yang dibayar (bold) + tanggal pelunasan

Orang tua tidak perlu scroll untuk tahu status pembayaran sudah lunas.

---

## Informasi Pembayaran (Card 1)

Header: "Informasi pembayaran"

| Label | Nilai |
|---|---|
| Nama siswa | Nama lengkap |
| Kelas | Kelas siswa |
| Cabang | Nama cabang |
| Periode | Bulan + tahun |
| Tanggal tagihan | Tanggal generate invoice |
| **Tanggal lunas** | **Tanggal pelunasan (hijau)** |
| Dicatat oleh | "Admin · [Nama Cabang]" |

---

## Rincian Pembayaran (Card 2)

Header: "Rincian pembayaran"

Identik dengan versi Belum Lunas:
- Per mapel: nama + nominal + badge tipe + info sesi

---

## Total (Card 3)

| Baris | Keterangan |
|---|---|
| Subtotal | Jumlah semua mapel |
| Sudah dibayar | Nominal penuh (hijau) |
| **Sisa tagihan** | **Rp 0** (hijau, bold besar) |

---

## Stempel LUNAS

Card dengan 2 lapisan:

**Lapisan belakang (watermark)**:
- SVG lingkaran besar dengan teks "LUNAS" + "BIMBEL PINTAR"
- Opacity 7% — sangat transparan, hanya terlihat samar
- Dirotasi −20°

**Lapisan depan (stempel resmi)**:
- Judul kecil: "Bukti pembayaran resmi"
- Kotak dengan border hijau, border-radius lg:
  - Teks **"L U N A S"** (besar, spasi antar huruf, hijau)
  - Divider tipis hijau
  - Sub-teks: "Dibayar pada"
  - Tanggal + jam WIB (bold hijau)
  - Nama bimbel + cabang (kecil)

---

## Cap Digital

Card abu muda (berbeda dari versi Belum Lunas):
- Lingkaran border **hijau solid** (bukan transparan)
- Background lingkaran hijau muda
- Ikon logo berwarna hijau
- Nama bimbel + cabang
- Teks: "Dokumen resmi · **terverifikasi** digital"

---

## Footer Note

Teks kecil abu:
- "Simpan halaman ini sebagai bukti pembayaran resmi Anda."
- "Dokumen ini diterbitkan secara digital oleh [Nama Bimbel]."

---

## Perbedaan Kunci dari Versi Belum Lunas

| Elemen | Belum Lunas | Lunas |
|---|---|---|
| Badge header | Merah | **Hijau** |
| Banner atas body | Merah (peringatan bayar) | **Hijau (konfirmasi lunas)** |
| Card total | "Total tagihan" merah | **"Sisa tagihan: Rp 0" hijau** |
| Stempel | Tidak ada | **Stempel LUNAS + watermark** |
| Cap digital | Abu transparan | **Hijau solid** |
| Field "Tanggal lunas" | Tidak ada | **Ada, berwarna hijau** |
| Footer | "Bukti tagihan" | **"Bukti pembayaran"** |

---

## Keputusan Desain

- **Banner hijau besar di atas** — orang tua langsung tahu sudah lunas tanpa perlu scroll
- **Stempel dua lapis** (watermark + stempel resmi) — kesan dokumen resmi, tidak mudah dipalsukan secara visual
- **Tanggal + jam pelunasan** di stempel — informasi krusial untuk rekonsiliasi jika diperlukan
- **Cap digital berubah warna** dari abu ke hijau — perubahan visual yang konsisten dengan status
- **"Sisa tagihan: Rp 0"** bukan "Total lunas" — framing yang lebih jelas bahwa tidak ada lagi kewajiban
- **"Terverifikasi digital"** vs "diterbitkan secara digital" — perbedaan teks kecil yang bermakna untuk status lunas
