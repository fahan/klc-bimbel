# Business Rules — Sistem Manajemen Bimbel Multi-Cabang

## Daftar Isi
1. [Organisasi & Cabang](#1-organisasi--cabang)
2. [Hierarki Role & Akses](#2-hierarki-role--akses)
3. [Master Data](#3-master-data)
4. [Siswa](#4-siswa)
5. [Jadwal & Sesi](#5-jadwal--sesi)
6. [Presensi](#6-presensi)
7. [Tracking Progress](#7-tracking-progress)
8. [Komisi Guru](#8-komisi-guru)
9. [Pembayaran & Invoice](#9-pembayaran--invoice)
10. [Laporan](#10-laporan)
11. [Toko & Stok](#11-toko--stok)

---

## 1. Organisasi & Cabang

- Sistem mendukung **multi-cabang** dengan jumlah cabang yang bisa bertambah seiring waktu.
- Setiap cabang memiliki **nama unik** dan **kode unik** (contoh: PWK, BWS) yang digunakan sebagai prefix nomor invoice.
- Data yang bersifat **global** (shared semua cabang): mata pelajaran, tarif SPP, kurikulum modul, predikat penilaian, data master guru.
- Data yang bersifat **per cabang**: siswa, jadwal & sesi, presensi, pembayaran SPP, stok toko, komisi guru.
- Data yang bersifat **lintas cabang**: guru bisa mengajar di banyak cabang, siswa bisa pindah atau ikut sesi di cabang lain.

---

## 2. Hierarki Role & Akses

### Struktur hierarki
```
Owner
  └── Admin Global
        └── Admin Cabang
              └── Guru
```

### Detail akses per role

| Fitur | Owner | Admin Global | Admin Cabang | Guru |
|---|:---:|:---:|:---:|:---:|
| Semua cabang | ✅ | ✅ | ❌ (cabang sendiri) | ❌ |
| Master data global | ✅ | ✅ | ❌ | ❌ |
| Manajemen cabang | ✅ | ✅ | ❌ | ❌ |
| Kelola user & role | ✅ | ✅ | ❌ | ❌ |
| Gudang pusat & transfer stok | ✅ | ✅ | ❌ | ❌ |
| Data siswa cabang | ✅ | ✅ | ✅ | ❌ |
| Jadwal & sesi | ✅ | ✅ | ✅ | ✅ (lihat) |
| Presensi & progress | ✅ | ✅ | ✅ | ✅ (input) |
| Pembayaran SPP | ✅ | ✅ | ✅ | ❌ |
| Stok toko cabang | ✅ | ✅ | ✅ | ❌ |
| Laporan keuangan per cabang | ✅ | ✅ | ✅ | ❌ |
| Laporan konsolidasi semua cabang | ✅ | ✅ | ❌ | ❌ |
| Laporan komisi (semua cabang) | ✅ | ✅ | ❌ | ❌ |
| Laporan komisi (cabang sendiri) | ✅ | ✅ | ✅ | ✅ (milik sendiri) |
| Generate link laporan progress | ✅ | ✅ | ✅ | ❌ |
| Generate invoice | ✅ | ✅ | ✅ | ❌ |

### Aturan tambahan
- Satu user bisa memiliki role **Admin Cabang sekaligus Guru** — saat mengajar, mereka muncul sebagai guru dan bisa input presensi & progress.
- **Owner** tidak bisa diubah rolenya oleh siapapun.
- **Admin Global** punya akses penuh semua cabang seperti owner, namun tidak dapat melihat laporan keuangan yang bersifat owner-only (jika ada).
- Owner & Admin Global melihat data semua cabang via **cabang switcher** di topbar. Admin Cabang otomatis terkunci ke cabang sendiri.

---

## 3. Master Data

### Mata Pelajaran
- Mata pelajaran bersifat **global** (shared semua cabang), dikelola oleh Owner & Admin Global.
- Setiap mata pelajaran memiliki:
  - **Tipe tracking**: `module_based` (AHE, ASE, Les Ngaji) atau `free_material` (Matematika, Fisika, dll)
  - **Kapasitas reguler**: maksimal 2–3 siswa per sesi (tergantung mapel)
  - **Kapasitas private**: maksimal 1 siswa per sesi
- Satu guru bisa mengampu lebih dari satu mata pelajaran.
- Satu siswa bisa mengikuti lebih dari satu mata pelajaran (jadwal terpisah).

### Tarif SPP
- Tarif SPP bersifat **global** dan sama di semua cabang.
- Tarif dibedakan berdasarkan: **mata pelajaran + tipe (reguler/private) + tanggal mulai berlaku**.
- Tarif baru tidak menghapus tarif lama — sistem menyimpan histori semua tarif.
- **Lock SPP per siswa**: saat siswa mendaftar, tarif yang berlaku pada tanggal daftar di-lock ke siswa tersebut. Meskipun tarif naik di kemudian hari, SPP siswa tersebut tidak berubah — kecuali admin mengubah secara manual.
- Contoh: Siswa A daftar tahun 2023 (tarif Rp 100.000), Siswa B daftar 2024 (tarif Rp 150.000). Di tahun 2024, SPP Siswa A tetap Rp 100.000.

### Kurikulum Modul (untuk mapel `module_based`)
- Setiap mapel `module_based` memiliki daftar modul yang berurutan.
- Setiap modul memiliki jumlah total bab.
- Siswa harus menyelesaikan modul sebelumnya untuk lanjut ke modul berikutnya (**mastery-based learning**).

---

## 4. Siswa

- Setiap siswa memiliki **cabang utama** tempat ia terdaftar.
- Siswa bisa **pindah cabang permanen**: admin cabang asal memproses pindah, histori tetap tersimpan, SPP lock tidak berubah.
- Siswa bisa **ikut sesi di cabang lain (sementara)**: dicatat sebagai "siswa tamu", SPP tetap dibayar ke cabang utama.
- **Biaya registrasi** dikenakan sekali saat pendaftaran awal, terpisah dari SPP bulanan.

---

## 5. Jadwal & Sesi

### Struktur sesi
- Sesi = kombinasi **Guru + Mata Pelajaran + Hari + Jam + Cabang**.
- Jadwal default **konsisten mingguan** — sistem auto-generate session log setiap kali sesi terjadi.
- Perubahan jadwal dicatat sebagai pengecualian dari jadwal default.

### Kapasitas sesi
- **Reguler**: maksimal 2–3 siswa (sesuai konfigurasi mapel)
- **Private**: maksimal 1 siswa
- Saat siswa baru daftar → admin mencari slot kosong berdasarkan guru & jam yang tersedia.
- Umumnya setiap siswa mengikuti **3 sesi per minggu** untuk satu mata pelajaran.

### Penggantian guru
- Jika guru tetap tidak hadir, **guru lain bisa menggantikan** dengan langsung melakukan presensi di sesi tersebut.
- Sistem otomatis mendeteksi bahwa yang mengajar bukan guru tetap sesi.
- **Komisi sesi tersebut jatuh ke guru yang benar-benar mengajar** (guru pengganti), bukan guru tetap.

---

## 6. Presensi

- Presensi dilakukan oleh **guru via smartphone** setelah atau saat sesi berlangsung.
- Alur: Guru buka app → pilih sesi hari ini → centang status per siswa → submit.
- Status presensi: **Hadir / Absen / Izin / Sakit**.
- Siapapun yang submit presensi pada sesi tersebut = **guru yang dianggap mengajar** pada sesi itu.
- Admin juga bisa melakukan presensi untuk semua sesi.

---

## 7. Tracking Progress

### Tipe 1 — Modul berjenjang (`module_based`)
Untuk mapel: AHE, ASE, Les Ngaji, dan mapel berjenjang lainnya.

**Per sesi guru mencatat:**
- Modul yang dikerjakan
- Bab dari → sampai bab
- Jika bab terakhir modul dicapai → modul selesai → guru wajib memilih predikat
- Catatan opsional

**Aturan:**
- Siswa hanya bisa lanjut ke modul berikutnya setelah modul sebelumnya selesai 100%.
- Sistem menyimpan posisi terkini siswa (modul berapa, bab berapa) untuk referensi guru sesi berikutnya.

### Tipe 2 — Materi bebas (`free_material`)
Untuk mapel: Matematika, Fisika, Bahasa Inggris, dll.

**Per sesi guru mencatat:**
- Topik yang diajarkan (teks bebas, satu topik untuk semua siswa di sesi)
- Per siswa: predikat pemahaman + catatan khusus (opsional)

**Struktur input:**
```
Topik hari ini: [berlaku untuk semua siswa]
  └── Siswa A: Predikat + Catatan
  └── Siswa B: Predikat + Catatan
  └── Siswa C: Predikat + Catatan
```

### Predikat Penilaian
| No | Predikat | Makna |
|---|---|---|
| 1 | Perlu bimbingan | Belum memahami, perlu ulang materi |
| 2 | Cukup | Memahami dasar, masih perlu latihan |
| 3 | Baik | Memahami dengan baik, sedikit kesalahan |
| 4 | Baik sekali | Memahami dengan sangat baik |
| 5 | Memuaskan | Sempurna, dikerjakan mandiri tanpa bantuan |

### Laporan progress ke orang tua
- Laporan bersifat **on-demand** — admin generate kapan saja saat diminta.
- Laporan **terpisah per mata pelajaran** per siswa.
- Admin generate **link unik** per siswa dengan masa berlaku yang dapat dikonfigurasi (7 hari, 30 hari, 3 bulan, atau permanen).
- Orang tua membuka link → melihat laporan tanpa perlu login.
- Link dikirim via **WhatsApp** — sistem menyiapkan pesan otomatis.

---

## 8. Komisi Guru

### Formula komisi
```
Komisi per siswa per sesi =
  (SPP siswa ÷ total sesi terjadwal bulan ini) × 40%

Total komisi guru per bulan =
  Σ (komisi per sesi × jumlah sesi yang guru tersebut hadir mengajar siswa tsb)
  — dari semua siswa, semua mapel yang diampu, semua cabang
```

### Aturan komisi
- Komisi dihitung berdasarkan **siapa yang benar-benar mengajar** (actual teacher), bukan guru tetap sesi.
- Jika guru A digantikan guru B → komisi sesi itu jatuh ke **guru B**.
- Guru yang mengajar di banyak cabang → komisi diakumulasi dari semua cabang.
- Komisi dihitung **otomatis di akhir bulan** oleh sistem (pg_cron di Supabase).
- Status komisi: `draft` → `calculated` (akhir bulan) → `approved` (admin/owner setujui).
- Admin/Owner bisa melakukan **edit manual** sebelum approve jika ada koreksi.
- Setelah approve, komisi dicatat sebagai **pengeluaran** di laporan keuangan.

---

## 9. Pembayaran & Invoice

### Tipe invoice
| Tipe | Keterangan | Format Nomor |
|---|---|---|
| SPP Bulanan | Tagihan per siswa per bulan | `INV-SPP-[KODE]-[YYYYMM]-[URUT]` |
| Registrasi | Biaya pendaftaran siswa baru | `INV-REG-[KODE]-[YYYYMM]-[URUT]` |

**Contoh:** `INV-SPP-PWK-202605-001`, `INV-REG-BWS-202605-001`

### Aturan nomor invoice
- Nomor urut **reset setiap bulan per cabang**.
- Nomor otomatis di-generate sistem saat invoice dibuat.

### Status invoice
| Status | Keterangan |
|---|---|
| Belum Lunas | Tagihan penuh, belum ada pembayaran |
| Sebagian | Ada pembayaran masuk, masih ada sisa |
| Lunas | Terbayar penuh — berfungsi sebagai bukti pembayaran |

### Aturan invoice
- Satu invoice per siswa per bulan per cabang (untuk SPP).
- Invoice bisa di-generate ulang jika ada perubahan data.
- Setelah orang tua bayar, invoice update status otomatis.
- Invoice **Lunas** dengan stempel digital berfungsi sebagai **bukti pembayaran resmi**.
- Tidak ada fitur retur atau pengembalian.

### Pengiriman invoice
- Invoice dikirim via **link unik** melalui WhatsApp.
- Orang tua membuka link → melihat invoice digital tanpa login.
- Sistem menyiapkan pesan WhatsApp otomatis dengan nama siswa, periode, total, dan link.

### Pembayaran
- Pembayaran dicatat oleh admin (bukan guru).
- Pembayaran bisa dilakukan **bertahap** — setiap pembayaran menambah `paid_amount` di invoice.
- Metode: Tunai atau Transfer.

---

## 10. Laporan

### Laporan keuangan
- **Per cabang**: pemasukan (SPP + registrasi + penjualan toko), pengeluaran (komisi guru + pembelian stok), saldo bersih.
- **Konsolidasi**: semua cabang digabung — hanya bisa dilihat Owner & Admin Global.
- Period: bulanan, kuartalan, tahunan.

### Laporan komisi
- Admin/Owner bisa melihat breakdown komisi per guru, per mapel, per siswa.
- Transparansi penuh: formula kalkulasi ditampilkan (SPP ÷ total sesi × 40% × hadir).

### Laporan kehadiran siswa
- Rekapitulasi kehadiran per siswa per bulan per sesi.

### Laporan pembayaran
- Daftar invoice dengan status per periode.
- Filter: belum lunas, sebagian, lunas.

---

## 11. Toko & Stok

### Produk
- Stok produk bersifat **independen per cabang** — setiap cabang kelola stoknya sendiri.
- Terdapat **gudang pusat** yang mendistribusikan stok ke cabang.
- Kategori produk: Stationary, Modul, Seragam, Alat Tulis.
- Harga produk **sama untuk semua pembeli** — tidak ada perbedaan harga per siswa.
- Setiap produk memiliki **stok minimum** — sistem notifikasi jika stok ≤ minimum.

### Transfer stok (gudang pusat → cabang)
- **Admin Cabang** mengajukan request restock ke gudang pusat.
- **Owner atau Admin Global** mereview dan approve request.
- Setelah approve: stok gudang pusat berkurang, stok cabang bertambah.
- Setiap mutasi stok dicatat dengan timestamp dan approver.

### Penjualan toko
- Transaksi penjualan dicatat oleh **admin** cabang.
- Mendukung **multi-item** dalam satu transaksi.
- Pembeli bisa siswa (opsional) atau bukan siswa.
- Tidak ada fitur retur atau penukaran barang.
- Hasil penjualan masuk ke laporan keuangan sebagai **pemasukan — penjualan toko**.
- Pembelian stok masuk sebagai **pengeluaran — pembelian stok**.
