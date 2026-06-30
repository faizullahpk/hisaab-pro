<div align="center">

# 💎 Hisaab Pro

### Your Personal Financial Operating System

A private, premium, installable financial workspace — built for freelancers and professionals who want **every rupee in focus**. Not an expense tracker. A complete financial command center.

**Phase 1 — Enterprise Foundation** ✦ **Phase 2 — Full Authentication**

`Vanilla JS` · `Buildless` · `PWA` · `Firebase` · `Cloudinary` · `10 Themes`

</div>

---

## ✨ What's inside

This release delivers a **production-grade foundation** and a **complete authentication system** — the bedrock that all financial modules (income, expenses, clients, debts, savings, analytics) slot into next, *without rewrites*.

### Phase 1 — Foundation
- **Modular architecture** — clean ES-module structure, zero build step, deploys anywhere static
- **Hash-based SPA router** with lazy-loaded pages, route guards, and animated transitions
- **10 hand-crafted themes**, each with its own animated background (Midnight, Dark, Space, Ocean, Forest, Cyberpunk, Neon, Glass, Light, Minimal)
- **Fully responsive** — desktop, tablet, mobile, landscape/portrait, safe-area aware (notches)
- **Reusable component system** — sidebar, top bar, footer, notifications, profile menu, command palette, toasts, skeletons, modals
- **⌘K command palette** (Raycast/Linear-style) for instant navigation
- **PWA** — installable on Android & iPhone, offline support, service worker, app icons
- **Design signature** — Space Grotesk display, Inter UI, JetBrains Mono for every financial figure

### Phase 2 — Authentication
- **Google** sign-in · **Email/Password** · **Guest mode** (works fully offline)
- **Email verification** (with resend + auto-advance) and **password reset**
- **Remember me** with proper session persistence (local vs. session)
- **Profile management** — edit name, upload avatar (→ Cloudinary), account stats
- **Security center** — recent login history, device list with revoke, verification status
- **Protected routes**, unauthorized screen, session restore on refresh
- **Firestore security rules** — users can only ever access their own data

---

## 🚀 Quick start

Because the app uses native ES modules, it must be served over **http** (not opened as a `file://`). Any static server works:

```bash
# From the project folder — pick one:
python3 -m http.server 8080
# or
npx serve .
# or
npx http-server -p 8080
```

Then open **http://localhost:8080**. 

👉 **It works immediately in Guest mode** — no setup required. Cloudinary is already wired (cloud `dtpanksun`, unsigned preset `upload`), so avatar uploads work out of the box. To unlock cloud accounts, Google sign-in and multi-device sync, add your Firebase keys (below).

---

## 🔑 Enable cloud sync (Firebase) — 5 minutes

Open **`config/env.js`** and fill in the `firebase` block. Full step-by-step instructions with screenshots-worth of detail are in **[`docs/SETUP.md`](docs/SETUP.md)**. The short version:

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com)
2. **Authentication → Sign-in method** → enable **Email/Password** and **Google**
3. **Firestore Database** → Create database (production mode)
4. **Project settings → Your apps → Web** → copy the config object
5. Paste the values into `config/env.js`:

```js
window.__HISAAB_ENV__ = {
  firebase: {
    apiKey: "AIza…",
    authDomain: "your-app.firebaseapp.com",
    projectId: "your-app",
    storageBucket: "your-app.appspot.com",
    messagingSenderId: "1234567890",
    appId: "1:1234567890:web:abc123"
  },
  cloudinary: { cloudName: "dtpanksun", uploadPreset: "upload", folder: "hisaab-pro" }
};
```

6. Deploy the security rules (so users can only read their own data):

```bash
firebase deploy --only firestore:rules
```

Refresh — you'll now see "Connected" on the dashboard, and Google/email sign-up will work. The dashboard's **System status** card tells you exactly what's wired at a glance.

> 🔒 `config/env.js` is **gitignored**. Commit `config/env.example.js` instead. Your Cloudinary cloud name + *unsigned* preset are safe to ship in the browser by design; never put secret API keys or signed presets in client code.

---

## 📦 Deploy

The app is 100% static — host it on anything. `start_url` and the service worker use **relative paths**, so it works from a sub-path too.

| Host | Steps |
|---|---|
| **GitHub Pages** | Push to a repo → Settings → Pages → deploy from `main` / root. (404.html bounces unknown paths back into the SPA.) |
| **Cloudflare Pages** | Connect repo → Framework preset: *None* → Build command: *(empty)* → Output dir: `/` |
| **Firebase Hosting** | `firebase init hosting` (public dir = project root, single-page = **No**, since we use hash routing) → `firebase deploy` |
| **Vercel** | Import project → Framework preset: *Other* → no build command → output: root |
| **Netlify** | Drag-and-drop the folder, or connect the repo with no build command |

No build, no bundler, no `npm install`. What you see is what ships.

---

## 🗂 Project structure

```
hisaab-pro/
├── index.html                 # App shell (loads fonts, CSS, env, module entry)
├── manifest.webmanifest       # PWA manifest
├── service-worker.js          # Offline caching
├── offline.html / 404.html    # Static fallbacks
├── firestore.rules            # Security rules (own-data-only)
├── config/
│   ├── env.js                 # ← your keys (gitignored; Cloudinary pre-filled)
│   ├── env.example.js         # Template to commit
│   ├── app.config.js          # App constants, routes, nav, collections
│   ├── firebase.config.js     # Resolves Firebase env
│   └── cloudinary.config.js   # Resolves Cloudinary env
├── css/                       # 9 layered stylesheets (tokens → themes → ui)
├── js/
│   ├── main.js                # Boot sequence
│   ├── core/                  # dom, events (bus), store, router
│   ├── services/
│   │   ├── firebase/          # firebase, auth, firestore
│   │   ├── cloudinary/        # unsigned uploads
│   │   └── storage/           # local/session wrappers
│   ├── themes/                # theme engine (10 themes)
│   ├── components/            # icons, loader, toast, skeleton, popovers, chrome
│   ├── layouts/               # app shell + auth split-screen
│   ├── pages/                 # login, signup, reset, verify, dashboard,
│   │                          #   profile, settings, security, 404, unauthorized
│   ├── guards/                # route auth guard
│   └── utils/                 # validators, formatters, helpers, animations
├── pwa/                       # install prompt
└── assets/icons/              # generated PWA icons + favicon
```

---

## ⌨️ Shortcuts & tips

- **⌘K / Ctrl+K** — open the command palette (search any module, action, or page)
- **Theme switcher** (top bar) — switch any of the 10 themes instantly; choice is remembered
- **Settings → Reduced motion** — respects and toggles motion preferences
- **Settings → Export/Import** — back up your workspace preferences as JSON

---

## 🛣 Roadmap (next phases)

The navigation, Firestore collections, and dashboard already stub these — they build directly on this foundation:

`Income` · `Expenses` · `Clients & Invoices` · `Debts & Receivables` · `Savings & Goals` · `Family & Shared` · `Receipts (OCR)` · `Analytics & Reports` · `Budgets` · `Recurring & Reminders`

---

<div align="center">

**Built by [DGTechnology.online](https://dgtechnology.online)**
*Digital Galaxy — Where Everything Is Possible*

</div>
