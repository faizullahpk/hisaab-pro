/**
 * Hisaab Pro — Top-bar popovers
 * Theme switcher, notification center, profile menu, and a ⌘K command
 * palette. Each is a self-contained factory returning a trigger element.
 */
import { icon } from "./icons.js";
import { el, qsa } from "../core/dom.js";
import { renderThemePicker, cycleTheme } from "../themes/theme.engine.js";
import { getUser, logout, isGuest } from "../services/firebase/auth.service.js";
import { initials } from "../utils/formatters.js";
import { navigate } from "../core/router.js";
import { NAV } from "../../config/app.config.js";
import { toastInfo } from "./toast.js";

/* ---------- generic popover plumbing ---------- */
function openPopover(anchor, build, { align = "right", width = 280 } = {}) {
  closeAllPopovers();
  const pop = el("div", { class: "dropdown popover-open" });
  pop.style.width = width + "px";
  build(pop);
  document.body.appendChild(pop);
  const r = anchor.getBoundingClientRect();
  pop.style.top = `${r.bottom + 10}px`;
  if (align === "right") pop.style.right = `${window.innerWidth - r.right}px`;
  else pop.style.left = `${r.left}px`;

  const onDoc = (e) => { if (!pop.contains(e.target) && !anchor.contains(e.target)) close(); };
  const onKey = (e) => { if (e.key === "Escape") close(); };
  function close() { pop.remove(); document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); }
  pop._close = close;
  setTimeout(() => { document.addEventListener("mousedown", onDoc); document.addEventListener("keydown", onKey); }, 0);
  return close;
}
export function closeAllPopovers() { qsa(".popover-open").forEach(p => p._close?.()); }

/* ---------- Theme switcher ---------- */
export function themeSwitcher() {
  const btn = el("button", { class: "icon-btn", "data-tip": "Themes", html: icon("palette") });
  btn.addEventListener("click", () => openPopover(btn, (pop) => {
    pop.style.width = "320px";
    const head = el("div", { class: "flex between center", style: "padding:6px 8px 10px" });
    head.append(el("span", { class: "dropdown-label", text: "Appearance", style: "padding:0" }));
    const cyc = el("button", { class: "btn btn--subtle", style: "height:30px;padding:0 10px;font-size:12px", text: "Shuffle" });
    cyc.addEventListener("click", () => cycleTheme());
    head.append(cyc);
    pop.append(head);
    const grid = el("div", { class: "theme-picker" });
    renderThemePicker(grid, () => {});
    pop.append(grid);
  }, { width: 320 }));
  return btn;
}

/* ---------- Notification center ---------- */
const seedNotifications = [
  { id: 1, icon: "sparkle", title: "Welcome to Hisaab Pro", body: "Your financial workspace is ready. Add your Firebase keys to sync to the cloud.", time: "just now", unread: true },
  { id: 2, icon: "shield", title: "Secure by default", body: "Sessions are protected and your receipts upload straight to Cloudinary.", time: "today", unread: true },
  { id: 3, icon: "palette", title: "10 themes unlocked", body: "Switch instantly from the palette in the top bar.", time: "today", unread: false }
];

export function notificationCenter() {
  const unread = seedNotifications.filter(n => n.unread).length;
  const btn = el("button", { class: "icon-btn", "data-tip": "Notifications", html: icon("bell") + (unread ? `<span class="notif-dot"></span>` : "") });
  btn.addEventListener("click", () => openPopover(btn, (pop) => {
    pop.style.width = "340px"; pop.style.maxHeight = "70vh"; pop.style.overflow = "auto";
    pop.append(el("div", { class: "flex between center", style: "padding:8px 10px", html:
      `<span class="dropdown-label" style="padding:0">Notifications</span><button class="btn btn--subtle" style="height:28px;font-size:12px;padding:0 8px">Mark all read</button>` }));
    seedNotifications.forEach(n => {
      const item = el("div", { class: "notif-item" });
      item.innerHTML = `
        <span class="notif-ic">${icon(n.icon)}</span>
        <div class="notif-text">
          <div class="notif-title">${n.title}${n.unread ? '<span class="notif-unread"></span>' : ""}</div>
          <div class="notif-body">${n.body}</div>
          <div class="notif-time">${n.time}</div>
        </div>`;
      pop.append(item);
    });
  }, { width: 340 }));
  return btn;
}

/* ---------- Profile dropdown ---------- */
export function profileMenu() {
  const u = getUser();
  const btn = el("button", { class: "profile-trigger" });
  const render = () => {
    const user = getUser();
    btn.innerHTML = `
      <span class="avatar avatar--sm">${user?.photoURL ? `<img src="${user.photoURL}" alt="">` : initials(user?.name)}</span>
      <span class="profile-meta">
        <span class="profile-name">${user?.name || "Guest"}</span>
        <span class="profile-sub">${user?.isGuest ? "Guest session" : (user?.email || "")}</span>
      </span>
      ${icon("chevron-down", "profile-caret")}`;
  };
  render();
  btn.addEventListener("click", () => openPopover(btn, (pop) => {
    const user = getUser();
    pop.append(el("div", { class: "menu-userhead", html: `
      <span class="avatar avatar--md">${user?.photoURL ? `<img src="${user.photoURL}" alt="">` : initials(user?.name)}</span>
      <div><div class="profile-name">${user?.name || "Guest"}</div>
      <div class="profile-sub">${user?.isGuest ? "Guest session" : (user?.email || "")}</div></div>` }));
    pop.append(el("div", { class: "dropdown-sep" }));
    [["user", "Profile", "/profile"], ["gear", "Settings", "/settings"], ["shield", "Security", "/security"]].forEach(([ic, label, path]) => {
      const i = el("button", { class: "dropdown-item", html: `${icon(ic)}<span>${label}</span>` });
      i.addEventListener("click", () => { pop._close?.(); navigate(path); });
      pop.append(i);
    });
    if (isGuest()) {
      const up = el("button", { class: "dropdown-item", html: `${icon("sparkle")}<span>Create an account</span>` });
      up.addEventListener("click", () => { pop._close?.(); navigate("/signup"); });
      pop.append(el("div", { class: "dropdown-sep" })); pop.append(up);
    }
    pop.append(el("div", { class: "dropdown-sep" }));
    const out = el("button", { class: "dropdown-item dropdown-item--danger", html: `${icon("logout")}<span>Sign out</span>` });
    out.addEventListener("click", async () => { pop._close?.(); await logout(); navigate("/login", true); });
    pop.append(out);
  }, { width: 260 }));
  return Object.assign(btn, { refresh: render });
}

/* ---------- Command palette (⌘K) ---------- */
const COMMANDS = [
  ...NAV.flatMap(g => g.items.map(i => ({ label: i.label, hint: g.group, icon: i.icon, path: i.path, soon: i.soon }))),
  { label: "Sign out", hint: "Session", icon: "logout", action: async () => { await logout(); navigate("/login", true); } }
];

export function openCommandPalette() {
  if (document.getElementById("cmdk")) return;
  const overlay = el("div", { id: "cmdk", class: "cmdk-overlay" });
  overlay.innerHTML = `
    <div class="cmdk">
      <div class="cmdk-input-row">${icon("search")}
        <input class="cmdk-input" placeholder="Search modules, actions, settings…" autocomplete="off" />
        <span class="kbd">esc</span>
      </div>
      <div class="cmdk-list" id="cmdk-list"></div>
    </div>`;
  document.body.appendChild(overlay);
  const input = overlay.querySelector(".cmdk-input");
  const list = overlay.querySelector("#cmdk-list");
  let active = 0, filtered = COMMANDS;

  const draw = () => {
    list.innerHTML = filtered.length ? filtered.map((c, i) => `
      <button class="cmdk-item ${i === active ? "is-active" : ""}" data-i="${i}">
        <span class="cmdk-ic">${icon(c.icon)}</span>
        <span class="cmdk-label">${c.label}</span>
        ${c.soon ? '<span class="badge badge--soon">Soon</span>' : ""}
        <span class="cmdk-hint">${c.hint}</span>
      </button>`).join("") : `<div class="cmdk-empty">No matches. Try another search.</div>`;
    qsa(".cmdk-item", list).forEach(b => b.addEventListener("click", () => run(filtered[+b.dataset.i])));
  };
  const run = (c) => {
    if (!c) return;
    close();
    if (c.action) c.action();
    else if (c.soon) toastInfo(`${c.label} arrives in an upcoming phase.`);
    else navigate(c.path);
  };
  const filter = () => {
    const q = input.value.toLowerCase().trim();
    filtered = !q ? COMMANDS : COMMANDS.filter(c => (c.label + " " + c.hint).toLowerCase().includes(q));
    active = 0; draw();
  };
  const onKey = (e) => {
    if (e.key === "Escape") return close();
    if (e.key === "ArrowDown") { e.preventDefault(); active = Math.min(active + 1, filtered.length - 1); draw(); }
    if (e.key === "ArrowUp") { e.preventDefault(); active = Math.max(active - 1, 0); draw(); }
    if (e.key === "Enter") { e.preventDefault(); run(filtered[active]); }
  };
  function close() { overlay.remove(); document.removeEventListener("keydown", onKey); }
  overlay.addEventListener("mousedown", (e) => { if (e.target === overlay) close(); });
  input.addEventListener("input", filter);
  document.addEventListener("keydown", onKey);
  draw();
  setTimeout(() => input.focus(), 30);
}

/** Global ⌘K / Ctrl+K shortcut — call once at boot. */
export function registerCommandShortcut() {
  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); openCommandPalette(); }
  });
}
