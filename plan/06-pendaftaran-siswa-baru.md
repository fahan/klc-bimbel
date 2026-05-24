# Wireframe: Pendaftaran Siswa Baru

## Informasi Umum
- **Role**: Admin Cabang, Admin Global, Owner
- **Platform**: Desktop
- **Akses**: Card menu "Daftarkan siswa" di Dashboard, atau menu "Data siswa" → Tambah

---

## Layout

Form multi-step dengan:
- **Topbar**: judul
- **Stepper** 4 langkah di bawah topbar
- **Body 2 kolom**: kiri (data sudah diisi), kanan (aksi aktif)
- **Footer**: navigasi langkah

---

## Stepper 4 Langkah

```
[✓] Data siswa → [✓] Mata pelajaran → [3] Pilih jadwal → [ ] Konfirmasi
```

- Langkah selesai: ikon centang hijau
- Langkah aktif: nomor biru
- Langkah belum: nomor abu

---

## Kolom Kiri — Data Sudah Diisi (Referensi)

### Card 1 — Data siswa (readonly setelah langkah 1)
- Nama lengkap
- Tanggal lahir + Kelas (2 kolom)
- No. HP orang tua
- Tanggal daftar
- Tombol "Edit" di header card (kecil, hijau)

### Card 2 — Mata pelajaran & tipe (readonly setelah langkah 2)
Setiap mapel yang dipilih ditampilkan dengan:
- Nama mapel + ikon centang
- Toggle tipe: Reguler / Private
- Keterangan SPP: "Rp X/bulan · tarif berlaku [tanggal]"
- Tombol "+ Tambah mata pelajaran lain" (abu, di akhir list)
- Tombol "Edit" di header card

---

## Kolom Kanan — Aksi Aktif (Langkah 3: Pilih Jadwal)

### Card — Pilih slot jadwal

Sub-judul: "Pilih 1 slot per mata pelajaran · 3 sesi/minggu"

**Per mata pelajaran**, ditampilkan:

**Filter hari**
- Pill button: Semua hari | Senin | Selasa | Rabu | ...
- Pill "Ada slot kosong" untuk filter cepat

**List slot tersedia**
Setiap slot card berisi:
- Hari-hari sesi (misal: Senin · Rabu · Jumat)
- Jam + nama guru + nama mapel
- Kapasitas: `X/Y siswa`
- Badge: **Ada slot** (hijau) / **Kosong** (hijau) / **Penuh** (merah, tidak bisa diklik)

Slot terpilih: border biru + background biru muda
Slot penuh: opacity 50%, cursor tidak-diperbolehkan

---

## Kolom Kanan — Ringkasan Pendaftaran

Card ringkasan selalu terlihat di kanan bawah:

**Isi ringkasan:**
- Nama siswa
- Per mapel: nama + tipe + hari/jam + nama guru
- ---
- Biaya registrasi: Rp X
- SPP per mapel per bulan
- ---
- **Total tagihan pertama** (semua dijumlahkan)

**Banner lock SPP (amber):**
- Ikon info
- Teks: "Tarif SPP di-lock sesuai harga hari ini ([tanggal]). Jika tarif naik di masa mendatang, SPP siswa ini tidak berubah."

---

## Footer Navigasi

- Kiri: "Langkah X dari 4 · [nama langkah]"
- Kanan: Tombol `Kembali` + Tombol `Lanjut ke [langkah berikutnya] →` (biru)

---

## Keputusan Desain

- **Layout 2 kolom** — data lama tetap terlihat sebagai referensi tanpa harus bolak-balik halaman
- **Slot penuh otomatis nonaktif** — admin tidak mungkin salah pilih slot yang sudah penuh
- **Toggle tipe langsung mengubah nominal SPP** yang ditampilkan — konsekuensi langsung terlihat
- **Banner lock SPP amber** di ringkasan — pengingat penting agar admin sadar konsekuensi harga
- **Stepper 4 langkah** — admin tahu persis sudah di tahap mana, tidak bingung
- **Total tagihan pertama** langsung terlihat di ringkasan termasuk registrasi — transparansi biaya
