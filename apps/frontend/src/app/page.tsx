'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import './landing.css'

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

export default function LandingPage() {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsLoggedIn(!!localStorage.getItem('token'))
    }
  }, [])

  const toggleFaq = (i: number) => {
    setOpenFaqIndex(openFaqIndex === i ? null : i)
  }

  const faqs = [
    {
      q: 'Anak saya kelas 5 SD tapi belum lancar perkalian. Mulai dari mana?',
      a: 'Di sesi pertama gratis, guru kami diagnostik dulu posisi anak. Kalau perkalian belum lancar, kami mulai dari modul perkalian dasar. Tidak ada gengsi-gengsi — yang penting tuntas.',
    },
    {
      q: 'Bagaimana saya tahu anak benar-benar belajar, bukan sekadar duduk?',
      a: 'Setiap minggu Anda dapat link laporan via WhatsApp: posisi modul anak, predikat tiap bab, catatan guru, dan persentase kehadiran. Kalau ada yang janggal, langsung balas chat — admin pasti respon.',
    },
    {
      q: 'Kalau anak sakit / izin, bagaimana?',
      a: 'Sesi ditandai "Izin" atau "Sakit" — tidak menambah biaya, dan kami atur sesi pengganti di hari lain pada minggu yang sama. Kalau sesi belum tuntas dipahami, guru akan ulang materinya.',
    },
    {
      q: 'Saya pindah kota karena pekerjaan. Anak saya bagaimana?',
      a: 'Cukup lapor admin cabang lama. Modul, predikat, dan tarif lock anak otomatis ikut ke cabang baru. Tidak ada biaya pindah, tidak perlu daftar ulang.',
    },
    {
      q: 'Apakah ada diskon kalau ambil 2 mapel?',
      a: 'Ya. Mapel kedua dapat potongan 10%, mapel ketiga 15%. Untuk saudara kandung yang ikut, tambahan diskon 10% per anak.',
    },
    {
      q: 'Bagaimana cara coba gratis 1 sesi?',
      a: 'Klik tombol "Coba Gratis" di atas, isi nama anak, kelas, dan mapel yang diminati. Admin cabang akan menghubungi via WhatsApp dalam 24 jam untuk atur jadwal.',
    },
  ]

  return (
    <div className="klc">
      {/* ============== NAV ============== */}
      <nav className="klc-nav">
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
        </div>
      </nav>

      {/* ============== HERO ============== */}
      <header className="klc-hero">
        <div className="klc-hero-bg"></div>
        <div className="klc-container klc-hero-grid">
          <div>
            <span className="klc-eyebrow">
              <span className="pulse"></span>Pendaftaran Tahun Ajaran 2026/2027 Dibuka
            </span>
            <h1>
              Anak belajar <span className="em">tuntas</span>,<br />
              orang tua selalu <span className="em">tahu</span>.
            </h1>
            <p className="klc-hero-sub">
              Bimbel keluarga dengan metode <strong>Mastery Learning</strong> — anak naik level setelah benar-benar
              paham, bukan karena umur. Setiap minggu Anda menerima laporan progress lewat WhatsApp, langsung dari
              guru kelas.
            </p>
            <div className="klc-hero-cta">
              <a href="#daftar" className="klc-btn klc-btn--primary klc-btn--lg">
                Coba Gratis 1 Sesi →
              </a>
              <a href="#metode" className="klc-btn klc-btn--ghost klc-btn--lg">
                Lihat Metode Belajar
              </a>
            </div>
            <div className="klc-hero-trust">
              <div>
                <div className="num">12+</div>
                <div className="lbl">Tahun mendampingi</div>
              </div>
              <div>
                <div className="num">4</div>
                <div className="lbl">Cabang di Jawa</div>
              </div>
              <div>
                <div className="num">1.400+</div>
                <div className="lbl">Siswa aktif & alumni</div>
              </div>
              <div>
                <div className="num">96%</div>
                <div className="lbl">Kehadiran rata-rata</div>
              </div>
            </div>
          </div>
          <div className="klc-hero-stack">
            <div className="klc-photo klc-photo--main">
              <div className="klc-photo-figure">[ foto: anak & guru, suasana belajar ]</div>
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
            <div className="klc-guru-card">
              <div className="klc-guru-photo">
                <span className="label">[ foto Bu Rini ]</span>
              </div>
              <h4>Bu Rini Astuti</h4>
              <div className="role">Guru AHE & ASE</div>
              <span className="pill">7 tahun di KLC</span>
            </div>
            <div className="klc-guru-card">
              <div className="klc-guru-photo" style={{ background: 'linear-gradient(135deg,#C2A079,#8A6743)' }}>
                <span className="label">[ foto Pak Doni ]</span>
              </div>
              <h4>Pak Doni Pratama</h4>
              <div className="role">Guru Matematika</div>
              <span className="pill">Lulusan UPI</span>
            </div>
            <div className="klc-guru-card">
              <div className="klc-guru-photo" style={{ background: 'linear-gradient(135deg,#DCB892,#A37F5C)' }}>
                <span className="label">[ foto Bu Tia ]</span>
              </div>
              <h4>Bu Tia Maharani</h4>
              <div className="role">Guru AHE Tingkat Lanjut</div>
              <span className="pill">5 tahun di KLC</span>
            </div>
            <div className="klc-guru-card">
              <div className="klc-guru-photo" style={{ background: 'linear-gradient(135deg,#B89B7E,#735540)' }}>
                <span className="label">[ foto Ust. Ali ]</span>
              </div>
              <h4>Ust. Ali Mubarok</h4>
              <div className="role">Guru Les Ngaji</div>
              <span className="pill">Hafidz 30 juz</span>
            </div>
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
            <div className="klc-testi">
              <div className="klc-testi-quote">"</div>
              <div className="klc-stars">★★★★★</div>
              <p className="klc-testi-text">
                "Yang membuat saya tenang adalah laporan WA tiap minggu. Saya tahu Aira sedang di modul mana, di bab
                mana, dan apa yang perlu dilatih di rumah. Tidak ada kejutan saat ujian sekolah."
              </p>
              <div className="klc-testi-author">
                <div className="klc-testi-av">DH</div>
                <div>
                  <div className="klc-testi-name">Ibu Diah Hasanah</div>
                  <div className="klc-testi-meta">Wali Aira · 2 tahun di KLC PWK</div>
                </div>
              </div>
            </div>

            <div className="klc-testi">
              <div className="klc-testi-quote">"</div>
              <div className="klc-stars">★★★★★</div>
              <p className="klc-testi-text">
                "Anak saya pindah dinas ke Bandung — di tempat lain artinya daftar ulang. Di KLC tinggal lapor
                admin, tarif lama tetap, modul Bagas lanjut dari posisi terakhir. Sangat menghargai keluarga."
              </p>
              <div className="klc-testi-author">
                <div className="klc-testi-av" style={{ background: 'linear-gradient(135deg,#B89B7E,#735540)' }}>
                  SP
                </div>
                <div>
                  <div className="klc-testi-name">Bapak Surya Prasetya</div>
                  <div className="klc-testi-meta">Wali Bagas · pindah PWK → BDG</div>
                </div>
              </div>
            </div>

            <div className="klc-testi">
              <div className="klc-testi-quote">"</div>
              <div className="klc-stars">★★★★★</div>
              <p className="klc-testi-text">
                "Hafidz dulu takut hitung. Sekarang dia minta sendiri ditambahin sesi karena ingin lulus modul.
                Predikat "Memuaskan" jadi target dia. Mastery learning betul-betul mengubah motivasi anak."
              </p>
              <div className="klc-testi-author">
                <div className="klc-testi-av" style={{ background: 'linear-gradient(135deg,#C99974,#8A6743)' }}>
                  FM
                </div>
                <div>
                  <div className="klc-testi-name">Ibu Fitri Maulida</div>
                  <div className="klc-testi-meta">Wali Hafidz · 1 tahun di KLC BWS</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============== CABANG ============== */}
      <section className="klc-section" id="cabang">
        <div className="klc-container">
          <div className="klc-section-head">
            <div className="klc-section-eyebrow">Lokasi Cabang</div>
            <h2>Empat cabang, satu standar mengajar</h2>
            <p className="klc-section-sub">
              Kurikulum, predikat, dan komitmen ke orang tua sama persis di setiap cabang. Pindah kota? Pindah
              cabang saja.
            </p>
          </div>

          <div className="klc-branch-grid">
            <div className="klc-branch">
              <span className="klc-branch-code">PWK</span>
              <h4>Purwakarta</h4>
              <p>Jl. Ipik Gandamanah No. 12, Purwakarta. Buka Senin–Sabtu, 09:00–19:00.</p>
              <div className="meta">
                <span>147 siswa aktif</span>
                <span>•</span>
                <span>4 ruang kelas</span>
              </div>
            </div>
            <div className="klc-branch">
              <span className="klc-branch-code">BDG</span>
              <h4>Bandung</h4>
              <p>Jl. Surya Sumantri No. 28, Sukajadi, Bandung. Buka Senin–Sabtu, 09:00–20:00.</p>
              <div className="meta">
                <span>312 siswa aktif</span>
                <span>•</span>
                <span>6 ruang kelas</span>
              </div>
            </div>
            <div className="klc-branch">
              <span className="klc-branch-code">JKT</span>
              <h4>Jakarta</h4>
              <p>Ruko Greenville Blok A2, Jakarta Barat. Buka Senin–Sabtu, 10:00–20:00.</p>
              <div className="meta">
                <span>485 siswa aktif</span>
                <span>•</span>
                <span>8 ruang kelas</span>
              </div>
            </div>
            <div className="klc-branch">
              <span className="klc-branch-code">BWS</span>
              <h4>Banyuwangi</h4>
              <p>Jl. Diponegoro No. 41, Banyuwangi. Buka Senin–Jumat & Minggu, 09:00–18:00.</p>
              <div className="meta">
                <span>89 siswa aktif</span>
                <span>•</span>
                <span>3 ruang kelas</span>
              </div>
            </div>
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
              <div className="klc-tarif-card">
                <div className="name">AHE</div>
                <div className="desc">12× sesi/bulan</div>
                <div className="price">
                  Rp 350<small>rb</small>
                </div>
              </div>
              <div className="klc-tarif-card">
                <div className="name">ASE</div>
                <div className="desc">12× sesi/bulan</div>
                <div className="price">
                  Rp 350<small>rb</small>
                </div>
              </div>
              <div className="klc-tarif-card">
                <div className="name">Matematika</div>
                <div className="desc">8× sesi/bulan</div>
                <div className="price">
                  Rp 320<small>rb</small>
                </div>
              </div>
              <div className="klc-tarif-card">
                <div className="name">Les Ngaji</div>
                <div className="desc">8× sesi/bulan</div>
                <div className="price">
                  Rp 280<small>rb</small>
                </div>
              </div>
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
            {faqs.map((faq, i) => (
              <div key={i} className={`klc-faq-item ${openFaqIndex === i ? 'open' : ''}`}>
                <div className="klc-faq-q" onClick={() => toggleFaq(i)}>
                  {faq.q}
                  <span className="toggle">+</span>
                </div>
                <div className="klc-faq-a">{faq.a}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============== FINAL CTA ============== */}
      <section className="klc-section" id="daftar" style={{ paddingTop: 0, paddingBottom: '96px' }}>
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
              href="https://wa.me/628123445566?text=Halo%20KLC%20Bimbel%2C%20saya%20tertarik%20coba%20gratis"
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
                  <a href="https://wa.me/628123445566" target="_blank" rel="noopener noreferrer">WhatsApp: 0812-3344-5566</a>
                </li>
                <li>
                  <a href="mailto:halo@klcbimbel.id">halo@klcbimbel.id</a>
                </li>
                <li>
                  <a href="https://instagram.com/klcbimbel" target="_blank" rel="noopener noreferrer">Instagram @klcbimbel</a>
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
