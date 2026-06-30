/**
 * Hisaab Pro — Client Router
 * Hash-based SPA router (works on GitHub Pages / any static host,
 * no server rewrites needed). Lazy-loads page modules, applies
 * the correct layout, and runs auth guards before mounting.
 */
import { ROUTES, DEFAULT_ROUTE_AUTHED, DEFAULT_ROUTE_GUEST } from "../../config/app.config.js";
import { bus, EVT } from "./events.js";
import { authGuard } from "../guards/auth.guard.js";
import { renderAppLayout } from "../layouts/app.layout.js";
import { renderAuthLayout } from "../layouts/auth.layout.js";
import { startTopLoader, stopTopLoader } from "../components/loader.js";
import { animateViewIn } from "../utils/animations.js";

/** Lazy page registry — each loads only when first visited. */
const PAGES = {
  login:        () => import("../pages/login.page.js"),
  signup:       () => import("../pages/signup.page.js"),
  reset:        () => import("../pages/reset.page.js"),
  verify:       () => import("../pages/verify.page.js"),
  unauthorized: () => import("../pages/unauthorized.page.js"),
  dashboard:         () => import("../pages/dashboard.page.js"),
  "income-expenses":  () => import("../pages/income-expenses.page.js"),
  "clients-debts":    () => import("../pages/clients-debts.page.js"),
  "family-savings":   () => import("../pages/family-savings.page.js"),
  reports:           () => import("../pages/reports.page.js"),
  profile:           () => import("../pages/profile.page.js"),
  settings:     () => import("../pages/settings.page.js"),
  security:     () => import("../pages/security.page.js"),
  notfound:     () => import("../pages/notfound.page.js")
};

let currentCleanup = null;
let currentLayout = null;

export function navigate(path, replace = false) {
  const target = "#" + path.replace(/^#/, "").replace(/^\/?/, "/");
  if (location.hash === target) { handleRoute(); return; }
  if (replace) location.replace(target);
  else location.hash = target;
}

function parseHash() {
  const raw = location.hash.replace(/^#/, "") || DEFAULT_ROUTE_GUEST;
  const [path, queryStr] = raw.split("?");
  const query = Object.fromEntries(new URLSearchParams(queryStr || ""));
  return { path: path || "/", query };
}

async function handleRoute() {
  const { path, query } = parseHash();
  let route = ROUTES[path];

  // Unknown path -> 404 page (inside auth layout so it always renders)
  let pageKey = route ? route.page : "notfound";
  let layout = route ? route.layout : "auth";

  // Guard: decide redirects based on auth requirements
  const guard = authGuard(route);
  if (guard.redirect) { navigate(guard.redirect, true); return; }

  startTopLoader();
  try {
    const loader = PAGES[pageKey] || PAGES.notfound;
    const mod = await loader();
    const render = mod.default || mod.render;

    // Tear down previous view
    if (typeof currentCleanup === "function") { try { currentCleanup(); } catch {} }
    currentCleanup = null;

    // Ensure correct layout shell is present
    const root = document.getElementById("app");
    let outlet;
    if (layout !== currentLayout) {
      if (layout === "app") outlet = renderAppLayout(root);
      else outlet = renderAuthLayout(root);
      currentLayout = layout;
    } else {
      outlet = document.getElementById("view-outlet");
    }

    // Mount the page into the outlet
    outlet.classList.remove("view-enter");
    const result = await render(outlet, { query, path, route });
    if (typeof result === "function") currentCleanup = result;

    animateViewIn(outlet);
    document.title = `${route?.title ? route.title + " · " : ""}Hisaab Pro`;
    bus.emit(EVT.ROUTE_CHANGED, { path, query, route });
    outlet.scrollTo?.(0, 0);
    window.scrollTo(0, 0);
  } catch (err) {
    console.error("[router] failed to render", pageKey, err);
    const root = document.getElementById("app");
    root.innerHTML = `<div style="padding:48px;text-align:center">
      <h2>Something broke while loading this page.</h2>
      <p style="color:var(--c-text-mute);margin-top:8px">${err?.message || err}</p>
      <a class="auth-link" href="#${DEFAULT_ROUTE_GUEST}">Go back</a></div>`;
    currentLayout = null;
  } finally {
    stopTopLoader();
  }
}

export function startRouter() {
  window.addEventListener("hashchange", handleRoute);
  // Auth state changes can require a re-evaluation (e.g. session restored)
  bus.on(EVT.AUTH_CHANGED, () => handleRoute());
  if (!location.hash) navigate(DEFAULT_ROUTE_GUEST, true);
  else handleRoute();
}

export { DEFAULT_ROUTE_AUTHED, DEFAULT_ROUTE_GUEST };
