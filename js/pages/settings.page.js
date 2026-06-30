/**
 * Hisaab Pro — Settings Page
 * Appearance (10-theme picker), preferences (currency, language,
 * motion), notifications, and data (export local backup). Choices
 * persist locally and sync to Firestore preferences when available.
 */
import { icon } from "../components/icons.js";
import { qs } from "../core/dom.js";
import { renderThemePicker, getTheme } from "../themes/theme.engine.js";
import { CURRENCIES, LANGUAGES } from "../../config/app.config.js";
import { LocalStore } from "../services/storage/local.service.js";
import { savePreferences } from "../services/firebase/firestore.service.js";
import { getUser, logout } from "../services/firebase/auth.service.js";
import { navigate } from "../core/router.js";
import { toastSuccess, toastInfo } from "../components/toast.js";

const PREF_KEY = "preferences";

export default function render(outlet) {
  const prefs = LocalStore.get(PREF_KEY, { currency: "PKR", language: "en", reducedMotion: false, notifyBills: true, notifyTips: true });
  const u = getUser();

  outlet.innerHTML = `
    <div class="page-head">
      <span class="eyebrow">System</span>
      <h1>Settings</h1>
      <p>Tune Hisaab Pro to feel like yours.</p>
    </div>

    <div class="col gap-6" style="max-width:880px">
      <section class="card card--pad-lg" data-anim>
        <div class="card-header"><div><span class="eyebrow">Appearance</span><div class="card-title">Theme</div></div>
          <span class="badge">${getTheme()}</span></div>
        <div class="theme-picker" id="theme-picker"></div>
      </section>

      <section class="card card--pad-lg" data-anim>
        <div class="card-header"><div class="card-title">Preferences</div></div>
        <div class="grid grid-2">
          <div class="field">
            <label class="field-label" for="currency">Currency</label>
            <div class="select-wrap">${icon("chevron-down", "select-caret")}
              <select class="input" id="currency">
                ${CURRENCIES.map(c => `<option value="${c.code}" ${c.code === prefs.currency ? "selected" : ""}>${c.code} — ${c.label}</option>`).join("")}
              </select></div>
          </div>
          <div class="field">
            <label class="field-label" for="language">Language</label>
            <div class="select-wrap">${icon("chevron-down", "select-caret")}
              <select class="input" id="language">
                ${LANGUAGES.map(l => `<option value="${l.code}" ${l.code === prefs.language ? "selected" : ""}>${l.label}</option>`).join("")}
              </select></div>
          </div>
        </div>
        <div class="toggle-row">
          <div><div class="toggle-title">Reduced motion</div><div class="toggle-sub">Minimise animations and background motion.</div></div>
          ${toggle("reducedMotion", prefs.reducedMotion)}
        </div>
      </section>

      <section class="card card--pad-lg" data-anim>
        <div class="card-header"><div class="card-title">Notifications</div></div>
        <div class="toggle-row">
          <div><div class="toggle-title">Upcoming bills</div><div class="toggle-sub">Remind me before bills are due.</div></div>
          ${toggle("notifyBills", prefs.notifyBills)}
        </div>
        <div class="toggle-row">
          <div><div class="toggle-title">Tips &amp; insights</div><div class="toggle-sub">Occasional suggestions to improve your finances.</div></div>
          ${toggle("notifyTips", prefs.notifyTips)}
        </div>
      </section>

      <section class="card card--pad-lg" data-anim>
        <div class="card-header"><div class="card-title">Data &amp; backup</div></div>
        <p class="text-mute" style="font-size:14px;margin-bottom:16px">Export a local backup of your workspace settings. Full financial export arrives with the analytics module.</p>
        <div class="flex gap-3" style="flex-wrap:wrap">
          <button class="btn btn--ghost" id="export-btn">${icon("download")} Export backup</button>
          <button class="btn btn--ghost" id="import-btn">${icon("upload")} Import backup</button>
          <input type="file" id="import-input" accept="application/json" hidden />
        </div>
      </section>

      <section class="card card--pad-lg" data-anim>
        <div class="card-header"><div class="card-title">Account</div></div>
        <div class="flex gap-3" style="flex-wrap:wrap">
          <a class="btn btn--ghost" href="#/security">${icon("shield")} Security &amp; devices</a>
          <button class="btn btn--danger" id="signout-btn">${icon("logout")} Sign out</button>
        </div>
      </section>
    </div>`;

  // Theme picker
  renderThemePicker(qs("#theme-picker", outlet), () => persist());

  // Selects + toggles
  qs("#currency", outlet).addEventListener("change", persist);
  qs("#language", outlet).addEventListener("change", persist);
  outlet.querySelectorAll(".switch input").forEach(t => t.addEventListener("change", () => {
    if (t.dataset.pref === "reducedMotion") document.documentElement.classList.toggle("reduce-motion", t.checked);
    persist();
  }));
  document.documentElement.classList.toggle("reduce-motion", prefs.reducedMotion);

  function readPrefs() {
    return {
      currency: qs("#currency", outlet).value,
      language: qs("#language", outlet).value,
      theme: getTheme(),
      reducedMotion: qs('[data-pref="reducedMotion"]', outlet).checked,
      notifyBills: qs('[data-pref="notifyBills"]', outlet).checked,
      notifyTips: qs('[data-pref="notifyTips"]', outlet).checked
    };
  }
  function persist() {
    const next = readPrefs();
    LocalStore.set(PREF_KEY, next);
    if (u && !u.isGuest) savePreferences(u.uid, next).catch(() => {});
    toastSuccess("Preferences saved.", "Updated");
  }

  // Export / import
  qs("#export-btn", outlet).addEventListener("click", () => {
    const data = { app: "hisaab-pro", exportedAt: new Date().toISOString(), preferences: readPrefs() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `hisaab-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    toastSuccess("Backup downloaded.", "Exported");
  });
  const importInput = qs("#import-input", outlet);
  qs("#import-btn", outlet).addEventListener("click", () => importInput.click());
  importInput.addEventListener("change", async () => {
    const f = importInput.files?.[0]; if (!f) return;
    try {
      const json = JSON.parse(await f.text());
      if (json.preferences) { LocalStore.set(PREF_KEY, json.preferences); toastSuccess("Backup restored. Reloading…", "Imported"); setTimeout(() => location.reload(), 800); }
      else toastInfo("That file doesn't look like a Hisaab backup.");
    } catch { toastInfo("Couldn't read that backup file."); }
  });

  qs("#signout-btn", outlet).addEventListener("click", async () => { await logout(); navigate("/login", true); });
}

function toggle(pref, on) {
  return `<label class="switch"><input type="checkbox" data-pref="${pref}" ${on ? "checked" : ""}><span class="switch-track"></span></label>`;
}
