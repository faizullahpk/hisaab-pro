/**
 * Hisaab Pro — App Layout
 * The authenticated shell: animated background, sidebar, top bar,
 * page outlet, footer and (on phones) a bottom nav. Returns the
 * outlet element pages mount into. Reused across all app routes.
 */
import { el } from "../core/dom.js";
import { appStore } from "../core/store.js";
import { buildSidebar, buildTopbar, buildFooter, buildBottomNav } from "../components/chrome.js";

let unsub = null;

export function renderAppLayout(root) {
  if (unsub) { unsub(); unsub = null; }
  root.innerHTML = "";

  // Animated theme background (fixed, behind everything)
  const bg = el("div", { class: "app-bg" });
  bg.append(el("div", { class: "grain" }));
  root.append(bg);

  const shell = el("div", { class: "app-shell" });
  const scrim = el("div", { class: "sidebar-scrim" });
  scrim.addEventListener("click", () => appStore.set({ drawerOpen: false }));

  const sidebar = buildSidebar();
  const main = el("main", { class: "app-main" });
  const topbar = buildTopbar();
  const content = el("div", { class: "app-content" });
  const wrap = el("div", { class: "content-wrap" });
  const outlet = el("div", { id: "view-outlet" });
  wrap.append(outlet);
  content.append(wrap);
  main.append(topbar, content, buildFooter());

  shell.append(sidebar, scrim, main);
  root.append(shell, buildBottomNav());

  // React to sidebar collapse + drawer state
  const apply = (s) => {
    shell.classList.toggle("is-collapsed", s.sidebarCollapsed);
    shell.classList.toggle("drawer-open", s.drawerOpen);
  };
  apply(appStore.get());
  unsub = appStore.subscribe(apply);

  // Close drawer on navigation (mobile)
  window.addEventListener("hashchange", () => appStore.set({ drawerOpen: false }));

  return outlet;
}
