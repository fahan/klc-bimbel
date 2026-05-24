/* global React, I, LCData, fmtIDR, fmtIDRCompact */
const { useState: useStateD } = React;

function Dashboard() {
  const { RECENT_ACTIVITY, BRANCHES } = LCData;

  const stats = [
    { label: "Total Siswa Aktif",   value: "545",  delta: "+18", deltaDir: "up",   foot: "vs bulan lalu" },
    { label: "Pendapatan Bulan Ini",value: "Rp 412 Jt", delta: "+8.2%", deltaDir: "up",   foot: "Apr 2026" },
    { label: "Sesi Minggu Ini",     value: "284",  delta: "−4",   deltaDir: "down", foot: "vs minggu lalu" },
    { label: "Outstanding Invoice", value: "Rp 38 Jt", delta: "12 invoice", deltaDir: "flat", foot: "perlu ditagih" },
  ];

  // sparkline points
  const spark = [38, 42, 41, 48, 52, 55, 60, 64, 62, 70, 74, 78];
  const max = Math.max(...spark);
  const sparkPath = spark.map((v, i) => `${i === 0 ? "M" : "L"} ${i * 24} ${60 - (v / max) * 50}`).join(" ");

  return (
    <div className="lc-page">
      <div className="lc-page-header">
        <div>
          <h1 className="lc-page-title">Dashboard</h1>
          <p className="lc-page-sub">Ringkasan operasional semua cabang · Rabu, 29 April 2026</p>
        </div>
        <div className="lc-page-actions">
          <button className="lc-btn lc-btn--secondary"><I.Download size={14}/> Export</button>
          <button className="lc-btn lc-btn--primary"><I.Plus size={14}/> Tambah Siswa</button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 20 }}>
        {stats.map((s, i) => (
          <div key={i} className="lc-stat">
            <div className="lc-stat-label">{s.label}</div>
            <div className="lc-stat-value">{s.value}</div>
            <div className="lc-stat-foot">
              <span className={"lc-delta " + s.deltaDir}>
                {s.deltaDir === "up" && <I.ArrowUp size={11}/>}
                {s.deltaDir === "down" && <I.ArrowDown size={11}/>}
                {s.delta}
              </span>
              <span>{s.foot}</span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 14, marginBottom: 14 }}>
        {/* Revenue chart */}
        <div className="lc-card">
          <div className="lc-card-head">
            <div>
              <div className="lc-card-title">Pendapatan 12 bulan terakhir</div>
              <div className="lc-card-sub">Konsolidasi semua cabang · dalam juta Rupiah</div>
            </div>
            <div style={{ marginLeft: "auto" }} className="row gap-2">
              <button className="lc-btn lc-btn--ghost lc-btn--sm">Bulanan</button>
              <button className="lc-btn lc-btn--ghost lc-btn--sm">Kuartalan</button>
              <button className="lc-btn lc-btn--ghost lc-btn--sm">Tahunan</button>
            </div>
          </div>
          <div style={{ padding: 22 }}>
            <svg width="100%" height="220" viewBox="0 0 280 80" preserveAspectRatio="none">
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4A56E0" stopOpacity="0.25"/>
                  <stop offset="100%" stopColor="#4A56E0" stopOpacity="0"/>
                </linearGradient>
              </defs>
              {[15, 30, 45, 60].map(y => <line key={y} x1="0" y1={y} x2="280" y2={y} stroke="#EEF0F3" strokeWidth="0.5"/>)}
              <path d={sparkPath + " L 264 60 L 0 60 Z"} fill="url(#g1)"/>
              <path d={sparkPath} stroke="#4A56E0" strokeWidth="1.5" fill="none"/>
              {spark.map((v, i) => (
                <circle key={i} cx={i * 24} cy={60 - (v / max) * 50} r="1.6" fill="#4A56E0"/>
              ))}
            </svg>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 11, color: "var(--text-3)" }}>
              {["Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des","Jan","Feb","Mar","Apr"].map(m => <span key={m}>{m}</span>)}
            </div>
          </div>
        </div>

        {/* Branch breakdown */}
        <div className="lc-card">
          <div className="lc-card-head">
            <div className="lc-card-title">Performa Cabang</div>
            <span style={{ marginLeft: "auto" }} className="lc-badge lc-badge--neutral">Apr 2026</span>
          </div>
          <div style={{ padding: "8px 6px" }}>
            {BRANCHES.map((b, i) => {
              const pct = [78, 62, 95, 70][i];
              return (
                <div key={b.code} style={{ padding: "10px 14px" }}>
                  <div className="row gap-2" style={{ marginBottom: 6 }}>
                    <span className="lc-badge lc-badge--brand" style={{ fontFamily: "var(--font-mono)" }}>{b.code}</span>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{b.name.replace("Cabang ", "")}</span>
                    <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--text-3)" }} className="mono">{b.students} siswa</span>
                  </div>
                  <div className="lc-progress"><div className="lc-progress-bar" style={{ width: pct + "%" }}/></div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {/* Recent activity */}
        <div className="lc-card">
          <div className="lc-card-head">
            <div className="lc-card-title">Aktivitas Terbaru</div>
            <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--brand-700)", cursor: "pointer" }}>Lihat semua</span>
          </div>
          <div>
            {RECENT_ACTIVITY.map((a, i) => (
              <div key={i} style={{ padding: "12px 18px", display: "flex", gap: 12, borderTop: i ? "1px solid var(--hairline)" : "none" }}>
                <div className="lc-avatar sm">{a.by.split(" ").map(s => s[0]).slice(0,2).join("")}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13 }}>
                    <strong style={{ fontWeight: 600 }}>{a.by}</strong>
                    <span style={{ color: "var(--text-3)" }}> · {a.what}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>{a.detail}</div>
                </div>
                <div style={{ fontSize: 11, color: "var(--text-4)" }}>{a.ts}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tasks / alerts */}
        <div className="lc-card">
          <div className="lc-card-head">
            <div className="lc-card-title">Perlu Perhatian</div>
          </div>
          <div style={{ padding: "12px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { icon: I.AlertCircle, color: "var(--danger-500)", title: "12 invoice belum lunas",     sub: "Total Rp 38.4 Jt · jatuh tempo lewat 7 hari" },
              { icon: I.Package,     color: "var(--warning-500)", title: "4 produk di bawah stok minimum",sub: "Cabang PWK · Modul AHE-2, Seragam M, +2" },
              { icon: I.Coins,       color: "var(--info-500)",   title: "Komisi April siap di-approve", sub: "6 guru · Total Rp 16.6 Jt · status: calculated" },
              { icon: I.Users,       color: "var(--success-500)",title: "8 siswa baru menunggu placement",sub: "Belum ada slot jadwal" },
            ].map((t, i) => {
              const Ic = t.icon;
              return (
                <div key={i} style={{ display: "flex", gap: 10, padding: "10px 12px", border: "1px solid var(--border)", borderRadius: 8, background: "var(--surface-2)" }}>
                  <div style={{ width: 28, height: 28, borderRadius: 6, background: "white", border: "1px solid var(--border)", display: "grid", placeItems: "center", color: t.color }}>
                    <Ic size={14}/>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{t.title}</div>
                    <div style={{ fontSize: 11.5, color: "var(--text-3)", marginTop: 1 }}>{t.sub}</div>
                  </div>
                  <button className="lc-btn lc-btn--ghost lc-btn--sm">Buka</button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

window.Dashboard = Dashboard;
