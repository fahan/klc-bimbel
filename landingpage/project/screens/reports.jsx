/* global React, I, LCData, fmtIDR, fmtIDRCompact */

function Reports() {
  const months = ["Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des","Jan","Feb","Mar","Apr"];
  const income = [285, 298, 310, 325, 340, 350, 365, 380, 365, 385, 398, 412];
  const expense = [165, 172, 180, 188, 192, 198, 205, 215, 210, 220, 225, 232];
  const max = 450;

  const branches = [
    { code: "PWK", income: 142, expense: 78,  net: 64 },
    { code: "JKT", income: 168, expense: 92,  net: 76 },
    { code: "BWS", income: 48,  expense: 32,  net: 16 },
    { code: "BDG", income: 54,  expense: 30,  net: 24 },
  ];

  return (
    <div className="lc-page" style={{ maxWidth: "none" }}>
      <div className="lc-page-header">
        <div>
          <h1 className="lc-page-title">Laporan Keuangan</h1>
          <p className="lc-page-sub">Konsolidasi semua cabang · April 2026</p>
        </div>
        <div className="lc-page-actions">
          <button className="lc-btn lc-btn--secondary"><I.Calendar size={14}/> Apr 2026</button>
          <button className="lc-btn lc-btn--secondary"><I.Download size={14}/> Export PDF</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 20 }}>
        <div className="lc-stat">
          <div className="lc-stat-label" style={{ color: "var(--success-700)" }}>Pemasukan</div>
          <div className="lc-stat-value mono">Rp 412 Jt</div>
          <div className="lc-stat-foot"><span className="lc-delta up"><I.ArrowUp size={11}/>+8.2%</span><span>vs Mar</span></div>
        </div>
        <div className="lc-stat">
          <div className="lc-stat-label" style={{ color: "var(--danger-700)" }}>Pengeluaran</div>
          <div className="lc-stat-value mono">Rp 232 Jt</div>
          <div className="lc-stat-foot"><span className="lc-delta down"><I.ArrowUp size={11}/>+3.1%</span><span>vs Mar</span></div>
        </div>
        <div className="lc-stat">
          <div className="lc-stat-label">Saldo Bersih</div>
          <div className="lc-stat-value mono" style={{ color: "var(--brand-700)" }}>Rp 180 Jt</div>
          <div className="lc-stat-foot"><span className="lc-delta up"><I.ArrowUp size={11}/>+15.3%</span><span>margin 43.7%</span></div>
        </div>
        <div className="lc-stat">
          <div className="lc-stat-label">Outstanding</div>
          <div className="lc-stat-value mono">Rp 38 Jt</div>
          <div className="lc-stat-foot"><span>12 invoice belum lunas</span></div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 14, marginBottom: 14 }}>
        <div className="lc-card">
          <div className="lc-card-head">
            <div className="lc-card-title">Pemasukan vs Pengeluaran</div>
            <div style={{ marginLeft: "auto" }} className="row gap-3">
              <span className="row gap-1" style={{ fontSize: 11, color: "var(--text-3)" }}><span style={{ width: 8, height: 8, background: "#4A56E0", borderRadius: 2 }}/>Pemasukan</span>
              <span className="row gap-1" style={{ fontSize: 11, color: "var(--text-3)" }}><span style={{ width: 8, height: 8, background: "#FCC9C4", borderRadius: 2 }}/>Pengeluaran</span>
            </div>
          </div>
          <div style={{ padding: 22 }}>
            <svg width="100%" height="240" viewBox="0 0 480 200">
              {[40, 80, 120, 160].map(y => <line key={y} x1="30" y1={y} x2="480" y2={y} stroke="#EEF0F3" strokeWidth="0.5"/>)}
              {[100, 200, 300, 400].map((v, i) => <text key={v} x="22" y={200 - (v / max) * 160 + 3} textAnchor="end" fontSize="9" fill="#94A0AF">{v}</text>)}
              {months.map((m, i) => {
                const x = 50 + i * 35;
                const ih = (income[i] / max) * 160;
                const eh = (expense[i] / max) * 160;
                return (
                  <g key={m}>
                    <rect x={x - 8}  y={200 - ih} width="8" height={ih} fill="#4A56E0" rx="1"/>
                    <rect x={x + 1} y={200 - eh} width="8" height={eh} fill="#FCC9C4" rx="1"/>
                    <text x={x} y="195" textAnchor="middle" fontSize="9" fill="#6B7383">{m}</text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        <div className="lc-card">
          <div className="lc-card-head">
            <div className="lc-card-title">Saldo Bersih per Cabang</div>
          </div>
          <div style={{ padding: "14px 18px" }}>
            {branches.map(b => {
              const total = b.income;
              return (
                <div key={b.code} style={{ marginBottom: 14 }}>
                  <div className="row gap-2" style={{ marginBottom: 6 }}>
                    <span className="lc-badge lc-badge--brand" style={{ fontFamily: "var(--font-mono)" }}>{b.code}</span>
                    <span style={{ marginLeft: "auto", fontSize: 13, fontWeight: 600 }} className="mono">Rp {b.net} Jt</span>
                  </div>
                  <div style={{ display: "flex", height: 20, background: "var(--surface-3)", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ width: ((b.income - b.expense) / total) * 100 + "%", background: "var(--success-500)" }}/>
                    <div style={{ width: (b.expense / total) * 100 + "%", background: "var(--danger-100)" }}/>
                  </div>
                  <div className="row gap-3" style={{ marginTop: 4, fontSize: 11, color: "var(--text-3)" }}>
                    <span>+{b.income} Jt</span>
                    <span>−{b.expense} Jt</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="lc-card">
        <div className="lc-card-head">
          <div className="lc-card-title">Laporan Per Cabang — April 2026</div>
        </div>
        <table className="lc-table">
          <thead>
            <tr>
              <th>Cabang</th>
              <th className="num">SPP</th>
              <th className="num">Registrasi</th>
              <th className="num">Penjualan Toko</th>
              <th className="num">Total Pemasukan</th>
              <th className="num">Komisi Guru</th>
              <th className="num">Pembelian Stok</th>
              <th className="num">Saldo Bersih</th>
            </tr>
          </thead>
          <tbody>
            {[
              { c: "PWK", spp: 132, reg: 5,  toko: 5,  in: 142, kg: 56, ps: 22, net: 64 },
              { c: "JKT", spp: 156, reg: 6,  toko: 6,  in: 168, kg: 72, ps: 20, net: 76 },
              { c: "BWS", spp: 44,  reg: 2,  toko: 2,  in: 48,  kg: 24, ps: 8,  net: 16 },
              { c: "BDG", spp: 50,  reg: 2,  toko: 2,  in: 54,  kg: 22, ps: 8,  net: 24 },
            ].map((r, i) => (
              <tr key={i}>
                <td><span className="lc-badge lc-badge--brand" style={{ fontFamily: "var(--font-mono)" }}>{r.c}</span></td>
                <td className="num mono">Rp {r.spp} Jt</td>
                <td className="num mono">Rp {r.reg} Jt</td>
                <td className="num mono">Rp {r.toko} Jt</td>
                <td className="num mono" style={{ fontWeight: 600 }}>Rp {r.in} Jt</td>
                <td className="num mono" style={{ color: "var(--danger-700)" }}>−Rp {r.kg} Jt</td>
                <td className="num mono" style={{ color: "var(--danger-700)" }}>−Rp {r.ps} Jt</td>
                <td className="num mono" style={{ fontWeight: 600, color: "var(--success-700)" }}>Rp {r.net} Jt</td>
              </tr>
            ))}
            <tr style={{ background: "var(--surface-2)", fontWeight: 600 }}>
              <td>Total Konsolidasi</td>
              <td className="num mono">Rp 382 Jt</td>
              <td className="num mono">Rp 15 Jt</td>
              <td className="num mono">Rp 15 Jt</td>
              <td className="num mono">Rp 412 Jt</td>
              <td className="num mono" style={{ color: "var(--danger-700)" }}>−Rp 174 Jt</td>
              <td className="num mono" style={{ color: "var(--danger-700)" }}>−Rp 58 Jt</td>
              <td className="num mono" style={{ color: "var(--success-700)" }}>Rp 180 Jt</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

window.Reports = Reports;
