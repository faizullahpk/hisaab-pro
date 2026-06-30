/** Hisaab Pro — Unauthorized / Access denied */
import { icon } from "../components/icons.js";
export default function render(outlet) {
  outlet.innerHTML = `
  <div class="auth-card" style="text-align:center">
    <span class="state-badge state-badge--danger">${icon("lock")}</span>
    <div class="auth-head"><h2>Access denied</h2>
      <p>You don't have permission to view this page. Sign in with the right account to continue.</p></div>
    <a class="btn btn--primary btn--lg btn--block" href="#/login">Go to sign in</a>
    <a class="btn btn--ghost btn--block" href="#/dashboard" style="margin-top:12px">Back to dashboard</a>
  </div>`;
}
