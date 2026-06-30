# 🔧 Setup Guide — Connecting Firebase

Hisaab Pro runs fully in **Guest mode** with no setup. This guide unlocks the cloud layer: real accounts, Google sign-in, email verification, password reset, login history, device management, and cross-device sync.

Estimated time: **~5 minutes.**

---

## 1. Create a Firebase project

1. Go to **[console.firebase.google.com](https://console.firebase.google.com)** and sign in.
2. Click **Add project**, give it a name (e.g. `hisaab-pro`), and continue. Google Analytics is optional.

## 2. Enable sign-in methods

1. In the left sidebar: **Build → Authentication → Get started**.
2. Open the **Sign-in method** tab.
3. Enable **Email/Password** (toggle it on, Save).
4. Enable **Google** (toggle on, pick a support email, Save).

> Want only email or only Google? Just enable what you need — the UI adapts.

## 3. Create the Firestore database

1. **Build → Firestore Database → Create database**.
2. Choose **Production mode** (we ship strict rules in the next step).
3. Pick a location close to your users (e.g. `asia-south1` for Pakistan/India) and enable.

## 4. Register a Web app & copy the config

1. Go to **Project settings** (gear icon, top-left) → **General**.
2. Scroll to **Your apps** → click the **Web** icon (`</>`).
3. Give it a nickname (e.g. `hisaab-web`) — you do **not** need Firebase Hosting here.
4. Firebase shows a `firebaseConfig` object. Copy those values.

## 5. Paste the keys into `config/env.js`

```js
window.__HISAAB_ENV__ = {
  firebase: {
    apiKey:            "AIza...",
    authDomain:        "hisaab-pro.firebaseapp.com",
    projectId:         "hisaab-pro",
    storageBucket:     "hisaab-pro.appspot.com",
    messagingSenderId: "000000000000",
    appId:             "1:000000000000:web:abcdef123456",
    measurementId:     "G-XXXXXXX"   // optional
  },
  cloudinary: {
    cloudName:    "dtpanksun",   // already set — your account
    uploadPreset: "upload",      // already set — unsigned preset
    folder:       "hisaab-pro"
  }
};
```

Save and refresh the app. The dashboard's **System status** card should now read **Cloud sync (Firebase): Connected**.

## 6. Deploy the security rules

The included **`firestore.rules`** ensures every user can read/write **only their own** data. Deploy it:

```bash
npm install -g firebase-tools     # once
firebase login
firebase init firestore           # select your project; accept firestore.rules
firebase deploy --only firestore:rules
```

Or paste the contents of `firestore.rules` directly into **Firestore → Rules** in the console and click **Publish**.

---

## 7. (Production) Authorize your domain

When you deploy live, add your domain so Google sign-in works:

**Authentication → Settings → Authorized domains → Add domain**
(e.g. `yourname.github.io`, `hisaab-pro.pages.dev`, or your custom domain). `localhost` is authorized by default for local development.

---

## ☁️ About Cloudinary (already configured)

Your Cloudinary environment is wired in: **cloud `dtpanksun`**, **unsigned preset `upload`**. Avatar and receipt uploads work immediately. These values are *meant* to be public in browser code — an **unsigned** preset can only create assets, never read/delete your library. 

⚠️ **Never** put a Cloudinary **API Secret** or a **signed** preset in client code. If you ever need signed uploads, do them from a small serverless function.

---

## ❓ Troubleshooting

| Symptom | Fix |
|---|---|
| "Cloud sign-in is off" banner stays | Keys missing/typo in `config/env.js`; check the browser console for the Firebase message. |
| Google popup closes instantly | Add your domain under **Authorized domains**; allow popups. |
| `Missing or insufficient permissions` | Security rules not deployed, or you're querying another user's data. Deploy `firestore.rules`. |
| Modules fail to load (`Failed to fetch`) | You opened `index.html` as a file. Serve over http (`python3 -m http.server`). |
| Avatar upload fails | Confirm the preset name is exactly `upload` and its mode is **Unsigned** in Cloudinary. |

---

Need the financial modules next? They plug straight into this foundation — the routes, collections, and dashboard slots are already in place.

**Built by DGTechnology.online — Digital Galaxy.**
