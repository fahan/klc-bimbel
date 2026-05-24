# Soft Delete Implementation untuk Jadwal Sesi (Opsi 4)

## Overview
Implementasi soft delete pattern untuk Session (jadwal sesi) agar mendukung frequent schedule changes sambil mempertahankan data integrity.

## Perubahan Backend

### 1. **sessions.service.ts** - Modifikasi Delete Logic

#### `remove()` method (Soft Delete)
- Sebelum: Hard delete langsung menghapus dari database
- Sesudah: Update `isActive = false` untuk preserve history
- Cek: Session tidak boleh punya active students
- Response: "Session archived successfully"

#### New `hardDelete()` method (Permanent Delete)
- Hanya untuk OWNER & ADMIN_GLOBAL
- Validasi: Tidak ada active students & no attendance records
- Jika ada attendance records → ERROR: Cannot hard-delete
- Response: "Session permanently deleted"

### 2. **sessions.controller.ts** - Endpoint Updates

```
DELETE /sessions/:id
├─ Soft delete (archive)
├─ Roles: OWNER, ADMIN_GLOBAL, ADMIN_CABANG
└─ Response: "Session archived successfully"

DELETE /sessions/:id/hard-delete  (NEW)
├─ Hard delete (permanent)
├─ Roles: OWNER, ADMIN_GLOBAL ONLY
└─ Response: "Session permanently deleted"
```

## Perubahan Frontend

### 1. **lib/api/endpoints.ts** - Add Hard Delete Method
```typescript
sessionApi.delete(id)        // Soft delete
sessionApi.hardDelete(id)    // Hard delete (permanent)
```

### 2. **jadwal-sesi/[id]/page.tsx** - Delete Modal UI

#### New Features:
- **Delete Modal Dialog** dengan 2 opsi clear
- **Soft Delete (Archive)**:
  - Jadwal dipindahkan ke inactive (arsip)
  - Semua riwayat kehadiran tetap
  - Dapat dibuat ulang dengan jadwal yang sama
  - Recommended untuk session dengan history
  
- **Hard Delete (Permanent)**:
  - Selamanya hapus dari sistem
  - Hanya untuk session tanpa attendance
  - TIDAK bisa dipulihkan
  - Warning yang jelas

#### UX Improvements:
- Modal menampilkan session details (mata pelajaran, guru, hari, jam)
- Dua button dengan warna berbeda (orange untuk archive, red untuk delete)
- Rekomendasi inline untuk guide pengguna
- Error handling dengan message yang informatif

## Workflow Scenario User (Case Saras)

### Initial State:
```
Senin 10:30 - AHE (Saras) - Kirana, Jihan ✅ (4 minggu attendance)
```

### Change Request:
```
Senin 10:30 - ASE (Saras) - Jono, Joni
```

### User Action:
1. Admin buka detail session AHE
2. Klik tombol "Hapus"
3. Modal muncul dengan 2 pilihan:
   - 📦 **Arsipkan Sesi** (recommended)
     - Klik → session jadi inactive
     - Attendance history preserved
     - Redirect ke /jadwal-sesi
   
4. Admin buat session baru:
   - POST /sessions
   - Senin 10:30 - ASE (Saras) - Jono, Joni
   - Success ✅

### Result:
```
Session lama:     AHE (INACTIVE - archived)
Session baru:     ASE (ACTIVE) ✅
Attendance:       Semua intact ✅
Commission calc:  Akurat ✅
Audit trail:      Clear ✅
```

## Data Integrity Protection

### Attendance Records:
- ✅ Soft delete: Preserved (accessible via reports)
- ❌ Hard delete: Blocked if exists
- Impact: Invoice & Commission calculations safe

### Timeline:
```
Scenario: Delete session dengan 4 minggu attendance

Soft Delete:
- Session.isActive = false
- SessionLog records: Tetap ada
- Attendance records: Tetap ada
- Can recreate schedule: YES
- Data: 100% preserved

Hard Delete:
- Blocked dengan error message
- User harus pilih soft delete
- Data protection: GUARANTEED
```

## Database Changes

### Schema:
- `Session.isActive` (existing) digunakan untuk soft delete
- No migration needed (field sudah ada)

### Queries:
- `findAll()`: WHERE isActive = true (auto exclude archived)
- `getOne()`: Direct query (returns archived jika requested)
- Validasi duplikat: Only check WHERE isActive = true

## Rollback Plan

Jika perlu kembali ke hard delete:
1. Admin buka session detail dengan attendance
2. Backend prevent hard delete dengan clear error
3. Admin dipandu untuk soft delete dulu
4. Zero data loss

## Testing Checklist

- [ ] Create session dengan students
- [ ] Wait 1 week (generate attendance)
- [ ] Click delete → Modal muncul
- [ ] Soft delete → Session archived, attendance intact
- [ ] Try hard delete → Error message (cannot delete with attendance)
- [ ] Create session baru dengan jadwal sama → Success
- [ ] Verify attendance history preserved di reports
- [ ] Verify commission calculation still accurate

## Migration Guide

Untuk existing sessions:
- No data migration needed
- Soft-deleted sessions dari before → masih ada, isActive = false
- All queries auto-exclude them (WHERE isActive = true)
- Hard delete attempt → block if attendance exists

