/**
 * Hisaab Pro — Theme Engine
 * Registers all 10 themes, applies them instantly via [data-theme],
 * persists the choice, and keeps the PWA status-bar colour in sync.
 */
import { LocalStore } from "../services/storage/local.service.js";
import { bus, EVT } from "../core/events.js";
import { APP } from "../../config/app.config.js";
import { icon } from "../components/icons.js";

const KEY = "theme";

/** id, label, group, swatch gradient + the colour the OS bar should take. */
export const THEMES = [
  { id: "midnight",  label: "Midnight",  group: "Dark",  bar: "#0a0a14", swatch: ["#8b7cff", "#ff7ac6"] },
  { id: "dark",      label: "Dark",      group: "Dark",  bar: "#0c0d10", swatch: ["#4f8cff", "#57d9c7"] },
  { id: "space",     label: "Space",     group: "Dark",  bar: "#03030a", swatch: ["#7b8cff", "#ff8fd0"] },
  { id: "ocean",     label: "Ocean",     group: "Vivid", bar: "#04141c", swatch: ["#29c6d8", "#4ce0a3"] },
  { id: "forest",    label: "Forest",    group: "Vivid", bar: "#08130d", swatch: ["#4fcf86", "#d9c46a"] },
  { id: "cyberpunk", label: "Cyberpunk", group: "Vivid", bar: "#0a0014", swatch: ["#ff2ec4", "#2ef0ff"] },
  { id: "neon",      label: "Neon",      group: "Vivid", bar: "#060608", swatch: ["#39ffb0", "#b16cff"] },
  { id: "glass",     label: "Glass",     group: "Light", bar: "#0e1018", swatch: ["#8fb8ff", "#ff9ad5"] },
  { id: "light",     label: "Light",     group: "Light", bar: "#f6f7fb", swatch: ["#5b6cff", "#ff7eb6"] },
  { id: "minimal",   label: "Minimal",   group: "Light", bar: "#ffffff", swatch: ["#18181b", "#ef6f53"] }
];

const byId = (id) => THEMES.find(t => t.id === id);

export function getTheme() {
  return LocalStore.get(KEY, null) || APP.defaultTheme;
}

export function applyTheme(id, { persist = true } = {}) {
  const theme = byId(id) || byId(APP.defaultTheme);
  document.documentElement.setAttribute("data-theme", theme.id);
  document.documentElement.style.colorScheme =
    ["light", "minimal"].includes(theme.id) ? "light" : "dark";

  // Sync the PWA / mobile status bar colour
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) { meta = document.createElement("meta"); meta.name = "theme-color"; document.head.appendChild(meta); }
  meta.content = theme.bar;

  if (persist) LocalStore.set(KEY, theme.id);
  bus.emit(EVT.THEME_CHANGED, theme);
  return theme;
}

export function initTheme() {
  // Apply before paint to avoid a flash (called early from main.js)
  return applyTheme(getTheme(), { persist: false });
}

export function cycleTheme() {
  const idx = THEMES.findIndex(t => t.id === getTheme());
  return applyTheme(THEMES[(idx + 1) % THEMES.length].id);
}

/** Build the theme picker grid (used in the switcher + settings page). */
export function renderThemePicker(container, onPick) {
  const active = getTheme();
  const groups = [...new Set(THEMES.map(t => t.group))];
  container.innerHTML = groups.map(group => `
    <div class="theme-group">
      <div class="dropdown-label">${group}</div>
      <div class="theme-grid">
        ${THEMES.filter(t => t.group === group).map(t => `
          <button class="theme-chip ${t.id === active ? "is-active" : ""}" data-theme-id="${t.id}" title="${t.label}">
            <span class="theme-swatch" style="background:linear-gradient(135deg, ${t.swatch[0]}, ${t.swatch[1]})"></span>
            <span class="theme-chip-label">${t.label}</span>
            <span class="theme-check">${icon("check")}</span>
          </button>`).join("")}
      </div>
    </div>`).join("");

  container.querySelectorAll("[data-theme-id]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.themeId;
      applyTheme(id);
      container.querySelectorAll(".theme-chip").forEach(c => c.classList.toggle("is-active", c === btn));
      onPick?.(id);
    });
  });
}
