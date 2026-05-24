/* global React, I, LCData, fmtIDR */

// ============================================================
// Mobile — Guru Attendance Flow
// ============================================================
function MobileAttendance() {
  return (
    <div className="lc-phone">
      <div className="lc-phone-notch"/>
      <div className="lc-phone-screen">
        <div className="lc-phone-status">
          <span>9:41</span>
          <span style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <svg width="16" height="11" viewBox="0 0 16 11"><rect x="0" y="3" width="3" height="5" fill="#0E1116" rx="0.5"/><rect x="4" y="2" width="3" height="6" fill="#0E1116" rx="0.5"/><rect x="8" y="1" width="3" height="7" fill="#0E1116" rx="0.5"/><rect x="12" y="0" width="3" height="8" fill="#0E1116" rx="0.5"/></svg>
            <svg width="20" height="11" viewBox="0 0 20 11"><rect x="0" y="0" width="18" height="11" rx="2.5" fill="none" stroke="#0E1116" strokeWidth="0.8"/><rect x="2" y="2" width="14" height="7" rx="1" fill="#0E1116"/></svg>
          </span>
        </div>

        <div className="lc-mobile-header">
          <button className="lc-icon-btn"><I.ArrowLeft size={18}/></button>
          <div style={{ flex: 1 }}>
            <div className="lc-mobile-title">Presensi Sesi</div>
            <div style={{ fontSize: 12, color: "var(--text-3)" }}>AHE · Senin 27 Apr · 14:00</div>
          </div>
          <button className="lc-icon-btn"><I.More size={18}/></button>
        </div>

        <div className="lc-mobile-content">
          <div className="lc-mobile-card" style={{ marginBottom: 14, background: "var(--brand-50)", borderColor: "var(--brand-200)" }}>
            <div className="row gap-2">
              <I.Info size={16} style={{ color: "var(--brand-700)" }}/>
              <span style={{ fontSize: 12.5, color: "var(--brand-800)", lineHeight: 1.4 }}>
                Anda mengajar sebagai <strong>Bu Rini</strong>. Submit presensi → komisi sesi otomatis ke Anda.
              </span>
            </div>
          </div>

          <div style={{ fontSize: 12, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8, paddingLeft: 4 }}>3 Siswa</div>

          {[
            { name: "Aira Putri Maharani", initials: "AP", status: "Hadir" },
            { name: "Bagas Aditya Pratama", initials: "BA", status: "Hadir" },
            { name: "Hafidz Akbar", initials: "HA", status: "Sakit" },
          ].map((s, i) => (
            <div key={i} className="lc-mobile-card" style={{ marginBottom: 10 }}>
              <div className="row gap-3" style={{ marginBottom: 12 }}>
                <div className="lc-avatar">{s.initials}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{s.name}</div>
                  <div style={{ fontSize: 11.5, color: "var(--text-3)" }}>Modul 3 · Bab 5</div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
                {["Hadir","Absen","Izin","Sakit"].map(st => {
                  const active = s.status === st;
                  const tone = { Hadir: ["#D1FADF","#027A48"], Absen: ["#FEE4E2","#B42318"], Izin: ["#FEF0C7","#B54708"], Sakit: ["#D1E9FF","#175CD3"] }[st];
                  return (
                    <button key={st} style={{
                      padding: "8px 4px", border: `1px solid ${active ? tone[1] : "var(--border)"}`,
                      borderRadius: 8, background: active ? tone[0] : "white",
                      color: active ? tone[1] : "var(--text-2)", fontSize: 12, fontWeight: active ? 600 : 500,
                      cursor: "pointer",
                    }}>{st}</button>
                  );
                })}
              </div>
            </div>
          ))}

          <button className="lc-btn lc-btn--primary lc-btn--lg" style={{ width: "100%", justifyContent: "center", marginTop: 10 }}>
            <I.Check size={16}/> Submit Presensi
          </button>
          <div style={{ fontSize: 11, color: "var(--text-3)", textAlign: "center", marginTop: 10 }}>Lanjut ke input progress setelah submit</div>
        </div>

        <div className="lc-mobile-tabbar">
          {[
            { icon: I.Home, label: "Beranda" },
            { icon: I.Calendar, label: "Sesi", active: true },
            { icon: I.Layers, label: "Progress" },
            { icon: I.User, label: "Profil" },
          ].map((t, i) => {
            const Ic = t.icon;
            return (
              <div key={i} className={"lc-mobile-tab " + (t.active ? "active" : "")}>
                <Ic size={20}/>
                <span>{t.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Mobile — Parent Progress Report (link-based, no login)
// ============================================================
function MobileProgressReport() {
  return (
    <div className="lc-phone">
      <div className="lc-phone-notch"/>
      <div className="lc-phone-screen">
        <div className="lc-phone-status">
          <span>9:41</span>
          <span style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <svg width="16" height="11" viewBox="0 0 16 11"><rect x="0" y="3" width="3" height="5" fill="#0E1116" rx="0.5"/><rect x="4" y="2" width="3" height="6" fill="#0E1116" rx="0.5"/><rect x="8" y="1" width="3" height="7" fill="#0E1116" rx="0.5"/><rect x="12" y="0" width="3" height="8" fill="#0E1116" rx="0.5"/></svg>
            <svg width="20" height="11" viewBox="0 0 20 11"><rect x="0" y="0" width="18" height="11" rx="2.5" fill="none" stroke="#0E1116" strokeWidth="0.8"/><rect x="2" y="2" width="14" height="7" rx="1" fill="#0E1116"/></svg>
          </span>
        </div>

        {/* Browser bar */}
        <div style={{ background: "#F2F4F7", padding: "8px 14px", display: "flex", alignItems: "center", gap: 8, borderBottom: "1px solid var(--border)" }}>
          <I.Globe size={12} style={{ color: "var(--text-3)" }}/>
          <span style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>learn-center.id/r/aira-aH3kQ8</span>
        </div>

        <div className="lc-mobile-content">
          <div style={{ background: "linear-gradient(135deg, #4A56E0, #2F359B)", borderRadius: 14, padding: 20, color: "white", marginBottom: 16 }}>
            <div style={{ fontSize: 11, opacity: 0.8, textTransform: "uppercase", letterSpacing: "0.06em" }}>Laporan Progress</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4, letterSpacing: "-0.01em" }}>Aira Putri Maharani</div>
            <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>AHE · Kelas 5 SD · Cabang PWK</div>
            <div className="row gap-2" style={{ marginTop: 12 }}>
              <span style={{ fontSize: 10.5, padding: "3px 8px", background: "rgba(255,255,255,0.18)", borderRadius: 999, backdropFilter: "blur(8px)" }}>Berlaku 30 hari</span>
              <span style={{ fontSize: 10.5, padding: "3px 8px", background: "rgba(255,255,255,0.18)", borderRadius: 999 }}>1 — 28 Apr</span>
            </div>
          </div>

          <div className="lc-mobile-card" style={{ marginBottom: 12 }}>
            <div className="row gap-3">
              <div>
                <div style={{ fontSize: 11, color: "var(--text-3)" }}>Kehadiran</div>
                <div style={{ fontSize: 22, fontWeight: 700, marginTop: 2 }} className="mono">96%</div>
                <div style={{ fontSize: 11, color: "var(--text-3)" }}>11 dari 12 sesi</div>
              </div>
              <div style={{ width: 1, background: "var(--hairline)", alignSelf: "stretch" }}/>
              <div>
                <div style={{ fontSize: 11, color: "var(--text-3)" }}>Posisi Saat Ini</div>
                <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>Modul 3</div>
                <div style={{ fontSize: 11, color: "var(--text-3)" }}>Bab 5 dari 10</div>
              </div>
            </div>
            <div className="lc-progress" style={{ marginTop: 12 }}><div className="lc-progress-bar" style={{ width: "50%" }}/></div>
          </div>

          <div style={{ fontSize: 12, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8, paddingLeft: 4 }}>Modul Selesai</div>

          {[
            { mod: "Modul 1 — Penjumlahan Dasar",  predikat: 5, label: "Memuaskan" },
            { mod: "Modul 2 — Pengurangan Dasar",  predikat: 4, label: "Baik sekali" },
          ].map((m, i) => (
            <div key={i} className="lc-mobile-card" style={{ marginBottom: 10 }}>
              <div className="row gap-2">
                <I.Award size={16} style={{ color: "var(--success-500)" }}/>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{m.mod}</div>
                  <span className={"lc-predikat lc-predikat-" + m.predikat} style={{ marginTop: 6 }}>{m.label}</span>
                </div>
              </div>
            </div>
          ))}

          <div style={{ fontSize: 12, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.04em", margin: "16px 0 8px", paddingLeft: 4 }}>Sesi Terakhir</div>
          {[
            { d: "26 Apr", topic: "Modul 3 · Bab 4 → 5", note: "Sangat baik dalam memahami konsep penjumlahan tiga digit." },
            { d: "24 Apr", topic: "Modul 3 · Bab 3 → 4", note: "Perlu latihan tambahan di rumah." },
            { d: "22 Apr", topic: "Modul 3 · Bab 2 → 3", note: "Antusias, mengerjakan soal mandiri." },
          ].map((s, i) => (
            <div key={i} style={{ padding: "10px 4px", borderBottom: i < 2 ? "1px solid var(--hairline)" : "none" }}>
              <div className="row gap-2">
                <div style={{ fontSize: 11, color: "var(--text-3)", width: 50, fontWeight: 500 }}>{s.d}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 500 }}>{s.topic}</div>
                  <div style={{ fontSize: 11.5, color: "var(--text-3)", marginTop: 3 }}>{s.note}</div>
                </div>
              </div>
            </div>
          ))}

          <div style={{ marginTop: 16, padding: 12, background: "var(--surface-3)", borderRadius: 8, fontSize: 11, color: "var(--text-3)", textAlign: "center" }}>
            Laporan dihasilkan oleh <strong style={{ color: "var(--text-2)" }}>Learning Center Bimbel</strong><br/>
            Berlaku hingga 28 Mei 2026
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Mobile — Parent Invoice
// ============================================================
function MobileInvoice() {
  return (
    <div className="lc-phone">
      <div className="lc-phone-notch"/>
      <div className="lc-phone-screen">
        <div className="lc-phone-status">
          <span>9:41</span>
          <span style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <svg width="16" height="11" viewBox="0 0 16 11"><rect x="0" y="3" width="3" height="5" fill="#0E1116" rx="0.5"/><rect x="4" y="2" width="3" height="6" fill="#0E1116" rx="0.5"/><rect x="8" y="1" width="3" height="7" fill="#0E1116" rx="0.5"/><rect x="12" y="0" width="3" height="8" fill="#0E1116" rx="0.5"/></svg>
            <svg width="20" height="11" viewBox="0 0 20 11"><rect x="0" y="0" width="18" height="11" rx="2.5" fill="none" stroke="#0E1116" strokeWidth="0.8"/><rect x="2" y="2" width="14" height="7" rx="1" fill="#0E1116"/></svg>
          </span>
        </div>

        <div style={{ background: "#F2F4F7", padding: "8px 14px", display: "flex", alignItems: "center", gap: 8, borderBottom: "1px solid var(--border)" }}>
          <I.Globe size={12} style={{ color: "var(--text-3)" }}/>
          <span style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>learn-center.id/i/INV-PWK-202604-002</span>
        </div>

        <div className="lc-mobile-content" style={{ padding: 0 }}>
          {/* Invoice hero */}
          <div style={{ padding: "20px 18px", background: "white", borderBottom: "1px solid var(--hairline)" }}>
            <div className="row gap-2" style={{ marginBottom: 14 }}>
              <div className="lc-sidebar-logo">L</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Learning Center</div>
                <div style={{ fontSize: 10.5, color: "var(--text-3)" }}>Cabang Purwakarta</div>
              </div>
              <span className="lc-badge lc-badge--warning" style={{ marginLeft: "auto" }}><span className="dot"/>Sebagian</span>
            </div>
            <div style={{ fontSize: 11, color: "var(--text-3)" }}>Invoice</div>
            <div style={{ fontSize: 13, fontWeight: 600, fontFamily: "var(--font-mono)", color: "var(--brand-700)", marginTop: 2 }}>
              INV-SPP-PWK-202604-002
            </div>
          </div>

          {/* Amount */}
          <div style={{ padding: "20px 18px", background: "white", borderBottom: "1px solid var(--hairline)", textAlign: "center" }}>
            <div style={{ fontSize: 11, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Sisa Tagihan</div>
            <div style={{ fontSize: 32, fontWeight: 700, marginTop: 4, letterSpacing: "-0.02em" }} className="mono">Rp 350.000</div>
            <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>dari Rp 700.000 (50% terbayar)</div>
            <div style={{ height: 6, background: "var(--surface-3)", borderRadius: 999, marginTop: 12, overflow: "hidden" }}>
              <div style={{ width: "50%", height: "100%", background: "var(--success-500)" }}/>
            </div>
          </div>

          {/* Detail */}
          <div style={{ padding: 18, background: "white" }}>
            <div style={{ fontSize: 12, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 10 }}>Detail Tagihan</div>
            {[
              ["Siswa", "Bagas Aditya Pratama"],
              ["Periode", "April 2026"],
              ["Jatuh Tempo", "10 April 2026"],
              ["Diterbitkan", "1 April 2026"],
            ].map(([k, v], i) => (
              <div key={i} style={{ display: "flex", padding: "8px 0", borderBottom: i < 3 ? "1px solid var(--hairline)" : "none" }}>
                <span style={{ fontSize: 12, color: "var(--text-3)", width: 110 }}>{k}</span>
                <span style={{ fontSize: 12.5, fontWeight: 500 }}>{v}</span>
              </div>
            ))}

            <div style={{ marginTop: 16, padding: "12px 14px", background: "var(--surface-2)", borderRadius: 8 }}>
              <div className="row gap-2" style={{ marginBottom: 6 }}>
                <span style={{ fontSize: 12.5, fontWeight: 500 }}>SPP AHE — Reguler</span>
                <span style={{ marginLeft: "auto", fontSize: 12.5 }} className="mono">Rp 350.000</span>
              </div>
              <div className="row gap-2" style={{ marginBottom: 6 }}>
                <span style={{ fontSize: 12.5, fontWeight: 500 }}>SPP ASE — Reguler</span>
                <span style={{ marginLeft: "auto", fontSize: 12.5 }} className="mono">Rp 350.000</span>
              </div>
              <div style={{ height: 1, background: "var(--border)", margin: "10px 0" }}/>
              <div className="row gap-2">
                <span style={{ fontSize: 13, fontWeight: 600 }}>Total</span>
                <span style={{ marginLeft: "auto", fontSize: 13, fontWeight: 600 }} className="mono">Rp 700.000</span>
              </div>
              <div className="row gap-2" style={{ marginTop: 4 }}>
                <span style={{ fontSize: 12, color: "var(--success-700)" }}>Terbayar</span>
                <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--success-700)" }} className="mono">−Rp 350.000</span>
              </div>
            </div>

            <div style={{ marginTop: 16, padding: 12, border: "1px dashed var(--border-strong)", borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 6 }}>Rekening Pembayaran</div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>BCA · 1234 5678 90</div>
              <div style={{ fontSize: 11.5, color: "var(--text-3)" }}>a.n. Learning Center Bimbel</div>
            </div>

            <button className="lc-btn lc-btn--primary lc-btn--lg" style={{ width: "100%", justifyContent: "center", marginTop: 16 }}>
              <I.Copy size={14}/> Salin No. Rekening
            </button>
            <button className="lc-btn lc-btn--secondary" style={{ width: "100%", justifyContent: "center", marginTop: 8 }}>
              <I.Whatsapp size={14}/> Konfirmasi via WhatsApp
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

window.MobileAttendance = MobileAttendance;
window.MobileProgressReport = MobileProgressReport;
window.MobileInvoice = MobileInvoice;
