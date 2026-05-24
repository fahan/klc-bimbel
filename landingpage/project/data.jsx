/* global React */
// Mock data for the Learning Center prototype.

const BRANCHES = [
  { code: "PWK", name: "Cabang Purwakarta", city: "Purwakarta",  students: 142, teachers: 12 },
  { code: "BWS", name: "Cabang Bawean",     city: "Bawean",      students: 98,  teachers: 9 },
  { code: "JKT", name: "Cabang Jakarta",    city: "Jakarta Pusat", students: 184, teachers: 14 },
  { code: "BDG", name: "Cabang Bandung",    city: "Bandung",     students: 121, teachers: 10 },
];

const SUBJECTS = [
  { id: "ahe",  name: "AHE (Aritmatika)", type: "module_based", reg: 3, priv: 1, color: "#4A56E0" },
  { id: "ase",  name: "ASE (Sempoa)",     type: "module_based", reg: 3, priv: 1, color: "#6366F1" },
  { id: "ngji", name: "Les Ngaji",        type: "module_based", reg: 2, priv: 1, color: "#10B981" },
  { id: "mtk",  name: "Matematika",       type: "free_material", reg: 3, priv: 1, color: "#F59E0B" },
  { id: "fis",  name: "Fisika",           type: "free_material", reg: 3, priv: 1, color: "#EF4444" },
  { id: "ing",  name: "Bahasa Inggris",   type: "free_material", reg: 3, priv: 1, color: "#3B82F6" },
];

const TARIFS = [
  { subject: "AHE",          type: "Reguler", price: 350000, since: "2024-01-01" },
  { subject: "AHE",          type: "Private", price: 600000, since: "2024-01-01" },
  { subject: "ASE",          type: "Reguler", price: 350000, since: "2024-01-01" },
  { subject: "Les Ngaji",    type: "Reguler", price: 280000, since: "2023-07-01" },
  { subject: "Matematika",   type: "Reguler", price: 400000, since: "2025-01-01" },
  { subject: "Matematika",   type: "Private", price: 700000, since: "2025-01-01" },
  { subject: "Fisika",       type: "Reguler", price: 400000, since: "2025-01-01" },
  { subject: "Bahasa Inggris", type: "Reguler", price: 380000, since: "2024-09-01" },
];

const STUDENTS = [
  { id: "S001", name: "Aira Putri Maharani", initials: "AP", branch: "PWK", grade: "Kelas 5 SD",   subjects: ["AHE", "Matematika"], status: "Aktif",   joinDate: "2023-08-12", parent: "Ibu Diah",       phone: "0812-3344-1101", spp: 750000, attendance: 96 },
  { id: "S002", name: "Bagas Aditya Pratama", initials: "BA", branch: "PWK", grade: "Kelas 6 SD",   subjects: ["AHE", "ASE"],         status: "Aktif",   joinDate: "2023-02-04", parent: "Bpk Hendra",     phone: "0812-3344-1102", spp: 700000, attendance: 92 },
  { id: "S003", name: "Citra Anggun Pertiwi", initials: "CA", branch: "PWK", grade: "Kelas 8 SMP",  subjects: ["Matematika", "Fisika"],status: "Aktif",   joinDate: "2024-01-15", parent: "Ibu Ratna",      phone: "0812-3344-1103", spp: 800000, attendance: 88 },
  { id: "S004", name: "Dirga Bayu Saputra",   initials: "DB", branch: "JKT", grade: "Kelas 4 SD",   subjects: ["AHE"],                status: "Aktif",   joinDate: "2025-03-21", parent: "Bpk Wijaya",     phone: "0812-3344-1104", spp: 350000, attendance: 100 },
  { id: "S005", name: "Elsa Damayanti",        initials: "ED", branch: "JKT", grade: "Kelas 9 SMP",  subjects: ["Matematika", "Bahasa Inggris"], status: "Aktif", joinDate: "2024-05-10", parent: "Ibu Nani", phone: "0812-3344-1105", spp: 780000, attendance: 78 },
  { id: "S006", name: "Faiz Mahendra",         initials: "FM", branch: "BWS", grade: "Kelas 7 SMP",  subjects: ["Matematika"],          status: "Cuti",    joinDate: "2024-08-02", parent: "Bpk Anton",      phone: "0812-3344-1106", spp: 400000, attendance: 64 },
  { id: "S007", name: "Gita Permata Sari",     initials: "GP", branch: "BDG", grade: "Kelas 3 SD",   subjects: ["Les Ngaji", "AHE"],   status: "Aktif",   joinDate: "2024-11-19", parent: "Ibu Sari",       phone: "0812-3344-1107", spp: 630000, attendance: 100 },
  { id: "S008", name: "Hafidz Akbar",          initials: "HA", branch: "PWK", grade: "Kelas 5 SD",   subjects: ["AHE", "Les Ngaji"],   status: "Aktif",   joinDate: "2023-11-03", parent: "Bpk Akbar",      phone: "0812-3344-1108", spp: 630000, attendance: 94 },
  { id: "S009", name: "Indira Wulandari",      initials: "IW", branch: "BDG", grade: "Kelas 10 SMA", subjects: ["Fisika", "Matematika"], status: "Aktif", joinDate: "2025-02-08", parent: "Ibu Yanti", phone: "0812-3344-1109", spp: 800000, attendance: 90 },
  { id: "S010", name: "Joshua Tanuwijaya",     initials: "JT", branch: "JKT", grade: "Kelas 11 SMA", subjects: ["Matematika", "Fisika", "Bahasa Inggris"], status: "Aktif", joinDate: "2024-07-30", parent: "Ibu Lina", phone: "0812-3344-1110", spp: 1180000, attendance: 86 },
];

const TEACHERS = [
  { id: "T01", name: "Bu Rini Astuti",     initials: "RA", subjects: ["AHE", "ASE"],            branches: ["PWK", "JKT"], sessions: 48 },
  { id: "T02", name: "Pak Budi Santoso",   initials: "BS", subjects: ["Matematika", "Fisika"],  branches: ["PWK"],        sessions: 36 },
  { id: "T03", name: "Ustadz Hasan",       initials: "UH", subjects: ["Les Ngaji"],             branches: ["PWK", "BWS"], sessions: 24 },
  { id: "T04", name: "Bu Sinta Maharani",  initials: "SM", subjects: ["Bahasa Inggris"],        branches: ["JKT"],        sessions: 30 },
  { id: "T05", name: "Pak Doni Wibowo",    initials: "DW", subjects: ["AHE", "Matematika"],     branches: ["BDG"],        sessions: 42 },
  { id: "T06", name: "Bu Anggun Lestari",  initials: "AL", subjects: ["ASE"],                   branches: ["JKT", "BDG"], sessions: 28 },
];

// Module curriculum example (AHE)
const AHE_CURRICULUM = [
  { module: "Modul 1 — Penjumlahan Dasar", chapters: 8 },
  { module: "Modul 2 — Pengurangan Dasar", chapters: 8 },
  { module: "Modul 3 — Operasi Campuran",  chapters: 10 },
  { module: "Modul 4 — Perkalian Sederhana", chapters: 10 },
  { module: "Modul 5 — Pembagian",         chapters: 12 },
  { module: "Modul 6 — Bilangan Besar",    chapters: 14 },
];

const SCHEDULE = [
  // Mon
  { day: 1, start: "14:00", end: "15:30", subject: "AHE",        teacher: "Bu Rini",     room: "Ruang 1", students: 3, capacity: 3 },
  { day: 1, start: "15:30", end: "17:00", subject: "Matematika", teacher: "Pak Budi",    room: "Ruang 2", students: 2, capacity: 3 },
  { day: 1, start: "17:00", end: "18:30", subject: "Les Ngaji",  teacher: "Ust. Hasan",  room: "Mushola", students: 2, capacity: 2 },
  // Tue
  { day: 2, start: "14:00", end: "15:30", subject: "ASE",        teacher: "Bu Rini",     room: "Ruang 1", students: 3, capacity: 3 },
  { day: 2, start: "15:30", end: "17:00", subject: "Fisika",     teacher: "Pak Budi",    room: "Ruang 2", students: 1, capacity: 3 },
  // Wed
  { day: 3, start: "14:00", end: "15:30", subject: "AHE",        teacher: "Bu Rini",     room: "Ruang 1", students: 3, capacity: 3 },
  { day: 3, start: "15:30", end: "17:00", subject: "Matematika", teacher: "Pak Budi",    room: "Ruang 2", students: 3, capacity: 3 },
  { day: 3, start: "17:00", end: "18:30", subject: "Bahasa Inggris", teacher: "Bu Sinta",room: "Ruang 3", students: 2, capacity: 3 },
  // Thu
  { day: 4, start: "14:00", end: "15:30", subject: "ASE",        teacher: "Bu Rini",     room: "Ruang 1", students: 2, capacity: 3 },
  { day: 4, start: "15:30", end: "17:00", subject: "Les Ngaji",  teacher: "Ust. Hasan",  room: "Mushola", students: 2, capacity: 2 },
  // Fri
  { day: 5, start: "14:00", end: "15:30", subject: "AHE",        teacher: "Bu Rini",     room: "Ruang 1", students: 3, capacity: 3 },
  { day: 5, start: "15:30", end: "17:00", subject: "Matematika (Private)", teacher: "Pak Budi", room: "Ruang 2", students: 1, capacity: 1 },
  // Sat
  { day: 6, start: "09:00", end: "10:30", subject: "AHE",        teacher: "Bu Rini",     room: "Ruang 1", students: 3, capacity: 3 },
  { day: 6, start: "10:30", end: "12:00", subject: "Bahasa Inggris", teacher: "Bu Sinta", room: "Ruang 3", students: 3, capacity: 3 },
];

const INVOICES = [
  { no: "INV-SPP-PWK-202604-001", student: "Aira Putri Maharani", branch: "PWK", period: "Apr 2026",  total: 750000, paid: 750000, status: "Lunas",   issued: "2026-04-01", due: "2026-04-10" },
  { no: "INV-SPP-PWK-202604-002", student: "Bagas Aditya Pratama", branch: "PWK", period: "Apr 2026", total: 700000, paid: 350000, status: "Sebagian",issued: "2026-04-01", due: "2026-04-10" },
  { no: "INV-SPP-PWK-202604-003", student: "Hafidz Akbar",         branch: "PWK", period: "Apr 2026", total: 630000, paid: 0,      status: "Belum Lunas", issued: "2026-04-01", due: "2026-04-10" },
  { no: "INV-SPP-JKT-202604-001", student: "Dirga Bayu Saputra",   branch: "JKT", period: "Apr 2026", total: 350000, paid: 350000, status: "Lunas",   issued: "2026-04-01", due: "2026-04-10" },
  { no: "INV-SPP-JKT-202604-002", student: "Elsa Damayanti",       branch: "JKT", period: "Apr 2026", total: 780000, paid: 780000, status: "Lunas",   issued: "2026-04-01", due: "2026-04-10" },
  { no: "INV-SPP-JKT-202604-003", student: "Joshua Tanuwijaya",    branch: "JKT", period: "Apr 2026", total: 1180000,paid: 0,      status: "Belum Lunas", issued: "2026-04-01", due: "2026-04-10" },
  { no: "INV-REG-BDG-202602-014", student: "Indira Wulandari",     branch: "BDG", period: "Registrasi", total: 250000, paid: 250000, status: "Lunas", issued: "2026-02-08", due: "2026-02-15" },
  { no: "INV-SPP-BWS-202604-001", student: "Faiz Mahendra",        branch: "BWS", period: "Apr 2026", total: 400000, paid: 0,      status: "Belum Lunas", issued: "2026-04-01", due: "2026-04-10" },
];

const COMMISSIONS = [
  { teacher: "Bu Rini Astuti",   branch: "PWK + JKT", sessions: 48, students: 36, gross: 4_320_000, status: "calculated" },
  { teacher: "Pak Budi Santoso", branch: "PWK",       sessions: 36, students: 22, gross: 3_080_000, status: "calculated" },
  { teacher: "Ustadz Hasan",     branch: "PWK + BWS", sessions: 24, students: 14, gross: 1_568_000, status: "approved" },
  { teacher: "Bu Sinta Maharani",branch: "JKT",       sessions: 30, students: 18, gross: 2_376_000, status: "approved" },
  { teacher: "Pak Doni Wibowo",  branch: "BDG",       sessions: 42, students: 24, gross: 3_360_000, status: "draft" },
  { teacher: "Bu Anggun Lestari",branch: "JKT + BDG", sessions: 28, students: 16, gross: 1_920_000, status: "draft" },
];

const PRODUCTS = [
  { sku: "MOD-AHE-1", name: "Modul AHE Tingkat 1", category: "Modul",       price: 75000, stock: 24, min: 10, branch: "PWK" },
  { sku: "MOD-AHE-2", name: "Modul AHE Tingkat 2", category: "Modul",       price: 75000, stock: 8,  min: 10, branch: "PWK" },
  { sku: "MOD-ASE-1", name: "Modul Sempoa Pemula", category: "Modul",       price: 65000, stock: 16, min: 8,  branch: "PWK" },
  { sku: "SRG-PWK-S", name: "Seragam Bimbel Size S", category: "Seragam",   price: 120000,stock: 12, min: 5,  branch: "PWK" },
  { sku: "SRG-PWK-M", name: "Seragam Bimbel Size M", category: "Seragam",   price: 120000,stock: 4,  min: 5,  branch: "PWK" },
  { sku: "STA-PEN-K", name: "Pulpen Bimbel (Hitam)", category: "Stationary",price: 5000,  stock: 84, min: 30, branch: "PWK" },
  { sku: "ALT-SEMPOA",name: "Sempoa 4 Manik",       category: "Alat Tulis", price: 95000, stock: 6,  min: 4,  branch: "PWK" },
];

const RECENT_ACTIVITY = [
  { ts: "10 menit lalu", by: "Bu Rini",      what: "Submit presensi", detail: "AHE · 3 siswa hadir · Ruang 1" },
  { ts: "32 menit lalu", by: "Admin Yuni",   what: "Pembayaran masuk",detail: "INV-SPP-PWK-202604-001 · Lunas" },
  { ts: "1 jam lalu",    by: "Pak Budi",     what: "Update progress", detail: "Aira → Modul 3 Bab 5 (Memuaskan)" },
  { ts: "2 jam lalu",    by: "Admin Siti",   what: "Generate invoice",detail: "Periode Apr 2026 · 142 invoice" },
  { ts: "3 jam lalu",    by: "Owner",        what: "Approve restock", detail: "Modul AHE-2 · 50 pcs → Cabang BDG" },
  { ts: "5 jam lalu",    by: "Bu Sinta",     what: "Submit presensi", detail: "Bahasa Inggris · 2/3 hadir" },
];

window.LCData = { BRANCHES, SUBJECTS, TARIFS, STUDENTS, TEACHERS, AHE_CURRICULUM, SCHEDULE, INVOICES, COMMISSIONS, PRODUCTS, RECENT_ACTIVITY };

// Helpers
window.fmtIDR = (n) => "Rp " + Math.round(n).toLocaleString("id-ID");
window.fmtIDRCompact = (n) => {
  if (n >= 1e9) return "Rp " + (n/1e9).toFixed(1) + " M";
  if (n >= 1e6) return "Rp " + (n/1e6).toFixed(1) + " Jt";
  if (n >= 1e3) return "Rp " + (n/1e3).toFixed(0) + " rb";
  return "Rp " + n;
};
