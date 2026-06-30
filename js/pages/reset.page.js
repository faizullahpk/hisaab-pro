/**
 * Hisaab Pro — Password Reset Page
 * Sends a Firebase reset email; confirms with an inline success state.
 */
import { icon } from "../components/icons.js";
import { qs } from "../core/dom.js";
import { resetPassword, authErrorMessage } from "../services/firebase/auth.service.js";
import { toastError } from "../components/toast.js";
import { isEmail } from "../utils/validators.js";

export default function render(outlet) {
  outlet.innerHTML = `
  <div class="auth-card">
    <a class="back-link" href="#/login">${icon("chevron")} Back to sign in</a>
    <div class="auth-head">
      <h2>Reset password</h2>
      <p>Enter your email and we'll send a secure reset link.</p>
    </div>
    <form class="auth-form" id="reset-form" novalidate>
      <div class="field">
        <label class="field-label" for="email">Email</label>
        <div class="input-wrap">${icon("mail", "input-icon")}
          <input class="input input--icon" id="email" type="email" placeholder="you@email.com" autocomplete="email" required />
        </div>
        <div class="field-error" data-error="email"></div>
      </div>
      <button class="btn btn--primary btn--lg btn--block" type="submit" id="submit-btn">Send reset link</button>
    </form>
    <div id="reset-done" class="reset-success hidden">
      <span class="reset-tick">${icon("check-circle")}</span>
      <h3>Check your inbox</h3>
      <p>If an account exists for <strong id="sent-to"></strong>, a reset link is on its way.</p>
      <a class="btn btn--ghost btn--block" href="#/login" style="margin-top:16px">Return to sign in</a>
    </div>
  </div>`;

  const form = qs("#reset-form", outlet);
  const submit = qs("#submit-btn", outlet);
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = qs("#email", outlet).value.trim();
    qs('[data-error="email"]', outlet).textContent = isEmail(email) ? "" : "Enter a valid email";
    if (!isEmail(email)) return;
    submit.disabled = true; submit.innerHTML = `<span class="btn-spinner"></span> Sending…`;
    try {
      await resetPassword(email);
    } catch (err) {
      // We still show success to avoid leaking which emails exist,
      // unless it's a config error worth surfacing.
      if (err?.code === "auth/not-configured") { toastError(authErrorMessage(err), "Cloud not configured"); submit.disabled = false; submit.textContent = "Send reset link"; return; }
    }
    qs("#sent-to", outlet).textContent = email;
    form.classList.add("hidden");
    qs("#reset-done", outlet).classList.remove("hidden");
  });
}
