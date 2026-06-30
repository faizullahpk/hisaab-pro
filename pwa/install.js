/**
 * Hisaab Pro — Install Prompt
 * Captures beforeinstallprompt, surfaces a tasteful install pill, and
 * celebrates a successful install. Also detects iOS (no native prompt)
 * and shows a one-time hint to "Add to Home Screen".
 */
import { toastSuccess, toastInfo } from "../js/components/toast.js";
import { icon } from "../js/components/icons.js";
import { LocalStore } from "../js/services/storage/local.service.js";

let deferredPrompt = null;

export function registerInstallPrompt() {
  // Already installed? do nothing.
  if (window.matchMedia("(display-mode: standalone)").matches || navigator.standalone) return;

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    showInstallPill();
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    removePill();
    toastSuccess("Hisaab Pro is now installed on your device.", "Installed");
  });

  // iOS Safari has no beforeinstallprompt — nudge once
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) && !navigator.standalone;
  if (isIOS && !LocalStore.get("pwa.iosHinted", false)) {
    setTimeout(() => {
      toastInfo("Tap Share, then 'Add to Home Screen' to install.", "Install Hisaab Pro");
      LocalStore.set("pwa.iosHinted", true);
    }, 6000);
  }
}

function showInstallPill() {
  if (document.getElementById("install-pill")) return;
  const pill = document.createElement("button");
  pill.id = "install-pill";
  pill.className = "install-pill";
  pill.innerHTML = `${icon("download")}<span>Install app</span>`;
  pill.addEventListener("click", async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") removePill();
    deferredPrompt = null;
  });
  document.body.appendChild(pill);
  requestAnimationFrame(() => pill.classList.add("is-in"));
}

function removePill() {
  const p = document.getElementById("install-pill");
  if (p) { p.classList.remove("is-in"); setTimeout(() => p.remove(), 300); }
}
