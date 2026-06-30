/**
 * Hisaab Pro — Firebase Configuration Resolver
 * Reads credentials from window.__HISAAB_ENV__ (config/env.js).
 * Falls back to a safe demo-disabled object so the app boots even
 * before keys are added — auth simply runs in local Guest mode.
 */
const env = (typeof window !== "undefined" && window.__HISAAB_ENV__) || {};

export const firebaseConfig = env.firebase || {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};

/** True only when a real project is configured. */
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId
);

if (!isFirebaseConfigured && typeof console !== "undefined") {
  console.warn(
    "[Hisaab Pro] Firebase not configured. Running in offline Guest mode.\n" +
    "Copy config/env.example.js → config/env.js and add your keys."
  );
}
