/**
 * Hisaab Pro — Email Verification Page
 * Prompts the user to verify, resends the email, and polls for status.
 */
import { icon } from "../components/icons.js";
import { qs } from "../core/dom.js";
import { getUser, resendVerification, reloadUser, isFirebaseReady } from "../services/firebase/auth.service.js";
import { navigate, DEFAULT_ROUTE_AUTHED } from "../core/router.js";
import { toastSuccess, toastError, toastInfo } from "../components/toast.js";

export default function render(outlet) {
  const u = getUser();
  outlet.innerHTML = `
  <div class="auth-card" style="text-align:center">
    <span class="verify-badge">${icon("mail")}</span>
    <div class="auth-head">
      <h2>Verify your email</h2>
      <p>We sent a verification link to <strong>${u?.email || "your inbox"}</strong>. Click it, then come back here.</p>
    </div>
    <button class="btn btn--primary btn--lg btn--block" id="check-btn">I've verified — continue</button>
    <button class="btn btn--ghost btn--block" id="resend-btn" style="margin-top:12px">Resend email</button>
    <p class="auth-switch"><a class="auth-link" href="#/dashboard">Skip for now</a></p>
  </div>`;

  qs("#check-btn", outlet).addEventListener("click", async (e) => {
    e.currentTarget.disabled = true;
    const user = await reloadUser();
    if (!isFirebaseReady() || user?.emailVerified) {
      toastSuccess("Email verified.", "All set");
      navigate(DEFAULT_ROUTE_AUTHED, true);
    } else {
      toastInfo("Not verified yet — check the link in your email.");
      e.currentTarget.disabled = false;
    }
  });

  qs("#resend-btn", outlet).addEventListener("click", async (e) => {
    e.currentTarget.disabled = true;
    try { await resendVerification(); toastSuccess("Verification email sent again.", "Sent"); }
    catch { toastError("Couldn't resend right now."); }
    setTimeout(() => { e.currentTarget.disabled = false; }, 4000);
  });

  // Light polling so it auto-advances once verified in another tab
  let tries = 0;
  const poll = setInterval(async () => {
    if (++tries > 20) return clearInterval(poll);
    const user = await reloadUser();
    if (user?.emailVerified) { clearInterval(poll); toastSuccess("Email verified.", "All set"); navigate(DEFAULT_ROUTE_AUTHED, true); }
  }, 5000);
  return () => clearInterval(poll);
}
