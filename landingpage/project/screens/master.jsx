/* global React, I, LCData, fmtIDR */

function MasterData() {
  const { SUBJECTS, TARIFS } = LCData;

  return (
    <div className="lc-page" style={{ maxWidth: "none" }}>
      <div className="lc-page-header">
        <div>
          <h1 className="lc-page-title">Master Data</h1>
          <p className="lc-page-sub">Data global · berlaku semua cabang</p>
        </div>
        <div className="lc-page-actions">
          <button className="lc-btn lc-btn--primary"><I.Plus size={14}/> Tambah Mata Pelajaran</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 14 }}>
        <div className="lc-card">
          <div className="lc-card-head">
            <div className="lc-card-title">Mata Pelajaran</div>
            <span style={{ marginLeft: "auto" }} className="lc-card-sub">{SUBJECTS.length} mapel</span>
          </div>
          <table className="lc-table">
            <thead>
              <tr>
                <th>Mata Pelajaran</th>
                <th>Tipe Tracking</th>
                <th className="num">Reg.</th>
                <th className="num">Priv.</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {SUBJECTS.map(s => (
                <tr key={s.id}>
                  <td>
                    <div className="row gap-2">
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: s.color }}/>
                      <span style={{ fontWeight: 500 }}>{s.name}</span>
                    </div>
                  </td>
                  <td>
                    <span className={"lc-badge " + (s.type === "module_based" ? "lc-badge--brand" : "lc-badge--warning")}>
                      {s.type === "module_based" ? "Module-based" : "Free material"}
                    </span>
                  </td>
                  <td className="num mono">{s.reg}</td>
                  <td className="num mono">{s.priv}</td>
                  <td><button className="lc-icon-btn"><I.Edit size={14}/></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="lc-card">
          <div className="lc-card-head">
            <div className="lc-card-title">Tarif SPP</div>
            <span className="lc-card-sub" style={{ marginLeft: "auto" }}>Histori tersimpan</span>
          </div>
          <div style={{ padding: 14, background: "var(--info-50)", borderBottom: "1px solid var(--info-100)", display: "flex", gap: 10 }}>
            <I.Info size={16} style={{ color: "var(--info-700)", flexShrink: 0, marginTop: 1 }}/>
            <div style={{ fontSize: 12, color: "var(--info-700)", lineHeight: 1.5 }}>
              <strong>SPP siswa di-lock saat daftar.</strong> Tarif baru tidak mengubah SPP siswa lama —
              kecuali admin override manual.
            </div>
          </div>
          <table className="lc-table">
            <thead>
              <tr>
                <th>Mapel</th>
                <th>Tipe</th>
                <th className="num">Tarif</th>
                <th>Berlaku Sejak</th>
              </tr>
            </thead>
            <tbody>
              {TARIFS.map((t, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 500 }}>{t.subject}</td>
                  <td>
                    <span className={"lc-badge " + (t.type === "Private" ? "lc-badge--warning" : "lc-badge--neutral")}>{t.type}</span>
                  </td>
                  <td className="num mono">{fmtIDR(t.price)}</td>
                  <td className="muted">{t.since}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

window.MasterData = MasterData;
