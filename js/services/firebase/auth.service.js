/**
 * Hisaab Pro — Authentication Service
 * One API for Google / Email / Guest auth, session persistence,
 * verification, password reset and profile management. Works with
 * Firebase when configured; falls back to a local Guest session
 * otherwise so the app is always usable.
 */
import { initFirebase, firebaseSDK } from "./firebase.js";
import { bus, EVT } from "../../core/events.js";
import { appStore } from "../../core/store.js";
import { LocalStore } from "../storage/local.service.js";
import { ensureUserProfile, recordLogin, registerDevice } from "./firestore.service.js";

const GUEST_KEY = "guest.session";
const REMEMBER_KEY = "auth.remember";

let _configured = false;
let _initialized = false;

/** Normalise either a Firebase user or guest object into one shape. */
function normalize(user, { guest = false } = {}) {
  if (!user) return null;
  return {
    uid: user.uid,
    name: user.displayName || (guest ? "Guest" : (user.email?.split("@")[0] ?? "User")),
    email: user.email || null,
    photoURL: user.photoURL || null,
    emailVerified: guest ? true : Boolean(user.emailVerified),
    provider: guest ? "guest" : (user.providerData?.[0]?.providerId || "password"),
    isGuest: guest,
    createdAt: user.metadata?.creationTime || null,
    lastLoginAt: user.metadata?.lastSignInTime || new Date().toISOString()
  };
}

function setSession(user) {
  appStore.set({ user, isGuest: Boolean(user?.isGuest) });
  bus.emit(EVT.AUTH_CHANGED, user);
}

/** Boot auth: restore guest or attach Firebase observer. Resolves once. */
export async function initAuth() {
  if (_initialized) return;
  _initialized = true;

  const { auth, configured } = await initFirebase();
  _configured = configured;

  // Restore a local guest session immediately (works offline)
  const guest = LocalStore.get(GUEST_KEY, null);
  if (guest) setSession(normalize(guest, { guest: true }));

  if (!configured) {
    appStore.set({ bootReady: true });
    if (!guest) setSession(null);
    return;
  }

  await new Promise((resolve) => {
    let first = true;
    firebaseSDK.auth.onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        LocalStore.remove(GUEST_KEY);
        const user = normalize(fbUser);
        setSession(user);
        // Side effects (non-blocking)
        ensureUserProfile(user).catch(() => {});
      } else if (!LocalStore.get(GUEST_KEY)) {
        setSession(null);
      }
      if (first) { first = false; appStore.set({ bootReady: true }); resolve(); }
    });
  });
}

/** Apply Remember-Me persistence before a sign-in call. */
async function applyPersistence(remember) {
  const { auth } = await initFirebase();
  if (!auth) return;
  const { setPersistence, browserLocalPersistence, browserSessionPersistence } = firebaseSDK.auth;
  LocalStore.set(REMEMBER_KEY, Boolean(remember));
  await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
}

/* ----------------------------- Google ----------------------------- */
export async function loginWithGoogle(remember = true) {
  const { auth, configured } = await initFirebase();
  if (!configured) throw notConfigured();
  await applyPersistence(remember);
  const provider = new firebaseSDK.auth.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const { user } = await firebaseSDK.auth.signInWithPopup(auth, provider);
  const u = normalize(user);
  await afterLogin(u);
  return u;
}

/* ------------------------- Email + password ----------------------- */
export async function signUpWithEmail({ name, email, password, remember = true }) {
  const { auth, configured } = await initFirebase();
  if (!configured) throw notConfigured();
  await applyPersistence(remember);
  const { user } = await firebaseSDK.auth.createUserWithEmailAndPassword(auth, email, password);
  if (name) await firebaseSDK.auth.updateProfile(user, { displayName: name });
  await firebaseSDK.auth.sendEmailVerification(user);
  const u = normalize(user);
  await afterLogin(u, { isNew: true });
  return u;
}

export async function loginWithEmail({ email, password, remember = true }) {
  const { auth, configured } = await initFirebase();
  if (!configured) throw notConfigured();
  await applyPersistence(remember);
  const { user } = await firebaseSDK.auth.signInWithEmailAndPassword(auth, email, password);
  const u = normalize(user);
  await afterLogin(u);
  return u;
}

export async function resetPassword(email) {
  const { auth, configured } = await initFirebase();
  if (!configured) throw notConfigured();
  await firebaseSDK.auth.sendPasswordResetEmail(auth, email);
  return true;
}

export async function resendVerification() {
  const { auth, configured } = await initFirebase();
  if (!configured || !auth.currentUser) return false;
  await firebaseSDK.auth.sendEmailVerification(auth.currentUser);
  return true;
}

export async function reloadUser() {
  const { auth, configured } = await initFirebase();
  if (!configured || !auth.currentUser) return getUser();
  await auth.currentUser.reload();
  const u = normalize(auth.currentUser);
  setSession(u);
  return u;
}

/* ------------------------------ Guest ----------------------------- */
export async function loginAsGuest() {
  const guest = {
    uid: "guest_" + Math.random().toString(36).slice(2, 10),
    displayName: "Guest",
    email: null,
    photoURL: null,
    metadata: { creationTime: new Date().toISOString() }
  };
  LocalStore.set(GUEST_KEY, guest);
  const u = normalize(guest, { guest: true });
  setSession(u);
  bus.emit(EVT.AUTH_LOGIN, u);
  return u;
}

/* ----------------------------- Profile ---------------------------- */
export async function updateUserProfile({ name, photoURL }) {
  const current = getUser();
  if (current?.isGuest) {
    const guest = LocalStore.get(GUEST_KEY, {});
    if (name != null) guest.displayName = name;
    if (photoURL != null) guest.photoURL = photoURL;
    LocalStore.set(GUEST_KEY, guest);
    const u = normalize(guest, { guest: true });
    setSession(u);
    return u;
  }
  const { auth, configured } = await initFirebase();
  if (!configured || !auth.currentUser) throw notConfigured();
  const patch = {};
  if (name != null) patch.displayName = name;
  if (photoURL != null) patch.photoURL = photoURL;
  await firebaseSDK.auth.updateProfile(auth.currentUser, patch);
  const u = normalize(auth.currentUser);
  setSession(u);
  ensureUserProfile(u).catch(() => {});
  return u;
}

/* ------------------------------ Logout ---------------------------- */
export async function logout() {
  const wasGuest = getUser()?.isGuest;
  LocalStore.remove(GUEST_KEY);
  if (_configured && !wasGuest) {
    const { auth } = await initFirebase();
    try { await firebaseSDK.auth.signOut(auth); } catch {}
  }
  setSession(null);
  bus.emit(EVT.AUTH_LOGOUT);
}

/* ----------------------------- Helpers ---------------------------- */
async function afterLogin(user, meta = {}) {
  bus.emit(EVT.AUTH_LOGIN, user);
  try {
    await ensureUserProfile(user, meta);
    await recordLogin(user);
    await registerDevice(user);
  } catch (e) { console.warn("[auth] post-login side effect failed", e); }
}

export const getUser = () => appStore.get().user;
export const isAuthenticated = () => Boolean(appStore.get().user);
export const isGuest = () => Boolean(appStore.get().user?.isGuest);
export const isFirebaseReady = () => _configured;

function notConfigured() {
  return Object.assign(
    new Error("Cloud sign-in needs Firebase keys. Add them to config/env.js, or continue as Guest."),
    { code: "auth/not-configured" }
  );
}

/** Maps Firebase error codes to human, in-product copy. */
export function authErrorMessage(err) {
  const code = err?.code || "";
  const map = {
    "auth/invalid-email": "That email address doesn't look right.",
    "auth/user-disabled": "This account has been disabled.",
    "auth/user-not-found": "No account found with that email.",
    "auth/wrong-password": "Incorrect password. Try again.",
    "auth/invalid-credential": "Email or password is incorrect.",
    "auth/email-already-in-use": "An account already exists with this email.",
    "auth/weak-password": "Use at least 6 characters for your password.",
    "auth/popup-closed-by-user": "Sign-in was cancelled.",
    "auth/popup-blocked": "Your browser blocked the sign-in popup.",
    "auth/too-many-requests": "Too many attempts. Wait a moment and retry.",
    "auth/network-request-failed": "Network error. Check your connection.",
    "auth/not-configured": err?.message
  };
  return map[code] || err?.message || "Something went wrong. Please try again.";
}
