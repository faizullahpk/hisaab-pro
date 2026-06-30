/**
 * Hisaab Pro — Auth Layout
 * Split-screen: a branded, animated aside on the left and the form
 * panel on the right. On tablet/phone the aside collapses away.
 * Returns the outlet element the auth pages mount into.
 */
import { el } from "../core/dom.js";
import { brandMark } from "../components/loader.js";
import { themeSwitcher } from "../components/popovers.js";
import { APP } from "../../config/app.config.js";

export function renderAuthLayout(root) {
  root.innerHTML = "";

  const bg = el("div", { class: "app-bg" });
  bg.append(el("div", { class: "grain" }));
  root.append(bg);

  const shell = el("div", { class: "auth-shell" });

  // Left: brand story
  const aside = el("aside", { class: "auth-aside" });
  const inner = el("div", { class: "auth-aside-inner" });
  inner.innerHTML = `
    <div class="brand-row">
      <span class="brand-mark">${brandMark(44)}</span>
      <span class="brand-name" style="font-size:1.25rem;font-weight:700">Hisaab<span style="color:var(--c-primary)">Pro</span></span>
    </div>
    <h1>Your money,<br><span class="gradient-text">finally in focus.</span></h1>
    <p class="lede">Every rupee — income, expenses, clients, debts and savings — in one private financial operating system built for how you actually earn.</p>
    <div class="auth-stats">
      <div class="auth-stat"><div class="figure">10</div><small>Live themes</small></div>
      <div class="auth-stat"><div class="figure">100%</div><small>Yours &amp; private</small></div>
      <div class="auth-stat"><div class="figure">∞</div><small>Built to grow</small></div>
    </div>`;
  const asideFoot = el("div", { class: "aside-foot" });
  asideFoot.innerHTML = `Built by <strong>${APP.brand.company}</strong> — ${APP.brand.fullName}`;
  aside.append(inner, asideFoot);

  // Right: form panel
  const panel = el("div", { class: "auth-panel" });
  const themeBtn = themeSwitcher();
  themeBtn.classList.add("auth-theme-btn");
  panel.append(themeBtn);
  const outlet = el("div", { id: "view-outlet", class: "auth-outlet" });
  panel.append(outlet);

  shell.append(aside, panel);
  root.append(shell);
  return outlet;
}
