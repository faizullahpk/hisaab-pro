/**
 * Hisaab Pro — Loaders
 * 1) Full-screen boot splash  2) Thin top progress bar for routes.
 */
import { icon } from "./icons.js";

/* ---- Boot splash ---- */
export function showSplash() {
  if (document.getElementById("boot-splash")) return;
  const s = document.createElement("div");
  s.id = "boot-splash";
  s.className = "boot-splash";
  s.innerHTML = `
    <div class="boot-inner">
      <div class="boot-logo">${brandMark()}</div>
      <div class="boot-name">Hisaab<span>Pro</span></div>
      <div class="boot-spinner"></div>
      <div class="boot-tag">Loading your financial workspace…</div>
    </div>`;
  document.body.appendChild(s);
}
export function hideSplash() {
  const s = document.getElementById("boot-splash");
  if (!s) return;
  s.classList.add("is-out");
  setTimeout(() => s.remove(), 480);
}

/* ---- Top progress bar ---- */
let bar, timer;
function ensureBar() {
  if (bar) return bar;
  bar = document.createElement("div");
  bar.className = "top-loader";
  document.body.appendChild(bar);
  return bar;
}
export function startTopLoader() {
  const b = ensureBar();
  clearTimeout(timer);
  b.style.transition = "none"; b.style.width = "0%"; b.style.opacity = "1";
  void b.offsetWidth;
  b.style.transition = "width 0.6s var(--ease-out), opacity 0.3s";
  b.style.width = "80%";
}
export function stopTopLoader() {
  if (!bar) return;
  bar.style.width = "100%";
  timer = setTimeout(() => { bar.style.opacity = "0"; bar.style.width = "0%"; }, 250);
}

export function brandMark(size = 40) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="hg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="var(--c-primary)"/><stop offset="1" stop-color="var(--c-accent)"/>
    </linearGradient></defs>
    <rect x="3" y="3" width="42" height="42" rx="13" fill="url(#hg)" opacity="0.16"/>
    <rect x="3.75" y="3.75" width="40.5" height="40.5" rx="12.25" stroke="url(#hg)" stroke-width="1.5"/>
    <path d="M16 32V16M16 24h10M26 16v16" stroke="url(#hg)" stroke-width="3.2" stroke-linecap="round"/>
    <circle cx="32" cy="17" r="2.4" fill="url(#hg)"/>
  </svg>`;
}
