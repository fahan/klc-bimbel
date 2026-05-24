# Wireframe: Laporan Keuangan

## Informasi Umum
- **Role**: Admin Cabang (per cabang), Admin Global & Owner (semua cabang + konsolidasi)
- **Platform**: Desktop
- **Akses**: Menu "Keuangan" di sidebar → Laporan

---

## Layout

- **Topbar**: judul + selector periode + navigasi bulan + export
- **4 Metric cards**
- **Net bar** (ringkasan satu baris)
- **2 kolom**: grafik tren + breakdown sumber
- **Tabel transaksi terbaru**

---

## Topbar

**Kiri:**
- Judul: "Laporan keuangan"
- Sub-judul: "Pemasukan, pengeluaran, dan saldo bersih"

**Kanan:**
- Dropdown periode: `Bulanan` / `Kuartalan` / `Tahunan`
- Navigasi periode: [←] [April 2026] [→ (nonaktif jika bulan berjalan)]
- Tombol `Export`

---

## 4 Metric Cards

| Card | Nilai | Sub-info |
|---|---|---|
| Total pemasukan | Rp X | +X% vs bulan lalu (hijau jika naik) |
| Total pengeluaran | Rp X | Komisi guru |
| Saldo bersih | Rp X | Surplus bulan ini |
| SPP belum terbayar | Rp X | X siswa menunggak (merah) |

---

## Net Bar

Satu baris ringkasan komponen keuangan:

```
[SPP terkumpul: Rp X] | [Biaya registrasi: Rp X] | [Komisi guru: −Rp X] | [Pengeluaran lain: −Rp X]
                                                        Saldo bersih [Bulan] [Tahun]: Rp X
                                                        [Surplus X%]
```

- Pemasukan: teks hijau
- Pengeluaran: teks merah dengan tanda minus
- Badge surplus/defisit di kanan

---

## 2 Kolom Tengah

### Panel kiri — Grafik tren 6 bulan

- **Judul**: "Tren 6 bulan terakhir"
- **Legend**: Pemasukan (hijau muda) | Pengeluaran (merah muda) | Saldo bersih (biru garis)
- **Chart**: Bar chart (pemasukan + pengeluaran) + Line chart overlay (saldo bersih)
- Sumbu Y: label "Rp Xjt"
- Sumbu X: bulan (Nov, Des, Jan, Feb, Mar, Apr)
- Tooltip saat hover: nilai per kategori per bulan

### Panel kanan — Sumber pemasukan & pengeluaran

**Bagian Pemasukan:**

| Item | Bar | Persen | Nilai |
|---|---|---|---|
| SPP bulanan | ████████ 90% | 90% | Rp X |
| Biaya registrasi | █ 10% | 10% | Rp X |
| Penjualan toko | ██ | X% | Rp X |

**Divider**

**Bagian Pengeluaran:**

| Item | Bar | Persen | Nilai |
|---|---|---|---|
| Komisi guru | ████████ 100% | 100% | Rp X |
| Pembelian stok | █ | X% | Rp X |

---

## Tabel Transaksi Terbaru

### Kolom
| Kolom | Keterangan |
|---|---|
| Tanggal | Tanggal transaksi |
| Jenis | Badge: SPP (hijau) / Registrasi (biru) / Komisi (merah) / Penjualan (amber) |
| Keterangan | Nama siswa + detail |
| Dicatat oleh | Nama admin/sistem |
| Jumlah | +Rp X (hijau) atau −Rp X (merah) |

- Link "Lihat semua" di header tabel
- Hover row: background abu terang

---

## Catatan Multi-Cabang

**Owner & Admin Global:**
- Dropdown di topbar untuk switch antara "Semua Cabang" atau cabang tertentu
- Mode "Semua Cabang": metric cards menampilkan data konsolidasi, grafik menampilkan line per cabang berdampingan

**Admin Cabang:**
- Hanya melihat data cabangnya sendiri
- Tidak ada dropdown cabang

---

## Keputusan Desain

- **Net bar** memberikan ringkasan finansial dalam satu baris tanpa perlu membaca semua card
- **Grafik bar + line** dalam satu chart memudahkan melihat hubungan pemasukan vs pengeluaran vs surplus
- **Card "SPP belum terbayar"** berwarna merah di metric — pengingat piutang yang harus dikejar
- **Tabel transaksi** di bawah untuk audit trail cepat tanpa perlu ke halaman terpisah
- **Badge warna per jenis transaksi** memudahkan scanning visual tipe transaksi
