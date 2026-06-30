/**
 * Hisaab Pro — Reactive Store
 * Minimal observable state with persistence + subscriptions.
 */
import { LocalStore } from "../services/storage/local.service.js";

function createStore(initial, { persistKey } = {}) {
  let state = { ...initial, ...(persistKey ? LocalStore.get(persistKey, {}) : {}) };
  const subs = new Set();

  const notify = () => subs.forEach((fn) => fn(state));

  return {
    get: () => state,
    select: (selector) => selector(state),
    set(patch) {
      state = { ...state, ...(typeof patch === "function" ? patch(state) : patch) };
      if (persistKey) LocalStore.set(persistKey, state);
      notify();
    },
    subscribe(fn) { subs.add(fn); return () => subs.delete(fn); }
  };
}

/** App-level UI/session store (persisted). */
export const appStore = createStore(
  {
    user: null,            // resolved auth user
    isGuest: false,
    sidebarCollapsed: false,
    drawerOpen: false,
    bootReady: false,
    notifications: []
  },
  { persistKey: "hisaab.app" }
);

export { createStore };
