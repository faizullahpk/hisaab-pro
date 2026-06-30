/** Hisaab Pro — Toast notifications */
import { icon } from "./icons.js";
import { bus, EVT } from "../core/events.js";

function stack() {
  let s = document.querySelector(".toast-stack");
  if (!s) { s = document.createElement("div"); s.className = "toast-stack"; document.body.appendChild(s); }
  return s;
}

export function toast(message, { type = "info", title, duration = 4200 } = {}) {
  const iconName = { success: "check-circle", error: "alert", info: "info" }[type] || "info";
  const node = document.createElement("div");
  node.className = `toast toast--${type}`;
  node.innerHTML = `
    <span class="toast-icon">${icon(iconName)}</span>
    <div class="toast-body">
      ${title ? `<div class="toast-title">${title}</div>` : ""}
      <div class="toast-msg">${message}</div>
    </div>`;
  stack().appendChild(node);
  const close = () => { node.classList.add("is-out"); setTimeout(() => node.remove(), 240); };
  node.addEventListener("click", close);
  if (duration) setTimeout(close, duration);
  return close;
}

export const toastSuccess = (m, t) => toast(m, { type: "success", title: t });
export const toastError = (m, t) => toast(m, { type: "error", title: t });
export const toastInfo = (m, t) => toast(m, { type: "info", title: t });

// Allow any module to fire a toast through the bus
bus.on(EVT.TOAST, (p) => toast(p.message, p));
