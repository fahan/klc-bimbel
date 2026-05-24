/* global React, I, LCData */

function Schedule() {
  const { SCHEDULE } = LCData;
  const days = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const slots = ["08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00"];

  const subjectColor = {
    "AHE": { bg: "#EEF1FF", bd: "#BCC8FD", fg: "#2F359B" },
    "ASE": { bg: "#F1EEFE", bd: "#D8CFFE", fg: "#4338CA" },
    "Les Ngaji": { bg: "#ECFDF3", bd: "#A6E9CF", fg: "#027A48" },
    "Matematika": { bg: "#FFFAEB", bd: "#FED9A8", fg: "#B54708" },
    "Matematika (Private)": { bg: "#FFFAEB", bd: "#FED9A8", fg: "#B54708" },
    "Fisika": { bg: "#FEF3F2", bd: "#FCC9C4", fg: "#B42318" },
    "Bahasa Inggris": { bg: "#EFF8FF", bd: "#B2DDFF", fg: "#175CD3" },
  };

  const toMin = (t) => parseInt(t.split(":")[0]) * 60 + parseInt(t.split(":")[1]);
  const startGrid = toMin("08:00");

  return (
    <div className="lc-page" style={{ maxWidth: "none" }}>
      <div className="lc-page-header">
        <div>
          <h1 className="lc-page-title">Jadwal & Sesi</h1>
          <p className="lc-page-sub">Cabang Purwakarta · Minggu 27 Apr – 2 Mei 2026</p>
        </div>
        <div className="lc-page-actions">
          <button className="lc-btn lc-btn--secondary"><I.Calendar size={14}/> Minggu Ini</button>
          <button className="lc-btn lc-btn--primary"><I.Plus size={14}/> Buat Sesi</button>
        </div>
      </div>

      <div className="lc-card">
        <div style={{ padding: "12px 18px", borderBottom: "1px solid var(--hairline)", display: "flex", alignItems: "center", gap: 10 }}>
          <div className="row gap-1">
            <button className="lc-icon-btn"><I.ChevLeft size={14}/></button>
            <button className="lc-icon-btn"><I.ChevRight size={14}/></button>
          </div>
          <span style={{ fontSize: 13, fontWeight: 600 }}>27 April – 2 Mei 2026</span>
          <div style={{ marginLeft: "auto" }} className="row gap-2">
            <span className="lc-badge lc-badge--success"><span className="dot"/>Reguler</span>
            <span className="lc-badge lc-badge--warning"><span className="dot"/>Private</span>
            <span className="lc-badge lc-badge--danger"><span className="dot"/>Penuh</span>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "60px repeat(6, 1fr)", borderBottom: "1px solid var(--hairline)" }}>
          <div/>
          {days.map((d, i) => (
            <div key={d} style={{ padding: "10px 12px", borderLeft: "1px solid var(--hairline)", textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{d.slice(0,3)}</div>
              <div style={{ fontSize: 16, fontWeight: 600, marginTop: 2 }}>{27 + i}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "60px repeat(6, 1fr)", position: "relative" }}>
          {/* Time column */}
          <div>
            {slots.map(s => (
              <div key={s} style={{ height: 56, padding: "4px 8px", fontSize: 11, color: "var(--text-3)", borderTop: "1px solid var(--hairline)", textAlign: "right" }}>
                {s}
              </div>
            ))}
          </div>
          {days.map((d, di) => (
            <div key={d} style={{ position: "relative", borderLeft: "1px solid var(--hairline)" }}>
              {slots.map((s, si) => (
                <div key={si} style={{ height: 56, borderTop: "1px solid var(--hairline)" }}/>
              ))}
              {SCHEDULE.filter(e => e.day === di + 1).map((e, ei) => {
                const top = ((toMin(e.start) - startGrid) / 60) * 56;
                const h   = ((toMin(e.end) - toMin(e.start)) / 60) * 56;
                const c = subjectColor[e.subject] || subjectColor["AHE"];
                const isPrivate = e.subject.includes("Private");
                const isFull = e.students === e.capacity;
                return (
                  <div key={ei} style={{
                    position: "absolute", top: top + 1, left: 4, right: 4, height: h - 2,
                    background: c.bg, border: `1px solid ${c.bd}`, borderLeft: `3px solid ${c.fg}`,
                    borderRadius: 6, padding: "6px 8px", fontSize: 11.5, overflow: "hidden", cursor: "pointer",
                  }}>
                    <div style={{ fontWeight: 600, color: c.fg, fontSize: 12 }}>{e.subject}</div>
                    <div style={{ color: "var(--text-2)", marginTop: 2 }}>{e.start}–{e.end} · {e.teacher}</div>
                    <div style={{ color: "var(--text-3)", marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
                      <I.Users size={10}/>
                      <span>{e.students}/{e.capacity}</span>
                      {isFull && <span style={{ color: "var(--danger-700)", marginLeft: "auto", fontWeight: 500 }}>Penuh</span>}
                      {isPrivate && <span style={{ marginLeft: "auto", fontSize: 10 }}>Private</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

window.Schedule = Schedule;
