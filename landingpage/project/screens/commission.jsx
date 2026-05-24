/* global React, I, LCData, fmtIDR */

function Commission() {
  const { COMMISSIONS } = LCData;
  const total = COMMISSIONS.reduce((a, c) => a + c.gross, 0);
  const tone = { draft: "neutral", calculated: "warning", approved: "success" };

  return (
    <div className="lc-page" style={{ maxWidth: "none" }}>
      <div className="lc-page-header">
        <div>
          <h1 className="lc-page-title">Komisi Guru</h1>
          <p className="lc-page-sub">April 2026 · semua cabang</p>
        </div>
        <div className="lc-page-actions">
          <button className="lc-btn lc-btn--secondary"><I.Download size={14}/> Export</button>
          <button className="lc-btn lc-btn--primary"><I.CheckCircle size={14}/> Approve Semua</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 20 }}>
        <div className="lc-stat">
          <div className="lc-stat-label">Total Komisi Apr</div>
          <div className="lc-stat-value mono">{fmtIDR(total)}</div>
          <div className="lc-stat-foot"><span>6 guru aktif</span></div>
        </div>
        <div className="lc-stat">
          <div className="lc-stat-label">Total Sesi Bulan Ini</div>
          <div className="lc-stat-value">208</div>
          <div className="lc-stat-foot"><span>167 sesi sudah presensi</span></div>
        </div>
        <div className="lc-stat">
          <div className="lc-stat-label">Status</div>
          <div className="row gap-2" style={{ marginTop: 6 }}>
            <span className="lc-badge lc-badge--neutral">1 draft</span>
            <span className="lc-badge lc-badge--warning">3 calculated</span>
            <span className="lc-badge lc-badge--success">2 approved</span>
          </div>
          <div className="lc-stat-foot" style={{ marginTop: 12 }}><span>auto-calc 30 Apr 23:59</span></div>
        </div>
        <div className="lc-stat" style={{ background: "var(--brand-50)", borderColor: "var(--brand-200)" }}>
          <div className="lc-stat-label" style={{ color: "var(--brand-700)" }}>Formula</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, marginTop: 8, lineHeight: 1.6, color: "var(--brand-800)" }}>
            (SPP siswa<br/>÷ total sesi bulan)<br/>× 40% × hadir
          </div>
        </div>
      </div>

      <div className="lc-card">
        <div className="lc-card-head">
          <div className="lc-card-title">Breakdown Komisi per Guru</div>
          <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--text-3)" }}>Klik baris untuk detail per siswa</span>
        </div>
        <table className="lc-table">
          <thead>
            <tr>
              <th>Guru</th>
              <th>Cabang Mengajar</th>
              <th className="num">Sesi Hadir</th>
              <th className="num">Total Siswa</th>
              <th className="num">Komisi Bruto</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {COMMISSIONS.map((c, i) => (
              <tr key={i}>
                <td>
                  <div className="row gap-2">
                    <div className="lc-avatar sm">{c.teacher.split(" ").map(s => s[0]).slice(0,2).join("")}</div>
                    <span style={{ fontWeight: 500 }}>{c.teacher}</span>
                  </div>
                </td>
                <td className="muted">{c.branch}</td>
                <td className="num mono">{c.sessions}</td>
                <td className="num mono">{c.students}</td>
                <td className="num mono" style={{ fontWeight: 600 }}>{fmtIDR(c.gross)}</td>
                <td>
                  <span className={"lc-badge lc-badge--" + tone[c.status]}><span className="dot"/>{c.status}</span>
                </td>
                <td>
                  <div className="row gap-1">
                    <button className="lc-btn lc-btn--ghost lc-btn--sm">Detail</button>
                    {c.status !== "approved" && <button className="lc-btn lc-btn--secondary lc-btn--sm">Approve</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail panel */}
      <div className="lc-card" style={{ marginTop: 16 }}>
        <div className="lc-card-head">
          <div>
            <div className="lc-card-title">Bu Rini Astuti — Breakdown per Sesi</div>
            <div className="lc-card-sub">PWK + JKT · 48 sesi · transparansi formula</div>
          </div>
        </div>
        <table className="lc-table">
          <thead>
            <tr>
              <th>Tanggal</th>
              <th>Cabang</th>
              <th>Mapel</th>
              <th>Siswa</th>
              <th className="num">SPP Siswa</th>
              <th className="num">Total Sesi/Bln</th>
              <th className="num">Komisi (40%)</th>
            </tr>
          </thead>
          <tbody>
            {[
              { d: "01 Apr", b: "PWK", sub: "AHE", st: "Aira Putri",     spp: 350000, ses: 12, k: 11667 },
              { d: "01 Apr", b: "PWK", sub: "AHE", st: "Bagas Aditya",   spp: 350000, ses: 12, k: 11667 },
              { d: "01 Apr", b: "PWK", sub: "AHE", st: "Hafidz Akbar",   spp: 350000, ses: 12, k: 11667 },
              { d: "02 Apr", b: "JKT", sub: "ASE", st: "Dirga Bayu",     spp: 350000, ses: 12, k: 11667 },
              { d: "03 Apr", b: "PWK", sub: "AHE", st: "Aira Putri",     spp: 350000, ses: 12, k: 11667 },
            ].map((r, i) => (
              <tr key={i}>
                <td className="muted">{r.d}</td>
                <td><span className="lc-badge lc-badge--brand" style={{ fontFamily: "var(--font-mono)" }}>{r.b}</span></td>
                <td>{r.sub}</td>
                <td>{r.st}</td>
                <td className="num mono">{fmtIDR(r.spp)}</td>
                <td className="num mono">{r.ses}</td>
                <td className="num mono" style={{ color: "var(--success-700)", fontWeight: 600 }}>{fmtIDR(r.k)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

window.Commission = Commission;
