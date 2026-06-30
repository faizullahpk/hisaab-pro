/**
 * Hisaab Pro — Firebase Bootstrap
 * Loads the modular Firebase SDK from the CDN on demand so the app
 * stays buildless. Exposes lazily-initialised app / auth / db handles.
 * When Firebase isn't configured, everything resolves to null and the
 * app gracefully falls back to local Guest mode.
 */
import { firebaseConfig, isFirebaseConfigured } from "../../../config/firebase.config.js";

const SDK = "https://www.gstatic.com/firebasejs/10.12.2";

let _app = null;
let _auth = null;
let _db = null;
let _ready = null;

/** Returns { app, auth, db, sdk } or nulls if unconfigured. */
export function initFirebase() {
  if (_ready) return _ready;

  if (!isFirebaseConfigured) {
    _ready = Promise.resolve({ app: null, auth: null, db: null, configured: false });
    return _ready;
  }

  _ready = (async () => {
    const [{ initializeApp }, authMod, fsMod] = await Promise.all([
      import(`${SDK}/firebase-app.js`),
      import(`${SDK}/firebase-auth.js`),
      import(`${SDK}/firebase-firestore.js`)
    ]);

    _app = initializeApp(firebaseConfig);
    _auth = authMod.getAuth(_app);
    _db = fsMod.getFirestore(_app);

    // Keep handles to the SDK namespaces for services that need them
    firebaseSDK.auth = authMod;
    firebaseSDK.firestore = fsMod;

    return { app: _app, auth: _auth, db: _db, configured: true };
  })();

  return _ready;
}

/** Holds the resolved SDK namespaces after init (auth + firestore fns). */
export const firebaseSDK = { auth: null, firestore: null };

export const getAuthInstance = () => _auth;
export const getDb = () => _db;
export const firebaseConfigured = isFirebaseConfigured;
