/* global React, I, LCData, fmtIDR */

function Store() {
  const { PRODUCTS } = LCData;

  return (
    <div className="lc-page" style={{ maxWidth: "none" }}>
      <div className="lc-page-header">
        <div>
          <h1 className="lc-page-title">Toko & Stok</h1>
          <p className="lc-page-sub">Cabang Purwakarta · Stok independen per cabang</p>
        </div>
        <div className="lc-page-actions">
          <button className="lc-btn lc-btn--secondary"><I.Upload size={14}/> Request Restock</button>
          <button className="lc-btn lc-btn--primary"><I.Plus size={14}/> Catat Penjualan</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 20 }}>
        <div className="lc-stat">
          <div className="lc-stat-label">Total Produk</div>
          <div className="lc-stat-value">{PRODUCTS.length}</div>
          <div className="lc-stat-foot"><span>4 kategori aktif</span></div>
        </div>
        <div className="lc-stat" style={{ borderColor: "var(--warning-100)" }}>
          <div className="lc-stat-label" style={{ color: "var(--warning-700)" }}>⚠ Di Bawah Stok Minimum</div>
          <div className="lc-stat-value" style={{ color: "var(--warning-700)" }}>3</div>
          <div className="lc-stat-foot"><span>perlu restock segera</span></div>
        </div>
        <div className="lc-stat">
          <div className="lc-stat-label">Penjualan Bulan Ini</div>
          <div className="lc-stat-value mono">Rp 5.4 Jt</div>
          <div className="lc-stat-foot"><span className="lc-delta up"><I.ArrowUp size={11}/>+12%</span><span>vs Mar</span></div>
        </div>
        <div className="lc-stat">
          <div className="lc-stat-label">Transaksi Hari Ini</div>
          <div className="lc-stat-value">8</div>
          <div className="lc-stat-foot"><span>Rp 480 rb total</span></div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 14 }}>
        <div className="lc-card">
          <div className="lc-table-toolbar">
            <div className="lc-search" style={{ width: 220, background: "white", border: "1px solid var(--border)" }}>
              <I.Search size={14}/><span>Cari produk, SKU…</span>
            </div>
            <div style={{ marginLeft: 8 }} className="row gap-1">
              <span className="lc-filter lc-filter--active">Semua</span>
              <span className="lc-filter">Modul</span>
              <span className="lc-filter">Seragam</span>
              <span className="lc-filter">Stationary</span>
              <span className="lc-filter">Alat Tulis</span>
            </div>
          </div>
          <table className="lc-table">
            <thead>
              <tr>
                <th>Produk</th>
                <th>Kategori</th>
                <th className="num">Harga</th>
                <th className="num">Stok</th>
                <th className="num">Min</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {PRODUCTS.map(p => {
                const low = p.stock <= p.min;
                return (
                  <tr key={p.sku}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>{p.sku}</div>
                    </td>
                    <td><span className="lc-badge lc-badge--neutral">{p.category}</span></td>
                    <td className="num mono">{fmtIDR(p.price)}</td>
                    <td className="num mono" style={{ fontWeight: 600, color: low ? "var(--danger-700)" : "var(--text)" }}>{p.stock}</td>
                    <td className="num mono muted">{p.min}</td>
                    <td>
                      {low
                        ? <span className="lc-badge lc-badge--danger"><span className="dot"/>Stok rendah</span>
                        : <span className="lc-badge lc-badge--success"><span className="dot"/>Cukup</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="lc-card">
          <div className="lc-card-head">
            <div className="lc-card-title">Transfer Stok dari Gudang Pusat</div>
            <span className="lc-badge lc-badge--warning" style={{ marginLeft: "auto" }}>2 pending</span>
          </div>
          <div style={{ padding: 14 }}>
            {[
              { sku: "MOD-AHE-2", name: "Modul AHE Tingkat 2", qty: 50, status: "pending", from: "Admin Yuni", branch: "BDG", ts: "2 jam lalu" },
              { sku: "SRG-PWK-M", name: "Seragam Bimbel Size M", qty: 24, status: "pending", from: "Admin Siti", branch: "PWK", ts: "5 jam lalu" },
              { sku: "ALT-SEMPOA", name: "Sempoa 4 Manik", qty: 20, status: "approved", from: "Admin Doni", branch: "BDG", ts: "kemarin" },
              { sku: "STA-PEN-K", name: "Pulpen Bimbel", qty: 100, status: "approved", from: "Admin Yuni", branch: "JKT", ts: "kemarin" },
            ].map((t, i) => (
              <div key={i} style={{ padding: "12px 4px", borderBottom: i < 3 ? "1px solid var(--hairline)" : "none" }}>
                <div className="row gap-2">
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{t.name}</div>
                    <div style={{ fontSize: 11.5, color: "var(--text-3)", marginTop: 2 }}>
                      {t.qty} pcs · ke <strong>{t.branch}</strong> · oleh {t.from}
                    </div>
                  </div>
                  {t.status === "pending"
                    ? <span className="lc-badge lc-badge--warning"><span className="dot"/>Pending</span>
                    : <span className="lc-badge lc-badge--success"><span className="dot"/>Approved</span>}
                </div>
                {t.status === "pending" && (
                  <div className="row gap-1" style={{ marginTop: 8 }}>
                    <button className="lc-btn lc-btn--secondary lc-btn--sm" style={{ flex: 1 }}>Tolak</button>
                    <button className="lc-btn lc-btn--primary lc-btn--sm" style={{ flex: 1 }}>Approve</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

window.Store = Store;
