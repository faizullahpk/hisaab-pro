/**
 * Hisaab Pro — Application Entry Point
 * Orchestrates the boot sequence:
 *   theme → splash → auth restore → shortcuts → router → ready → PWA
 * No inline scripts anywhere; this single module wires the whole app.
 */
import { initTheme } from "./themes/theme.engine.js";
import { showSplash, hideSplash } from "./components/loader.js";
import { initAuth, isFirebaseReady } from "./services/firebase/auth.service.js";
import { registerCommandShortcut } from "./components/popovers.js";
import { startRouter } from "./core/router.js";
import { APP } from "../config/app.config.js";
import { isCloudinaryConfigured } from "./services/cloudinary/cloudinary.service.js";
import { registerInstallPrompt } from "../pwa/install.js";
import "./components/toast.js"; // side-effect: wire bus → toasts

async function boot() {
  // 1) Paint the saved theme immediately (splash covers any flash)
  initTheme();

  // 2) Full-screen boot splash
  showSplash();

  // 3) Restore session (guest or Firebase) before routing
  try {
    await initAuth();
  } catch (err) {
    console.warn("[boot] auth init failed, continuing in guest-capable mode", err);
  }

  // 4) Global ⌘K command palette
  registerCommandShortcut();

  // 5) Start the router (renders the first view into the shell)
  startRouter();

  // 6) Reveal the app
  setTimeout(hideSplash, 350);

  // 7) Progressive web app: service worker + install prompt
  registerServiceWorker();
  registerInstallPrompt();

  // Friendly console signature
  banner();
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  // Resolve relative to the document so it works in any subfolder deploy
  const swUrl = new URL("./service-worker.js", document.baseURI).href;
  navigator.serviceWorker.register(swUrl).catch((e) => console.warn("[pwa] SW registration failed", e));
}

function banner() {
  const css = "color:#8b7cff;font-weight:bold;font-size:13px";
  console.log(`%c${APP.name} %cv${APP.version}`, css, "color:#888");
  console.log(
    `%cFirebase: ${isFirebaseReady() ? "connected" : "guest mode (add keys in config/env.js)"}  •  Cloudinary: ${isCloudinaryConfigured ? "ready (dtpanksun)" : "not set"}`,
    "color:#57d9c7"
  );
  console.log(`%cBuilt by ${APP.brand.company} — ${APP.brand.fullName}`, "color:#666");
}

// Kick off once the DOM is parsed
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
