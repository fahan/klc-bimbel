/* global React */
// Icons — minimal stroke set, sized via props. Lucide-style.

const Icon = ({ d, size = 16, stroke = "currentColor", fill = "none", style, viewBox = "0 0 24 24" }) => (
  <svg width={size} height={size} viewBox={viewBox} fill={fill} stroke={stroke}
       strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={style}>
    {d}
  </svg>
);

const I = {
  Home:    (p) => <Icon {...p} d={<><path d="M3 12 12 3l9 9"/><path d="M5 10v10h14V10"/></>}/>,
  Users:   (p) => <Icon {...p} d={<><circle cx="9" cy="8" r="3.5"/><path d="M2 21c0-3.5 3-6 7-6s7 2.5 7 6"/><circle cx="17" cy="9" r="2.5"/><path d="M22 19c0-2.2-1.8-4-4-4"/></>}/>,
  Calendar:(p) => <Icon {...p} d={<><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></>}/>,
  Check:   (p) => <Icon {...p} d={<><path d="m5 12 5 5L20 7"/></>}/>,
  Book:    (p) => <Icon {...p} d={<><path d="M4 4v15a2 2 0 0 1 2-2h14V4H6a2 2 0 0 0-2 2v0"/><path d="M4 19a2 2 0 0 0 2 2h14"/></>}/>,
  Receipt: (p) => <Icon {...p} d={<><path d="M5 3v18l2-1.5L9 21l2-1.5L13 21l2-1.5L17 21l2-1.5V3L17 4.5 15 3l-2 1.5L11 3 9 4.5 7 3z"/><path d="M8 9h8M8 13h8M8 17h5"/></>}/>,
  Wallet:  (p) => <Icon {...p} d={<><rect x="3" y="6" width="18" height="14" rx="2"/><path d="M3 10h18"/><circle cx="16" cy="15" r="1.2" fill="currentColor"/></>}/>,
  Coins:   (p) => <Icon {...p} d={<><circle cx="9" cy="9" r="6"/><circle cx="15" cy="15" r="6"/></>}/>,
  Chart:   (p) => <Icon {...p} d={<><path d="M4 19V5M4 19h16"/><rect x="7" y="11" width="3" height="6"/><rect x="12" y="7" width="3" height="10"/><rect x="17" y="14" width="3" height="3"/></>}/>,
  Database:(p) => <Icon {...p} d={<><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/></>}/>,
  Store:   (p) => <Icon {...p} d={<><path d="M3 9 5 4h14l2 5"/><path d="M3 9v11h18V9"/><path d="M3 9c0 1.7 1.3 3 3 3s3-1.3 3-3 1.3 3 3 3 3-1.3 3-3 1.3 3 3 3 3-1.3 3-3"/></>}/>,
  Bell:    (p) => <Icon {...p} d={<><path d="M6 9a6 6 0 0 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9"/><path d="M10 19a2 2 0 0 0 4 0"/></>}/>,
  Search:  (p) => <Icon {...p} d={<><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>}/>,
  ChevDown:(p) => <Icon {...p} d={<><path d="m6 9 6 6 6-6"/></>}/>,
  ChevRight:(p) => <Icon {...p} d={<><path d="m9 6 6 6-6 6"/></>}/>,
  ChevLeft:(p) => <Icon {...p} d={<><path d="m15 6-6 6 6 6"/></>}/>,
  Plus:    (p) => <Icon {...p} d={<><path d="M12 5v14M5 12h14"/></>}/>,
  Filter:  (p) => <Icon {...p} d={<><path d="M3 5h18l-7 8v6l-4-2v-4z"/></>}/>,
  Download:(p) => <Icon {...p} d={<><path d="M12 4v12m0 0-4-4m4 4 4-4M5 20h14"/></>}/>,
  Upload:  (p) => <Icon {...p} d={<><path d="M12 20V8m0 0-4 4m4-4 4 4M5 4h14"/></>}/>,
  Settings:(p) => <Icon {...p} d={<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3 1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8 1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/></>}/>,
  Phone:   (p) => <Icon {...p} d={<><path d="M22 16v3a2 2 0 0 1-2 2 19 19 0 0 1-17-17 2 2 0 0 1 2-2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6.2.5.1 1-.3 1.4L9 8a16 16 0 0 0 7 7l1.3-1.3c.4-.4 1-.5 1.4-.3.8.3 1.7.5 2.6.6A2 2 0 0 1 22 16z"/></>}/>,
  Whatsapp:(p) => <Icon {...p} d={<><path d="M3 21l1.6-4.7A8.5 8.5 0 1 1 12 21a8.5 8.5 0 0 1-4-1L3 21z"/><path d="M9 9c0 4 3 7 7 7"/></>}/>,
  Link:    (p) => <Icon {...p} d={<><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 1 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 1 0 5.7 5.7l1-1"/></>}/>,
  Edit:    (p) => <Icon {...p} d={<><path d="M11 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5"/><path d="m18.5 2.5 3 3L12 15l-4 1 1-4z"/></>}/>,
  Trash:   (p) => <Icon {...p} d={<><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14"/></>}/>,
  More:    (p) => <Icon {...p} d={<><circle cx="6" cy="12" r="1.2" fill="currentColor"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/><circle cx="18" cy="12" r="1.2" fill="currentColor"/></>}/>,
  TrendUp: (p) => <Icon {...p} d={<><path d="M3 17 9 11l4 4 8-8"/><path d="M14 7h7v7"/></>}/>,
  TrendDown:(p)=> <Icon {...p} d={<><path d="M3 7 9 13l4-4 8 8"/><path d="M14 17h7v-7"/></>}/>,
  ArrowUp: (p) => <Icon {...p} d={<><path d="M12 19V5m0 0-6 6m6-6 6 6"/></>}/>,
  ArrowDown:(p) => <Icon {...p} d={<><path d="M12 5v14m0 0-6-6m6 6 6-6"/></>}/>,
  Clock:   (p) => <Icon {...p} d={<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>}/>,
  X:       (p) => <Icon {...p} d={<><path d="M18 6 6 18M6 6l12 12"/></>}/>,
  Copy:    (p) => <Icon {...p} d={<><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></>}/>,
  Pin:     (p) => <Icon {...p} d={<><circle cx="12" cy="10" r="3"/><path d="M12 22s7-7 7-12a7 7 0 1 0-14 0c0 5 7 12 7 12z"/></>}/>,
  Send:    (p) => <Icon {...p} d={<><path d="m4 12 17-9-9 17-2-7z"/></>}/>,
  Globe:   (p) => <Icon {...p} d={<><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></>}/>,
  User:    (p) => <Icon {...p} d={<><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/></>}/>,
  Award:   (p) => <Icon {...p} d={<><circle cx="12" cy="9" r="6"/><path d="m9 14-2 7 5-3 5 3-2-7"/></>}/>,
  AlertCircle: (p) => <Icon {...p} d={<><circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/></>}/>,
  Info: (p) => <Icon {...p} d={<><circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/></>}/>,
  CheckCircle: (p) => <Icon {...p} d={<><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></>}/>,
  ArrowRight: (p) => <Icon {...p} d={<><path d="M5 12h14M13 5l7 7-7 7"/></>}/>,
  ArrowLeft: (p) => <Icon {...p} d={<><path d="M19 12H5M11 19l-7-7 7-7"/></>}/>,
  Building:(p) => <Icon {...p} d={<><rect x="4" y="3" width="16" height="18" rx="1"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2M10 21v-3h4v3"/></>}/>,
  Package: (p) => <Icon {...p} d={<><path d="M20 7 12 3 4 7v10l8 4 8-4z"/><path d="M4 7l8 4 8-4M12 11v10"/></>}/>,
  Home2:   (p) => <Icon {...p} d={<><path d="m3 11 9-7 9 7v9a2 2 0 0 1-2 2h-4v-7h-6v7H5a2 2 0 0 1-2-2z"/></>}/>,
  Layers:  (p) => <Icon {...p} d={<><path d="m12 3-9 5 9 5 9-5z"/><path d="M3 13l9 5 9-5M3 18l9 5 9-5"/></>}/>,
  GraduationCap: (p) => <Icon {...p} d={<><path d="M2 9 12 4l10 5-10 5z"/><path d="M6 11v5c0 1 2.7 3 6 3s6-2 6-3v-5"/></>}/>,
  PlayCircle: (p) => <Icon {...p} d={<><circle cx="12" cy="12" r="9"/><path d="m10 8 6 4-6 4z" fill="currentColor"/></>}/>,
  Bank:    (p) => <Icon {...p} d={<><path d="M3 21h18M3 10h18M5 10V21M19 10V21M9 10V21M15 10V21M12 3 3 8h18z"/></>}/>,
  Cash:    (p) => <Icon {...p} d={<><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 10v.01M18 14v.01"/></>}/>,
  Lock:    (p) => <Icon {...p} d={<><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 1 1 8 0v4"/></>}/>,
  BookOpen:(p) => <Icon {...p} d={<><path d="M2 5a2 2 0 0 1 2-2h6v17H4a2 2 0 0 1-2-2zM22 5a2 2 0 0 0-2-2h-6v17h6a2 2 0 0 0 2-2z"/></>}/>,
  Shirt:   (p) => <Icon {...p} d={<><path d="M8 3 5 6 2 8l3 4 2-1v9h10v-9l2 1 3-4-3-2-3-3-2 2a3 3 0 0 1-4 0z"/></>}/>,
  PenTool: (p) => <Icon {...p} d={<><path d="m12 19 7-7 3 3-7 7zM18 13l-1.5-7.5L2 2l3.5 14.5L13 18zM2 2l7.5 7.5"/><circle cx="11" cy="11" r="2"/></>}/>,
  QrCode:  (p) => <Icon {...p} d={<><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14h1M14 20h1M17 17h4v4M20 17v0"/></>}/>,
};

window.I = I;
window.Icon = Icon;
