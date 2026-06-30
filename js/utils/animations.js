/**
 * Hisaab Pro — Animation Helpers
 * Wraps GSAP when present; always degrades to CSS so motion works offline.
 *
 * KEY FIX: never call fromTo(outlet, {opacity:0}, ...) — that snaps the
 * already-visible page to opacity:0 causing a visible flash.
 * Instead we animate FROM the current rendered state using gsap.from(),
 * or do a translate-only slide when no card items are found.
 */
import { prefersReducedMotion } from "./helpers.js";

const gsap = () => window.gsap || null;

/** Animate a freshly mounted view in without causing opacity flash. */
export function animateViewIn(node) {
  if (!node) return;

  if (prefersReducedMotion()) {
    node.classList.add("view-enter");
    return;
  }

  const g = gsap();
  if (g) {
    // Only animate named items (cards, data-anim elements).
    // If none found, do a subtle Y slide — NEVER touch opacity on the container
    // because the page is already visible by the time this runs.
    const items = node.querySelectorAll("[data-anim], .card, .auth-card, .login-card, .stagger > *");
    if (items.length) {
      g.from(items, {
        y: 18,
        opacity: 0,
        duration: 0.45,
        ease: "power3.out",
        stagger: 0.05,
        clearProps: "all"
      });
    } else {
      // Slide-only: page content is already at opacity 1, just add subtle motion
      g.from(node, {
        y: 8,
        duration: 0.28,
        ease: "power2.out",
        clearProps: "transform"
      });
    }
  } else {
    node.classList.remove("view-enter");
    void node.offsetWidth; // reflow
    node.classList.add("view-enter");
  }
}

/** Count a number up (financial figures). */
export function countUp(elm, to, { duration = 1.1, format = (n) => Math.round(n).toLocaleString() } = {}) {
  if (!elm) return;
  if (prefersReducedMotion()) { elm.textContent = format(to); return; }
  const g = gsap();
  const obj = { v: 0 };
  if (g) {
    g.to(obj, { v: to, duration, ease: "power2.out", onUpdate: () => { elm.textContent = format(obj.v); } });
  } else {
    const start = performance.now();
    const tick = (t) => {
      const p = Math.min((t - start) / (duration * 1000), 1);
      elm.textContent = format(to * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
}

export function pulse(elm) {
  const g = gsap();
  if (g) g.fromTo(elm, { scale: 0.94 }, { scale: 1, duration: 0.4, ease: "back.out(2)" });
}
