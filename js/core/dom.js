/**
 * Hisaab Pro — DOM Utilities
 * Tiny, dependency-free helpers used across the app.
 */
export const qs = (sel, root = document) => root.querySelector(sel);
export const qsa = (sel, root = document) => [...root.querySelectorAll(sel)];

/** Create an element from an HTML string (single root). */
export function h(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

/** Build an element programmatically. */
export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === "class") node.className = v;
    else if (k === "html") node.innerHTML = v;
    else if (k === "text") node.textContent = v;
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === "dataset") Object.assign(node.dataset, v);
    else node.setAttribute(k, v);
  }
  for (const c of [].concat(children)) {
    if (c == null) continue;
    node.append(c.nodeType ? c : document.createTextNode(c));
  }
  return node;
}

export const on = (node, evt, handler, opts) => {
  node.addEventListener(evt, handler, opts);
  return () => node.removeEventListener(evt, handler, opts);
};

/** Delegated event binding. */
export function delegate(root, evt, selector, handler) {
  return on(root, evt, (e) => {
    const match = e.target.closest(selector);
    if (match && root.contains(match)) handler(e, match);
  });
}

export const clear = (node) => { while (node.firstChild) node.removeChild(node.firstChild); };
export const mount = (node, html) => { node.innerHTML = html; return node; };
export const show = (node, on = true) => node.classList.toggle("hidden", !on);

/** Trap focus inside a container (modals/dropdowns). */
export function trapFocus(container) {
  const focusable = qsa('a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])', container);
  if (!focusable.length) return () => {};
  const first = focusable[0], last = focusable[focusable.length - 1];
  const handler = (e) => {
    if (e.key !== "Tab") return;
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };
  container.addEventListener("keydown", handler);
  first.focus();
  return () => container.removeEventListener("keydown", handler);
}

export const escapeHTML = (s = "") =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
