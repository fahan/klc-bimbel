# Dokumentasi Fitur Import Data Siswa

## 📋 Daftar File yang Dibuat/Dimodifikasi

### Backend (NestJS)

#### File Baru:
1. **`apps/backend/src/modules/students/dto/import-students.dto.ts`**
   - DTO untuk request validation
   - Interfaces untuk ImportStudentRow dan ImportStudentResult

2. **`apps/backend/src/modules/students/utils/csv-parser.ts`**
   - Utility class CsvParser untuk parsing CSV file
   - Validasi format CSV dan field yang diperlukan

#### File Dimodifikasi:
1. **`apps/backend/src/modules/students/students.service.ts`**
   - Ditambahkan method `importStudents(file: Express.Multer.File)`
   - Logic untuk parse CSV dan bulk upsert ke database
   - Validasi branch existence
   - Error handling dengan detail error per row

2. **`apps/backend/src/modules/students/students.controller.ts`**
   - Import FileInterceptor dan UseInterceptors
   - Ditambahkan endpoint POST `/students/import`
   - Role-based access control: OWNER, ADMIN_GLOBAL

### Frontend (Next.js + React)

#### File Baru:
1. **`apps/frontend/src/components/students/ImportStudentsModal.tsx`**
   - Modal component untuk upload file CSV
   - Drag-and-drop file upload support
   - Preview file sebelum import
   - Progress indicator saat upload
   - Display hasil import (sukses/error)
   - Download template CSV button

2. **`apps/frontend/public/templates/template_import_siswa.csv`**
   - Template CSV file untuk didownload
   - Contoh format yang benar

#### File Dimodifikasi:
1. **`apps/frontend/src/lib/api/endpoints.ts`**
   - Ditambahkan method `studentApi.import(formData: FormData)`

2. **`apps/frontend/src/app/(dashboard)/master-data/students/page.tsx`**
   - Import ImportStudentsModal component
   - State untuk manage modal open/close
   - Button "Import CSV" di header
   - Handler untuk refresh data setelah import sukses
   - Pesan sukses notification

---

## 🚀 Cara Menggunakan Fitur

### 1. Download Template CSV
- Klik button **"Import CSV"** di halaman Data Siswa
- Klik **"Download Template"** di modal
- File `template_import_siswa.csv` akan terdownload

### 2. Format CSV yang Benar
```csv
name,classLevel,parentName,parentPhone,branchId
Ahmad Rizki,10 SMA,Ibu Sarah,081234567890,branch_123
Siti Nurhaliza,11 SMA,Pak Budi,082345678901,branch_456
```

**Field:**
- `name` (required) - Nama siswa, minimal 3 karakter
- `classLevel` (optional) - Tingkat kelas
- `parentName` (optional) - Nama orang tua
- `parentPhone` (optional) - Nomor HP orang tua
- `branchId` (required) - ID cabang (harus valid di sistem)

### 3. Upload File
- Drag and drop file CSV ke modal, atau
- Klik area untuk membuka file picker
- Pilih file CSV yang sudah dipersiapkan

### 4. Review Sebelum Import
- Tampilkan nama file yang dipilih
- Klik "Import" untuk memproses

### 5. Hasil Import
**Jika Sukses:**
- Menampilkan: Total baris, Jumlah berhasil, Jumlah gagal
- Auto refresh data siswa
- Auto close modal setelah 2 detik

**Jika Ada Error:**
- Menampilkan detail error per baris
- List error apa yang terjadi di setiap baris
- Tidak ada data yang tersimpan jika ada error

---

## 🔍 Logika Import

### Proses Validasi CSV
1. Parse CSV file
2. Validasi header (harus ada: name, branchId)
3. Validasi setiap baris:
   - Cek field name dan branchId tidak kosong
   - Cek panjang name minimal 3 karakter
4. Validasi branch IDs ada di database

### Proses Upsert Data
1. Check apakah siswa dengan nama dan branchId yang sama sudah ada
2. **Jika ada**: Update data (classLevel, parentName, parentPhone)
3. **Jika tidak ada**: Create siswa baru
4. **Jika ada error di satu baris**: Batalkan seluruh import dan tampilkan error

---

## 🔒 Security & Permissions

- **Endpoint**: `POST /students/import`
- **Authentication**: JWT required (Bearer token)
- **Authorization**: OWNER, ADMIN_GLOBAL only
- **File Size**: Tidak ada limit khusus (tergantung konfigurasi Multer)
- **File Type**: CSV only

---

## 📝 Error Handling

### Error Saat Parse CSV
- File tidak valid (bukan CSV)
- Header tidak sesuai
- Field required kosong
- Data format tidak sesuai

### Error Saat Import
- Branch ID tidak valid
- Duplikasi data dengan constraint yang ada
- Database error

Semua error akan ditampilkan di modal dengan detail baris mana yang error dan pesan error apa.

---

## 🧪 Testing

### Test Case 1: Import Valid CSV
1. Download template
2. Isi data dengan benar (minimal 3 siswa)
3. Upload file
4. Verifikasi: Data siswa bertambah, tampilan success message

### Test Case 2: Import dengan Duplikasi (Update)
1. Upload siswa "Ahmad Rizki" dengan branchId tertentu
2. Upload lagi dengan data yang sama tapi classLevel berbeda
3. Verifikasi: Data diupdate (classLevel berubah)

### Test Case 3: Import dengan Error
1. Upload CSV dengan field name kosong
2. Verifikasi: Tampil error detail, data tidak tersimpan

### Test Case 4: Import dengan Invalid Branch
1. Upload CSV dengan branchId yang tidak ada
2. Verifikasi: Error ditampilkan, import dibatalkan

### Test Case 5: Permission Check
1. Login sebagai GURU (tidak punya permission)
2. Coba akses endpoint `/students/import` directly
3. Verifikasi: Error 403 Forbidden

---

## 📊 Database Impact

Jika import sukses, akan terjadi:
- `INSERT` untuk siswa baru
- `UPDATE` untuk siswa yang sudah ada
- Tidak ada `DELETE`

Kolom yang di-update: `classLevel`, `parentName`, `parentPhone`, `updatedAt`

---

## 🔧 Troubleshooting

### Modal tidak muncul
- Pastikan component ImportStudentsModal sudah di-import
- Cek browser console untuk error

### File tidak bisa upload
- Pastikan file adalah CSV (tidak Excel)
- Cek ukuran file
- Cek permission user (harus OWNER atau ADMIN_GLOBAL)

### Import gagal dengan error 500
- Cek server logs untuk detail error
- Verifikasi database connection
- Cek format CSV dan data validity

---

## ✅ Checklist Implementasi

- [x] Backend API endpoint untuk import CSV
- [x] CSV parser dan validasi
- [x] Bulk upsert ke database
- [x] Error handling dengan detail
- [x] Frontend modal component
- [x] Drag-and-drop file upload
- [x] Template CSV download
- [x] Success notification
- [x] Auto refresh data
- [x] Role-based access control
- [x] Comprehensive error display

---

## 🎯 Fitur Tambahan di Masa Depan

Berikut adalah saran fitur yang bisa ditambahkan:
1. Progress bar dengan persentase (untuk file besar)
2. Preview data sebelum import (show first 5 rows)
3. Batch size management untuk file sangat besar
4. Import history log
5. Undo import functionality
6. Export template dari existing data

