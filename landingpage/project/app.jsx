/* global React, ReactDOM, LCData,
   Sidebar, Topbar, Dashboard, Students, Schedule, ProgressTracking,
   Invoices, Commission, Reports, MasterData, Store,
   SessionDetail, SlotFinder, StudentEnrollment,
   RecordPayment, GenerateReportLink,
   AdminCabangDashboard, GuruDashboard,
   POSPenjualan,
   MobileAttendance, MobileProgressReport, MobileInvoice,
   DesignCanvas, DCSection, DCArtboard */
const { useState } = React;

const SCREENS = {
  dashboard:  { title: "Dashboard",          comp: () => <Dashboard/> },
  students:   { title: "Siswa",              comp: () => <Students/> },
  enrollment: { title: "Pendaftaran Siswa Baru", comp: () => <StudentEnrollment/> },
  schedule:   { title: "Jadwal & Sesi",      comp: () => <Schedule/> },
  sessionDetail: { title: "Detail Sesi",     comp: () => <SessionDetail/> },
  slotFinder: { title: "Cari Slot Kosong",   comp: () => <SlotFinder/> },
  progress:   { title: "Progress Tracking",  comp: () => <ProgressTracking/> },
  invoices:   { title: "Invoice & Pembayaran", comp: () => <Invoices/> },
  recordPayment: { title: "Catat Pembayaran",  comp: () => <RecordPayment/> },
  generateReportLink: { title: "Bagikan Laporan", comp: () => <GenerateReportLink/> },
  commission: { title: "Komisi Guru",        comp: () => <Commission/> },
  reports:    { title: "Laporan Keuangan",   comp: () => <Reports/> },
  master:     { title: "Master Data",        comp: () => <MasterData/> },
  store:      { title: "Toko & Stok",        comp: () => <Store/> },
  pos:        { title: "Catat Penjualan",    comp: () => <POSPenjualan/> },
  adminCabang: { title: "Dashboard Cabang",  comp: () => <AdminCabangDashboard/> },
  guru:       { title: "Beranda Guru",       comp: () => <GuruDashboard/> },
};

function AppFrame({ initial, role = "owner", lockedBranchIdx }) {
  const [active, setActive] = useState(initial || "dashboard");
  const [branchIdx, setBranchIdx] = useState(lockedBranchIdx ?? 0);
  const branch = LCData.BRANCHES[branchIdx];

  const screen = SCREENS[active];
  const ScreenComp = screen.comp;

  return (
    <div className="lc-app" style={{ width: 1440, height: 900 }}>
      <Sidebar
        active={active}
        onNav={setActive}
        branch={branch}
        onSwitchBranch={() => role === "owner" && setBranchIdx((branchIdx + 1) % LCData.BRANCHES.length)}
        role={role}
      />
      <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
        <Topbar breadcrumb={["Learning Center", screen.title]}/>
        <div className="lc-content"><ScreenComp/></div>
      </div>
    </div>
  );
}

// ============================================================
// Build the design canvas with every screen as an artboard
// ============================================================
function App() {
  return (
    <DesignCanvas
      title="Learning Center · Bimbel Management UI"
      subtitle="Multi-cabang · Multi-role · Owner POV · Apr 2026"
      layout="grid"
      gridGap={56}
    >
      <DCSection id="overview" title="Overview & Navigasi">
        <DCArtboard id="dashboard" label="01 · Dashboard (Owner)" width={1440} height={900}>
          <AppFrame initial="dashboard"/>
        </DCArtboard>
      </DCSection>

      <DCSection id="academic" title="Akademik">
        <DCArtboard id="students" label="02 · Siswa — list + detail" width={1440} height={900}>
          <AppFrame initial="students"/>
        </DCArtboard>
        <DCArtboard id="enrollment" label="02a · Pendaftaran Siswa Baru" width={1440} height={900}>
          <AppFrame initial="enrollment"/>
        </DCArtboard>
        <DCArtboard id="schedule" label="03 · Jadwal & Sesi (weekly)" width={1440} height={900}>
          <AppFrame initial="schedule"/>
        </DCArtboard>
        <DCArtboard id="session-detail" label="03a · Detail Sesi (klik dari weekly)" width={1440} height={900}>
          <AppFrame initial="sessionDetail"/>
        </DCArtboard>
        <DCArtboard id="slot-finder" label="03b · Cari Slot Kosong (siswa baru)" width={1440} height={900}>
          <AppFrame initial="slotFinder"/>
        </DCArtboard>
        <DCArtboard id="progress" label="04 · Progress Tracking" width={1440} height={900}>
          <AppFrame initial="progress"/>
        </DCArtboard>
      </DCSection>

      <DCSection id="finance" title="Keuangan">
        <DCArtboard id="invoices" label="05 · Invoice & Pembayaran" width={1440} height={900}>
          <AppFrame initial="invoices"/>
        </DCArtboard>
        <DCArtboard id="record-payment" label="05a · Modal — Catat Pembayaran" width={1440} height={900}>
          <AppFrame initial="recordPayment"/>
        </DCArtboard>
        <DCArtboard id="generate-report-link" label="04a · Modal — Bagikan Laporan Progress" width={1440} height={900}>
          <AppFrame initial="generateReportLink"/>
        </DCArtboard>
        <DCArtboard id="commission" label="06 · Komisi Guru" width={1440} height={900}>
          <AppFrame initial="commission"/>
        </DCArtboard>
        <DCArtboard id="reports" label="07 · Laporan Keuangan" width={1440} height={900}>
          <AppFrame initial="reports"/>
        </DCArtboard>
      </DCSection>

      <DCSection id="ops" title="Operasional">
        <DCArtboard id="store" label="08 · Toko & Stok" width={1440} height={900}>
          <AppFrame initial="store"/>
        </DCArtboard>
        <DCArtboard id="pos" label="08a · Catat Penjualan (POS)" width={1440} height={900}>
          <AppFrame initial="pos"/>
        </DCArtboard>
        <DCArtboard id="master" label="09 · Master Data Global" width={1440} height={900}>
          <AppFrame initial="master"/>
        </DCArtboard>
      </DCSection>

      <DCSection id="roles" title="Role Variations — Admin Cabang & Guru">
        <DCArtboard id="admin-cabang" label="13 · Admin Cabang — locked ke 1 cabang" width={1440} height={900}>
          <AppFrame initial="adminCabang" role="admin-cabang"/>
        </DCArtboard>
        <DCArtboard id="guru-desktop" label="14 · Guru Desktop — Beranda + Komisi Saya" width={1440} height={900}>
          <AppFrame initial="guru" role="guru"/>
        </DCArtboard>
      </DCSection>

      <DCSection id="mobile" title="Mobile — Guru & Orang Tua">
        <DCArtboard id="m-attendance" label="10 · Guru: Presensi (mobile)" width={420} height={870}>
          <div style={{ padding: 14, display: "grid", placeItems: "center", height: "100%" }}>
            <MobileAttendance/>
          </div>
        </DCArtboard>
        <DCArtboard id="m-progress" label="11 · Orang Tua: Laporan Progress (link)" width={420} height={870}>
          <div style={{ padding: 14, display: "grid", placeItems: "center", height: "100%" }}>
            <MobileProgressReport/>
          </div>
        </DCArtboard>
        <DCArtboard id="m-invoice" label="12 · Orang Tua: Invoice Digital (link)" width={420} height={870}>
          <div style={{ padding: 14, display: "grid", placeItems: "center", height: "100%" }}>
            <MobileInvoice/>
          </div>
        </DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
