/* global React, I, LCData, fmtIDR */
const { useState: useStateS } = React;

function Students() {
  const { STUDENTS } = LCData;
  const [filter, setFilter] = useStateS("Semua");
  const [selected, setSelected] = useStateS(STUDENTS[0]);

  const filters = ["Semua", "Aktif", "Cuti", "Tunggakan"];
  const branchTone = { PWK: "brand", JKT: "info", BWS: "warning", BDG: "success" };

  const filtered = STUDENTS.filter(s => {
    if (filter === "Semua") return true;
    if (filter === "Aktif") return s.status === "Aktif";
    if (filter === "Cuti") return s.status === "Cuti";
    if (filter === "Tunggakan") return s.attendance < 80;
    return true;
  });

  return (
    <div className="lc-page" style={{ maxWidth: "none" }}>
      <div className="lc-page-header">
        <div>
          <h1 className="lc-page-title">Siswa</h1>
          <p className="lc-page-sub">{STUDENTS.length} siswa terdaftar di 4 cabang</p>
        </div>
        <div className="lc-page-actions">
          <button className="lc-btn lc-btn--secondary"><I.Upload size={14}/> Import CSV</button>
          <button className="lc-btn lc-btn--primary"><I.Plus size={14}/> Daftar Siswa Baru</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 14 }}>
        <div className="lc-card">
          <div className="lc-table-toolbar">
            <div className="lc-search" style={{ width: 220, background: "white", border: "1px solid var(--border)" }}>
              <I.Search size={14}/><span>Cari nama, kode siswa…</span>
            </div>
            <div className="row gap-2" style={{ marginLeft: 8 }}>
              {filters.map(f => (
                <span key={f} className={"lc-filter " + (filter === f ? "lc-filter--active" : "")} onClick={() => setFilter(f)}>
                  {f}
                </span>
              ))}
            </div>
            <div style={{ marginLeft: "auto" }}>
              <button className="lc-btn lc-btn--ghost lc-btn--sm"><I.Filter size={13}/> Filter</button>
            </div>
          </div>
          <table className="lc-table">
            <thead>
              <tr>
                <th>Siswa</th>
                <th>Cabang</th>
                <th>Mapel</th>
                <th>Status</th>
                <th className="num">Kehadiran</th>
                <th className="num">SPP</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.id} onClick={() => setSelected(s)} style={{ cursor: "pointer", background: selected?.id === s.id ? "var(--brand-50)" : undefined }}>
                  <td>
                    <div className="row gap-2">
                      <div className="lc-avatar sm" style={{ background: `linear-gradient(135deg, oklch(70% 0.14 ${(s.id.charCodeAt(2) * 30) % 360}), oklch(50% 0.18 ${(s.id.charCodeAt(2) * 30) % 360}))` }}>{s.initials}</div>
                      <div>
                        <div style={{ fontWeight: 500 }}>{s.name}</div>
                        <div style={{ fontSize: 11.5, color: "var(--text-3)" }}>{s.id} · {s.grade}</div>
                      </div>
                    </div>
                  </td>
                  <td><span className={"lc-badge lc-badge--" + (branchTone[s.branch] || "neutral")} style={{ fontFamily: "var(--font-mono)" }}>{s.branch}</span></td>
                  <td>
                    <div className="row gap-1">
                      {s.subjects.slice(0, 2).map(sub => <span key={sub} className="lc-badge lc-badge--outline">{sub}</span>)}
                      {s.subjects.length > 2 && <span className="lc-badge lc-badge--outline">+{s.subjects.length - 2}</span>}
                    </div>
                  </td>
                  <td>
                    <span className={"lc-badge " + (s.status === "Aktif" ? "lc-badge--success" : "lc-badge--warning")}>
                      <span className="dot"/>{s.status}
                    </span>
                  </td>
                  <td className="num">
                    <span style={{ color: s.attendance < 80 ? "var(--danger-700)" : "var(--text)" }}>{s.attendance}%</span>
                  </td>
                  <td className="num mono">{fmtIDR(s.spp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ padding: "10px 18px", borderTop: "1px solid var(--hairline)", display: "flex", alignItems: "center", fontSize: 12, color: "var(--text-3)" }}>
            <span>Menampilkan {filtered.length} dari {STUDENTS.length} siswa</span>
            <div style={{ marginLeft: "auto" }} className="row gap-1">
              <button className="lc-btn lc-btn--ghost lc-btn--sm"><I.ChevLeft size={13}/></button>
              <span style={{ padding: "0 8px" }}>1 / 1</span>
              <button className="lc-btn lc-btn--ghost lc-btn--sm"><I.ChevRight size={13}/></button>
            </div>
          </div>
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="lc-card">
            <div style={{ padding: 22, borderBottom: "1px solid var(--hairline)" }}>
              <div className="row gap-3">
                <div className="lc-avatar lg" style={{ background: `linear-gradient(135deg, oklch(70% 0.14 ${(selected.id.charCodeAt(2) * 30) % 360}), oklch(50% 0.18 ${(selected.id.charCodeAt(2) * 30) % 360}))` }}>{selected.initials}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.01em" }}>{selected.name}</div>
                  <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }} className="row gap-2">
                    <span>{selected.id}</span><span>·</span><span>{selected.grade}</span>
                    <span className={"lc-badge lc-badge--" + (branchTone[selected.branch] || "neutral")} style={{ fontFamily: "var(--font-mono)" }}>{selected.branch}</span>
                  </div>
                </div>
                <button className="lc-icon-btn"><I.More size={16}/></button>
              </div>
              <div className="row gap-2" style={{ marginTop: 14 }}>
                <button className="lc-btn lc-btn--secondary lc-btn--sm"><I.Whatsapp size={13}/> Kirim Laporan</button>
                <button className="lc-btn lc-btn--secondary lc-btn--sm"><I.Receipt size={13}/> Lihat Invoice</button>
                <button className="lc-btn lc-btn--ghost lc-btn--sm"><I.Edit size={13}/> Edit</button>
              </div>
            </div>

            <div style={{ padding: 22, borderBottom: "1px solid var(--hairline)" }}>
              <div className="lc-section-h"><h3>Orang Tua / Wali</h3></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, color: "var(--text-3)" }}>Nama</div>
                  <div style={{ fontSize: 13, fontWeight: 500, marginTop: 2 }}>{selected.parent}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "var(--text-3)" }}>WhatsApp</div>
                  <div style={{ fontSize: 13, fontWeight: 500, marginTop: 2 }} className="mono">{selected.phone}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "var(--text-3)" }}>Tanggal Daftar</div>
                  <div style={{ fontSize: 13, fontWeight: 500, marginTop: 2 }}>{selected.joinDate}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "var(--text-3)" }}>SPP Lock (saat daftar)</div>
                  <div style={{ fontSize: 13, fontWeight: 500, marginTop: 2 }} className="mono">{fmtIDR(selected.spp)}</div>
                </div>
              </div>
            </div>

            <div style={{ padding: 22, borderBottom: "1px solid var(--hairline)" }}>
              <div className="lc-section-h"><h3>Mata Pelajaran & Progress</h3></div>
              {selected.subjects.map((sub, i) => {
                const pct = [72, 45, 88][i] ?? 60;
                return (
                  <div key={sub} style={{ marginBottom: 12 }}>
                    <div className="row gap-2" style={{ marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{sub}</span>
                      <span className="lc-badge lc-badge--neutral" style={{ fontSize: 10 }}>
                        {sub === "AHE" || sub === "ASE" || sub === "Les Ngaji" ? "Module-based" : "Free material"}
                      </span>
                      <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--text-3)" }}>
                        {sub === "AHE" ? "Modul 3 · Bab 5/10" : pct + "% rata-rata"}
                      </span>
                    </div>
                    <div className="lc-progress"><div className="lc-progress-bar" style={{ width: pct + "%" }}/></div>
                  </div>
                );
              })}
            </div>

            <div style={{ padding: 22 }}>
              <div className="lc-section-h"><h3>Status Pembayaran</h3></div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                {[
                  { label: "Apr 2026", status: "Lunas",   tone: "success" },
                  { label: "Mar 2026", status: "Lunas",   tone: "success" },
                  { label: "Feb 2026", status: "Lunas",   tone: "success" },
                ].map((m, i) => (
                  <div key={i} style={{ padding: 10, border: "1px solid var(--border)", borderRadius: 8 }}>
                    <div style={{ fontSize: 11, color: "var(--text-3)" }}>{m.label}</div>
                    <span className={"lc-badge lc-badge--" + m.tone} style={{ marginTop: 4 }}>{m.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

window.Students = Students;
