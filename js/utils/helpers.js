/** Hisaab Pro — Misc Helpers */
export const sleep = (ms) => new Promise(r => setTimeout(r, ms));
export const uid = (p = "id") => `${p}_${crypto.randomUUID().slice(0, 8)}`;
export const clamp = (n, min, max) => Math.min(Math.max(n, min), max);

export function debounce(fn, wait = 250) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), wait); };
}
export function throttle(fn, wait = 200) {
  let last = 0;
  return (...a) => { const now = Date.now(); if (now - last >= wait) { last = now; fn(...a); } };
}

export const copyToClipboard = async (text) => {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
};

export const isOnline = () => navigator.onLine;
export const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Read a File as a data URL (for instant avatar preview before upload). */
export const readAsDataURL = (file) => new Promise((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(r.result);
  r.onerror = rej;
  r.readAsDataURL(file);
});

export const greeting = () => {
  const h = new Date().getHours();
  return h < 5 ? "Good evening" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
};
