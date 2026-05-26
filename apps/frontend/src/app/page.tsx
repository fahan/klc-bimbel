'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import './landing.css'
import { landingApi } from '@/lib/api/endpoints'

/**
 * IMPORTANT: Landing Page Data Consistency
 *
 * The following data on this page MUST be kept in sync with the system master data:
 *
 * 1. SUBJECTS (Mata Pelajaran) - Lines 221-265:
 *    - AHE (Rp 350rb, 12 sesi/bulan) - 10 modul
 *    - ASE (Rp 350rb, 12 sesi/bulan) - 8 modul
 *    - Matematika (Rp 320rb, 8 sesi/bulan) - Fleksibel
 *    - Les Ngaji (Rp 280rb, 8 sesi/bulan) - Iqro 1-6
 *
 * 2. BRANCHES (Cabang) - Lines 646-699:
 *    - Purwakarta (PWK): 147 siswa aktif, 4 ruang kelas
 *    - Bandung (BDG): 312 siswa aktif, 6 ruang kelas
 *    - Jakarta (JKT): 485 siswa aktif, 8 ruang kelas
 *    - Banyuwangi (BWS): 89 siswa aktif, 3 ruang kelas
 *
 * 3. PRICING (Tarif) - Lines 727-755:
 *    Verify pricing matches subject cards above and SPP master data
 *
 * Last verified: 2026-05-03 - All data consistent ✓
 */

const registrationSchema = z.object({
  childName: z.string().min(2, 'Nama anak minimal 2 karakter'),
  parentName: z.string().min(2, 'Nama orang tua minimal 2 karakter'),
  phone: z
    .string()
    .min(9, 'Nomor HP tidak valid')
    .max(15, 'Nomor HP tidak valid')
    .regex(/^[0-9+\-\s]+$/, 'Nomor HP tidak valid'),
  grade: z.string().min(1, 'Pilih kelas anak'),
  subjects: z.array(z.string()).min(1, 'Pilih minimal 1 mata pelajaran'),
  branchCode: z.string().optional(),
  notes: z.string().max(500, 'Catatan maksimal 500 karakter').optional(),
})

type RegistrationForm = z.infer<typeof registrationSchema>

const GRADE_OPTIONS = [
  'TK / PAUD',
  'Kelas 1 SD',
  'Kelas 2 SD',
  'Kelas 3 SD',
  'Kelas 4 SD',
  'Kelas 5 SD',
  'Kelas 6 SD',
  'Kelas 7 SMP',
  'Kelas 8 SMP',
  'Kelas 9 SMP',
  'Kelas 10 SMA',
  'Kelas 11 SMA',
  'Kelas 12 SMA',
]

// SUBJECT_OPTIONS and BRANCH_OPTIONS are now built dynamically inside component

const ID_NUMBERS: Record<number, string> = {
  1: 'Satu', 2: 'Dua', 3: 'Tiga', 4: 'Empat', 5: 'Lima',
  6: 'Enam', 7: 'Tujuh', 8: 'Delapan', 9: 'Sembilan', 10: 'Sepuluh',
}
const toIdWord = (n: number) => ID_NUMBERS[n] ?? String(n)

// Default content fallbacks
const DEFAULT_CONTENT = {
  hero: {
    eyebrowText: 'Pendaftaran Tahun Ajaran 2026/2027 Dibuka',
    headline: 'Anak belajar <em>tuntas</em>,\norang tua selalu <em>tahu</em>.',
    subheadline: 'Bimbel keluarga dengan metode <strong>Mastery Learning</strong> — anak naik level setelah benar-benar paham, bukan karena umur. Setiap minggu Anda menerima laporan progress lewat WhatsApp, langsung dari guru kelas.',
    photoUrl: '',
    stats: [
      { num: '12+', label: 'Tahun mendampingi' },
      { num: '4', label: 'Cabang di Jawa' },
      { num: '1.400+', label: 'Siswa aktif & alumni' },
      { num: '96%', label: 'Kehadiran rata-rata' },
    ],
  },
  teachers: [
    { name: 'Bu Rini Astuti', role: 'Guru AHE & ASE', badge: '7 tahun di KLC', photoUrl: null },
    { name: 'Pak Doni Pratama', role: 'Guru Matematika', badge: 'Lulusan UPI', photoUrl: null },
    { name: 'Bu Tia Maharani', role: 'Guru AHE Tingkat Lanjut', badge: '5 tahun di KLC', photoUrl: null },
    { name: 'Ust. Ali Mubarok', role: 'Guru Les Ngaji', badge: 'Hafidz 30 juz', photoUrl: null },
  ],
  testimonials: [
    { quote: '"Yang membuat saya tenang adalah laporan WA tiap minggu. Saya tahu Aira sedang di modul mana, di bab mana, dan apa yang perlu dilatih di rumah. Tidak ada kejutan saat ujian sekolah."', authorName: 'Ibu Diah Hasanah', authorMeta: 'Wali Aira · 2 tahun di KLC PWK', initials: 'DH' },
    { quote: '"Anak saya pindah dinas ke Bandung — di tempat lain artinya daftar ulang. Di KLC tinggal lapor admin, tarif lama tetap, modul Bagas lanjut dari posisi terakhir. Sangat menghargai keluarga."', authorName: 'Bapak Surya Prasetya', authorMeta: 'Wali Bagas · pindah PWK → BDG', initials: 'SP' },
    { quote: '"Hafidz dulu takut hitung. Sekarang dia minta sendiri ditambahin sesi karena ingin lulus modul. Predikat "Memuaskan" jadi target dia. Mastery learning betul-betul mengubah motivasi anak."', authorName: 'Ibu Fitri Maulida', authorMeta: 'Wali Hafidz · 1 tahun di KLC BWS', initials: 'FM' },
  ],
  faq: [
    { question: 'Anak saya kelas 5 SD tapi belum lancar perkalian. Mulai dari mana?', answer: 'Di sesi pertama gratis, guru kami diagnostik dulu posisi anak. Kalau perkalian belum lancar, kami mulai dari modul perkalian dasar. Tidak ada gengsi-gengsi — yang penting tuntas.' },
    { question: 'Bagaimana saya tahu anak benar-benar belajar, bukan sekadar duduk?', answer: 'Setiap minggu Anda dapat link laporan via WhatsApp: posisi modul anak, predikat tiap bab, catatan guru, dan persentase kehadiran. Kalau ada yang janggal, langsung balas chat — admin pasti respon.' },
    { question: 'Kalau anak sakit / izin, bagaimana?', answer: 'Sesi ditandai "Izin" atau "Sakit" — tidak menambah biaya, dan kami atur sesi pengganti di hari lain pada minggu yang sama.' },
    { question: 'Saya pindah kota karena pekerjaan. Anak saya bagaimana?', answer: 'Cukup lapor admin cabang lama. Modul, predikat, dan tarif lock anak otomatis ikut ke cabang baru. Tidak ada biaya pindah, tidak perlu daftar ulang.' },
    { question: 'Apakah ada diskon kalau ambil 2 mapel?', answer: 'Ya. Mapel kedua dapat potongan 10%, mapel ketiga 15%. Untuk saudara kandung yang ikut, tambahan diskon 10% per anak.' },
    { question: 'Bagaimana cara coba gratis 1 sesi?', answer: 'Klik tombol "Coba Gratis" di atas, isi nama anak, kelas, dan mapel yang diminati. Admin cabang akan menghubungi via WhatsApp dalam 24 jam untuk atur jadwal.' },
  ],
  contact: {
    phone: '08123445566',
    whatsapp: '628123445566',
    email: 'halo@klcbimbel.id',
    instagram: 'klcbimbel',
    waMessage: 'Halo%20KLC%20Bimbel%2C%20saya%20tertarik%20coba%20gratis',
  },
}

export default function LandingPage() {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const mobileMenuRef = useRef<HTMLDivElement>(null)

  const { data: contentData } = useQuery({
    queryKey: ['landing-content-public'],
    queryFn: () => landingApi.getAllContent(),
    staleTime: 5 * 60 * 1000,
  })

  const { data: sppRatesData } = useQuery({
    queryKey: ['landing-spp-rates-public'],
    queryFn: () => landingApi.getSppRates(),
    staleTime: 5 * 60 * 1000,
  })
  const sppRates: { id: string; name: string; code: string; sessionsPerMonth: number; amount: number }[] =
    sppRatesData?.data?.data ?? []

  // Map subject code → display icon
  const SUBJECT_ICONS: Record<string, string> = {
    AHE: '🧮', ASE: '📐', MTK: '📊', NGJ: '📖',
  }
  const subjectIcon = (code: string) =>
    SUBJECT_ICONS[code] ?? SUBJECT_ICONS[Object.keys(SUBJECT_ICONS).find(k => code.toUpperCase().includes(k)) ?? ''] ?? '📚'

  // Dynamic subject options for the registration form — derived from sppRates
  const subjectOptions = sppRates.map((r) => ({
    value: r.name,
    label: r.name,
  }))

  const { data: branchesData } = useQuery({
    queryKey: ['landing-branches-public'],
    queryFn: () => landingApi.getBranches(),
    staleTime: 5 * 60 * 1000,
  })
  const branches: { id: string; code: string; name: string; address: string | null; phone: string | null; studentCount: number }[] =
    branchesData?.data?.data ?? []
  const cms = contentData?.data?.data ?? {}
  const hero = { ...DEFAULT_CONTENT.hero, ...(cms.hero ?? {}) }
  const teachers: typeof DEFAULT_CONTENT.teachers = cms.teachers ?? DEFAULT_CONTENT.teachers
  const testimonials: typeof DEFAULT_CONTENT.testimonials = cms.testimonials ?? DEFAULT_CONTENT.testimonials
  const faqs: { question: string; answer: string }[] = cms.faq ?? DEFAULT_CONTENT.faq
  const contact = { ...DEFAULT_CONTENT.contact, ...(cms.contact ?? {}) }

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegistrationForm>({
    resolver: zodResolver(registrationSchema),
    defaultValues: { subjects: [] },
  })

  const selectedSubjects = watch('subjects')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsLoggedIn(!!localStorage.getItem('token'))
    }
  }, [])

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node)) {
        setIsMobileMenuOpen(false)
      }
    }
    if (isMobileMenuOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isMobileMenuOpen])

  const toggleFaq = (i: number) => {
    setOpenFaqIndex(openFaqIndex === i ? null : i)
  }

  const toggleSubject = (value: string) => {
    const current = selectedSubjects ?? []
    const next = current.includes(value) ? current.filter((s) => s !== value) : [...current, value]
    setValue('subjects', next, { shouldValidate: true })
  }

  const onSubmit = async (data: RegistrationForm) => {
    setSubmitError(null)
    try {
      await landingApi.register(data)
      setSubmitSuccess(true)
    } catch (err: any) {
      setSubmitError(
        err?.response?.data?.message ?? 'Terjadi kesalahan. Silakan coba lagi atau hubungi kami via WhatsApp.',
      )
    }
  }

  const closeMobileMenu = () => setIsMobileMenuOpen(false)

  return (
    <div className="klc">
      {/* ============== NAV ============== */}
      <nav className="klc-nav" ref={mobileMenuRef}>
        <div className="klc-container klc-nav-inner">
          <div className="klc-logo">
            <div className="klc-logo-mark">K</div>
            <div>
              KLC Bimbel
              <small>Keluarga · Belajar · Tuntas</small>
            </div>
          </div>
          <div className="klc-nav-links">
            <a href="#mapel">Mata Pelajaran</a>
            <a href="#metode">Metode</a>
            <a href="#komitmen">Komitmen</a>
            <a href="#cabang">Cabang</a>
            <a href="#tarif">Tarif</a>
            <a href="#faq">FAQ</a>
          </div>
          <div className="klc-nav-cta">
            <Link
              href={isLoggedIn ? '/dashboard' : '/login'}
              className="klc-btn klc-btn--ghost"
            >
              {isLoggedIn ? 'Dashboard' : 'Masuk'}
            </Link>
            <a href="#daftar" className="klc-btn klc-btn--primary">
              Coba Gratis 1 Sesi
            </a>
          </div>
          <button
            className={`klc-nav-toggle ${isMobileMenuOpen ? 'open' : ''}`}
            onClick={() => setIsMobileMenuOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>

        {/* Mobile dropdown menu */}
        <div className={`klc-nav-mobile ${isMobileMenuOpen ? 'open' : ''}`}>
          <a href="#mapel" onClick={closeMobileMenu}>Mata Pelajaran</a>
          <a href="#metode" onClick={closeMobileMenu}>Metode</a>
          <a href="#komitmen" onClick={closeMobileMenu}>Komitmen</a>
          <a href="#cabang" onClick={closeMobileMenu}>Cabang</a>
          <a href="#tarif" onClick={closeMobileMenu}>Tarif</a>
          <a href="#faq" onClick={closeMobileMenu}>FAQ</a>
          <Link
            href={isLoggedIn ? '/dashboard' : '/login'}
            className="klc-btn klc-btn--ghost"
            onClick={closeMobileMenu}
          >
            {isLoggedIn ? 'Dashboard' : 'Masuk'}
          </Link>
          <a href="#daftar" className="klc-btn klc-btn--primary" onClick={closeMobileMenu}>
            Coba Gratis 1 Sesi
          </a>
        </div>
      </nav>

      {/* ============== HERO ============== */}
      <header className="klc-hero">
        <div className="klc-hero-bg"></div>
        <div className="klc-container klc-hero-grid">
          <div>
            <span className="klc-eyebrow">
              <span className="pulse"></span>{hero.eyebrowText}
            </span>
            <h1 dangerouslySetInnerHTML={{ __html: hero.headline.replace(/\n/g, '<br />').replace(/<em>/g, '<span class="em">').replace(/<\/em>/g, '</span>') }} />
            <p className="klc-hero-sub" dangerouslySetInnerHTML={{ __html: hero.subheadline }} />
            <div className="klc-hero-cta">
              <a href="#daftar" className="klc-btn klc-btn--primary klc-btn--lg">
                Coba Gratis 1 Sesi →
              </a>
              <a href="#metode" className="klc-btn klc-btn--ghost klc-btn--lg">
                Lihat Metode Belajar
              </a>
            </div>
            <div className="klc-hero-trust">
              {hero.stats.map((stat: { num: string; label: string }, i: number) => (
                <div key={i}>
                  <div className="num">{stat.num}</div>
                  <div className="lbl">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="klc-hero-stack">
            <div className="klc-photo klc-photo--main">
              {hero.photoUrl
                ? <img src={hero.photoUrl} alt="Suasana belajar KLC" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '24px' }} />
                : <div className="klc-photo-figure">[ foto: anak & guru, suasana belajar ]</div>
              }
            </div>
            <div className="klc-photo klc-photo--badge">
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: 'var(--klc-sage-50)',
                    color: 'var(--klc-sage-700)',
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  ✓
                </div>
                <strong style={{ fontSize: '13px' }}>Modul 3 Selesai</strong>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--klc-ink-3)' }}>Aira Putri · AHE</div>
              <div
                style={{
                  fontSize: '11px',
                  color: 'var(--klc-sage-700)',
                  fontWeight: 600,
                  marginTop: '4px',
                }}
              >
                Predikat: Memuaskan ★★★★★
              </div>
            </div>
            <div className="klc-photo klc-photo--card">
              <div
                style={{
                  fontSize: '11px',
                  color: 'var(--klc-ink-3)',
                  textTransform: 'uppercase',
                  letterSpacing: '.06em',
                }}
              >
                Laporan Mingguan
              </div>
              <div
                style={{
                  fontFamily: 'var(--klc-serif)',
                  fontSize: '18px',
                  fontWeight: 600,
                  marginTop: '4px',
                }}
              >
                96% kehadiran
              </div>
              <div
                style={{
                  marginTop: '14px',
                  height: '6px',
                  background: 'var(--klc-cream-2)',
                  borderRadius: '999px',
                  overflow: 'hidden',
                }}
              >
                <div style={{ width: '96%', height: '100%', background: 'var(--klc-orange)' }}></div>
              </div>
              <div
                style={{
                  fontSize: '12px',
                  color: 'var(--klc-ink-2)',
                  marginTop: '14px',
                  lineHeight: 1.5,
                }}
              >
                "Aira sangat baik dalam memahami konsep penjumlahan tiga digit minggu ini."
              </div>
              <div style={{ fontSize: '11px', color: 'var(--klc-ink-3)', marginTop: '8px' }}>
                — Bu Rini, Guru AHE
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ============== MATA PELAJARAN ============== */}
      <section className="klc-section" id="mapel">
        <div className="klc-container">
          <div className="klc-section-head">
            <div className="klc-section-eyebrow">Mata Pelajaran</div>
            <h2>Pilihan belajar yang sudah teruji puluhan tahun</h2>
            <p className="klc-section-sub">
              Dari aritmatika dasar hingga ngaji — setiap mapel punya kurikulum modul jelas, predikat penilaian
              transparan, dan guru tetap yang konsisten mendampingi.
            </p>
          </div>

          <div className="klc-mapel-grid">
            <div className="klc-mapel klc-mapel--orange">
              <div className="klc-mapel-icon">🧮</div>
              <h4>AHE</h4>
              <p className="klc-mapel-desc">
                Aritmatika cepat dengan sempoa. Anak dilatih berhitung di luar kepala.
              </p>
              <div className="klc-mapel-tags">
                <span className="klc-mapel-tag">10 modul</span>
                <span className="klc-mapel-tag">TK – SMP</span>
              </div>
            </div>
            <div className="klc-mapel klc-mapel--sage">
              <div className="klc-mapel-icon">📐</div>
              <h4>ASE</h4>
              <p className="klc-mapel-desc">
                Aljabar & persiapan ujian sekolah. Latihan rutin, evaluasi per modul.
              </p>
              <div className="klc-mapel-tags">
                <span className="klc-mapel-tag">8 modul</span>
                <span className="klc-mapel-tag">SD – SMA</span>
              </div>
            </div>
            <div className="klc-mapel klc-mapel--rose">
              <div className="klc-mapel-icon">📊</div>
              <h4>Matematika</h4>
              <p className="klc-mapel-desc">
                Pendalaman materi sekolah. Tutor dapat menyesuaikan bab yang sedang dipelajari di sekolah.
              </p>
              <div className="klc-mapel-tags">
                <span className="klc-mapel-tag">Fleksibel</span>
                <span className="klc-mapel-tag">SD – SMA</span>
              </div>
            </div>
            <div className="klc-mapel klc-mapel--sun">
              <div className="klc-mapel-icon">📖</div>
              <h4>Les Ngaji</h4>
              <p className="klc-mapel-desc">
                Iqro hingga tilawah Al-Qur'an. Suasana tenang, guru lulusan pesantren.
              </p>
              <div className="klc-mapel-tags">
                <span className="klc-mapel-tag">Iqro 1–6</span>
                <span className="klc-mapel-tag">Semua usia</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============== CARA KERJA / MASTERY ============== */}
      <section className="klc-section klc-section--alt" id="metode">
        <div className="klc-container">
          <div className="klc-section-head">
            <div className="klc-section-eyebrow">Metode Belajar</div>
            <h2>Naik level setelah benar-benar paham — bukan karena umur</h2>
            <p className="klc-section-sub">
              Di sekolah, anak terus naik kelas walau ada bab yang belum tuntas. Di KLC, anak hanya pindah modul
              setelah lulus. Tidak ada yang tertinggal.
            </p>
          </div>

          <div className="klc-mastery">
            <div>
              <h3 style={{ fontSize: '30px' }}>Cara kerja Mastery Learning di KLC</h3>
              <div className="klc-mastery-points">
                <div className="klc-mastery-point">
                  <div className="klc-mastery-num">1</div>
                  <div>
                    <h4>Diagnostik awal</h4>
                    <p>
                      Sebelum mulai, kami nilai dulu posisi anak. Tidak semua anak kelas 5 mulai di modul yang sama
                      — kami sesuaikan.
                    </p>
                  </div>
                </div>
                <div className="klc-mastery-point">
                  <div className="klc-mastery-num">2</div>
                  <div>
                    <h4>Modul demi modul, dengan ujian kecil</h4>
                    <p>
                      Setiap modul punya 8–10 bab. Di akhir modul, anak ujian kecil dan diberi{' '}
                      <strong>predikat</strong> 1–5 (Perlu Bimbingan → Memuaskan).
                    </p>
                  </div>
                </div>
                <div className="klc-mastery-point">
                  <div className="klc-mastery-num">3</div>
                  <div>
                    <h4>Lulus dulu, baru pindah modul</h4>
                    <p>
                      Predikat minimal "Cukup Baik" untuk lanjut. Belum lulus? Kami ulang — tanpa biaya tambahan,
                      tanpa anak merasa malu.
                    </p>
                  </div>
                </div>
                <div className="klc-mastery-point">
                  <div className="klc-mastery-num">4</div>
                  <div>
                    <h4>Catatan guru, terbuka untuk orang tua</h4>
                    <p>
                      Setiap sesi, guru menulis catatan: apa yang anak pahami, di mana masih kesulitan. Anda baca
                      lewat link laporan tiap minggu.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="klc-modules">
              <div className="klc-modules-head">
                <div className="student-avatar">AP</div>
                <div>
                  <div className="name">Aira Putri Maharani</div>
                  <div className="meta">AHE · Kelas 5 SD · 8 bulan belajar di KLC</div>
                </div>
              </div>

              <div className="klc-module-row">
                <div className="klc-module-check done">✓</div>
                <div className="klc-module-info">
                  <div className="t">Modul 1 — Penjumlahan Dasar</div>
                  <div className="s">Selesai · Agt 2025</div>
                </div>
                <span className="predikat">★ Memuaskan</span>
              </div>

              <div className="klc-module-row">
                <div className="klc-module-check done">✓</div>
                <div className="klc-module-info">
                  <div className="t">Modul 2 — Pengurangan Dasar</div>
                  <div className="s">Selesai · Nov 2025</div>
                </div>
                <span className="predikat">★ Baik Sekali</span>
              </div>

              <div className="klc-module-row">
                <div className="klc-module-check now">●</div>
                <div className="klc-module-info">
                  <div className="t">Modul 3 — Penjumlahan 3 Digit</div>
                  <div className="s">Bab 5 dari 10 · sedang berlangsung</div>
                </div>
                <div className="progress-mini">
                  <div style={{ width: '50%' }}></div>
                </div>
              </div>

              <div className="klc-module-row">
                <div className="klc-module-check next">○</div>
                <div className="klc-module-info">
                  <div className="t">Modul 4 — Pengurangan 3 Digit</div>
                  <div className="s">Belum dimulai</div>
                </div>
              </div>

              <div className="klc-module-row">
                <div className="klc-module-check next">○</div>
                <div className="klc-module-info">
                  <div className="t">Modul 5 — Perkalian Dasar</div>
                  <div className="s">Belum dimulai</div>
                </div>
              </div>

              <div
                style={{
                  marginTop: '18px',
                  padding: '14px',
                  background: 'var(--klc-orange-50)',
                  borderRadius: '12px',
                  fontSize: '13px',
                  color: 'var(--klc-orange-700)',
                  textAlign: 'center',
                }}
              >
                <strong>10 modul total</strong> · Aira saat ini di modul ke-3
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============== KOMITMEN ============== */}
      <section className="klc-section" id="komitmen">
        <div className="klc-container">
          <div className="klc-section-head">
            <div className="klc-section-eyebrow">Komitmen ke Orang Tua</div>
            <h2>Tidak perlu pasang aplikasi. Cukup buka WhatsApp.</h2>
            <p className="klc-section-sub">
              Setiap minggu Anda dapat link laporan progress yang bisa dibuka langsung di chat WhatsApp. Tidak ada
              login, tidak ada aplikasi tambahan.
            </p>
          </div>

          <div className="klc-commitment-grid">
            <div className="klc-wa">
              <div className="klc-wa-head">
                <div className="av">K</div>
                <div>
                  <div style={{ fontWeight: 600 }}>KLC Bimbel · Cabang Purwakarta</div>
                  <div style={{ fontSize: '11px', opacity: 0.85 }}>online</div>
                </div>
              </div>

              <div className="klc-wa-bubble">
                Selamat sore Bu Diah 🙏<br />
                Berikut laporan progress mingguan <strong>Aira</strong> (AHE) — minggu ke-4 April:
                <span className="time">14:32 ✓✓</span>
              </div>

              <div className="klc-wa-card">
                <div className="preview">
                  <div className="label">Laporan Progress</div>
                  <div className="name">Aira Putri Maharani</div>
                  <div className="meta">AHE · 1–28 April 2026</div>
                </div>
                <div className="meta-bar">learn-center.id/r/aira-aH3kQ8</div>
              </div>

              <div className="klc-wa-bubble">
                Modul 3 sudah sampai Bab 5 dari 10. Aira sangat baik di penjumlahan 3 digit, namun perlu latihan
                tambahan di carry-over. Kehadiran 96% (1× sakit). 🌟
                <span className="time">14:32 ✓✓</span>
              </div>

              <div className="klc-wa-bubble" style={{ background: 'white' }}>
                Terima kasih banyak Bu! Saya buka linknya. 🙏
                <span className="time">14:35</span>
              </div>
            </div>

            <div>
              <div className="klc-commit-list">
                <div className="klc-commit-item">
                  <div className="klc-commit-icon">📱</div>
                  <div>
                    <h4>Laporan tiap minggu, lewat WA</h4>
                    <p>Tidak perlu install apa-apa. Klik link, lihat progress, baca catatan guru.</p>
                  </div>
                </div>
                <div className="klc-commit-item">
                  <div className="klc-commit-icon">🔒</div>
                  <div>
                    <h4>SPP di-lock seumur hidup siswa</h4>
                    <p>
                      Tarif yang berlaku saat anak daftar tetap berlaku selamanya. Kenaikan tarif baru tidak berlaku
                      untuk siswa lama.
                    </p>
                  </div>
                </div>
                <div className="klc-commit-item">
                  <div className="klc-commit-icon">👩‍🏫</div>
                  <div>
                    <h4>Guru tetap per kelas</h4>
                    <p>
                      Anak tidak gonta-ganti guru. Konsistensi belajar terjaga, guru hafal kelebihan dan kelemahan
                      setiap anak.
                    </p>
                  </div>
                </div>
                <div className="klc-commit-item">
                  <div className="klc-commit-icon">🔄</div>
                  <div>
                    <h4>Pindah cabang? Tidak perlu daftar ulang</h4>
                    <p>
                      Pindah dari Purwakarta ke Bandung? Data, modul, dan tarif lock anak tetap mengikuti. Tinggal
                      lapor admin.
                    </p>
                  </div>
                </div>
                <div className="klc-commit-item">
                  <div className="klc-commit-icon">💯</div>
                  <div>
                    <h4>Predikat & nilai transparan</h4>
                    <p>
                      Setiap modul ada predikat 1–5. Anda tahu persis di mana posisi anak — bukan sekadar "sudah
                      lancar".
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============== TIM GURU ============== */}
      <section className="klc-section klc-section--alt">
        <div className="klc-container">
          <div className="klc-section-head">
            <div className="klc-section-eyebrow">Tim Guru</div>
            <h2>Diajar oleh guru yang benar-benar mengenal anak Anda</h2>
            <p className="klc-section-sub">
              Semua guru kami melalui pelatihan kurikulum KLC selama 6 bulan sebelum mengajar. Mayoritas sudah
              mendampingi keluarga di KLC lebih dari 5 tahun.
            </p>
          </div>

          <div className="klc-guru-grid">
            {teachers.map((t: { name: string; role: string; badge: string; photoUrl: string | null }, i: number) => (
              <div className="klc-guru-card" key={i}>
                <div className="klc-guru-photo">
                  {t.photoUrl
                    ? <img src={t.photoUrl} alt={t.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '16px' }} />
                    : <span className="label">[ foto {t.name} ]</span>
                  }
                </div>
                <h4>{t.name}</h4>
                <div className="role">{t.role}</div>
                <span className="pill">{t.badge}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============== GALERI ============== */}
      <section className="klc-section">
        <div className="klc-container">
          <div className="klc-section-head">
            <div className="klc-section-eyebrow">Suasana Belajar</div>
            <h2>Ruang yang tenang, hangat, dan mendukung fokus</h2>
          </div>
          <div className="klc-gallery">
            <div className="g1">
              <span>Kelas AHE — sempoa & latihan rutin</span>
            </div>
            <div className="g2">
              <span>Sesi privat 1-on-1</span>
            </div>
            <div className="g3">
              <span>Ruang ngaji</span>
            </div>
            <div className="g4">
              <span>Halaman bermain antar sesi</span>
            </div>
            <div className="g5">
              <span>Konsultasi orang tua</span>
            </div>
          </div>
        </div>
      </section>

      {/* ============== TESTIMONI ============== */}
      <section className="klc-section klc-section--alt">
        <div className="klc-container">
          <div className="klc-section-head">
            <div className="klc-section-eyebrow">Cerita Orang Tua</div>
            <h2>Suara keluarga yang mempercayakan anaknya ke KLC</h2>
          </div>

          <div className="klc-testi-grid">
            {testimonials.map((t: { quote: string; authorName: string; authorMeta: string; initials: string }, i: number) => (
              <div className="klc-testi" key={i}>
                <div className="klc-testi-quote">"</div>
                <div className="klc-stars">★★★★★</div>
                <p className="klc-testi-text">{t.quote}</p>
                <div className="klc-testi-author">
                  <div className="klc-testi-av">{t.initials}</div>
                  <div>
                    <div className="klc-testi-name">{t.authorName}</div>
                    <div className="klc-testi-meta">{t.authorMeta}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============== CABANG ============== */}
      <section className="klc-section" id="cabang">
        <div className="klc-container">
          <div className="klc-section-head">
            <div className="klc-section-eyebrow">Lokasi Cabang</div>
            <h2>{toIdWord(branches.length)} cabang, satu standar mengajar</h2>
            <p className="klc-section-sub">
              Kurikulum, predikat, dan komitmen ke orang tua sama persis di setiap cabang. Pindah kota? Pindah
              cabang saja.
            </p>
          </div>

          <div className="klc-branch-grid">
            {branches.length > 0
              ? branches.map((b) => (
                  <div className="klc-branch" key={b.id}>
                    <span className="klc-branch-code">{b.code}</span>
                    <h4>{b.name}</h4>
                    {b.address && <p>{b.address}</p>}
                    <div className="meta">
                      <span>{b.studentCount} siswa aktif</span>
                      {b.phone && (
                        <>
                          <span>•</span>
                          <span>{b.phone}</span>
                        </>
                      )}
                    </div>
                  </div>
                ))
              : /* skeleton saat loading */
                [1, 2, 3, 4].map((n) => (
                  <div className="klc-branch" key={n} style={{ opacity: 0.4 }}>
                    <span className="klc-branch-code">···</span>
                    <h4 style={{ background: '#eee', height: 20, borderRadius: 6 }}></h4>
                    <p style={{ background: '#eee', height: 14, borderRadius: 6, marginTop: 8 }}></p>
                  </div>
                ))
            }
          </div>
        </div>
      </section>

      {/* ============== TARIF ============== */}
      <section className="klc-section klc-section--alt" id="tarif">
        <div className="klc-container">
          <div className="klc-tarif-wrap">
            <div className="klc-tarif-head">
              <div>
                <div className="klc-section-eyebrow">Tarif SPP</div>
                <h2>Transparan, tanpa biaya tersembunyi</h2>
                <p
                  style={{
                    fontSize: '16px',
                    color: 'var(--klc-ink-2)',
                    marginTop: '12px',
                    maxWidth: '480px',
                  }}
                >
                  SPP sama di semua cabang. Daftar sekali, tarif Anda dikunci — kenaikan tahunan tidak berlaku untuk
                  siswa lama.
                </p>
              </div>
              <a href="#daftar" className="klc-btn klc-btn--primary">
                Coba Gratis 1 Sesi
              </a>
            </div>

            <div className="klc-tarif-grid">
              {sppRates.map((r) => {
                const amountRb = Math.round(r.amount / 1000)
                return (
                  <div className="klc-tarif-card" key={r.id}>
                    <div className="name">{subjectIcon(r.code)} {r.name}</div>
                    <div className="desc">{r.sessionsPerMonth}× sesi/bulan</div>
                    <div className="price">
                      Rp {amountRb}<small>rb</small>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="klc-tarif-lock">
              <div className="klc-tarif-lock-icon">🔒</div>
              <div>
                <strong>SPP di-lock seumur hidup siswa.</strong> Daftar di tarif Rp 350.000? Tetap Rp 350.000 —
                selama anak Anda terus belajar di KLC. Biaya pendaftaran sekali Rp 250.000.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============== FAQ ============== */}
      <section className="klc-section" id="faq">
        <div className="klc-container">
          <div className="klc-section-head">
            <div className="klc-section-eyebrow">Pertanyaan Umum</div>
            <h2>Yang sering ditanya orang tua</h2>
          </div>

          <div className="klc-faq">
            {faqs.map((faq: { question: string; answer: string }, i: number) => (
              <div key={i} className={`klc-faq-item ${openFaqIndex === i ? 'open' : ''}`}>
                <div className="klc-faq-q" onClick={() => toggleFaq(i)}>
                  {faq.question}
                  <span className="toggle">+</span>
                </div>
                <div className="klc-faq-a">{faq.answer}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============== FINAL CTA ============== */}
      <section className="klc-section" style={{ paddingTop: 0, paddingBottom: '24px' }}>
        <div className="klc-finalcta">
          <h2>Coba dulu 1 sesi — gratis, tanpa kewajiban</h2>
          <p>
            Anak Anda diajar 1 sesi penuh, Anda terima laporan progress pertama via WhatsApp. Tidak cocok? Tidak
            masalah. Cocok? Lanjut ke pendaftaran reguler.
          </p>
          <div className="klc-finalcta-cta">
            <a href="#daftar" className="klc-btn klc-btn--white klc-btn--lg">
              Daftar Coba Gratis →
            </a>
            <a
              href={`https://wa.me/${contact.whatsapp}?text=${contact.waMessage}`}
              target="_blank"
              rel="noopener noreferrer"
              className="klc-btn klc-btn--wa klc-btn--lg"
              style={{ background: '#25D366', color: 'white' }}
            >
              Tanya via WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* ============== FORM DAFTAR COBA GRATIS ============== */}
      <section className="klc-section" id="daftar" style={{ paddingTop: '56px', paddingBottom: '96px' }}>
        <div className="klc-container">
          <div className="klc-section-head" style={{ marginBottom: '40px' }}>
            <div className="klc-section-eyebrow">Daftar Sekarang</div>
            <h2>Coba gratis 1 sesi — kami hubungi dalam 24 jam</h2>
            <p className="klc-section-sub">
              Isi form di bawah ini. Admin cabang terdekat akan menghubungi via WhatsApp untuk mengatur jadwal sesi pertama.
            </p>
          </div>

          <div className="klc-register">
            {submitSuccess ? (
              <div className="klc-form-success">
                <div className="klc-form-success-icon">✓</div>
                <h3>Pendaftaran Berhasil!</h3>
                <p>
                  Terima kasih! Tim KLC Bimbel akan menghubungi Anda via WhatsApp dalam <strong>24 jam</strong> untuk
                  mengatur jadwal sesi gratis pertama.
                </p>
                <p style={{ marginTop: '16px', fontSize: '14px', color: 'var(--klc-ink-3)' }}>
                  Pertanyaan mendesak? Langsung chat kami di{' '}
                  <a
                    href={`https://wa.me/${contact.whatsapp}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'var(--klc-orange-700)', fontWeight: 600 }}
                  >
                    WhatsApp: {contact.phone}
                  </a>
                </p>
              </div>
            ) : (
              <>
                <div className="klc-register-title">Formulir Pendaftaran Gratis</div>
                <div className="klc-register-sub">
                  Isi data anak & orang tua. Tidak ada biaya apapun untuk sesi pertama.
                </div>

                <form onSubmit={handleSubmit(onSubmit)} noValidate>
                  <div className="klc-form-grid">
                    <div className="klc-form-group">
                      <label htmlFor="childName">Nama Anak *</label>
                      <input
                        id="childName"
                        type="text"
                        placeholder="Contoh: Aira Putri"
                        className={errors.childName ? 'error' : ''}
                        {...register('childName')}
                      />
                      {errors.childName && <span className="klc-form-error">{errors.childName.message}</span>}
                    </div>

                    <div className="klc-form-group">
                      <label htmlFor="parentName">Nama Orang Tua / Wali *</label>
                      <input
                        id="parentName"
                        type="text"
                        placeholder="Contoh: Ibu Diah"
                        className={errors.parentName ? 'error' : ''}
                        {...register('parentName')}
                      />
                      {errors.parentName && <span className="klc-form-error">{errors.parentName.message}</span>}
                    </div>

                    <div className="klc-form-group">
                      <label htmlFor="phone">Nomor WhatsApp *</label>
                      <input
                        id="phone"
                        type="tel"
                        placeholder="08123456789"
                        className={errors.phone ? 'error' : ''}
                        {...register('phone')}
                      />
                      {errors.phone && <span className="klc-form-error">{errors.phone.message}</span>}
                    </div>

                    <div className="klc-form-group">
                      <label htmlFor="grade">Kelas Anak Saat Ini *</label>
                      <select
                        id="grade"
                        className={errors.grade ? 'error' : ''}
                        {...register('grade')}
                      >
                        <option value="">— Pilih kelas —</option>
                        {GRADE_OPTIONS.map((g) => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                      {errors.grade && <span className="klc-form-error">{errors.grade.message}</span>}
                    </div>

                    <div className="klc-form-group klc-form-full">
                      <label>Mata Pelajaran yang Diminati *</label>
                      <div className="klc-form-checks">
                        {subjectOptions.length === 0 ? (
                          <span style={{ color: '#999', fontSize: '14px' }}>Memuat mata pelajaran...</span>
                        ) : (
                          subjectOptions.map((s) => (
                            <label key={s.value} className="klc-form-check">
                              <input
                                type="checkbox"
                                checked={selectedSubjects?.includes(s.value) ?? false}
                                onChange={() => toggleSubject(s.value)}
                              />
                              {s.label}
                            </label>
                          ))
                        )}
                      </div>
                      {errors.subjects && <span className="klc-form-error">{errors.subjects.message}</span>}
                    </div>

                    <div className="klc-form-group">
                      <label htmlFor="branchCode">Cabang Terdekat</label>
                      <select id="branchCode" {...register('branchCode')}>
                        <option value="">— Pilih cabang (opsional) —</option>
                        {branches.map((b) => (
                          <option key={b.code} value={b.code}>{b.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="klc-form-group">
                      <label htmlFor="notes">Catatan Tambahan</label>
                      <input
                        id="notes"
                        type="text"
                        placeholder="Opsional — misal: anak belum lancar perkalian"
                        {...register('notes')}
                      />
                    </div>
                  </div>

                  {submitError && (
                    <div
                      style={{
                        marginTop: '16px',
                        padding: '14px 16px',
                        background: 'var(--klc-rose-50)',
                        border: '1px solid var(--klc-rose)',
                        borderRadius: '10px',
                        fontSize: '14px',
                        color: 'var(--klc-rose)',
                      }}
                    >
                      {submitError}
                    </div>
                  )}

                  <button type="submit" className="klc-form-submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Mengirim...' : 'Daftar Coba Gratis →'}
                  </button>

                  <p
                    style={{
                      marginTop: '14px',
                      fontSize: '13px',
                      color: 'var(--klc-ink-3)',
                      textAlign: 'center',
                    }}
                  >
                    Tidak ada biaya. Admin kami akan menghubungi via WhatsApp dalam 24 jam.
                  </p>
                </form>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ============== FOOTER ============== */}
      <footer>
        <div className="klc-container klc-footer">
          <div className="klc-footer-grid">
            <div>
              <div className="klc-logo">
                <div className="klc-logo-mark">K</div>
                <div>
                  KLC Bimbel
                  <small>Keluarga · Belajar · Tuntas</small>
                </div>
              </div>
              <p
                style={{
                  fontSize: '14px',
                  color: 'var(--klc-ink-2)',
                  marginTop: '16px',
                  lineHeight: 1.6,
                  maxWidth: '340px',
                }}
              >
                Bimbel keluarga sejak 2014. Mendampingi anak Indonesia tuntas memahami pelajaran, modul demi modul.
              </p>
            </div>
            <div>
              <h5>Mata Pelajaran</h5>
              <ul>
                <li>
                  <a href="#mapel">AHE — Aritmatika</a>
                </li>
                <li>
                  <a href="#mapel">ASE — Aljabar</a>
                </li>
                <li>
                  <a href="#mapel">Matematika</a>
                </li>
                <li>
                  <a href="#mapel">Les Ngaji</a>
                </li>
              </ul>
            </div>
            <div>
              <h5>Cabang</h5>
              <ul>
                <li>
                  <a href="#cabang">Purwakarta</a>
                </li>
                <li>
                  <a href="#cabang">Bandung</a>
                </li>
                <li>
                  <a href="#cabang">Jakarta</a>
                </li>
                <li>
                  <a href="#cabang">Banyuwangi</a>
                </li>
              </ul>
            </div>
            <div>
              <h5>Hubungi Kami</h5>
              <ul>
                <li>
                  <a href={`https://wa.me/${contact.whatsapp}`} target="_blank" rel="noopener noreferrer">WhatsApp: {contact.phone}</a>
                </li>
                <li>
                  <a href={`mailto:${contact.email}`}>{contact.email}</a>
                </li>
                <li>
                  <a href={`https://instagram.com/${contact.instagram}`} target="_blank" rel="noopener noreferrer">Instagram @{contact.instagram}</a>
                </li>
                <li>
                  <a href="#daftar">Karir di KLC</a>
                </li>
              </ul>
            </div>
          </div>
          <div className="klc-footer-bottom">
            <span>© 2026 KLC Bimbel. Semua hak dilindungi.</span>
            <span className="right">
              <a href="#mapel" style={{ marginRight: '18px' }}>
                Kebijakan Privasi
              </a>
              <a href="#mapel">Syarat & Ketentuan</a>
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}
