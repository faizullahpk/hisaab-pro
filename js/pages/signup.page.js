/**
 * Hisaab Pro — Sign-up Page
 * Name · Email · Password (+ live strength) · Confirm · Google · Guest.
 */
import { icon } from "../components/icons.js";
import { qs } from "../core/dom.js";
import { signUpWithEmail, loginWithGoogle, loginAsGuest, authErrorMessage, isFirebaseReady } from "../services/firebase/auth.service.js";
import { navigate, DEFAULT_ROUTE_AUTHED } from "../core/router.js";
import { toastSuccess, toastError } from "../components/toast.js";
import { isEmail, passwordStrength } from "../utils/validators.js";

export default function render(outlet) {
  outlet.innerHTML = `
  <div class="auth-card">
    <div class="auth-head">
      <h2>Create your account</h2>
      <p>Start organising your money in minutes.</p>
    </div>

    <div class="oauth-row">
      <button class="btn-oauth" id="google-btn">${icon("google")}<span>Sign up with Google</span></button>
    </div>
    <div class="divider--text">or with email</div>

    <form class="auth-form" id="signup-form" novalidate>
      <div class="field">
        <label class="field-label" for="name">Full name</label>
        <div class="input-wrap">${icon("user", "input-icon")}
          <input class="input input--icon" id="name" type="text" placeholder="Your name" autocomplete="name" required />
        </div>
        <div class="field-error" data-error="name"></div>
      </div>

      <div class="field">
        <label class="field-label" for="email">Email</label>
        <div class="input-wrap">${icon("mail", "input-icon")}
          <input class="input input--icon" id="email" type="email" placeholder="you@email.com" autocomplete="email" required />
        </div>
        <div class="field-error" data-error="email"></div>
      </div>

      <div class="field">
        <label class="field-label" for="password">Password</label>
        <div class="input-wrap">${icon("lock", "input-icon")}
          <input class="input input--icon" id="password" type="password" placeholder="Create a password" autocomplete="new-password" required />
          <button type="button" class="input-toggle" data-toggle="password" aria-label="Show password">${icon("eye")}</button>
        </div>
        <div class="strength" id="strength"><div class="strength-bars"><i></i><i></i><i></i><i></i></div><span class="strength-label"></span></div>
        <div class="field-error" data-error="password"></div>
      </div>

      <div class="field">
        <label class="field-label" for="confirm">Confirm password</label>
        <div class="input-wrap">${icon("lock", "input-icon")}
          <input class="input input--icon" id="confirm" type="password" placeholder="Re-enter password" autocomplete="new-password" required />
        </div>
        <div class="field-error" data-error="confirm"></div>
      </div>

      <label class="checkbox" style="margin-top:-4px"><input type="checkbox" id="terms" /><span class="box"></span>
        I agree to keep my financial data private and secure.</label>

      <button class="btn btn--primary btn--lg btn--block" type="submit" id="submit-btn">Create account</button>
    </form>

    <button class="btn btn--ghost btn--block" id="guest-btn" style="margin-top:12px">${icon("user")} Continue as guest</button>
    <p class="auth-switch">Already have an account? <a class="auth-link" href="#/login">Sign in</a></p>
    ${isFirebaseReady() ? "" : `<p class="auth-hint">${icon("info")} Add Firebase keys to create cloud accounts. Guest mode works offline now.</p>`}
  </div>`;

  outlet.querySelectorAll("[data-toggle]").forEach(btn => btn.addEventListener("click", () => {
    const i = qs("#" + btn.dataset.toggle, outlet);
    const show = i.type === "password"; i.type = show ? "text" : "password";
    btn.innerHTML = icon(show ? "eye-off" : "eye");
  }));

  const pw = qs("#password", outlet);
  const strength = qs("#strength", outlet);
  pw.addEventListener("input", () => {
    const { score, label } = passwordStrength(pw.value);
    strength.dataset.score = pw.value ? score : "";
    strength.querySelector(".strength-label").textContent = pw.value ? label : "";
  });

  const form = qs("#signup-form", outlet);
  const submit = qs("#submit-btn", outlet);
  const setBusy = (b) => { submit.disabled = b; submit.innerHTML = b ? `<span class="btn-spinner"></span> Creating…` : "Create account"; };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = qs("#name", outlet).value.trim();
    const email = qs("#email", outlet).value.trim();
    const password = pw.value;
    const confirm = qs("#confirm", outlet).value;
    const terms = qs("#terms", outlet).checked;

    qs('[data-error="name"]', outlet).textContent = name ? "" : "Tell us your name";
    qs('[data-error="email"]', outlet).textContent = isEmail(email) ? "" : "Enter a valid email";
    qs('[data-error="password"]', outlet).textContent = password.length >= 6 ? "" : "Use at least 6 characters";
    qs('[data-error="confirm"]', outlet).textContent = confirm === password ? "" : "Passwords don't match";
    if (!name || !isEmail(email) || password.length < 6 || confirm !== password) return;
    if (!terms) { toastError("Please accept to continue.", "One more thing"); return; }

    setBusy(true);
    try {
      const user = await signUpWithEmail({ name, email, password, remember: true });
      toastSuccess("Account created. We've sent a verification email.", `Welcome, ${user.name}`);
      navigate("/verify", true);
    } catch (err) { toastError(authErrorMessage(err), "Couldn't create account"); setBusy(false); }
  });

  qs("#google-btn", outlet).addEventListener("click", async (e) => {
    e.currentTarget.disabled = true;
    try { const u = await loginWithGoogle(true); toastSuccess(`Signed in as ${u.name}`, "Welcome"); navigate(DEFAULT_ROUTE_AUTHED, true); }
    catch (err) { toastError(authErrorMessage(err), "Google sign-up"); e.currentTarget.disabled = false; }
  });

  qs("#guest-btn", outlet).addEventListener("click", async () => {
    await loginAsGuest(); toastSuccess("Exploring as guest.", "Guest mode"); navigate(DEFAULT_ROUTE_AUTHED, true);
  });
}
