/**
 * Hisaab Pro — Firestore Service
 * User profiles, login history, device registry and preferences.
 * All methods are safe no-ops when Firebase isn't configured or the
 * current user is a Guest, so calling code never has to branch.
 */
import { initFirebase, firebaseSDK } from "./firebase.js";
import { COLLECTIONS } from "../../../config/app.config.js";

async function db() {
  const { db, configured } = await initFirebase();
  return configured ? db : null;
}

function fs() { return firebaseSDK.firestore; }

/** Lightweight device + browser fingerprint (non-tracking). */
function deviceInfo() {
  const ua = navigator.userAgent;
  const platform = /android/i.test(ua) ? "Android"
    : /iphone|ipad|ipod/i.test(ua) ? "iOS"
    : /mac/i.test(ua) ? "macOS"
    : /win/i.test(ua) ? "Windows"
    : /linux/i.test(ua) ? "Linux" : "Unknown";
  const browser = /edg/i.test(ua) ? "Edge"
    : /chrome/i.test(ua) ? "Chrome"
    : /firefox/i.test(ua) ? "Firefox"
    : /safari/i.test(ua) ? "Safari" : "Browser";
  let id = localStorage.getItem("hisaab:device.id");
  if (!id) { id = "dev_" + crypto.randomUUID().slice(0, 12); localStorage.setItem("hisaab:device.id", id); }
  return { id, platform, browser, label: `${browser} on ${platform}`, ua: ua.slice(0, 180) };
}

/** Create the user profile doc on first sign-in; merge updates after. */
export async function ensureUserProfile(user, meta = {}) {
  const database = await db();
  if (!database || !user || user.isGuest) return;
  const { doc, setDoc, serverTimestamp } = fs();
  const ref = doc(database, COLLECTIONS.users, user.uid);
  await setDoc(ref, {
    uid: user.uid,
    name: user.name,
    email: user.email,
    photoURL: user.photoURL,
    provider: user.provider,
    emailVerified: user.emailVerified,
    ...(meta.isNew ? { createdAt: serverTimestamp() } : {}),
    updatedAt: serverTimestamp()
  }, { merge: true });
}

export async function getUserProfile(uid) {
  const database = await db();
  if (!database) return null;
  const { doc, getDoc } = fs();
  const snap = await getDoc(doc(database, COLLECTIONS.users, uid));
  return snap.exists() ? snap.data() : null;
}

export async function savePreferences(uid, prefs) {
  const database = await db();
  if (!database || !uid) return;
  const { doc, setDoc, serverTimestamp } = fs();
  await setDoc(doc(database, COLLECTIONS.preferences, uid),
    { ...prefs, updatedAt: serverTimestamp() }, { merge: true });
}

/** Append a login event (capped to most recent reads in UI). */
export async function recordLogin(user) {
  const database = await db();
  if (!database || !user || user.isGuest) return;
  const { collection, addDoc, serverTimestamp } = fs();
  const dev = deviceInfo();
  await addDoc(collection(database, COLLECTIONS.users, user.uid, COLLECTIONS.loginHistory), {
    at: serverTimestamp(),
    provider: user.provider,
    device: dev.label,
    platform: dev.platform,
    browser: dev.browser
  });
}

export async function getLoginHistory(uid, max = 10) {
  const database = await db();
  if (!database) return [];
  const { collection, query, orderBy, limit, getDocs } = fs();
  const q = query(
    collection(database, COLLECTIONS.users, uid, COLLECTIONS.loginHistory),
    orderBy("at", "desc"), limit(max)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/** Remember this device so the user can review/revoke later. */
export async function registerDevice(user) {
  const database = await db();
  if (!database || !user || user.isGuest) return;
  const { doc, setDoc, serverTimestamp } = fs();
  const dev = deviceInfo();
  await setDoc(doc(database, COLLECTIONS.users, user.uid, COLLECTIONS.devices, dev.id), {
    ...dev, lastSeen: serverTimestamp()
  }, { merge: true });
}

export async function getDevices(uid) {
  const database = await db();
  if (!database) return [];
  const { collection, getDocs } = fs();
  const snap = await getDocs(collection(database, COLLECTIONS.users, uid, COLLECTIONS.devices));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function revokeDevice(uid, deviceId) {
  const database = await db();
  if (!database) return;
  const { doc, deleteDoc } = fs();
  await deleteDoc(doc(database, COLLECTIONS.users, uid, COLLECTIONS.devices, deviceId));
}

export { deviceInfo };
