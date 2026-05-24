/* global React, I, LCData, fmtIDR */
const { useState: useStateSD } = React;

function SessionDetail() {
  const [tab, setTab] = useStateSD("siswa");

  const session = {
    subject: "AHE",
    type: "Reguler",
    teacher: "Bu Rini Astuti",
    teacherInitials: "RA",
    day: "Senin",
    date: "27 April 2026",
    start: "14:00",
    end: "15:30",
    room: "Ruang 1",
    branch: "PWK",
    capacity: 3,
    students: [
      { id: "S001", name: "Aira Putri Maharani",  initials: "AP", status: "Hadir",  module: "Modul 3 · Bab 5", joined: "Aug 2023" },
      { id: "S002", name: "Bagas Aditya Pratama", initials: "BA", status: "Hadir",  module: "Modul 4 · Bab 9", joined: "Feb 2023" },
      { id: "S008", name: "Hafidz Akbar",          initials: "HA", status: "Sakit",  module: "Modul 2 · Bab 3", joined: "Nov 2023" },
    ],
    history: [
      { d: "27 Apr 2026", teacher: "Bu Rini",   present: 2, absent: 1, status: "Selesai", note: "Hafidz sakit (sudah konfirmasi orang tua)" },
      { d: "24 Apr 2026", teacher: "Bu Rini",   present: 3, absent: 0, status: "Selesai", note: null },
      { d: "22 Apr 2026", teacher: "Pak Doni ⚡",present: 3, absent: 0, status: "Selesai", note: "Pengganti — Bu Rini ada keperluan keluarga" },
      { d: "20 Apr 2026", teacher: "Bu Rini",   present: 3, absent: 0, status: "Selesai", note: null },
      { d: "17 Apr 2026", teacher: "Bu Rini",   present: 2, absent: 1, status: "Selesai", note: "Aira izin (acara sekolah)" },
    ],
  };

  return (
    <div className="lc-page" style={{ maxWidth: 1200 }}>
      {/* breadcrumb-ish header */}
      <div className="row gap-2" style={{ marginBottom: 14, fontSize: 12, color: "var(--text-3)" }}>
        <span style={{ cursor: "pointer" }}>← Jadwal & Sesi</span>
        <I.ChevRight size={11}/>
        <span>Senin 27 Apr</span>
        <I.ChevRight size={11}/>
        <span style={{ color: "var(--text)" }}>14:00 — AHE</span>
      </div>

      <div className="lc-page-header">
        <div>
          <div className="row gap-2" style={{ marginBottom: 4 }}>
            <span className="lc-badge lc-badge--brand" style={{ fontFamily: "var(--font-mono)" }}>{session.branch}</span>
            <span className="lc-badge lc-badge--success">{session.type}</span>
            <span className="lc-badge lc-badge--neutral">{session.room}</span>
          </div>
          <h1 className="lc-page-title">Sesi AHE — {session.day} {session.start}</h1>
          <p className="lc-page-sub">{session.date} · {session.start}–{session.end} · {session.teacher}</p>
        </div>
        <div className="lc-page-actions">
          <button className="lc-btn lc-btn--secondary"><I.Edit size={14}/> Ubah Jadwal</button>
          <button className="lc-btn lc-btn--secondary"><I.Users size={14}/> Ganti Guru</button>
          <button className="lc-btn lc-btn--primary"><I.Check size={14}/> Input Presensi</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 14 }}>
        <div>
          {/* Quick stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 14 }}>
            <div className="lc-card lc-card-pad">
              <div className="lc-stat-label">Kapasitas</div>
              <div className="lc-stat-value">{session.students.length}<span style={{ fontSize: 16, color: "var(--text-3)", fontWeight: 400 }}> / {session.capacity}</span></div>
              <div className="lc-stat-foot"><span className="lc-badge lc-badge--success" style={{ fontSize: 10 }}>Penuh</span></div>
            </div>
            <div className="lc-card lc-card-pad">
              <div className="lc-stat-label">Sesi ke</div>
              <div className="lc-stat-value">12</div>
              <div className="lc-stat-foot"><span>dari ~12 sesi/bulan</span></div>
            </div>
            <div className="lc-card lc-card-pad">
              <div className="lc-stat-label">Rata-rata Kehadiran</div>
              <div className="lc-stat-value">94%</div>
              <div className="lc-stat-foot"><span>30 hari terakhir</span></div>
            </div>
            <div className="lc-card lc-card-pad" style={{ background: "var(--brand-50)", borderColor: "var(--brand-200)" }}>
              <div className="lc-stat-label" style={{ color: "var(--brand-700)" }}>Komisi Sesi</div>
              <div className="lc-stat-value mono" style={{ color: "var(--brand-800)" }}>Rp 35.000</div>
              <div className="lc-stat-foot" style={{ color: "var(--brand-700)" }}><span>3 siswa × Rp 11.667</span></div>
            </div>
          </div>

          <div className="lc-card">
            <div className="lc-tabs" style={{ margin: "0 18px", paddingTop: 4 }}>
              <div className={"lc-tab " + (tab === "siswa" ? "active" : "")} onClick={() => setTab("siswa")}>Siswa di Sesi ({session.students.length})</div>
              <div className={"lc-tab " + (tab === "history" ? "active" : "")} onClick={() => setTab("history")}>Riwayat Sesi ({session.history.length})</div>
              <div className={"lc-tab " + (tab === "info" ? "active" : "")} onClick={() => setTab("info")}>Info Sesi</div>
            </div>

            {tab === "siswa" && (
              <table className="lc-table">
                <thead>
                  <tr>
                    <th>Siswa</th>
                    <th>Posisi Modul</th>
                    <th>Bergabung Sesi</th>
                    <th>Status Hari Ini</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {session.students.map(s => (
                    <tr key={s.id}>
                      <td>
                        <div className="row gap-2">
                          <div className="lc-avatar sm">{s.initials}</div>
                          <div>
                            <div style={{ fontWeight: 500 }}>{s.name}</div>
                            <div style={{ fontSize: 11.5, color: "var(--text-3)" }}>{s.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="muted">{s.module}</td>
                      <td className="muted">{s.joined}</td>
                      <td>
                        <span className={"lc-badge lc-badge--" + (s.status === "Hadir" ? "success" : s.status === "Sakit" ? "info" : "warning")}>
                          <span className="dot"/>{s.status}
                        </span>
                      </td>
                      <td>
                        <div className="row gap-1">
                          <button className="lc-btn lc-btn--ghost lc-btn--sm">Lihat Profil</button>
                          <button className="lc-btn lc-btn--ghost lc-btn--sm" style={{ color: "var(--danger-700)" }}>Keluarkan</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {tab === "history" && (
              <table className="lc-table">
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th>Guru Mengajar</th>
                    <th>Kehadiran</th>
                    <th>Status</th>
                    <th>Catatan</th>
                  </tr>
                </thead>
                <tbody>
                  {session.history.map((h, i) => (
                    <tr key={i}>
                      <td>{h.d}</td>
                      <td>
                        {h.teacher.includes("⚡")
                          ? <span className="row gap-1"><span>{h.teacher.replace(" ⚡", "")}</span><span className="lc-badge lc-badge--warning" style={{ fontSize: 10 }}>Pengganti</span></span>
                          : h.teacher}
                      </td>
                      <td>
                        <span style={{ color: "var(--success-700)", fontWeight: 500 }}>{h.present} hadir</span>
                        {h.absent > 0 && <span style={{ color: "var(--text-3)" }}> · {h.absent} tidak</span>}
                      </td>
                      <td><span className="lc-badge lc-badge--neutral">{h.status}</span></td>
                      <td className="muted" style={{ fontSize: 12 }}>{h.note || <span style={{ color: "var(--text-4)" }}>—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {tab === "info" && (
              <div style={{ padding: 22, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                {[
                  ["Mata Pelajaran", "AHE (Aritmatika)"],
                  ["Tipe", "Reguler — kapasitas 3 siswa"],
                  ["Hari & Jam", "Setiap Senin, 14:00–15:30"],
                  ["Ruangan", "Ruang 1 · Cabang Purwakarta"],
                  ["Guru Tetap", "Bu Rini Astuti"],
                  ["Tracking", "Module-based · Mastery learning"],
                  ["Mulai Berlaku", "1 Januari 2024"],
                  ["Sesi Berikutnya", "Rabu 29 Apr · 14:00"],
                ].map(([k, v]) => (
                  <div key={k}>
                    <div style={{ fontSize: 11, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{k}</div>
                    <div style={{ fontSize: 13.5, fontWeight: 500, marginTop: 4 }}>{v}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="lc-card lc-card-pad">
            <div className="lc-section-h"><h3>Guru Tetap Sesi</h3></div>
            <div className="row gap-3">
              <div className="lc-avatar lg">{session.teacherInitials}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{session.teacher}</div>
                <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>AHE, ASE · 2 cabang</div>
              </div>
            </div>
            <div style={{ marginTop: 12, padding: 10, background: "var(--surface-2)", borderRadius: 8, fontSize: 11.5, color: "var(--text-3)", lineHeight: 1.5 }}>
              <I.Info size={12} style={{ display: "inline", marginRight: 4, marginBottom: -2, color: "var(--info-500)" }}/>
              Jika guru lain submit presensi sesi ini, sistem otomatis mendeteksi pengganti — komisi jatuh ke guru tersebut.
            </div>
            <button className="lc-btn lc-btn--secondary lc-btn--sm" style={{ width: "100%", justifyContent: "center", marginTop: 10 }}>
              Cari Guru Pengganti
            </button>
          </div>

          <div className="lc-card lc-card-pad">
            <div className="lc-section-h"><h3>Konflik Jadwal</h3></div>
            <div style={{ padding: 12, background: "var(--success-50)", borderRadius: 8, fontSize: 12.5, color: "var(--success-700)", display: "flex", gap: 8 }}>
              <I.CheckCircle size={14} style={{ flexShrink: 0, marginTop: 1 }}/>
              <span>Tidak ada konflik. Bu Rini, Ruang 1, dan ke-3 siswa semua tersedia di slot ini.</span>
            </div>
          </div>

          <div className="lc-card lc-card-pad">
            <div className="lc-section-h"><h3>Aktivitas Sesi</h3></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { t: "10 menit lalu", who: "Bu Rini", act: "submit presensi" },
                { t: "1 jam lalu",    who: "Admin Yuni", act: "tambah Hafidz ke sesi" },
                { t: "Kemarin",       who: "Bu Rini", act: "update progress Aira → Bab 5" },
              ].map((a, i) => (
                <div key={i} style={{ fontSize: 12, lineHeight: 1.5 }}>
                  <div><strong>{a.who}</strong> <span style={{ color: "var(--text-3)" }}>{a.act}</span></div>
                  <div style={{ fontSize: 11, color: "var(--text-4)" }}>{a.t}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Slot Finder — find available slot for a new student
// ============================================================
function SlotFinder() {
  return (
    <div className="lc-page" style={{ maxWidth: 1200 }}>
      <div className="lc-page-header">
        <div>
          <h1 className="lc-page-title">Cari Slot Kosong</h1>
          <p className="lc-page-sub">Pendaftaran: <strong style={{ color: "var(--text)" }}>Aira Putri Maharani</strong> · AHE Reguler · 3× per minggu</p>
        </div>
        <div className="lc-page-actions">
          <button className="lc-btn lc-btn--secondary">Batal</button>
          <button className="lc-btn lc-btn--primary"><I.Check size={14}/> Konfirmasi 3 Slot</button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="lc-card" style={{ padding: 16, marginBottom: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr) auto", gap: 12, alignItems: "end" }}>
          <div>
            <label style={{ fontSize: 11, color: "var(--text-3)", display: "block", marginBottom: 4 }}>Mata Pelajaran</label>
            <div className="lc-select" style={{ width: "100%" }}>AHE (Aritmatika) <I.ChevDown size={12} style={{ marginLeft: "auto" }}/></div>
          </div>
          <div>
            <label style={{ fontSize: 11, color: "var(--text-3)", display: "block", marginBottom: 4 }}>Tipe</label>
            <div className="lc-select" style={{ width: "100%" }}>Reguler <I.ChevDown size={12} style={{ marginLeft: "auto" }}/></div>
          </div>
          <div>
            <label style={{ fontSize: 11, color: "var(--text-3)", display: "block", marginBottom: 4 }}>Frekuensi</label>
            <div className="lc-select" style={{ width: "100%" }}>3× / minggu <I.ChevDown size={12} style={{ marginLeft: "auto" }}/></div>
          </div>
          <div>
            <label style={{ fontSize: 11, color: "var(--text-3)", display: "block", marginBottom: 4 }}>Preferensi Guru</label>
            <div className="lc-select" style={{ width: "100%" }}>Siapa saja <I.ChevDown size={12} style={{ marginLeft: "auto" }}/></div>
          </div>
          <div>
            <label style={{ fontSize: 11, color: "var(--text-3)", display: "block", marginBottom: 4 }}>Preferensi Waktu</label>
            <div className="lc-select" style={{ width: "100%" }}>Sore (14:00–17:00) <I.ChevDown size={12} style={{ marginLeft: "auto" }}/></div>
          </div>
          <button className="lc-btn lc-btn--primary"><I.Search size={14}/> Cari Slot</button>
        </div>
      </div>

      <div className="row gap-2" style={{ marginBottom: 14 }}>
        <span style={{ fontSize: 13, color: "var(--text-3)" }}>Ditemukan <strong style={{ color: "var(--text)" }}>14 slot kosong</strong> di Cabang PWK</span>
        <span className="lc-badge lc-badge--brand" style={{ marginLeft: "auto" }}>Pilih 3 slot</span>
        <span className="lc-badge lc-badge--success">2 dipilih</span>
      </div>

      {/* Slot grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
        {[
          { day: "Senin",  t: "14:00–15:30", teacher: "Bu Rini",    cap: "2/3", recommended: true,  selected: true },
          { day: "Rabu",   t: "14:00–15:30", teacher: "Bu Rini",    cap: "2/3", recommended: true,  selected: true },
          { day: "Jumat",  t: "14:00–15:30", teacher: "Bu Rini",    cap: "2/3", recommended: true,  selected: false, hint: "Kombinasi konsisten — guru sama 3× seminggu" },
          { day: "Selasa", t: "15:30–17:00", teacher: "Pak Doni",   cap: "1/3" },
          { day: "Kamis",  t: "15:30–17:00", teacher: "Pak Doni",   cap: "1/3" },
          { day: "Sabtu",  t: "09:00–10:30", teacher: "Bu Rini",    cap: "2/3" },
          { day: "Senin",  t: "16:00–17:30", teacher: "Pak Doni",   cap: "0/3" },
          { day: "Rabu",   t: "16:00–17:30", teacher: "Pak Doni",   cap: "0/3" },
        ].map((s, i) => (
          <div key={i} className="lc-card" style={{
            padding: 14,
            cursor: "pointer",
            borderColor: s.selected ? "var(--brand-500)" : s.recommended ? "var(--brand-200)" : "var(--border)",
            background: s.selected ? "var(--brand-50)" : s.recommended ? "var(--surface)" : "var(--surface)",
            boxShadow: s.selected ? "0 0 0 3px rgba(74,86,224,0.15)" : "var(--sh-xs)",
            position: "relative",
          }}>
            {s.recommended && (
              <span style={{ position: "absolute", top: -8, left: 12, fontSize: 10, fontWeight: 600, padding: "2px 8px", background: "var(--brand-600)", color: "white", borderRadius: 999, letterSpacing: "0.04em", textTransform: "uppercase" }}>Direkomendasikan</span>
            )}
            <div className="row gap-2">
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{s.day} · {s.t}</div>
                <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>{s.teacher} · Ruang 1</div>
              </div>
              <div style={{ width: 22, height: 22, borderRadius: 4, border: "1.5px solid " + (s.selected ? "var(--brand-600)" : "var(--border-strong)"), background: s.selected ? "var(--brand-600)" : "white", display: "grid", placeItems: "center" }}>
                {s.selected && <I.Check size={12} stroke="white"/>}
              </div>
            </div>
            <div className="row gap-2" style={{ marginTop: 10 }}>
              <span className="lc-badge lc-badge--neutral"><I.Users size={10}/> {s.cap}</span>
              <span className="lc-badge lc-badge--outline">Reguler</span>
            </div>
            {s.hint && (
              <div style={{ marginTop: 10, padding: 8, background: "var(--brand-100)", borderRadius: 6, fontSize: 11, color: "var(--brand-800)" }}>
                <I.Info size={11} style={{ display: "inline", marginRight: 4, marginBottom: -2 }}/>{s.hint}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

window.SessionDetail = SessionDetail;
window.SlotFinder = SlotFinder;
