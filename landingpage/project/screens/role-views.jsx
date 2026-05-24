/* global React, I, LCData, fmtIDR */

// ============================================================
// Admin Cabang — Dashboard (locked to one cabang, no konsolidasi)
// ============================================================
function AdminCabangDashboard() {
  return (
    <div className="lc-page" style={{ maxWidth: "none" }}>
      <div className="lc-page-header">
        <div>
          <div className="row gap-2" style={{ marginBottom: 4 }}>
            <span className="lc-badge lc-badge--brand" style={{ fontFamily: "var(--font-mono)" }}>PWK</span>
            <span className="lc-badge lc-badge--neutral">Admin Cabang</span>
          </div>
          <h1 className="lc-page-title">Cabang Purwakarta</h1>
          <p className="lc-page-sub">Selamat datang Bu Yuni · Senin, 27 April 2026</p>
        </div>
        <div className="lc-page-actions">
          <button className="lc-btn lc-btn--secondary"><I.Plus size={14}/> Daftar Siswa Baru</button>
          <button className="lc-btn lc-btn--primary"><I.Receipt size={14}/> Generate Invoice</button>
        </div>
      </div>

      {/* Top stats — only PWK figures */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 20 }}>
        {[
          { l: "Siswa Aktif",       v: "47", f: "+3 bulan ini",        t: "success" },
          { l: "Sesi Hari Ini",     v: "8",  f: "5 selesai · 3 berikut",t: "info" },
          { l: "SPP Belum Lunas",   v: "Rp 2.450.000", f: "9 invoice", t: "warning", mono: true },
          { l: "Stok Hampir Habis", v: "3",  f: "perlu request gudang", t: "danger" },
        ].map((s, i) => (
          <div key={i} className="lc-stat">
            <div className="lc-stat-label">{s.l}</div>
            <div className={"lc-stat-value " + (s.mono ? "mono" : "")}>{s.v}</div>
            <div className="lc-stat-foot"><span>{s.f}</span></div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 14 }}>
        <div className="lc-card lc-card-pad">
          <div className="lc-section-h"><h3>Sesi Hari Ini</h3><a>Lihat semua</a></div>
          <table className="lc-table compact">
            <thead><tr><th>Jam</th><th>Mapel</th><th>Guru</th><th>Ruang</th><th>Siswa</th><th>Status</th></tr></thead>
            <tbody>
              {[
                ["09:00", "AHE", "Bu Rini",  "R1", "3/3", "Selesai"],
                ["10:30", "Matematika", "Pak Budi", "R2", "2/3", "Selesai"],
                ["12:30", "AHE", "Bu Rini",  "R1", "3/3", "Selesai"],
                ["14:00", "AHE", "Bu Rini",  "R1", "3/3", "Berlangsung"],
                ["15:30", "Matematika", "Pak Doni ⚡", "R2", "2/3", "Berikut"],
                ["17:00", "Les Ngaji", "Ust. Ali", "Mushola", "2/3", "Berikut"],
              ].map(([t, m, g, r, s, st], i) => (
                <tr key={i}>
                  <td className="mono">{t}</td>
                  <td><strong>{m}</strong></td>
                  <td>{g}</td>
                  <td className="muted">{r}</td>
                  <td className="muted">{s}</td>
                  <td><span className={"lc-badge lc-badge--" + (st === "Selesai" ? "success" : st === "Berlangsung" ? "info" : "neutral")}><span className="dot"/>{st}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="lc-card lc-card-pad">
            <div className="lc-section-h"><h3>Tugas Saya</h3></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { ic: I.AlertCircle, c: "warning", t: "9 invoice belum lunas", s: "Kirim reminder via WA" },
                { ic: I.Receipt,     c: "info",    t: "Generate invoice Mei 2026", s: "Jatuh tempo 1 Mei" },
                { ic: I.Coins,       c: "success", t: "Komisi guru Apr siap diapprove", s: "Total Rp 4.250.000" },
                { ic: I.Store,       c: "danger",  t: "3 produk stok minimum", s: "Request restock ke gudang" },
              ].map((i, k) => {
                const Ic = i.ic;
                return (
                  <div key={k} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: 10, background: "var(--surface-2)", borderRadius: 8 }}>
                    <Ic size={16} style={{ color: `var(--${i.c}-500)`, flexShrink: 0, marginTop: 2 }}/>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{i.t}</div>
                      <div style={{ fontSize: 12, color: "var(--text-3)" }}>{i.s}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="lc-card lc-card-pad">
            <div className="lc-section-h"><h3>Pengumuman dari Pusat</h3></div>
            <div style={{ padding: 12, background: "var(--brand-50)", borderRadius: 8, fontSize: 12.5, lineHeight: 1.5, color: "var(--brand-800)" }}>
              <strong>Tarif SPP AHE</strong> akan naik per 1 Juli 2026 menjadi Rp 380.000.<br/>
              <span style={{ color: "var(--brand-700)" }}>Siswa terdaftar tetap menggunakan tarif lock saat ini.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Guru Desktop — Beranda
// ============================================================
function GuruDashboard() {
  return (
    <div className="lc-page" style={{ maxWidth: "none" }}>
      <div className="lc-page-header">
        <div>
          <div className="row gap-2" style={{ marginBottom: 4 }}>
            <span className="lc-badge lc-badge--neutral">Guru</span>
            <span className="lc-badge lc-badge--outline">AHE · ASE</span>
            <span className="lc-badge lc-badge--outline">PWK · BWS</span>
          </div>
          <h1 className="lc-page-title">Halo, Bu Rini</h1>
          <p className="lc-page-sub">3 sesi hari ini · 1 sudah dipresensi</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 20 }}>
        <div className="lc-stat"><div className="lc-stat-label">Sesi Bulan Ini</div><div className="lc-stat-value">36</div><div className="lc-stat-foot"><span>22 selesai · 14 mendatang</span></div></div>
        <div className="lc-stat"><div className="lc-stat-label">Siswa Saya</div><div className="lc-stat-value">18</div><div className="lc-stat-foot"><span>2 cabang</span></div></div>
        <div className="lc-stat" style={{ background: "var(--brand-50)", borderColor: "var(--brand-200)" }}>
          <div className="lc-stat-label" style={{ color: "var(--brand-700)" }}>Komisi Bulan Ini</div>
          <div className="lc-stat-value mono" style={{ color: "var(--brand-800)" }}>{fmtIDR(770000)}</div>
          <div className="lc-stat-foot" style={{ color: "var(--brand-700)" }}><span>22 sesi · belum diapprove</span></div>
        </div>
        <div className="lc-stat"><div className="lc-stat-label">Rating Kehadiran</div><div className="lc-stat-value">100%</div><div className="lc-stat-foot"><span>3 bulan terakhir</span></div></div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 14 }}>
        <div className="lc-card lc-card-pad">
          <div className="lc-section-h"><h3>Sesi Saya — Hari Ini</h3><a>Buka jadwal mingguan</a></div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { jam: "09:00–10:30", subj: "AHE", room: "PWK · R1", students: 3, status: "selesai" },
              { jam: "14:00–15:30", subj: "AHE", room: "PWK · R1", students: 3, status: "berlangsung" },
              { jam: "16:00–17:30", subj: "ASE", room: "PWK · R2", students: 2, status: "berikut" },
            ].map((s, i) => (
              <div key={i} style={{
                padding: 14, borderRadius: 10,
                border: "1px solid " + (s.status === "berlangsung" ? "var(--brand-300)" : "var(--border)"),
                background: s.status === "berlangsung" ? "var(--brand-50)" : "var(--surface)",
              }}>
                <div className="row gap-3">
                  <div style={{ width: 4, alignSelf: "stretch", borderRadius: 2, background: s.status === "selesai" ? "var(--success-500)" : s.status === "berlangsung" ? "var(--brand-600)" : "var(--text-4)" }}/>
                  <div style={{ flex: 1 }}>
                    <div className="row gap-2">
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 500 }}>{s.jam}</span>
                      <span style={{ fontSize: 14, fontWeight: 600 }}>{s.subj}</span>
                      <span className="lc-badge lc-badge--neutral">{s.room}</span>
                      <span className="lc-badge lc-badge--outline">{s.students} siswa</span>
                    </div>
                  </div>
                  {s.status === "selesai" && <span className="lc-badge lc-badge--success"><span className="dot"/>Selesai</span>}
                  {s.status === "berlangsung" && <button className="lc-btn lc-btn--primary lc-btn--sm"><I.Check size={12}/> Input Presensi</button>}
                  {s.status === "berikut" && <button className="lc-btn lc-btn--secondary lc-btn--sm">Detail</button>}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lc-card lc-card-pad">
          <div className="lc-section-h"><h3>Komisi Saya — April 2026</h3></div>
          <div style={{ padding: 14, background: "var(--surface-2)", borderRadius: 8, marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Estimasi</div>
            <div style={{ fontSize: 28, fontWeight: 700, marginTop: 4, letterSpacing: "-0.01em" }} className="mono">{fmtIDR(770000)}</div>
            <div style={{ fontSize: 11.5, color: "var(--text-3)" }}>22 sesi × Rp 35.000 (rata-rata)</div>
            <span className="lc-badge lc-badge--warning" style={{ marginTop: 8 }}><span className="dot"/>Menunggu Approve Admin</span>
          </div>
          <div style={{ fontSize: 11, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>Rincian Per Sesi</div>
          {[
            { d: "AHE Senin 14:00", n: 4, total: 140000 },
            { d: "AHE Rabu 14:00",  n: 4, total: 140000 },
            { d: "AHE Jumat 14:00", n: 4, total: 140000 },
            { d: "ASE Selasa 16:00",n: 5, total: 175000 },
            { d: "ASE Kamis 16:00", n: 5, total: 175000 },
          ].map((r, i) => (
            <div key={i} className="row gap-2" style={{ padding: "8px 0", borderBottom: i < 4 ? "1px solid var(--hairline)" : "none", fontSize: 13 }}>
              <span>{r.d}</span>
              <span className="muted" style={{ marginLeft: 6, fontSize: 11 }}>{r.n}× sesi</span>
              <span style={{ marginLeft: "auto" }} className="mono">{fmtIDR(r.total)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

window.AdminCabangDashboard = AdminCabangDashboard;
window.GuruDashboard = GuruDashboard;
