/* global React, I, LCData, fmtIDR */

// Modal shell — used by RecordPayment + GenerateReportLink screens.
// Renders the parent context (faded) underneath, then the modal on top.
function ModalShell({ children, contextLabel = "Detail Invoice" }) {
  return (
    <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", background: "var(--canvas)" }}>
      {/* Faded parent context */}
      <div style={{
        position: "absolute", inset: 0, padding: "24px 28px",
        filter: "blur(2px) saturate(0.7)", opacity: 0.55, pointerEvents: "none",
      }}>
        <div className="row gap-2" style={{ marginBottom: 14, fontSize: 12, color: "var(--text-3)" }}>
          <span>← Invoice</span> <I.ChevRight size={11}/> <span style={{ color: "var(--text)" }}>{contextLabel}</span>
        </div>
        <div className="lc-card lc-card-pad" style={{ height: "calc(100% - 40px)" }}/>
      </div>

      {/* Scrim */}
      <div style={{ position: "absolute", inset: 0, background: "rgba(15, 18, 28, 0.42)", backdropFilter: "blur(2px)" }}/>

      {/* Modal */}
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", padding: 32 }}>
        {children}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Catat Pembayaran (Record Payment)
   ───────────────────────────────────────────── */
function RecordPayment() {
  const [method, setMethod] = React.useState("transfer");
  const [partial, setPartial] = React.useState(false);
  const total = 1450000;
  const paid = 0;
  const due = total - paid;
  const amount = partial ? 750000 : due;

  return (
    <ModalShell contextLabel="INV-2026-04-0148 · Aira Putri Maharani">
      <div className="lc-card" style={{ width: 560, padding: 0, boxShadow: "0 24px 60px -12px rgba(15, 23, 42, 0.32), 0 0 0 1px rgba(15, 23, 42, 0.06)" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--hairline)", display: "flex", alignItems: "center" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600, letterSpacing: "-0.01em" }}>Catat Pembayaran</h2>
            <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "var(--text-3)" }}>
              <span className="mono">INV-2026-04-0148</span> · Aira Putri Maharani
            </p>
          </div>
          <button className="lc-icon-btn" style={{ marginLeft: "auto" }}><I.X size={15}/></button>
        </div>

        <div style={{ padding: 24 }}>
          {/* Amount due banner */}
          <div style={{ background: "var(--brand-50)", border: "1px solid var(--brand-100)", borderRadius: 10, padding: "14px 16px", marginBottom: 20 }}>
            <div className="row gap-2">
              <div>
                <div style={{ fontSize: 11, color: "var(--brand-700)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Sisa Tagihan</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: "var(--brand-800)", marginTop: 2 }} className="mono">{fmtIDR(due)}</div>
              </div>
              <div style={{ marginLeft: "auto", textAlign: "right", fontSize: 11, color: "var(--text-3)" }}>
                <div>Total: <span className="mono" style={{ color: "var(--text)" }}>{fmtIDR(total)}</span></div>
                <div style={{ marginTop: 2 }}>Sudah dibayar: <span className="mono" style={{ color: "var(--text)" }}>{fmtIDR(paid)}</span></div>
              </div>
            </div>
          </div>

          {/* Field: Tanggal */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text-2)", display: "block", marginBottom: 6 }}>Tanggal Bayar</label>
            <div style={{
              border: "1px solid var(--border)", borderRadius: 8, padding: "9px 12px",
              fontSize: 13, display: "flex", alignItems: "center", gap: 8, background: "white",
            }}>
              <I.Calendar size={14} style={{ color: "var(--text-3)" }}/>
              29 April 2026
              <I.ChevDown size={12} style={{ marginLeft: "auto", color: "var(--text-3)" }}/>
            </div>
          </div>

          {/* Field: Metode */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text-2)", display: "block", marginBottom: 6 }}>Metode Pembayaran</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[
                { id: "transfer", label: "Transfer Bank", icon: <I.Bank size={14}/>, sub: "BCA · BRI · Mandiri" },
                { id: "cash", label: "Tunai", icon: <I.Cash size={14}/>, sub: "Bayar di tempat" },
              ].map(m => {
                const active = method === m.id;
                return (
                  <button key={m.id} onClick={() => setMethod(m.id)} style={{
                    border: "1.5px solid " + (active ? "var(--brand-500)" : "var(--border)"),
                    background: active ? "var(--brand-50)" : "white",
                    borderRadius: 8, padding: "12px 14px", textAlign: "left", cursor: "pointer",
                    display: "flex", flexDirection: "column", gap: 4,
                  }}>
                    <div className="row gap-2" style={{ alignItems: "center" }}>
                      <span style={{ color: active ? "var(--brand-700)" : "var(--text-3)" }}>{m.icon}</span>
                      <span style={{ fontSize: 13, fontWeight: 500, color: active ? "var(--brand-800)" : "var(--text)" }}>{m.label}</span>
                      {active && <I.Check size={13} style={{ marginLeft: "auto", color: "var(--brand-600)" }}/>}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-3)" }}>{m.sub}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Field: Rekening tujuan (only if transfer) */}
          {method === "transfer" && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text-2)", display: "block", marginBottom: 6 }}>Rekening Tujuan</label>
              <div style={{
                border: "1px solid var(--border)", borderRadius: 8, padding: "9px 12px",
                fontSize: 13, display: "flex", alignItems: "center", gap: 10, background: "white",
              }}>
                <span style={{ width: 24, height: 24, borderRadius: 4, background: "#1e40af", color: "white", display: "grid", placeItems: "center", fontSize: 9, fontWeight: 700 }}>BCA</span>
                <div>
                  <div style={{ fontWeight: 500 }}>BCA · 1234567890</div>
                  <div style={{ fontSize: 11, color: "var(--text-3)" }}>a.n. Learning Center Cab. Purwakarta</div>
                </div>
                <I.ChevDown size={12} style={{ marginLeft: "auto", color: "var(--text-3)" }}/>
              </div>
            </div>
          )}

          {/* Field: Jumlah */}
          <div style={{ marginBottom: 16 }}>
            <div className="row gap-2" style={{ marginBottom: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text-2)" }}>Jumlah Dibayar</label>
              <label style={{ marginLeft: "auto", fontSize: 12, color: "var(--text-2)", display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                <input type="checkbox" checked={partial} onChange={() => setPartial(!partial)} style={{ accentColor: "var(--brand-600)" }}/>
                Bayar Sebagian
              </label>
            </div>
            <div style={{
              border: "1.5px solid var(--brand-300)", borderRadius: 8, padding: "11px 14px",
              fontSize: 18, fontWeight: 600, display: "flex", alignItems: "center", gap: 8, background: "white",
            }}>
              <span style={{ color: "var(--text-3)", fontSize: 14, fontWeight: 500 }}>Rp</span>
              <span className="mono">{amount.toLocaleString("id-ID")}</span>
            </div>
            {partial && (
              <div style={{ fontSize: 11, color: "var(--warning-700)", marginTop: 6, display: "flex", gap: 6 }}>
                <I.AlertCircle size={12} style={{ marginTop: 1 }}/>
                Sisa {fmtIDR(due - amount)} akan tetap tertagih. Status invoice → <strong>Sebagian</strong>.
              </div>
            )}
          </div>

          {/* Field: Catatan */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text-2)", display: "block", marginBottom: 6 }}>Catatan (opsional)</label>
            <div style={{
              border: "1px solid var(--border)", borderRadius: 8, padding: "9px 12px",
              fontSize: 13, color: "var(--text-3)", background: "white", minHeight: 60,
            }}>
              Bukti transfer terlampir via WhatsApp Bu Diah, 29 Apr 09:14
            </div>
          </div>

          {/* Receipt option */}
          <label className="row gap-2" style={{ padding: "10px 12px", border: "1px solid var(--hairline)", borderRadius: 8, cursor: "pointer", fontSize: 12.5 }}>
            <input type="checkbox" defaultChecked style={{ accentColor: "var(--brand-600)" }}/>
            <I.Whatsapp size={14} style={{ color: "var(--success-600)" }}/>
            <span>Kirim bukti pembayaran ke WhatsApp orang tua</span>
          </label>
        </div>

        <div style={{ padding: "16px 24px", background: "var(--surface-2)", borderTop: "1px solid var(--hairline)", borderRadius: "0 0 12px 12px", display: "flex", gap: 10 }}>
          <button className="lc-btn lc-btn--ghost">Batal</button>
          <button className="lc-btn lc-btn--primary" style={{ marginLeft: "auto" }}>
            <I.Check size={13}/> Catat Pembayaran {fmtIDR(amount)}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

/* ─────────────────────────────────────────────
   Generate Report Link (Progress share)
   ───────────────────────────────────────────── */
function GenerateReportLink() {
  const [validity, setValidity] = React.useState("30d");
  const validities = [
    { id: "7d", label: "7 hari", sub: "Sekali baca" },
    { id: "30d", label: "30 hari", sub: "Direkomendasikan" },
    { id: "3mo", label: "3 bulan", sub: "Per kwartal" },
    { id: "perm", label: "Permanen", sub: "Tidak kedaluwarsa" },
  ];

  const link = "https://lc.id/r/aira-x7k2p9";
  const wa = `Halo Bu Diah 👋\n\nLaporan progress *Aira* (AHE & Les Ngaji) periode April 2026 sudah tersedia. Silakan dibuka:\n\n${link}\n\n✨ Highlight bulan ini:\n• AHE: naik ke Bab 4 — *Sangat Baik*\n• Les Ngaji: tartil meningkat — *Baik*\n\nLink berlaku sampai 29 Mei 2026.\n\nSalam,\nLC Purwakarta`;

  return (
    <ModalShell contextLabel="Progress · Aira Putri Maharani">
      <div className="lc-card" style={{ width: 720, padding: 0, boxShadow: "0 24px 60px -12px rgba(15, 23, 42, 0.32), 0 0 0 1px rgba(15, 23, 42, 0.06)" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--hairline)", display: "flex", alignItems: "center" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600, letterSpacing: "-0.01em" }}>Bagikan Laporan Progress</h2>
            <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "var(--text-3)" }}>Aira Putri Maharani · April 2026</p>
          </div>
          <button className="lc-icon-btn" style={{ marginLeft: "auto" }}><I.X size={15}/></button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 280px" }}>
          {/* Left: settings */}
          <div style={{ padding: 24, borderRight: "1px solid var(--hairline)" }}>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text-2)", display: "block", marginBottom: 8 }}>Masa Berlaku Link</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {validities.map(v => {
                  const active = validity === v.id;
                  return (
                    <button key={v.id} onClick={() => setValidity(v.id)} style={{
                      border: "1.5px solid " + (active ? "var(--brand-500)" : "var(--border)"),
                      background: active ? "var(--brand-50)" : "white",
                      borderRadius: 8, padding: "10px 12px", textAlign: "left", cursor: "pointer",
                    }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: active ? "var(--brand-800)" : "var(--text)" }}>{v.label}</div>
                      <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>{v.sub}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text-2)", display: "block", marginBottom: 8 }}>Yang Akan Ditampilkan</label>
              {[
                { k: "AHE — semua bab & predikat", on: true },
                { k: "Les Ngaji — riwayat materi & predikat", on: true },
                { k: "Daftar sesi (tanggal & guru)", on: true },
                { k: "Jumlah kehadiran bulanan", on: true },
                { k: "Catatan internal guru", on: false },
              ].map(item => (
                <label key={item.k} className="row gap-2" style={{ padding: "8px 0", borderBottom: "1px solid var(--hairline)", fontSize: 13, cursor: "pointer" }}>
                  <input type="checkbox" defaultChecked={item.on} style={{ accentColor: "var(--brand-600)" }}/>
                  <span style={{ color: item.on ? "var(--text)" : "var(--text-3)" }}>{item.k}</span>
                </label>
              ))}
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text-2)", display: "block", marginBottom: 8 }}>Link yang Dihasilkan</label>
              <div style={{
                background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px",
                fontSize: 13, fontFamily: "var(--font-mono)", display: "flex", alignItems: "center", gap: 10,
              }}>
                <I.Link size={13} style={{ color: "var(--text-3)" }}/>
                <span style={{ flex: 1, color: "var(--brand-700)" }}>{link}</span>
                <button className="lc-btn lc-btn--ghost lc-btn--sm"><I.Copy size={12}/> Salin</button>
              </div>
              <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 6 }}>
                Tanpa login. Berlaku sampai <strong>29 Mei 2026</strong>. Bisa dicabut kapan saja.
              </div>
            </div>
          </div>

          {/* Right: WA preview */}
          <div style={{ padding: 20, background: "linear-gradient(180deg, #efeae2 0%, #d9d3c8 100%)" }}>
            <div className="row gap-2" style={{ marginBottom: 12 }}>
              <I.Whatsapp size={14} style={{ color: "var(--success-600)" }}/>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)" }}>Preview Pesan WA</span>
            </div>
            <div style={{
              background: "#dcf8c6", borderRadius: "8px 8px 8px 2px", padding: "10px 12px",
              fontSize: 11.5, lineHeight: 1.55, whiteSpace: "pre-wrap", color: "#1f2937",
              boxShadow: "0 1px 1px rgba(0,0,0,0.08)",
            }}>
              {wa}
              <div style={{ textAlign: "right", fontSize: 9, color: "#7d8a99", marginTop: 4 }}>09:24 ✓✓</div>
            </div>
          </div>
        </div>

        <div style={{ padding: "16px 24px", background: "var(--surface-2)", borderTop: "1px solid var(--hairline)", borderRadius: "0 0 12px 12px", display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "var(--text-3)" }}>
            <I.Lock size={11} style={{ display: "inline", marginRight: 4, marginBottom: -1 }}/>
            Hanya orang yang punya link bisa membuka
          </span>
          <button className="lc-btn lc-btn--secondary" style={{ marginLeft: "auto" }}><I.Copy size={13}/> Salin Link</button>
          <button className="lc-btn lc-btn--primary"><I.Whatsapp size={13}/> Kirim ke WhatsApp</button>
        </div>
      </div>
    </ModalShell>
  );
}

window.RecordPayment = RecordPayment;
window.GenerateReportLink = GenerateReportLink;
