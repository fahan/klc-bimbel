# Wireframe: Input Progress Guru (Mobile)

## Informasi Umum
- **Role**: Guru, Admin Cabang (saat merangkap guru)
- **Platform**: Mobile (smartphone, PWA)
- **Akses**: Terintegrasi dalam alur presensi — muncul sebagai **Step 2** setelah presensi

---

## Alur Terintegrasi dengan Presensi

```
Step 1: Presensi siswa (hadir/absen)
   ↓
Step 2: Input progress belajar  ← halaman ini
   ↓
Step 3: Selesai
```

**Stepper** ditampilkan di atas layar:
- Step 1 (Presensi): ikon centang hijau (sudah selesai)
- Step 2 (Progress): nomor biru (aktif)
- Step 3 (Selesai): nomor abu (belum)

---

## Topbar

- Tombol back (←)
- Judul: nama mapel + hari + jam
- Sub-judul: nama guru + jumlah siswa
- Badge tipe tracking di kanan (otomatis dari master data)

---

## Badge Tipe Tracking

Sistem otomatis menentukan tipe dari master data mapel:
- **Ungu** "Modul": untuk mapel `module_based` (AHE, ASE, Les Ngaji)
- **Hijau teal** "Materi bebas": untuk mapel `free_material` (Matematika, Fisika, dll)

Guru tidak perlu memilih tipe — sistem yang tahu.

---

## Ringkasan Presensi (Step 1)

Card kecil di atas menampilkan hasil presensi yang sudah diisi:
- Background hijau muda
- Ikon centang
- Teks: "[Nama siswa] — Hadir · [Nama siswa 2] — Hadir"
- Tombol "Edit" jika perlu koreksi

---

## Tipe 1 — Form Modul Berjenjang (MODULE_BASED)

### Card progress belajar

**Posisi terakhir siswa**
- Chip info: "Modul X · Bab Y" + badge "Sedang berjalan" / "Belum mulai"
- Diambil otomatis dari `student_module_progress`

**Pilih modul**
- Dropdown: daftar modul (hanya modul yang sedang berjalan atau berikutnya)
- Di samping: info progress "X/Y bab"

**Progress bar modul**
- Bar horizontal tipis (biru)
- Label: "X/Y bab"

**Bab yang dikerjakan hari ini**
- 2 input angka: "Dari [  ]" — "[  ]"
- Label kecil di atas masing-masing: "Dari" dan "Sampai"

**Banner modul selesai** (muncul otomatis jika bab to = total bab modul)
- Background hijau
- Ikon centang
- Teks: "Modul X selesai hari ini! Pilih predikat di bawah."

**Predikat penyelesaian modul** (hanya muncul jika modul selesai)
- 4 tombol grid (2×2) + 1 tombol full-width:
  - Perlu bimbingan (merah)
  - Cukup (amber)
  - Baik (biru)
  - Baik sekali (hijau)
  - Memuaskan (teal, full-width)
- Tombol terpilih: border tebal + background solid

**Catatan (opsional)**
- Textarea: "Topik yang dibahas, catatan khusus..."

---

## Tipe 2 — Form Materi Bebas (FREE_MATERIAL)

### Info banner biru
- Teks: "Topik berlaku untuk semua siswa. Predikat & catatan diisi per siswa."

### Topik hari ini (satu untuk semua siswa)
- Input teks bebas
- Placeholder: contoh topik
- Hint kecil: "Satu topik untuk semua siswa di sesi ini"

### Per siswa (diulang untuk setiap siswa yang hadir)

**Header blok siswa**
- Background abu muda
- Avatar inisial + nama siswa + badge "Hadir"

**Isi blok siswa:**

1. **Predikat pemahaman**
   - Sama seperti tipe modul: 4 tombol grid + 1 full-width
   - Predikat untuk siswa ini (independent dari siswa lain)

2. **Catatan untuk [Nama siswa] (opsional)**
   - Textarea khusus per siswa
   - Placeholder: "Observasi khusus untuk siswa ini..."

---

## Tombol Submit

- **"Simpan progress"** (biru, full-width, besar)
- Ikon centang di kiri tombol

---

## Keputusan Desain

- **Integrasi dengan presensi** dalam satu alur — guru tidak perlu buka menu terpisah
- **Posisi terakhir siswa tampil otomatis** — guru tidak perlu ingat atau tanya siswa
- **Banner modul selesai muncul otomatis** — guru tidak perlu hitung manual apakah modul sudah selesai
- **Predikat hanya muncul saat modul selesai** (tipe modul) — menjaga form tetap sederhana
- **Topik satu untuk semua, predikat per siswa** (tipe bebas) — realistis karena guru mengajar topik yang sama tapi tiap siswa bisa berbeda pemahamannya
- **Catatan per siswa** bukan satu catatan untuk semua — laporan ke orang tua bisa lebih personal
