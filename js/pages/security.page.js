/**
 * Hisaab Pro — Security Page
 * Email-verification status, password reset, recent login history,
 * and the devices where this account is active (with revoke).
 */
import { icon } from "../components/icons.js";
import { qs } from "../core/dom.js";
import { getUser, resetPassword, isFirebaseReady } from "../services/firebase/auth.service.js";
import { getLoginHistory, getDevices, revokeDevice, deviceInfo } from "../services/firebase/firestore.service.js";
import { relativeTime, formatDateTime } from "../utils/formatters.js";
import { skeletonRows } from "../components/skeleton.js";
import { toastSuccess, toastError, toastInfo } from "../components/toast.js";

export default function render(outlet) {
  const u = getUser();
  const thisDevice = deviceInfo();

  outlet.innerHTML = `
    <div class="page-head">
      <span class="eyebrow">System</span>
      <h1>Security</h1>
      <p>Review how your account is protected and where it's signed in.</p>
    </div>

    <div class="col gap-6" style="max-width:900px">
      <section class="card card--pad-lg" data-anim>
        <div class="card-header"><div class="card-title">Sign-in &amp; verification</div></div>
        <div class="sec-row">
          <span class="sec-ic ${u?.emailVerified && !u?.isGuest ? "is-ok" : "is-wait"}">${icon(u?.emailVerified && !u?.isGuest ? "check-circle" : "alert")}</span>
          <div class="sec-text"><div class="sec-title">Email verification</div>
            <div class="sec-sub">${u?.isGuest ? "Guests don't have an email on file." : (u?.emailVerified ? "Your email is verified." : "Your email isn't verified yet.")}</div></div>
          ${!u?.isGuest && !u?.emailVerified ? `<a class="btn btn--ghost" href="#/verify">Verify now</a>` : ""}
        </div>
        <div class="sec-row">
          <span class="sec-ic is-ok">${icon("key")}</span>
          <div class="sec-text"><div class="sec-title">Password</div>
            <div class="sec-sub">${u?.isGuest ? "Create an account to set a password." : "Send a secure link to change your password."}</div></div>
          ${u?.isGuest ? "" : `<button class="btn btn--ghost" id="reset-btn">Send reset link</button>`}
        </div>
        <div class="sec-row">
          <span class="sec-ic is-ok">${icon("shield")}</span>
          <div class="sec-text"><div class="sec-title">Session</div>
            <div class="sec-sub">You're on <strong>${thisDevice.label}</strong> right now.</div></div>
          <span class="badge badge--dot" style="color:var(--c-success)">Active</span>
        </div>
      </section>

      <section class="card card--pad-lg" data-anim>
        <div class="card-header"><div class="card-title">Recent logins</div>
          ${isFirebaseReady() ? "" : `<span class="badge badge--soon">Cloud only</span>`}</div>
        <div id="history">${skeletonRows(3)}</div>
      </section>

      <section class="card card--pad-lg" data-anim>
        <div class="card-header"><div class="card-title">Devices</div></div>
        <div id="devices">${skeletonRows(2)}</div>
      </section>
    </div>`;

  // Password reset
  const resetBtn = qs("#reset-btn", outlet);
  if (resetBtn) resetBtn.addEventListener("click", async () => {
    resetBtn.disabled = true;
    try { await resetPassword(u.email); toastSuccess(`Reset link sent to ${u.email}.`, "Check your inbox"); }
    catch (err) { toastError(err.message || "Couldn't send link."); }
    finally { setTimeout(() => (resetBtn.disabled = false), 3000); }
  });

  // Load history + devices (cloud users only)
  loadHistory(outlet, u);
  loadDevices(outlet, u, thisDevice);
}

async function loadHistory(outlet, u) {
  const box = qs("#history", outlet);
  if (!isFirebaseReady() || !u || u.isGuest) {
    box.innerHTML = empty("clock", "No login history yet", "Sign-in events appear here once cloud sync is on.");
    return;
  }
  try {
    const rows = await getLoginHistory(u.uid, 8);
    box.innerHTML = rows.length ? rows.map(r => `
      <div class="hist-row">
        <span class="hist-ic">${icon(r.platform === "Android" || r.platform === "iOS" ? "smartphone" : "monitor")}</span>
        <div class="hist-text"><div class="hist-title">${r.device || "Unknown device"}</div>
          <div class="hist-sub">${r.provider === "google.com" ? "Google" : "Email"} · ${r.at ? formatDateTime(r.at) : "—"}</div></div>
        <span class="hist-time">${r.at ? relativeTime(r.at) : ""}</span>
      </div>`).join("") : empty("clock", "No logins recorded yet", "Your next sign-in will show up here.");
  } catch {
    box.innerHTML = empty("alert", "Couldn't load history", "Check your connection and try again.");
  }
}

async function loadDevices(outlet, u, thisDevice) {
  const box = qs("#devices", outlet);
  if (!isFirebaseReady() || !u || u.isGuest) {
    box.innerHTML = `
      <div class="hist-row">
        <span class="hist-ic">${icon(thisDevice.platform === "Android" || thisDevice.platform === "iOS" ? "smartphone" : "monitor")}</span>
        <div class="hist-text"><div class="hist-title">${thisDevice.label} <span class="badge badge--primary" style="margin-left:6px">This device</span></div>
          <div class="hist-sub">Local session</div></div>
      </div>`;
    return;
  }
  try {
    const devices = await getDevices(u.uid);
    box.innerHTML = (devices.length ? devices : [{ id: thisDevice.id, label: thisDevice.label, platform: thisDevice.platform }]).map(d => `
      <div class="hist-row" data-device="${d.id}">
        <span class="hist-ic">${icon(d.platform === "Android" || d.platform === "iOS" ? "smartphone" : "monitor")}</span>
        <div class="hist-text"><div class="hist-title">${d.label || "Device"} ${d.id === thisDevice.id ? `<span class="badge badge--primary" style="margin-left:6px">This device</span>` : ""}</div>
          <div class="hist-sub">${d.lastSeen ? "Last seen " + relativeTime(d.lastSeen) : "Active"}</div></div>
        ${d.id === thisDevice.id ? "" : `<button class="btn btn--subtle" data-revoke="${d.id}">Revoke</button>`}
      </div>`).join("");
    box.querySelectorAll("[data-revoke]").forEach(btn => btn.addEventListener("click", async () => {
      try { await revokeDevice(u.uid, btn.dataset.revoke); btn.closest("[data-device]").remove(); toastSuccess("Device signed out.", "Revoked"); }
      catch { toastInfo("Couldn't revoke right now."); }
    }));
  } catch {
    box.innerHTML = empty("alert", "Couldn't load devices", "Try again later.");
  }
}

const empty = (ic, title, sub) => `
  <div class="empty"><span class="empty-icon">${icon(ic)}</span>
    <div><div class="sec-title">${title}</div><div class="sec-sub">${sub}</div></div></div>`;
