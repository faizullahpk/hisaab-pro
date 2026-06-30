/** Hisaab Pro — 404 (rendered inside auth layout so it always works) */
import { icon } from "../components/icons.js";
export default function render(outlet) {
  outlet.innerHTML = `
  <div class="auth-card" style="text-align:center">
    <div class="notfound-code">404</div>
    <div class="auth-head"><h2>Page not found</h2>
      <p>The page you're looking for moved or never existed.</p></div>
    <a class="btn btn--primary btn--lg btn--block" href="#/dashboard">${icon("grid")} Back to dashboard</a>
  </div>`;
}
