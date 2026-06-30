/**
 * Hisaab Pro — Local Storage Service
 * Safe, namespaced wrapper with JSON + graceful failure.
 */
const NS = "hisaab:";

export const LocalStore = {
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(NS + key);
      return raw == null ? fallback : JSON.parse(raw);
    } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(NS + key, JSON.stringify(value)); return true; }
    catch { return false; }
  },
  remove(key) { try { localStorage.removeItem(NS + key); } catch {} },
  clear() {
    try { Object.keys(localStorage).filter(k => k.startsWith(NS)).forEach(k => localStorage.removeItem(k)); }
    catch {}
  }
};

/** Session-scoped variant (cleared when tab closes). */
export const SessionStore = {
  get(key, fallback = null) {
    try { const r = sessionStorage.getItem(NS + key); return r == null ? fallback : JSON.parse(r); }
    catch { return fallback; }
  },
  set(key, value) { try { sessionStorage.setItem(NS + key, JSON.stringify(value)); } catch {} },
  remove(key) { try { sessionStorage.removeItem(NS + key); } catch {} }
};
