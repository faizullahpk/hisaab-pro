/**
 * Hisaab Pro — Animation Helpers
 * Wraps GSAP when present (loaded lazily via CDN in index.html),
 * and always degrades to CSS classes so motion works offline.
 */
import { prefersReducedMotion } from "./helpers.js";

const gsap = () => window.gsap || null;

/** Animate a freshly mounted view in. */
export function animateViewIn(node) {
  if (!node) return;
  if (prefersReducedMotion()) { node.classList.add("view-enter"); return; }
  const g = gsap();
  if (g) {
    const items = node.querySelectorAll("[data-anim], .card, .auth-card, .stagger > *");
    if (items.length) {
      g.fromTo(items,
        { y: 16, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, ease: "power3.out", stagger: 0.05, clearProps: "all" });
    } else {
      g.fromTo(node, { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: "power3.out", clearProps: "all" });
    }
  } else {
    node.classList.remove("view-enter");
    void node.offsetWidth;
    node.classList.add("view-enter");
  }
}

/** Count a number up (financial figures love this). */
export function countUp(elm, to, { duration = 1.1, format = (n) => Math.round(n).toLocaleString() } = {}) {
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
