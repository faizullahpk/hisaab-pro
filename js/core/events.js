/**
 * Hisaab Pro — Global Event Bus
 * Decouples modules (auth, theme, router, components) via pub/sub.
 */
class EventBus {
  #map = new Map();
  on(type, fn) {
    if (!this.#map.has(type)) this.#map.set(type, new Set());
    this.#map.get(type).add(fn);
    return () => this.off(type, fn);
  }
  once(type, fn) {
    const off = this.on(type, (p) => { off(); fn(p); });
    return off;
  }
  off(type, fn) { this.#map.get(type)?.delete(fn); }
  emit(type, payload) { this.#map.get(type)?.forEach((fn) => { try { fn(payload); } catch (e) { console.error(`[bus:${type}]`, e); } }); }
}
export const bus = new EventBus();

/** Canonical event names — avoids stringly-typed bugs. */
export const EVT = Object.freeze({
  AUTH_CHANGED: "auth:changed",
  AUTH_LOGIN: "auth:login",
  AUTH_LOGOUT: "auth:logout",
  THEME_CHANGED: "theme:changed",
  ROUTE_CHANGED: "route:changed",
  TOAST: "ui:toast",
  PREFS_CHANGED: "prefs:changed"
});
