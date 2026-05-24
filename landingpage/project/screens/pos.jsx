/* global React, I, LCData, fmtIDR */
const { useState: useStateP } = React;

function POSPenjualan() {
  const { PRODUCTS } = LCData;

  // cart simulated
  const cart = [
    { sku: "MOD-AHE-2", name: "Modul AHE Tingkat 2", price: 75000, qty: 2 },
    { sku: "ALT-SEMPOA", name: "Sempoa 4 Manik",     price: 45000, qty: 1 },
    { sku: "STA-PEN-K",  name: "Pulpen Bimbel",      price: 5000,  qty: 4 },
  ];
  const subtotal = cart.reduce((a, l) => a + l.price * l.qty, 0);
  const discount = 10000;
  const total = subtotal - discount;

  const [linkSiswa, setLinkSiswa] = useStateP(true);
  const [method, setMethod] = useStateP("Tunai");

  const filterCats = ["Semua", "Modul", "Seragam", "Stationary", "Alat Tulis"];
  const [cat, setCat] = useStateP("Semua");
  const filtered = cat === "Semua" ? PRODUCTS : PRODUCTS.filter(p => p.category === cat);

  return (
    <div className="lc-page" style={{ maxWidth: "none", padding: "0 18px 18px" }}>
      <div className="row gap-2" style={{ margin: "14px 0", fontSize: 12, color: "var(--text-3)" }}>
        <span style={{ cursor: "pointer" }}>← Toko & Stok</span>
        <I.ChevRight size={11}/>
        <span style={{ color: "var(--text)" }}>Catat Penjualan</span>
      </div>

      <div className="lc-page-header" style={{ marginBottom: 14 }}>
        <div>
          <h1 className="lc-page-title">Catat Penjualan</h1>
          <p className="lc-page-sub">Cabang Purwakarta · Kasir: Bu Yuni · 30 Apr 2026, 14:32</p>
        </div>
        <div className="lc-page-actions">
          <button className="lc-btn lc-btn--ghost">Batal</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 420px", gap: 14, height: 720 }}>
        {/* Product picker */}
        <div className="lc-card" style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div className="lc-table-toolbar">
            <div className="lc-search" style={{ width: 260, background: "white", border: "1px solid var(--border)" }}>
              <I.Search size={14}/><span>Cari produk atau scan SKU…</span>
            </div>
            <div style={{ marginLeft: 8 }} className="row gap-1">
              {filterCats.map(c => (
                <span key={c} className={"lc-filter " + (cat === c ? "lc-filter--active" : "")} onClick={() => setCat(c)}>{c}</span>
              ))}
            </div>
          </div>

          <div style={{ padding: 14, overflowY: "auto", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, alignContent: "start" }}>
            {filtered.map(p => {
              const inCart = cart.find(c => c.sku === p.sku);
              const low = p.stock <= p.min;
              const out = p.stock === 0;
              return (
                <div key={p.sku} style={{
                  border: "1px solid " + (inCart ? "var(--brand-300)" : "var(--border)"),
                  background: inCart ? "var(--brand-50)" : out ? "var(--surface-2)" : "white",
                  borderRadius: 10, padding: 12, cursor: out ? "not-allowed" : "pointer",
                  opacity: out ? 0.55 : 1, position: "relative",
                }}>
                  <div style={{ height: 70, background: "var(--surface-3)", borderRadius: 6, marginBottom: 10, display: "grid", placeItems: "center", color: "var(--text-4)" }}>
                    {p.category === "Modul" && <I.BookOpen size={26}/>}
                    {p.category === "Seragam" && <I.Shirt size={26}/>}
                    {p.category === "Stationary" && <I.PenTool size={26}/>}
                    {p.category === "Alat Tulis" && <I.PenTool size={26}/>}
                  </div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.3, minHeight: 32 }}>{p.name}</div>
                  <div style={{ fontSize: 10.5, color: "var(--text-3)", fontFamily: "var(--font-mono)", marginTop: 2 }}>{p.sku}</div>
                  <div className="row gap-2" style={{ marginTop: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }} className="mono">{fmtIDR(p.price)}</span>
                    <span style={{ marginLeft: "auto", fontSize: 10.5, color: low ? "var(--danger-700)" : "var(--text-3)" }}>
                      stok {p.stock}
                    </span>
                  </div>
                  {inCart && (
                    <span style={{ position: "absolute", top: 8, right: 8, background: "var(--brand-600)", color: "white", borderRadius: 999, padding: "2px 7px", fontSize: 10.5, fontWeight: 600 }}>
                      ×{inCart.qty}
                    </span>
                  )}
                  {out && (
                    <span style={{ position: "absolute", top: 8, right: 8 }} className="lc-badge lc-badge--neutral">Habis</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Cart panel */}
        <div className="lc-card" style={{ display: "flex", flexDirection: "column", overflow: "hidden", padding: 0 }}>
          <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--hairline)" }}>
            <div className="lc-section-h" style={{ marginBottom: 12 }}><h3>Transaksi #1248</h3></div>

            {/* Optional siswa link */}
            <div style={{ padding: 12, background: linkSiswa ? "var(--brand-50)" : "var(--surface-2)", border: "1px solid " + (linkSiswa ? "var(--brand-200)" : "var(--border)"), borderRadius: 8 }}>
              <label className="row gap-2" style={{ cursor: "pointer", marginBottom: linkSiswa ? 10 : 0 }}>
                <input type="checkbox" checked={linkSiswa} onChange={() => setLinkSiswa(!linkSiswa)} style={{ width: 16, height: 16, accentColor: "var(--brand-600)" }}/>
                <span style={{ fontSize: 13, fontWeight: 500 }}>Kaitkan ke Siswa (opsional)</span>
              </label>
              {linkSiswa && (
                <div className="row gap-2" style={{ padding: "8px 10px", background: "white", border: "1px solid var(--brand-200)", borderRadius: 6 }}>
                  <div className="lc-avatar sm">AP</div>
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 500 }}>Aira Putri Maharani</div>
                    <div style={{ fontSize: 10.5, color: "var(--text-3)" }}>S001 · AHE · PWK</div>
                  </div>
                  <I.X size={12} style={{ marginLeft: "auto", color: "var(--text-3)", cursor: "pointer" }}/>
                </div>
              )}
            </div>
          </div>

          {/* Cart lines */}
          <div style={{ flex: 1, overflowY: "auto", padding: "8px 18px" }}>
            {cart.length === 0 && (
              <div style={{ padding: "60px 0", textAlign: "center", color: "var(--text-4)", fontSize: 13 }}>
                Klik produk di kiri untuk menambah ke keranjang
              </div>
            )}
            {cart.map((l, i) => (
              <div key={l.sku} style={{ padding: "12px 0", borderBottom: i < cart.length - 1 ? "1px solid var(--hairline)" : "none" }}>
                <div className="row gap-2" style={{ marginBottom: 6 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{l.name}</div>
                    <div style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>{l.sku} · {fmtIDR(l.price)}/pcs</div>
                  </div>
                  <button className="lc-icon-btn"><I.X size={12}/></button>
                </div>
                <div className="row gap-2">
                  <div className="row gap-0" style={{ border: "1px solid var(--border)", borderRadius: 6, overflow: "hidden" }}>
                    <button style={{ width: 28, height: 28, background: "white", border: "none", cursor: "pointer", color: "var(--text-2)" }}>−</button>
                    <span style={{ width: 36, textAlign: "center", fontSize: 13, fontWeight: 500, lineHeight: "28px", borderLeft: "1px solid var(--border)", borderRight: "1px solid var(--border)" }} className="mono">{l.qty}</span>
                    <button style={{ width: 28, height: 28, background: "white", border: "none", cursor: "pointer", color: "var(--text-2)" }}>+</button>
                  </div>
                  <span style={{ marginLeft: "auto", fontSize: 13.5, fontWeight: 600 }} className="mono">{fmtIDR(l.price * l.qty)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Footer — totals + payment */}
          <div style={{ padding: 18, background: "var(--surface-2)", borderTop: "1px solid var(--border)" }}>
            <div className="row gap-2" style={{ fontSize: 12.5, color: "var(--text-3)", marginBottom: 4 }}>
              <span>Subtotal ({cart.reduce((a, l) => a + l.qty, 0)} item)</span>
              <span style={{ marginLeft: "auto" }} className="mono">{fmtIDR(subtotal)}</span>
            </div>
            <div className="row gap-2" style={{ fontSize: 12.5, color: "var(--text-3)", marginBottom: 4 }}>
              <span>Diskon <span style={{ color: "var(--brand-700)", cursor: "pointer", textDecoration: "underline" }}>+ tambah</span></span>
              <span style={{ marginLeft: "auto", color: "var(--success-700)" }} className="mono">−{fmtIDR(discount)}</span>
            </div>
            <div style={{ height: 1, background: "var(--border)", margin: "10px 0" }}/>
            <div className="row gap-2" style={{ marginBottom: 14 }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>Total</span>
              <span style={{ marginLeft: "auto", fontSize: 22, fontWeight: 700, letterSpacing: "-0.01em" }} className="mono">{fmtIDR(total)}</span>
            </div>

            <div style={{ fontSize: 11, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>Metode Bayar</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginBottom: 12 }}>
              {["Tunai", "Transfer", "QRIS"].map(m => {
                const active = method === m;
                const ic = m === "Tunai" ? I.Cash : m === "Transfer" ? I.Bank : I.QrCode;
                const Ic = ic;
                return (
                  <button key={m} onClick={() => setMethod(m)} style={{
                    padding: "10px 6px", borderRadius: 8, border: "1px solid " + (active ? "var(--brand-500)" : "var(--border)"),
                    background: active ? "var(--brand-50)" : "white", color: active ? "var(--brand-800)" : "var(--text-2)",
                    fontSize: 12, fontWeight: active ? 600 : 500, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  }}><Ic size={14}/> {m}</button>
                );
              })}
            </div>

            {method === "Tunai" && (
              <div style={{ background: "white", border: "1px solid var(--border)", borderRadius: 8, padding: 12, marginBottom: 12 }}>
                <div className="row gap-2" style={{ fontSize: 12.5 }}>
                  <span style={{ color: "var(--text-3)" }}>Uang Diterima</span>
                  <span style={{ marginLeft: "auto" }} className="mono">Rp 250.000</span>
                </div>
                <div className="row gap-2" style={{ fontSize: 12.5, marginTop: 4 }}>
                  <span style={{ color: "var(--text-3)" }}>Kembalian</span>
                  <span style={{ marginLeft: "auto", color: "var(--success-700)", fontWeight: 600 }} className="mono">{fmtIDR(250000 - total)}</span>
                </div>
              </div>
            )}

            <button className="lc-btn lc-btn--primary lc-btn--lg" style={{ width: "100%", justifyContent: "center" }}>
              <I.Check size={15}/> Bayar & Cetak Struk
            </button>
            <div style={{ fontSize: 10.5, color: "var(--text-4)", textAlign: "center", marginTop: 8 }}>
              Stok akan otomatis berkurang · Pemasukan tercatat ke laporan keuangan PWK
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

window.POSPenjualan = POSPenjualan;
