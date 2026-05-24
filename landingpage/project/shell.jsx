/* global React, I, Icon */
const { useState } = React;

// ============================================================
// Sidebar
// ============================================================
function Sidebar({ active, onNav, branch, onSwitchBranch, role = "owner" }) {
  const ownerItems = [
    { section: "Overview" },
    { id: "dashboard", label: "Dashboard", icon: I.Home2 },
    { id: "schedule",  label: "Jadwal & Sesi", icon: I.Calendar, count: 14 },

    { section: "Akademik" },
    { id: "students",  label: "Siswa", icon: I.GraduationCap, count: 142 },
    { id: "progress",  label: "Progress Tracking", icon: I.Layers },
    { id: "attendance",label: "Presensi", icon: I.Check },

    { section: "Keuangan" },
    { id: "invoices",  label: "Invoice & Pembayaran", icon: I.Receipt, count: 8 },
    { id: "commission",label: "Komisi Guru", icon: I.Coins },
    { id: "reports",   label: "Laporan", icon: I.Chart },

    { section: "Operasional" },
    { id: "store",     label: "Toko & Stok", icon: I.Store },
    { id: "master",    label: "Master Data", icon: I.Database },
  ];

  const adminCabangItems = [
    { section: "Overview" },
    { id: "dashboard", label: "Dashboard Cabang", icon: I.Home2 },
    { id: "schedule",  label: "Jadwal & Sesi", icon: I.Calendar, count: 14 },

    { section: "Akademik" },
    { id: "students",  label: "Siswa", icon: I.GraduationCap, count: 47 },
    { id: "progress",  label: "Progress Tracking", icon: I.Layers },
    { id: "attendance",label: "Presensi", icon: I.Check },

    { section: "Keuangan Cabang" },
    { id: "invoices",  label: "Invoice & Pembayaran", icon: I.Receipt, count: 3 },
    { id: "commission",label: "Komisi Guru", icon: I.Coins },
    { id: "reports",   label: "Laporan Cabang", icon: I.Chart },

    { section: "Operasional" },
    { id: "store",     label: "Toko & Stok", icon: I.Store },
  ];

  const guruItems = [
    { section: "Saya" },
    { id: "dashboard", label: "Beranda", icon: I.Home2 },
    { id: "schedule",  label: "Jadwal Saya", icon: I.Calendar, count: 12 },
    { id: "attendance",label: "Presensi & Progress", icon: I.Check },

    { section: "Siswa" },
    { id: "students",  label: "Siswa Saya", icon: I.GraduationCap, count: 18 },
    { id: "progress",  label: "Catatan Modul", icon: I.Layers },

    { section: "Komisi" },
    { id: "commission",label: "Komisi Saya", icon: I.Coins },
  ];

  const items = role === "admin-cabang" ? adminCabangItems : role === "guru" ? guruItems : ownerItems;
  const userInfo = role === "admin-cabang"
    ? { initials: "YN", name: "Yuni Hartati", role: "Admin Cabang · " + branch.code }
    : role === "guru"
    ? { initials: "RA", name: "Bu Rini Astuti", role: "Guru · AHE, ASE" }
    : { initials: "RA", name: "Rendra Adiputra", role: "Owner · Semua cabang" };
  const branchClickable = role !== "admin-cabang"; // admin cabang is locked to one branch

  return (
    <aside className="lc-sidebar">
      <div className="lc-sidebar-brand">
        <div className="lc-sidebar-logo">L</div>
        <div className="lc-sidebar-name">
          Learning Center
          <small>Bimbel Management</small>
        </div>
      </div>

      <div className={"lc-branch-switcher " + (branchClickable ? "" : "locked")} onClick={branchClickable ? onSwitchBranch : undefined} style={branchClickable ? {} : { cursor: "default", opacity: 0.95 }}>
        <span className="lc-branch-dot"/>
        <span className="lc-branch-label">
          {branch.name}
          <small>{branch.code} · {role === "guru" ? "Guru" : branch.students + " siswa"}</small>
        </span>
        {branchClickable
          ? <I.ChevDown className="lc-chev" size={14}/>
          : <I.Lock size={12} style={{ color: "var(--text-4)" }}/>}
      </div>

      <nav className="lc-nav">
        {items.map((it, i) => {
          if (it.section) {
            return <div key={i} className="lc-nav-section"><div className="lc-nav-section-title">{it.section}</div></div>;
          }
          const Ic = it.icon;
          return (
            <div key={it.id}
                 className={"lc-nav-item " + (active === it.id ? "active" : "")}
                 onClick={() => onNav(it.id)}>
              <Ic size={16}/>
              <span>{it.label}</span>
              {it.count != null && <span className="lc-nav-count">{it.count}</span>}
            </div>
          );
        })}
      </nav>

      <div className="lc-sidebar-user">
        <div className="lc-avatar">{userInfo.initials}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="lc-user-name">{userInfo.name}</div>
          <div className="lc-user-role">{userInfo.role}</div>
        </div>
        <button className="lc-icon-btn"><I.Settings size={15}/></button>
      </div>
    </aside>
  );
}

// ============================================================
// Topbar
// ============================================================
function Topbar({ title, breadcrumb, actions }) {
  return (
    <div className="lc-topbar">
      <div className="row gap-2">
        {breadcrumb && breadcrumb.map((b, i) => (
          <React.Fragment key={i}>
            {i > 0 && <I.ChevRight size={13} style={{ color: "var(--text-4)" }}/>}
            <span className={i === breadcrumb.length - 1 ? "lc-topbar-title" : "lc-topbar-crumb"}>{b}</span>
          </React.Fragment>
        ))}
        {!breadcrumb && <span className="lc-topbar-title">{title}</span>}
      </div>
      <div className="lc-topbar-spacer"/>
      <div className="lc-search">
        <I.Search size={14}/>
        <span>Cari siswa, guru, invoice…</span>
        <kbd>⌘K</kbd>
      </div>
      <button className="lc-icon-btn"><I.Bell size={16}/></button>
      {actions}
    </div>
  );
}

window.Sidebar = Sidebar;
window.Topbar = Topbar;
