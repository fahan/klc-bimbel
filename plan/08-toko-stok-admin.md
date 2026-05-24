# Wireframe: Toko & Stok Admin

## Informasi Umum
- **Role**: Admin Cabang (stok cabangnya), Admin Global & Owner (semua cabang + gudang pusat)
- **Platform**: Desktop
- **Akses**: Menu "Toko & stok" di sidebar

---

## Layout

- **Topbar**: judul + tombol tambah produk & restock
- **Alert bar**: notifikasi stok menipis/habis
- **Filter bar**: kategori + filter stok + search
- **Body 2 kolom**: kiri (metric + tabel produk + legend), kanan (form catat penjualan + panel restock)

---

## Topbar

**Kiri:**
- Judul: "Toko & stok"
- Sub-judul: "Penjualan stationary, modul, dan seragam"

**Kanan:**
- Tombol `+ Tambah produk`
- Tombol `Catat restock` (biru)

---

## Alert Bar

Muncul jika ada produk stok menipis atau habis:
- Background amber
- Ikon peringatan
- Teks: "X produk stok menipis dan Y produk stok habis — segera lakukan restock."
- Link "Lihat produk →" di kanan

---

## Filter Bar

- Label "Kategori:"
- Pill: Semua | Stationary | Modul | Seragam | Alat tulis
- Pill **"Stok menipis"** (amber) — filter khusus
- Search input "Cari produk..." di kanan (margin-left: auto)

---

## Kolom Kiri

### 4 Metric Cards

| Card | Keterangan |
|---|---|
| Total produk | Jumlah jenis produk + jumlah kategori |
| Stok menipis | Jumlah produk di bawah min_stock |
| Stok habis | Jumlah produk dengan stok = 0 |
| Penjualan bulan ini | Total nilai + jumlah transaksi |

### Tabel Produk

**Kolom:**
| Kolom | Keterangan |
|---|---|
| Produk | Nama + detail (ukuran, tipe, dll) |
| Kategori | Badge warna per kategori |
| Harga | Harga jual |
| Stok min | Angka minimum |
| Status stok | Angka + progress bar + badge |
| Aksi | Tombol Jual + Restock |

**Progress bar status stok:**
- Hijau: stok aman (di atas min_stock)
- Amber: stok menipis (mendekati min_stock)
- Merah: stok habis (= 0)

**Badge status:**
- Menipis (amber)
- Habis (merah)

**Baris stok menipis/habis**: background amber muda

**Tombol "Jual"**: nonaktif (abu, cursor not-allowed) jika stok = 0

---

## Kolom Kanan

### Card — Catat Penjualan

**Field:**
1. **Pembeli** (opsional) — input search nama siswa
2. **Item yang dijual**:
   - List item yang sudah ditambahkan (avatar chip):
     - Nama produk + jumlah (× N) + subtotal
     - Tombol × untuk hapus item
   - **Row tambah item**:
     - Dropdown pilih produk
     - Input jumlah (number)
     - Tombol `Tambah`
3. **Metode pembayaran**: Tunai / Transfer
4. **Total** (dihitung otomatis, bold)
5. Tombol `Simpan transaksi` (biru, full-width)

---

### Card — Perlu Restock Segera

- Header: "Perlu restock segera" + badge jumlah produk (amber)
- List produk kritis:
  - Dot merah: stok habis
  - Dot amber: stok menipis
  - Nama produk
  - Info stok: "Stok habis · min X" atau "Sisa X · min Y"
  - Tombol `+ Restock` per produk

---

## Alur Restock

Saat admin klik `+ Restock` atau `Catat restock`:
1. Modal/form muncul: pilih produk, masukkan jumlah masuk
2. Sistem catat `stock_mutations` dengan type: `IN`
3. `products.stock` bertambah
4. Mutasi tercatat sebagai **pengeluaran — pembelian stok** di laporan keuangan

**Untuk transfer dari gudang pusat:**
1. Admin Cabang klik `Request restock`
2. Owner/Admin Global menerima notifikasi request
3. Approve → `stock_mutations` type `TRANSFER_OUT` di gudang, `TRANSFER_IN` di cabang

---

## Keputusan Desain

- **Alert bar kuning** langsung terlihat di bagian atas — tidak perlu scroll untuk tahu ada stok kritis
- **Progress bar stok visual** lebih intuitif dari sekadar angka — admin langsung tahu kondisi stok
- **Tombol "Jual" nonaktif** jika stok habis — mencegah error input
- **Form catat penjualan di sidebar kanan** — admin bisa lihat daftar produk dan langsung catat penjualan tanpa navigasi
- **Multi-item dalam satu transaksi** — realistis karena orang sering beli lebih dari satu item
- **Panel restock prioritas** menampilkan hanya produk yang urgent — tidak semua produk
