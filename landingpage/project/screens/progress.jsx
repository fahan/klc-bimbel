/* global React, I, LCData, fmtIDR */
const { useState: useStateP } = React;

function ProgressTracking() {
  const { AHE_CURRICULUM } = LCData;
  const [tab, setTab] = useStateP("module");

  return (
    <div className="lc-page" style={{ maxWidth: "none" }}>
      <div className="lc-page-header">
        <div>
          <h1 className="lc-page-title">Progress Tracking</h1>
          <p className="lc-page-sub">Sesi AHE — Senin 27 Apr · 14:00–15:30 · Bu Rini · Ruang 1</p>
        </div>
        <div className="lc-page-actions">
          <button className="lc-btn lc-btn--secondary">Simpan Draft</button>
          <button className="lc-btn lc-btn--primary"><I.Check size={14}/> Submit Progress</button>
        </div>
      </div>

      <div className="lc-tabs">
        <div className={"lc-tab " + (tab === "module" ? "active" : "")} onClick={() => setTab("module")}>Module-based (AHE)</div>
        <div className={"lc-tab " + (tab === "free" ? "active" : "")} onClick={() => setTab("free")}>Free Material (Matematika)</div>
      </div>

      {tab === "module" && (
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 14 }}>
          <div className="lc-card">
            <div className="lc-card-head">
              <div className="lc-card-title">Input Per Siswa</div>
              <span className="lc-badge lc-badge--brand" style={{ marginLeft: "auto" }}>Module-based · Mastery Learning</span>
            </div>
            {[
              { name: "Aira Putri Maharani",  initials: "AP", current: { mod: "Modul 3", chap: 5, total: 10 }, fromCh: 5, toCh: 7, done: false },
              { name: "Bagas Aditya Pratama", initials: "BA", current: { mod: "Modul 4", chap: 9, total: 10 }, fromCh: 9, toCh: 10, done: true, predikat: 4 },
              { name: "Hafidz Akbar",         initials: "HA", current: { mod: "Modul 2", chap: 3, total: 8 },  fromCh: 3, toCh: 4, done: false },
            ].map((s, i) => (
              <div key={i} style={{ padding: 18, borderBottom: i < 2 ? "1px solid var(--hairline)" : "none" }}>
                <div className="row gap-3" style={{ marginBottom: 12 }}>
                  <div className="lc-avatar">{s.initials}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{s.name}</div>
                    <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 1 }}>
                      Posisi terkini: <strong style={{ color: "var(--text-2)" }}>{s.current.mod} · Bab {s.current.chap}/{s.current.total}</strong>
                    </div>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, color: "var(--text-3)", display: "block", marginBottom: 4 }}>Modul</label>
                    <div className="lc-select" style={{ width: "100%" }}>{s.current.mod} <I.ChevDown size={12} style={{ marginLeft: "auto" }}/></div>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: "var(--text-3)", display: "block", marginBottom: 4 }}>Bab dari</label>
                    <input className="lc-input" defaultValue={s.fromCh} style={{ width: "100%" }}/>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: "var(--text-3)", display: "block", marginBottom: 4 }}>Bab sampai</label>
                    <input className="lc-input" defaultValue={s.toCh} style={{ width: "100%" }}/>
                  </div>
                </div>

                {s.done && (
                  <div style={{ marginTop: 12, padding: 10, background: "var(--success-50)", border: "1px solid var(--success-100)", borderRadius: 8 }}>
                    <div className="row gap-2" style={{ marginBottom: 8 }}>
                      <I.Award size={14} style={{ color: "var(--success-700)" }}/>
                      <span style={{ fontSize: 12, color: "var(--success-700)", fontWeight: 600 }}>Bab terakhir tercapai — Modul {s.current.mod.split(" ")[1]} selesai!</span>
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 6 }}>Pilih predikat akhir modul:</div>
                    <div className="row gap-1">
                      {[1,2,3,4,5].map(p => (
                        <span key={p} className={"lc-predikat lc-predikat-" + p} style={{ cursor: "pointer", opacity: s.predikat === p ? 1 : 0.55, outline: s.predikat === p ? "2px solid currentColor" : "none" }}>
                          {["Perlu bimbingan","Cukup","Baik","Baik sekali","Memuaskan"][p-1]}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <textarea className="lc-input" placeholder="Catatan (opsional)…" style={{ width: "100%", marginTop: 10, minHeight: 38, resize: "vertical" }}/>
              </div>
            ))}
          </div>

          <div className="lc-card">
            <div className="lc-card-head">
              <div className="lc-card-title">Kurikulum AHE</div>
              <span className="lc-card-sub" style={{ marginLeft: "auto" }}>6 modul · 62 bab</span>
            </div>
            <div style={{ padding: 16 }}>
              {AHE_CURRICULUM.map((m, i) => {
                const isCurrent = i === 2;
                return (
                  <div key={i} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: i < AHE_CURRICULUM.length - 1 ? "1px solid var(--hairline)" : "none" }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", border: "1.5px solid " + (isCurrent ? "var(--brand-500)" : i < 2 ? "var(--success-500)" : "var(--border-strong)"), background: i < 2 ? "var(--success-500)" : "white", color: i < 2 ? "white" : isCurrent ? "var(--brand-700)" : "var(--text-3)", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 600, flexShrink: 0 }}>
                      {i < 2 ? <I.Check size={12}/> : i + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{m.module}</div>
                      <div style={{ fontSize: 11.5, color: "var(--text-3)" }}>{m.chapters} bab · {i < 2 ? "selesai" : isCurrent ? "sedang dikerjakan" : "terkunci"}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {tab === "free" && (
        <div className="lc-card">
          <div className="lc-card-head">
            <div className="lc-card-title">Sesi Matematika — Free Material</div>
            <span className="lc-badge lc-badge--warning" style={{ marginLeft: "auto" }}>Free material · per topik</span>
          </div>
          <div style={{ padding: 22, borderBottom: "1px solid var(--hairline)", background: "var(--surface-2)" }}>
            <label style={{ fontSize: 11, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: 6 }}>Topik hari ini (berlaku semua siswa)</label>
            <input className="lc-input" defaultValue="Persamaan Linear Dua Variabel — metode substitusi & eliminasi" style={{ width: "100%", fontSize: 14, fontWeight: 500 }}/>
          </div>
          {[
            { name: "Citra Anggun Pertiwi", initials: "CA", predikat: 4 },
            { name: "Elsa Damayanti",       initials: "ED", predikat: 3 },
            { name: "Joshua Tanuwijaya",    initials: "JT", predikat: 5 },
          ].map((s, i) => (
            <div key={i} style={{ padding: 18, borderBottom: i < 2 ? "1px solid var(--hairline)" : "none", display: "grid", gridTemplateColumns: "240px 1fr 280px", gap: 16, alignItems: "center" }}>
              <div className="row gap-2">
                <div className="lc-avatar sm">{s.initials}</div>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{s.name}</span>
              </div>
              <div className="row gap-1">
                {[1,2,3,4,5].map(p => (
                  <span key={p} className={"lc-predikat lc-predikat-" + p} style={{ cursor: "pointer", opacity: s.predikat === p ? 1 : 0.5, outline: s.predikat === p ? "2px solid currentColor" : "none" }}>
                    {["1","2","3","4","5"][p-1]}
                  </span>
                ))}
              </div>
              <input className="lc-input" placeholder="Catatan khusus untuk siswa ini…"/>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

window.ProgressTracking = ProgressTracking;
