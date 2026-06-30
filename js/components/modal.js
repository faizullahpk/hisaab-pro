/**
 * Hisaab Pro — Modal & Drawer Component
 * openModal() → centered dialog for confirmations and small forms.
 * openDrawer() → right-side panel for larger add/edit forms.
 * Both return a close() function and are keyboard-accessible.
 */
import { icon } from "./icons.js";

/* ========================= MODAL ================================== */
/**
 * @param {object} opts
 *   title:string, body:string|HTMLElement, actions:[{label,cls,onClick}]
 *   size:'sm'|'md'|'lg'  (default md)
 */
export function openModal({ title, body, actions = [], size = "md", onClose } = {}) {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";

  const dialog = document.createElement("div");
  dialog.className = `modal modal--${size}`;
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-label", title || "Dialog");

  const head = document.createElement("div");
  head.className = "modal-head";
  head.innerHTML = `<div class="modal-title">${title || ""}</div>`;
  const closeBtn = document.createElement("button");
  closeBtn.className = "icon-btn";
  closeBtn.setAttribute("aria-label", "Close");
  closeBtn.innerHTML = icon("x");
  closeBtn.addEventListener("click", close);
  head.appendChild(closeBtn);
  dialog.appendChild(head);

  const content = document.createElement("div");
  content.className = "modal-body";
  if (typeof body === "string") content.innerHTML = body;
  else content.appendChild(body);
  dialog.appendChild(content);

  if (actions.length) {
    const foot = document.createElement("div");
    foot.className = "modal-foot";
    actions.forEach(a => {
      const btn = document.createElement("button");
      btn.className = `btn ${a.cls || "btn--ghost"}`;
      btn.textContent = a.label;
      btn.addEventListener("click", () => a.onClick?.(close));
      foot.appendChild(btn);
    });
    dialog.appendChild(foot);
  }

  overlay.appendChild(dialog);
  document.body.appendChild(overlay);

  // Trap focus and keyboard
  setTimeout(() => {
    dialog.querySelector("button, input, select, textarea")?.focus();
    overlay.classList.add("is-open");
  }, 10);

  const onKey = e => { if (e.key === "Escape") close(); };
  document.addEventListener("keydown", onKey);
  overlay.addEventListener("mousedown", e => { if (e.target === overlay) close(); });

  function close() {
    overlay.classList.remove("is-open");
    overlay.classList.add("is-out");
    setTimeout(() => { overlay.remove(); }, 240);
    document.removeEventListener("keydown", onKey);
    onClose?.();
  }

  return { close, overlay, dialog };
}

/* ========================= DRAWER ================================= */
/**
 * @param {object} opts
 *   title:string, body:string|HTMLElement, width:'sm'|'md'|'lg'
 */
export function openDrawer({ title, body, width = "md", onClose } = {}) {
  const overlay = document.createElement("div");
  overlay.className = "drawer-overlay";

  const panel = document.createElement("aside");
  panel.className = `drawer drawer--${width}`;

  const head = document.createElement("div");
  head.className = "drawer-head";
  head.innerHTML = `<div class="drawer-title">${title || ""}</div>`;
  const closeBtn = document.createElement("button");
  closeBtn.className = "icon-btn";
  closeBtn.setAttribute("aria-label", "Close");
  closeBtn.innerHTML = icon("x");
  closeBtn.addEventListener("click", close);
  head.appendChild(closeBtn);

  const content = document.createElement("div");
  content.className = "drawer-body";
  if (typeof body === "string") content.innerHTML = body;
  else content.appendChild(body);

  panel.appendChild(head);
  panel.appendChild(content);
  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  setTimeout(() => { overlay.classList.add("is-open"); panel.querySelector("input, select, textarea")?.focus(); }, 10);

  const onKey = e => { if (e.key === "Escape") close(); };
  document.addEventListener("keydown", onKey);
  overlay.addEventListener("mousedown", e => { if (e.target === overlay) close(); });

  function close() {
    overlay.classList.remove("is-open");
    overlay.classList.add("is-out");
    setTimeout(() => overlay.remove(), 340);
    document.removeEventListener("keydown", onKey);
    onClose?.();
  }

  return { close, overlay, panel, body: content };
}

/* ========================= CONFIRM ================================ */
export function confirm({ title = "Are you sure?", message, confirmLabel = "Delete", onConfirm, danger = true }) {
  return openModal({
    title,
    body: `<p style="color:var(--c-text-soft)">${message || ""}</p>`,
    size: "sm",
    actions: [
      { label: "Cancel", cls: "btn--ghost", onClick: close => close() },
      {
        label: confirmLabel,
        cls: danger ? "btn--danger" : "btn--primary",
        onClick: async close => { await onConfirm?.(); close(); }
      }
    ]
  });
}
