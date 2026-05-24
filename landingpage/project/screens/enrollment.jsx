/* global React, I, LCData, fmtIDR */
const { useState: useStateE } = React;

function StudentEnrollment() {
  const [step, setStep] = useStateE(2);
  const steps = [
    { n: 1, label: "Data Diri" },
    { n: 2, label: "Mata Pelajaran & Slot" },
    { n: 3, label: "Biaya & Konfirmasi" },
  ];

  return (
    <div className="lc-page" style={{ maxWidth: 1100 }}>
      <div className="row gap-2" style={{ marginBottom: 14, fontSize: 12, color: "var(--text-3)" }}>
        <span style={{ cursor: "pointer" }}>← Siswa</span>
        <I.ChevRight size={11}/>
        <span style={{ color: "var(--text)" }}>Daftar Siswa Baru</span>
      </div>

      <div className="lc-page-header">
        <div>
          <h1 className="lc-page-title">Pendaftaran Siswa Baru</h1>
          <p className="lc-page-sub">Cabang Purwakarta · Tarif SPP akan di-lock pada tarif berlaku hari ini (29 Apr 2026)</p>
        </div>
        <div className="lc-page-actions">
          <button className="lc-btn lc-btn--ghost">Batal</button>
        </div>
      </div>

      {/* Stepper */}
      <div className="lc-card" style={{ padding: "18px 24px", marginBottom: 14 }}>
        <div className="row gap-3">
          {steps.map((s, i) => {
            const done = step > s.n;
            const active = step === s.n;
            return (
              <React.Fragment key={s.n}>
                <div className="row gap-2" style={{ flex: i < 2 ? "0 0 auto" : "0 0 auto" }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%",
                    border: "1.5px solid " + (done ? "var(--success-500)" : active ? "var(--brand-600)" : "var(--border-strong)"),
                    background: done ? "var(--success-500)" : active ? "var(--brand-600)" : "white",
                    color: done || active ? "white" : "var(--text-3)",
                    display: "grid", placeItems: "center", fontSize: 12, fontWeight: 600,
                  }}>
                    {done ? <I.Check size={14}/> : s.n}
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Langkah {s.n}</div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: active ? "var(--brand-700)" : "var(--text)" }}>{s.label}</div>
                  </div>
                </div>
                {i < 2 && <div style={{ flex: 1, height: 1, background: step > s.n ? "var(--success-500)" : "var(--hairline)" }}/>}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 14 }}>
        <div className="lc-card lc-card-pad">
          <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 600, letterSpacing: "-0.01em" }}>Mata Pelajaran & Jadwal</h3>
          <p style={{ margin: "0 0 18px", fontSize: 12.5, color: "var(--text-3)" }}>Pilih mapel yang akan diikuti siswa. Sistem akan mencari slot kosong otomatis.</p>

          {/* Selected mapel */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ border: "1px solid var(--brand-200)", background: "var(--brand-50)", borderRadius: 10, padding: 14 }}>
              <div className="row gap-3">
                <span style={{ width: 10, height: 10, borderRadius: 3, background: "#4A56E0" }}/>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>AHE (Aritmatika)</div>
                  <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>Module-based · Reguler · Rp 350.000/bln</div>
                </div>
                <button className="lc-icon-btn"><I.X size={14}/></button>
              </div>

              <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--brand-200)" }}>
                <div className="row gap-2" style={{ marginBottom: 8 }}>
                  <span style={{ fontSize: 11, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Slot Dipilih (3/3)</span>
                  <button className="lc-btn lc-btn--ghost lc-btn--sm" style={{ marginLeft: "auto" }}><I.Edit size={12}/> Ubah Slot</button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                  {[
                    { d: "Senin",  t: "14:00–15:30" },
                    { d: "Rabu",   t: "14:00–15:30" },
                    { d: "Jumat",  t: "14:00–15:30" },
                  ].map((s, i) => (
                    <div key={i} style={{ background: "white", borderRadius: 6, padding: "8px 10px", fontSize: 12, border: "1px solid var(--brand-100)" }}>
                      <div style={{ fontWeight: 500 }}>{s.d}</div>
                      <div style={{ fontSize: 11, color: "var(--text-3)" }}>{s.t} · Bu Rini</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ border: "1px solid var(--border)", borderRadius: 10, padding: 14 }}>
              <div className="row gap-3">
                <span style={{ width: 10, height: 10, borderRadius: 3, background: "#10B981" }}/>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>Les Ngaji</div>
                  <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>Module-based · Reguler · Rp 280.000/bln</div>
                </div>
                <button className="lc-icon-btn"><I.X size={14}/></button>
              </div>
              <div style={{ marginTop: 10, padding: 10, background: "var(--warning-50)", border: "1px solid var(--warning-100)", borderRadius: 6, fontSize: 12, color: "var(--warning-700)", display: "flex", gap: 8 }}>
                <I.AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }}/>
                <span><strong>Belum ada slot dipilih.</strong> Cari slot tersedia di Cabang PWK untuk Les Ngaji 2× / minggu.</span>
              </div>
              <button className="lc-btn lc-btn--secondary lc-btn--sm" style={{ marginTop: 10 }}><I.Search size={12}/> Cari Slot Les Ngaji</button>
            </div>
          </div>

          <button className="lc-btn lc-btn--ghost" style={{ marginTop: 14, border: "1px dashed var(--border-strong)", width: "100%", justifyContent: "center", padding: 12 }}>
            <I.Plus size={14}/> Tambah Mata Pelajaran Lain
          </button>

          <div style={{ marginTop: 22, paddingTop: 18, borderTop: "1px solid var(--hairline)", display: "flex", gap: 10 }}>
            <button className="lc-btn lc-btn--secondary"><I.ChevLeft size={13}/> Kembali</button>
            <button className="lc-btn lc-btn--primary" style={{ marginLeft: "auto" }}>Lanjut: Biaya & Konfirmasi <I.ChevRight size={13}/></button>
          </div>
        </div>

        {/* Summary panel */}
        <div className="lc-card" style={{ padding: 0, alignSelf: "start", position: "sticky", top: 16 }}>
          <div style={{ padding: 18, borderBottom: "1px solid var(--hairline)" }}>
            <div className="lc-section-h" style={{ marginBottom: 12 }}><h3>Ringkasan Pendaftaran</h3></div>
            <div className="row gap-3">
              <div className="lc-avatar lg" style={{ background: "linear-gradient(135deg, oklch(70% 0.14 280), oklch(50% 0.18 280))" }}>AP</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Aira Putri Maharani</div>
                <div style={{ fontSize: 12, color: "var(--text-3)" }}>Kelas 5 SD · 10 th</div>
              </div>
            </div>
            <div style={{ marginTop: 12, fontSize: 12, color: "var(--text-3)" }}>
              <div className="row gap-2"><span>Wali</span><span style={{ marginLeft: "auto", color: "var(--text)" }}>Ibu Diah</span></div>
              <div className="row gap-2" style={{ marginTop: 4 }}><span>WhatsApp</span><span style={{ marginLeft: "auto", color: "var(--text)" }} className="mono">0812-3344-1101</span></div>
              <div className="row gap-2" style={{ marginTop: 4 }}><span>Cabang</span><span style={{ marginLeft: "auto" }}><span className="lc-badge lc-badge--brand" style={{ fontFamily: "var(--font-mono)" }}>PWK</span></span></div>
            </div>
          </div>

          <div style={{ padding: 18, borderBottom: "1px solid var(--hairline)" }}>
            <div style={{ fontSize: 11, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 10 }}>Rincian Biaya</div>
            {[
              ["AHE — SPP Bulanan", 350000],
              ["Les Ngaji — SPP Bulanan", 280000],
            ].map(([k, v]) => (
              <div key={k} className="row gap-2" style={{ padding: "6px 0", fontSize: 13 }}>
                <span>{k}</span>
                <span style={{ marginLeft: "auto" }} className="mono">{fmtIDR(v)}</span>
              </div>
            ))}
            <div style={{ height: 1, background: "var(--hairline)", margin: "8px 0" }}/>
            <div className="row gap-2" style={{ padding: "4px 0", fontSize: 13, fontWeight: 600 }}>
              <span>SPP / bulan</span>
              <span style={{ marginLeft: "auto" }} className="mono">{fmtIDR(630000)}</span>
            </div>
            <div className="row gap-2" style={{ padding: "6px 0", fontSize: 13, color: "var(--accent-700)" }}>
              <span>Biaya Registrasi (sekali)</span>
              <span style={{ marginLeft: "auto" }} className="mono">{fmtIDR(250000)}</span>
            </div>
          </div>

          <div style={{ padding: 18, background: "var(--brand-50)", borderRadius: "0 0 12px 12px" }}>
            <div className="row gap-2">
              <span style={{ fontSize: 12, color: "var(--brand-700)" }}>Total Tagihan Awal</span>
              <span style={{ marginLeft: "auto", fontSize: 18, fontWeight: 700, color: "var(--brand-800)" }} className="mono">{fmtIDR(880000)}</span>
            </div>
            <div style={{ fontSize: 11, color: "var(--brand-700)", marginTop: 6, lineHeight: 1.5 }}>
              <I.Pin size={11} style={{ display: "inline", marginRight: 4, marginBottom: -1 }}/>
              SPP <strong>Rp 630.000</strong> akan di-<strong>lock</strong> ke siswa ini. Kenaikan tarif di kemudian hari tidak mengubah SPP siswa.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

window.StudentEnrollment = StudentEnrollment;
