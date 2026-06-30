/**
 * Hisaab Pro — Icon Library
 * Lightweight inline SVG set (Lucide-style, 24px, currentColor).
 * Usage: icon("grid")  ->  returns an <svg> string.
 */
const P = (d) => `<path d="${d}"/>`;
const STROKE = 'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';

const PATHS = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  "trending-up": '<polyline points="3 17 9 11 13 15 21 7"/><polyline points="15 7 21 7 21 13"/>',
  "trending-down": '<polyline points="3 7 9 13 13 9 21 17"/><polyline points="15 17 21 17 21 11"/>',
  piggy: '<path d="M19 10c.8 0 1 .6 1 1.5S19.8 13 19 13"/><path d="M5 11c0-3.3 3.1-6 7-6s7 2.7 7 6c0 1.8-.9 3.4-2.3 4.5V19h-3v-2H9.3v2h-3v-3.5C4.9 14.4 5 12.8 5 11Z"/><circle cx="9" cy="10" r="1"/>',
  scale: '<path d="M12 3v18"/><path d="M7 7h10"/><path d="M5 7l-2.5 6h5L5 7Z"/><path d="M19 7l-2.5 6h5L19 7Z"/><path d="M8 21h8"/>',
  briefcase: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M3 12h18"/>',
  heart: '<path d="M20.8 5.6a5 5 0 0 0-7.1 0L12 7.3l-1.7-1.7a5 5 0 1 0-7.1 7.1L12 21l8.8-8.3a5 5 0 0 0 0-7.1Z"/>',
  chart: '<path d="M3 3v18h18"/><rect x="7" y="11" width="3" height="6" rx="1"/><rect x="12" y="7" width="3" height="10" rx="1"/><rect x="17" y="13" width="3" height="4" rx="1"/>',
  receipt: '<path d="M5 3v18l2-1.2L9 21l2-1.2L13 21l2-1.2L17 21l2-1.2V3l-2 1.2L15 3l-2 1.2L11 3 9 4.2 7 3 5 4.2Z"/><path d="M8 8h8M8 12h8M8 16h5"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 13a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.2a1.6 1.6 0 0 0-2.7-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 4.6 13H4a2 2 0 1 1 0-4h.2a1.6 1.6 0 0 0 1.1-2.7l-.1-.1A2 2 0 1 1 8 3.4l.1.1A1.6 1.6 0 0 0 10 4.6V4a2 2 0 1 1 4 0v.2a1.6 1.6 0 0 0 2.7 1.1l.1-.1A2 2 0 1 1 20.6 8l-.1.1A1.6 1.6 0 0 0 21 12h-1.6Z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  bell: '<path d="M18 9a6 6 0 1 0-12 0c0 6-2 7-2 7h16s-2-1-2-7Z"/><path d="M10.5 20a2 2 0 0 0 3 0"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  chevron: '<polyline points="9 6 15 12 9 18"/>',
  "chevron-down": '<polyline points="6 9 12 15 18 9"/>',
  "chevrons-left": '<polyline points="11 7 6 12 11 17"/><polyline points="18 7 13 12 18 17"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  "eye-off": '<path d="M10.6 6.1A9 9 0 0 1 12 6c6 0 10 6 10 6a16 16 0 0 1-2.3 2.8M6.6 6.6A16 16 0 0 0 2 12s4 6 10 6a9 9 0 0 0 3.7-.8"/><path d="m4 4 16 16"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  google: '<path d="M21.6 12.2c0-.6-.1-1.3-.2-1.9H12v3.6h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.2Z" fill="#4285F4" stroke="none"/><path d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22Z" fill="#34A853" stroke="none"/><path d="M6.4 13.9a6 6 0 0 1 0-3.8V7.5H3.1a10 10 0 0 0 0 9l3.3-2.6Z" fill="#FBBC05" stroke="none"/><path d="M12 6.1c1.5 0 2.8.5 3.8 1.5l2.8-2.8A10 10 0 0 0 3.1 7.5l3.3 2.6C7.2 7.9 9.4 6.1 12 6.1Z" fill="#EA4335" stroke="none"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><path d="M21 12H9"/>',
  camera: '<path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z"/><circle cx="12" cy="13" r="3.5"/>',
  check: '<polyline points="4 12 9 17 20 6"/>',
  "check-circle": '<circle cx="12" cy="12" r="9"/><polyline points="8 12 11 15 16 9"/>',
  alert: '<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  shield: '<path d="M12 3 4 6v6c0 4.5 3.2 7.5 8 9 4.8-1.5 8-4.5 8-9V6l-8-3Z"/><polyline points="9 12 11 14 15 10"/>',
  palette: '<path d="M12 3a9 9 0 0 0 0 18c1.7 0 2-1.5 1.2-2.4-.8-1-.4-2.6 1.3-2.6H17a4 4 0 0 0 4-4c0-5-4-9-9-9Z"/><circle cx="7.5" cy="11" r="1"/><circle cx="11" cy="7.5" r="1"/><circle cx="15.5" cy="8.5" r="1"/>',
  download: '<path d="M12 3v12"/><polyline points="8 11 12 15 16 11"/><path d="M4 21h16"/>',
  upload: '<path d="M12 21V9"/><polyline points="8 13 12 9 16 13"/><path d="M4 3h16"/>',
  monitor: '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M9 21h6M12 17v4"/>',
  smartphone: '<rect x="7" y="3" width="10" height="18" rx="2"/><path d="M11 18h2"/>',
  clock: '<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18"/>',
  sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8Z"/><path d="M19 15l.7 2 .3.3 2 .7-2 .7-.3.3-.7 2-.7-2-.3-.3-2-.7 2-.7.3-.3Z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  wifi_off: '<path d="m2 2 20 20"/><path d="M8.5 16.5a5 5 0 0 1 7 0"/><path d="M5 12.9a10 10 0 0 1 3-1.9M2 8.8a16 16 0 0 1 5-3M22 8.8a16 16 0 0 0-9-3.6"/><path d="M12 20h.01"/>',
  trash: '<path d="M4 7h16M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13"/><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>',
  filter: '<polygon points="22 3 2 3 10 12.5 10 19 14 21 14 12.5 22 3"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  tag: '<path d="M12 2H7a2 2 0 0 0-2 2v5a2 2 0 0 0 .6 1.4l7 7a2 2 0 0 0 2.8 0l5-5a2 2 0 0 0 0-2.8l-7-7A2 2 0 0 0 12 2Z"/><circle cx="7.5" cy="7.5" r="1"/>',
  home: '<path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z"/><path d="M9 21V12h6v9"/>',
  zap: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z"/>',
  users: '<circle cx="9" cy="7" r="4"/><path d="M3 21c0-4 2.7-6 6-6s6 2 6 6"/><path d="M16 3.1a4 4 0 0 1 0 7.8M21 21c0-3.3-2-5.1-5-5.8"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  "pie-chart": '<path d="M21.2 15A9 9 0 1 1 9 2.8"/><path d="M21.2 15H12V5.8"/><path d="M21.2 15 12 5.8"/>',
  "bar-chart": '<rect x="3" y="14" width="4" height="7" rx="1"/><rect x="10" y="9" width="4" height="12" rx="1"/><rect x="17" y="4" width="4" height="17" rx="1"/>',
  "file-text": '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><polyline points="14 2 14 8 20 8"/><path d="M8 13h8M8 17h5"/>',
  wallet: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M16 12a1 1 0 0 0 0 2h3v-2Z"/><path d="M2 10h20"/>',
  "arrow-right": '<path d="M5 12h14"/><polyline points="12 5 19 12 12 19"/>',
  "arrow-up": '<path d="M12 19V5"/><polyline points="5 12 12 5 19 12"/>',
  "arrow-down": '<path d="M12 5v14"/><polyline points="5 12 12 19 19 12"/>',
  "more-vertical": '<circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>',
  refresh: '<path d="M3 12a9 9 0 1 0 9-9 9.8 9.8 0 0 0-6.9 2.8"/><polyline points="3 3 3 9 9 9"/>',
  "credit-card": '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/>',
  minus: '<path d="M5 12h14"/>',
  "chevron-right": '<polyline points="9 6 15 12 9 18"/>',
  coins: '<circle cx="8" cy="12" r="6"/><path d="M9.3 7A6 6 0 1 1 7 7.3"/><path d="M14 9a6 6 0 0 1 0 6"/>',
  building: '<rect x="4" y="2" width="16" height="20" rx="1"/><path d="M9 22V12h6v10"/><rect x="8" y="5" width="2" height="2"/><rect x="14" y="5" width="2" height="2"/><rect x="8" y="10" width="2" height="2"/><rect x="14" y="10" width="2" height="2"/>',
  phone: '<path d="M6.6 10.8a15.2 15.2 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.2c1.1.4 2.3.6 3.6.6a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.3.2 2.5.6 3.6a1 1 0 0 1-.2 1Z"/>',
  "user-plus": '<path d="M16 21c0-4 2.7-6 6-6"/><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="16" y1="11" x2="22" y2="11"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
  "list-check": '<path d="M11 5h10M11 9h10M11 13h10"/><path d="m3 5 2 2 4-4"/><path d="m3 9 2 2 4-4"/><path d="m3 13 2 2 4-4"/>',
  sort: '<path d="M4 6h16M4 12h10M4 18h4"/>',
  "x-circle": '<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6M15 9l-6 6"/>',
  save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>',
  "trending-flat": '<path d="M3 12h18M16 7l5 5-5 5"/>',
  rupee: '<path d="M6 3h12M6 8h12M9 12h8M9 12c0 3 2.7 7 7 7"/><path d="M6 8c0 3 2.7 7 7 7"/>',
  star: '<path d="m12 3 2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.3 6.8 19l1-5.8L3.6 9.1l5.8-.8Z"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  key: '<circle cx="8" cy="14" r="4"/><path d="m11 11 8-8 2 2-2 2 2 2-3 3-2-2-2 2"/>',
};

export function icon(name, cls = "") {
  const body = PATHS[name];
  if (!body) return "";
  const colored = name === "google";
  return `<svg class="icon ${cls}" viewBox="0 0 24 24" ${colored ? "" : STROKE} aria-hidden="true">${body}</svg>`;
}

export function iconMarkup(name, cls) { return icon(name, cls); }
export const ICONS = Object.keys(PATHS);
