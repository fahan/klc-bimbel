/* global React, I, LCData, fmtIDR */
const { useState: useStateI } = React;

function Invoices() {
  const { INVOICES } = LCData;
  const [filter, setFilter] = useStateI("Semua");
  const filters = ["Semua", "Belum Lunas", "Sebagian", "Lunas"];
  const filtered = filter === "Semua" ? INVOICES : INVOICES.filter(i => i.status === filter);

  const statusTone = { "Lunas": "success", "Sebagian": "warning", "Belum Lunas": "danger" };

  const totalDue = INVOICES.filter(i => i.status !== "Lunas").reduce((a, i) => a + (i.total - i.paid), 0);
  const totalPaid = INVOICES.reduce((a, i) => a + i.paid, 0);

  return (
    <div className="lc-page" style={{ maxWidth: "none" }}>
      <div className="lc-page-header">
        <div>
          <h1 className="lc-page-title">Invoice & Pembayaran</h1>
          <p className="lc-page-sub">Apr 2026 · 8 invoice diterbitkan</p>
        </div>
        <div className="lc-page-actions">
          <button className="lc-btn lc-btn--secondary"><I.Whatsapp size={14}/> Kirim Massal</button>
          <button className="lc-btn lc-btn--primary"><I.Plus size={14}/> Generate Invoice</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 20 }}>
        <div className="lc-stat">
          <div className="lc-stat-label">Total Tagihan Apr</div>
          <div className="lc-stat-value mono">Rp 5.4 Jt</div>
          <div className="lc-stat-foot"><span>8 invoice diterbitkan</span></div>
        </div>
        <div className="lc-stat">
          <div className="lc-stat-label" style={{ color: "var(--success-700)" }}>Sudah Diterima</div>
          <div className="lc-stat-value mono">{fmtIDR(totalPaid)}</div>
          <div className="lc-stat-foot"><span>4 lunas, 1 sebagian</span></div>
        </div>
        <div className="lc-stat">
          <div className="lc-stat-label" style={{ color: "var(--danger-700)" }}>Outstanding</div>
          <div className="lc-stat-value mono">{fmtIDR(totalDue)}</div>
          <div className="lc-stat-foot"><span className="lc-delta down"><I.ArrowDown size={11}/>3 invoice belum lunas</span></div>
        </div>
        <div className="lc-stat">
          <div className="lc-stat-label">Avg. Hari Bayar</div>
          <div className="lc-stat-value mono">4.2</div>
          <div className="lc-stat-foot"><span>setelah issued</span></div>
        </div>
      </div>

      <div className="lc-card">
        <div className="lc-table-toolbar">
          <div className="row gap-2">
            {filters.map(f => (
              <span key={f} className={"lc-filter " + (filter === f ? "lc-filter--active" : "")} onClick={() => setFilter(f)}>
                {f} <span style={{ marginLeft: 4, color: "var(--text-4)" }}>{f === "Semua" ? INVOICES.length : INVOICES.filter(i => i.status === f).length}</span>
              </span>
            ))}
          </div>
          <div style={{ marginLeft: "auto" }} className="row gap-2">
            <button className="lc-btn lc-btn--ghost lc-btn--sm"><I.Filter size={13}/> Cabang</button>
            <button className="lc-btn lc-btn--ghost lc-btn--sm"><I.Calendar size={13}/> Apr 2026</button>
          </div>
        </div>

        <table className="lc-table">
          <thead>
            <tr>
              <th>Nomor Invoice</th>
              <th>Siswa</th>
              <th>Cabang</th>
              <th>Periode</th>
              <th className="num">Total</th>
              <th className="num">Dibayar</th>
              <th>Status</th>
              <th>Jatuh Tempo</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(inv => (
              <tr key={inv.no}>
                <td>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--brand-700)", fontWeight: 500 }}>{inv.no}</div>
                </td>
                <td style={{ fontWeight: 500 }}>{inv.student}</td>
                <td><span className="lc-badge lc-badge--brand" style={{ fontFamily: "var(--font-mono)" }}>{inv.branch}</span></td>
                <td className="muted">{inv.period}</td>
                <td className="num mono">{fmtIDR(inv.total)}</td>
                <td className="num mono" style={{ color: inv.paid === 0 ? "var(--text-4)" : "var(--text)" }}>{fmtIDR(inv.paid)}</td>
                <td>
                  <span className={"lc-badge lc-badge--" + statusTone[inv.status]}><span className="dot"/>{inv.status}</span>
                </td>
                <td className="muted">{inv.due}</td>
                <td>
                  <div className="row gap-1">
                    <button className="lc-icon-btn" title="Kirim WhatsApp"><I.Whatsapp size={14}/></button>
                    <button className="lc-icon-btn" title="Salin link"><I.Link size={14}/></button>
                    <button className="lc-icon-btn"><I.More size={14}/></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

window.Invoices = Invoices;
