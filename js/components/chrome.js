/**
 * Hisaab Pro — Shell chrome
 * Sidebar (with collapse + mobile drawer), top navigation bar, and footer.
 */
import { icon } from "./icons.js";
import { el } from "../core/dom.js";
import { NAV, APP } from "../../config/app.config.js";
import { brandMark } from "./loader.js";
import { appStore } from "../core/store.js";
import { bus, EVT } from "../core/events.js";
import { navigate, DEFAULT_ROUTE_AUTHED } from "../core/router.js";
import { toastInfo } from "./toast.js";
import { themeSwitcher, notificationCenter, profileMenu, openCommandPalette } from "./popovers.js";

/* ---------------------------- Sidebar ---------------------------- */
export function buildSidebar() {
  const aside = el("aside", { class: "sidebar" });

  const brand = el("a", { class: "sidebar-brand", href: "#" + DEFAULT_ROUTE_AUTHED });
  brand.innerHTML = `<span class="brand-mark">${brandMark(38)}</span>
    <span class="brand-name">Hisaab<span>Pro</span></span>`;
  aside.append(brand);

  const nav = el("nav", { class: "sidebar-nav" });
  NAV.forEach(group => {
    nav.append(el("div", { class: "nav-group-label", text: group.group }));
    group.items.forEach(item => {
      const a = el("a", { class: "nav-item", href: item.soon ? "#" : "#" + item.path, dataset: { path: item.path } });
      a.innerHTML = `${icon(item.icon)}<span>${item.label}</span>${item.soon ? '<span class="badge badge--soon nav-soon">Soon</span>' : ""}`;
      if (item.soon) a.addEventListener("click", (e) => { e.preventDefault(); toastInfo(`${item.label} arrives in an upcoming phase.`); });
      nav.append(a);
    });
  });
  aside.append(nav);

  const foot = el("div", { class: "sidebar-foot" });
  const collapse = el("button", { class: "collapse-toggle" });
  collapse.innerHTML = `${icon("chevrons-left")}<span>Collapse</span>`;
  collapse.addEventListener("click", () => {
    appStore.set(s => ({ sidebarCollapsed: !s.sidebarCollapsed }));
  });
  foot.append(collapse);
  aside.append(foot);

  // Reflect active route
  const setActive = (path) => aside.querySelectorAll(".nav-item").forEach(n =>
    n.classList.toggle("is-active", n.dataset.path === path));
  bus.on(EVT.ROUTE_CHANGED, ({ path }) => setActive(path));
  setActive(location.hash.replace("#", ""));

  return aside;
}

/* --------------------------- Top bar ----------------------------- */
export function buildTopbar() {
  const bar = el("header", { class: "topbar" });

  // Mobile menu button (drawer)
  const burger = el("button", { class: "icon-btn mobile-only", "aria-label": "Menu", html: icon("menu") });
  burger.addEventListener("click", () => appStore.set(s => ({ drawerOpen: !s.drawerOpen })));
  bar.append(burger);

  const title = el("div", { class: "topbar-title", id: "page-title", text: "Dashboard" });
  bar.append(title);
  bus.on(EVT.ROUTE_CHANGED, ({ route }) => { title.textContent = route?.title || "Hisaab Pro"; });

  bar.append(el("div", { class: "topbar-spacer" }));

  // Command-palette search
  const search = el("button", { class: "searchbar" });
  search.innerHTML = `${icon("search")}<span>Search anything…</span><span class="kbd">⌘K</span>`;
  search.addEventListener("click", openCommandPalette);
  bar.append(search);

  const searchMobile = el("button", { class: "icon-btn searchbar-mobile hidden", "aria-label": "Search", html: icon("search") });
  searchMobile.addEventListener("click", openCommandPalette);
  bar.append(searchMobile);

  const actions = el("div", { class: "topbar-actions" });
  actions.append(themeSwitcher());
  actions.append(notificationCenter());
  const profile = profileMenu();
  actions.append(profile);
  bar.append(actions);

  bus.on(EVT.AUTH_CHANGED, () => profile.refresh?.());
  return bar;
}

/* ---------------------------- Footer ----------------------------- */
export function buildFooter() {
  const f = el("footer", { class: "app-footer" });
  f.innerHTML = `
    <div class="footer-inner">
      <span>${APP.name} <span class="text-mute">v${APP.version}</span></span>
      <span class="footer-built">Built by
        <a href="${APP.brand.url}" target="_blank" rel="noopener" class="footer-brand">${APP.brand.company}</a>
        <span class="text-mute">— ${APP.brand.fullName}</span>
      </span>
    </div>`;
  return f;
}

/* ------------------ Bottom nav (phones) -------------------------- */
export function buildBottomNav() {
  const items = [
    { label: "Home", icon: "grid", path: "/dashboard" },
    { label: "Search", icon: "search", action: openCommandPalette },
    { label: "Profile", icon: "user", path: "/profile" },
    { label: "Settings", icon: "gear", path: "/settings" }
  ];
  const nav = el("nav", { class: "bottom-nav" });
  items.forEach(it => {
    const a = el("a", { href: it.path ? "#" + it.path : "#", dataset: { path: it.path || "" } });
    a.innerHTML = `${icon(it.icon)}<span>${it.label}</span>`;
    if (it.action) a.addEventListener("click", (e) => { e.preventDefault(); it.action(); });
    nav.append(a);
  });
  bus.on(EVT.ROUTE_CHANGED, ({ path }) =>
    nav.querySelectorAll("a").forEach(a => a.classList.toggle("is-active", a.dataset.path === path)));
  return nav;
}
