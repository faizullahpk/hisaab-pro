/**
 * Hisaab Pro — Login Page (v2)
 * Premium sign-in experience.
 * Fixes: async Firebase ready check, full loading states, inline errors,
 *        shake-on-invalid, proper disabled→re-enabled flow, guest mode UX.
 */
import { icon }               from "../components/icons.js";
import { qs }                 from "../core/dom.js";
import { loginWithEmail, loginWithGoogle, loginAsGuest,
         authErrorMessage, isFirebaseReady }
                              from "../services/firebase/auth.service.js";
import { navigate, DEFAULT_ROUTE_AUTHED } from "../core/router.js";
import { toastSuccess, toastError }       from "../components/toast.js";
import { isEmail }            from "../utils/validators.js";
import { brandMark }          from "../components/loader.js";
import { APP }                from "../../config/app.config.js";

export default function render(outlet) {
  const fbReady = isFirebaseReady();

  outlet.innerHTML = `
  <div class="login-wrap">

    <!-- Logo lockup -->
    <div class="login-logo">
      ${brandMark(36)}
      <span class="login-logo-text">Hisaab<span>Pro</span></span>
    </div>

    <div class="login-card">
      <div class="login-head">
        <h2>Welcome back</h2>
        <p>Sign in to your financial workspace.</p>
      </div>

      ${fbReady ? `
      <!-- Google OAuth -->
      <button class="btn-oauth" id="google-btn" type="button">
        ${icon("google")}
        <span>Continue with Google</span>
        <span class="oauth-loader hidden" id="google-spinner"><span class="btn-spinner btn-spinner--dark"></span></span>
      </button>

      <div class="auth-divider"><span>or</span></div>
      ` : `
      <div class="no-cloud-hint">
        ${icon("wifi_off")}
        <div>
          <div class="hint-title">Cloud sign-in unavailable</div>
          <div class="hint-body">Firebase keys aren't configured. Add them to <code>config/env.js</code> or continue as guest.</div>
        </div>
      </div>
      `}

      <!-- Email / Password form -->
      <form id="login-form" class="login-form" novalidate autocomplete="on">

        <div class="lf-field" id="field-email">
          <label class="lf-label" for="lf-email">Email address</label>
          <div class="lf-input-wrap">
            ${icon("mail", "lf-input-icon")}
            <input
              class="lf-input"
              id="lf-email"
              type="email"
              name="email"
              placeholder="you@example.com"
              autocomplete="email"
              autocapitalize="none"
              spellcheck="false"
              ${!fbReady ? "disabled" : ""}
            />
          </div>
          <div class="lf-error" id="err-email" role="alert" aria-live="polite"></div>
        </div>

        <div class="lf-field" id="field-password">
          <label class="lf-label" for="lf-password">Password</label>
          <div class="lf-input-wrap">
            ${icon("lock", "lf-input-icon")}
            <input
              class="lf-input"
              id="lf-password"
              type="password"
              name="password"
              placeholder="Your password"
              autocomplete="current-password"
              ${!fbReady ? "disabled" : ""}
            />
            <button type="button" class="lf-eye" id="toggle-pw" aria-label="Show password" tabindex="-1">
              ${icon("eye")}
            </button>
          </div>
          <div class="lf-error" id="err-password" role="alert" aria-live="polite"></div>
        </div>

        <div class="lf-meta">
          <label class="lf-check">
            <input type="checkbox" id="lf-remember" checked />
            <span class="lf-box"></span>
            Remember me
          </label>
          <a class="lf-link" href="#/reset">Forgot password?</a>
        </div>

        <button
          class="lf-submit"
          type="submit"
          id="lf-submit"
          ${!fbReady ? "disabled" : ""}
        >
          <span id="submit-label">Sign in</span>
          <span class="btn-spinner hidden" id="submit-spinner"></span>
          ${icon("arrow-right", "lf-submit-arrow")}
        </button>

      </form>

      <!-- Guest -->
      <div class="login-divider-minor"></div>
      <button class="lf-guest" id="guest-btn" type="button">
        ${icon("user")}
        Continue without an account
        <span class="btn-spinner hidden" id="guest-spinner"></span>
      </button>

    </div><!-- /.login-card -->

    <p class="login-footer">
      New to ${APP.name}?
      <a class="lf-link" href="#/signup">Create a free account</a>
    </p>

  </div>`;

  /* ── Focus first interactive field ── */
  const firstInput = fbReady
    ? qs("#lf-email", outlet)
    : qs("#guest-btn", outlet);
  setTimeout(() => firstInput?.focus(), 80);

  /* ── Password visibility toggle ── */
  qs("#toggle-pw", outlet)?.addEventListener("click", () => {
    const inp = qs("#lf-password", outlet);
    const show = inp.type === "password";
    inp.type = show ? "text" : "password";
    qs("#toggle-pw", outlet).innerHTML = icon(show ? "eye-off" : "eye");
  });

  /* ── Inline validation helpers ── */
  const clearErr = id => {
    qs(`#err-${id}`, outlet).textContent = "";
    qs(`#field-${id}`, outlet)?.classList.remove("lf-field--error");
    qs(`#lf-${id}`, outlet)?.classList.remove("lf-shake");
  };
  const setErr = (id, msg) => {
    const errEl = qs(`#err-${id}`, outlet);
    const fieldEl = qs(`#field-${id}`, outlet);
    const inputEl = qs(`#lf-${id}`, outlet);
    if (errEl)   errEl.textContent = msg;
    if (fieldEl) fieldEl.classList.add("lf-field--error");
    if (inputEl) {
      inputEl.classList.remove("lf-shake");
      void inputEl.offsetWidth; // reflow to restart animation
      inputEl.classList.add("lf-shake");
    }
  };

  /* Clear errors when user types */
  qs("#lf-email",    outlet)?.addEventListener("input", () => clearErr("email"));
  qs("#lf-password", outlet)?.addEventListener("input", () => clearErr("password"));

  /* ── Lock / unlock all controls ── */
  const setLoading = (on) => {
    ["lf-email","lf-password","lf-submit","google-btn","guest-btn"].forEach(id => {
      const el = qs("#" + id, outlet);
      if (el) el.disabled = on;
    });
  };

  /* ── Email form submit ── */
  qs("#login-form", outlet).addEventListener("submit", async e => {
    e.preventDefault();
    const email    = qs("#lf-email",    outlet).value.trim();
    const password = qs("#lf-password", outlet).value;
    let valid = true;

    if (!isEmail(email)) { setErr("email",    "Enter a valid email address."); valid = false; }
    else                  clearErr("email");
    if (!password)        { setErr("password", "Enter your password.");         valid = false; }
    else                  clearErr("password");
    if (!valid) return;

    const submitLabel   = qs("#submit-label",   outlet);
    const submitSpinner = qs("#submit-spinner",  outlet);
    const submitArrow   = qs(".lf-submit-arrow", outlet);

    setLoading(true);
    submitLabel.textContent = "Signing in…";
    submitSpinner.classList.remove("hidden");
    submitArrow.classList.add("hidden");

    try {
      const remember = qs("#lf-remember", outlet).checked;
      const user = await loginWithEmail({ email, password, remember });
      toastSuccess(`Welcome back, ${user.name.split(" ")[0]}!`, "Signed in");
      navigate(DEFAULT_ROUTE_AUTHED, true);
    } catch (err) {
      const msg = authErrorMessage(err);
      // Surface credential errors inline instead of only as toasts
      if (err?.code === "auth/user-not-found" || err?.code === "auth/invalid-email") {
        setErr("email", msg);
      } else if (err?.code === "auth/wrong-password" || err?.code === "auth/invalid-credential") {
        setErr("password", "Incorrect password. Try again.");
      } else {
        toastError(msg, "Sign-in failed");
      }
      setLoading(false);
      submitLabel.textContent  = "Sign in";
      submitSpinner.classList.add("hidden");
      submitArrow.classList.remove("hidden");
    }
  });

  /* ── Google sign-in ── */
  qs("#google-btn", outlet)?.addEventListener("click", async () => {
    const btn     = qs("#google-btn",     outlet);
    const spinner = qs("#google-spinner", outlet);
    setLoading(true);
    spinner?.classList.remove("hidden");
    try {
      const remember = qs("#lf-remember", outlet)?.checked ?? true;
      const user = await loginWithGoogle(remember);
      toastSuccess(`Welcome, ${user.name.split(" ")[0]}!`, "Signed in");
      navigate(DEFAULT_ROUTE_AUTHED, true);
    } catch (err) {
      toastError(authErrorMessage(err), "Google sign-in");
      setLoading(false);
      spinner?.classList.add("hidden");
    }
  });

  /* ── Guest mode ── */
  qs("#guest-btn", outlet).addEventListener("click", async () => {
    const spinner = qs("#guest-spinner", outlet);
    setLoading(true);
    spinner.classList.remove("hidden");
    try {
      await loginAsGuest();
      toastSuccess("Exploring as guest — your data stays on this device.", "Guest mode");
      navigate(DEFAULT_ROUTE_AUTHED, true);
    } catch {
      setLoading(false);
      spinner.classList.add("hidden");
    }
  });
}
